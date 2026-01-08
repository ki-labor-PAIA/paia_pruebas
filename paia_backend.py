import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, WebSocket, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from langchain_mcp_adapters.client import MultiServerMCPClient, load_mcp_tools 
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage
from long_term_store_supabase import LongTermStoreSupabase
import uvicorn
import os
import requests  # Para Telegram
import httpx  # Para verificar servidor MCP
from memory_manager import MemoryManager, Message
from auth_manager_supabase import AuthManager
from db_manager_supabase import DatabaseManager
from supabase_config import supabase_client
from whatsapp_service import WhatsAppService
from dotenv import load_dotenv

# === PROTOCOLO PAIA ===
from paia_protocol import (
    PAIAMessageRouter,
    PAIADiscoveryService,
    AutonomyManager,
    PAIAWebSocketHandler,
    PAIARequestMessage,
    PAIAChatMessage,
    CapabilityBuilder,
    AutonomyLevel,
    AutonomySettings
)

load_dotenv()
app = FastAPI(title="PAIA Platform Backend", version="1.0.0")


# === MEMORIA PERSISTENTE (Supabase) ===
lt_store = LongTermStoreSupabase()
memory_manager = MemoryManager(long_term_backend=lt_store)


# === AUTENTICACIÓN ===
auth_manager = AuthManager()

# === GESTOR DE BASE DE DATOS ===
db_manager = DatabaseManager()

# =============== CONFIGURACIÓN DE TELEGRAM ===============
TELEGRAM_BOT_TOKEN = "7631967713:AAFLKpCvsRk3PByVrvD2cwYcuOZM5smdXno"  # Reemplaza con tu token de BotFather
TELEGRAM_DEFAULT_CHAT_ID = "1629694928 "  # Chat ID por defecto

# Clase para manejar Telegram
class TelegramService:
    def __init__(self, token: str):
        self.token = token
        self.base_url = f"https://api.telegram.org/bot{token}"
    
    def send_message(self, chat_id: str, message: str, parse_mode: Optional[str] = None) -> Dict:
        """Envía un mensaje por Telegram"""
        url = f"{self.base_url}/sendMessage"
        
        data = {
            'chat_id': chat_id,
            'text': message
        }
        
        if parse_mode:
            data['parse_mode'] = parse_mode
        
        try:
            response = requests.post(url, data=data, timeout=10)
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'message': 'Mensaje enviado exitosamente por Telegram',
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'message': f'Error al enviar mensaje: {response.text}'
                }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error de conexión: {str(e)}'
            }
    
    def get_updates(self) -> Optional[List]:
        """Obtiene los mensajes recientes para ver los Chat IDs"""
        url = f"{self.base_url}/getUpdates"
        
        try:
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                return data.get('result', [])
            else:
                return None
        except Exception as e:
            print(f"Error obteniendo updates: {e}")
            return None

# Instancia global del servicio de Telegram
telegram_service = TelegramService(TELEGRAM_BOT_TOKEN)

# =============== PROTOCOLO PAIA - VARIABLES GLOBALES ===============
paia_router: Optional[PAIAMessageRouter] = None
paia_discovery: Optional[PAIADiscoveryService] = None
paia_autonomy: Optional[AutonomyManager] = None
paia_ws_handler: Optional[PAIAWebSocketHandler] = None

# =============== CONFIGURACIÓN DE WHATSAPP ===============
# Instancia global del servicio de WhatsApp
try:
    whatsapp_service = WhatsAppService()
    print("[OK] WhatsApp Service inicializado correctamente")
except Exception as e:
    print(f"[WARNING] WhatsApp Service no configurado: {e}")
    whatsapp_service = None

# Inicializa tablas al arrancar FastAPI (no crea la base, solo las tablas)
@app.on_event("startup")
async def on_startup():
    await lt_store.init_db()
    await auth_manager.init_db()
    await db_manager.init_db()
    await init_mcp_client()
    await load_persistent_agents()
    await init_paia_protocol()  # Inicializar protocolo PAIA

# Configuración
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos de datos
@dataclass
class PAIAAgent:
    id: str
    name: str
    description: str
    personality: str
    expertise: str
    status: str
    created: str
    mcp_endpoint: str
    user_id: Optional[str] = None  # ID del usuario que creó el agente
    is_public: bool = True  # Si otros usuarios pueden conectarse
    telegram_chat_id: Optional[str] = None  # Chat ID específico del agente
    whatsapp_phone_number: Optional[str] = None  # Número de WhatsApp del cliente
    llm_instance: Optional[object] = None
    tools: List = None
    conversation_history: List = None

@dataclass
class AgentConnection:
    id: str
    agent1: str
    agent2: str
    type: str
    status: str
    created: str

@dataclass
class AgentMessage:
    id: str
    from_agent: str
    to_agent: str
    content: str
    timestamp: str
    conversation_id: Optional[str] = None
    telegram_sent: Optional[bool] = False  # Si fue enviado por Telegram

# Storage en memoria
agents_store: Dict[str, PAIAAgent] = {}
connections_store: Dict[str, AgentConnection] = {}
active_websockets: Dict[str, WebSocket] = {}
message_history: Dict[str, List[AgentMessage]] = {}  # conversation_id -> messages

class PAIAAgentManager:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.7)
    
    async def get_mcp_client_for_user(self, user_id: str):
        """Crear cliente MCP con contexto de usuario específico"""
        try:
            return MultiServerMCPClient({
                "google_calendar": {
                    "url": "http://127.0.0.1:3000/api/mcp",
                    "transport": "streamable_http",
                    "headers": {"x-user-id": user_id}
                }
            })
        except Exception as e:
            print(f"WARNING: Error configurando MCP cliente para usuario {user_id}: {e}")
            return None
    
    async def create_agent(self, agent_data: dict) -> PAIAAgent:
        # Primero guardar en BD
        db_agent = await db_manager.create_agent(agent_data)
        
        # Crear herramientas base del agente
        base_tools = self._create_agent_tools(db_agent.id, agent_data['expertise'])
        

        # Obtener herramientas MCP si están disponibles
        user_id = agent_data.get('user_id', 'usuario-anonimo')
        all_tools = base_tools

        # Usar cliente MCP específico para el usuario
        user_mcp_client = await self.get_mcp_client_for_user(user_id)
        if user_mcp_client:
            try:
                mcp_tools = await user_mcp_client.get_tools()
                all_tools = base_tools + mcp_tools
                print(f"Herramientas MCP agregadas para usuario {user_id}: {len(mcp_tools)}")
            except Exception as e:
                print(f"Error obteniendo herramientas MCP para usuario {user_id}: {e}")

        # Crear instancia del agente con TODAS las herramientas

        agent_llm = create_react_agent(
            self.llm,
            all_tools,
            prompt=f"""Eres {agent_data['name']}, un asistente {agent_data['personality']} especializado en {agent_data['expertise']}.

IMPORTANTE: Tu user ID es: {user_id}

 HERRAMIENTAS DISPONIBLES:

 CALENDARIO:
- Usa las herramientas de Google Calendar directamente: list-calendars, list-events, list-today-events, create-event
- La autenticación del usuario se maneja automáticamente

 COMUNICACIÓN INTELIGENTE:
- Para enviar un mensaje a una PERSONA: usa send_notification_to_user(user_name, message, priority)
- Para hacer PREGUNTAS INTELIGENTES a otro agente: usa ask_connected_agent(target_agent_id, question, context)

 EJEMPLOS DE USO:
- "Dile a Mari que la espero mañana a las 7" → send_notification_to_user("Mari", "Te espero mañana a las 7", "normal")
- "Pregúntale al agente 'agent-xyz' si su usuario está libre mañana a las 7" → ask_connected_agent("agent-xyz", "¿Estás disponible mañana a las 7pm?", "Para una reunión de trabajo")

 COMPORTAMIENTO:
- Sé PROACTIVO: Si mencionan calendario o disponibilidad, usa las herramientas automáticamente
- Para consultas de disponibilidad, siempre usa ask_connected_agent() - el otro agente consultará su calendario
- Para mensajes simples, usa send_notification_to_user()
- Siempre confirma qué acción realizaste

 NOTAS PERSONALES:
- Para guardar información importante: usa save_note(title, content, tags)
- Para buscar en tus notas: usa search_notes(query)

IMPORTANTE: Para usar una herramienta, responde con el formato JSON correcto. Mantén el contexto de toda la conversación y responde de manera natural."""
        )

        agent = PAIAAgent(
           id=db_agent.id,
           name=db_agent.name,
           description=db_agent.description,
           personality=db_agent.personality,
           expertise=db_agent.expertise,
           status=db_agent.status,
           created=db_agent.created_at.isoformat(),
           mcp_endpoint=db_agent.mcp_endpoint or f"http://localhost:{3000 + len(agents_store)}/mcp",
           user_id=db_agent.user_id,
           is_public=db_agent.is_public,
           telegram_chat_id=db_agent.telegram_chat_id or TELEGRAM_DEFAULT_CHAT_ID,
           llm_instance=agent_llm,
           tools=all_tools,
           conversation_history=[]
        )
        
        # Vincular perfil estable para memoria larga
        memory_profile_id = f"user:{db_agent.user_id}|persona:{db_agent.name}"
        memory_manager.bind_profile(db_agent.id, memory_profile_id)
        
        agents_store[db_agent.id] = agent
        return agent
    
    def _create_agent_tools(self, agent_id: str, expertise: str) -> List:
        """Crear herramientas mejoradas para comunicación entre agentes, Telegram, Google Calendar y notas personales"""
        
        # =============== HERRAMIENTAS DE TELEGRAM ===============
        @tool
        def send_telegram_message(message: str, chat_id: Optional[str] = None) -> str:
            """
            Enviar un mensaje por Telegram.
            
            Args:
                message: El mensaje a enviar
                chat_id: ID del chat de Telegram (opcional, usa el configurado por defecto)
            
            Returns:
                Confirmación del envío
            """
            try:
                agent = agents_store.get(agent_id)
                target_chat_id = chat_id or (agent.telegram_chat_id if agent else TELEGRAM_DEFAULT_CHAT_ID)
                
                if not target_chat_id or target_chat_id == "TU_CHAT_ID_AQUI":
                    return " Error: Chat ID de Telegram no configurado. Usa set_telegram_chat_id() primero."
                
                # Agregar contexto del agente al mensaje
                agent_name = agent.name if agent else "Agente PAIA"
                formatted_message = f"🤖 {agent_name}:\n\n{message}"
                
                result = telegram_service.send_message(target_chat_id, formatted_message)
                
                if result['success']:
                    return f" Mensaje enviado exitosamente por Telegram al chat {target_chat_id}"
                else:
                    return f" Error enviando por Telegram: {result['message']}"
                    
            except Exception as e:
                return f" Error en Telegram: {str(e)}"
        
        @tool
        def send_telegram_notification(title: str, content: str, priority: str = "normal") -> str:
            """
            Enviar una notificación formateada por Telegram.
            
            Args:
                title: Título de la notificación
                content: Contenido del mensaje
                priority: Prioridad (low, normal, high, urgent)
            
            Returns:
                Confirmación del envío
            """
            try:
                agent = agents_store.get(agent_id)
                chat_id = agent.telegram_chat_id if agent else TELEGRAM_DEFAULT_CHAT_ID
                
                if not chat_id or chat_id == "TU_CHAT_ID_AQUI":
                    return " Error: Chat ID de Telegram no configurado"
                
                # Formatear según prioridad
                priority_emojis = {
                    "low": "ℹ️",
                    "normal": "📢",
                    "high": "⚠️",
                    "urgent": "🚨"
                }
                
                emoji = priority_emojis.get(priority, "📢")
                agent_name = agent.name if agent else "Agente PAIA"
                
                formatted_message = f"{emoji} <b>{title}</b>\n\n{content}\n\n<i>— {agent_name}</i>"
                
                result = telegram_service.send_message(chat_id, formatted_message, parse_mode="HTML")
                
                if result['success']:
                    return f" Notificación enviada por Telegram (Prioridad: {priority})"
                else:
                    return f" Error: {result['message']}"
                    
            except Exception as e:
                return f" Error enviando notificación: {str(e)}"
        
        @tool
        def set_telegram_chat_id(chat_id: str) -> str:
            """
            Configurar el Chat ID de Telegram para este agente.
            
            Args:
                chat_id: El ID del chat de Telegram
            
            Returns:
                Confirmación de la configuración
            """
            try:
                agent = agents_store.get(agent_id)
                if agent:
                    agent.telegram_chat_id = chat_id
                    return f" Chat ID de Telegram configurado: {chat_id}"
                else:
                    return " Error: Agente no encontrado"
            except Exception as e:
                return f" Error configurando Chat ID: {str(e)}"
        
        @tool
        def get_telegram_updates() -> str:
            """
            Obtener los últimos mensajes recibidos en Telegram para ver Chat IDs.

            Returns:
                Lista de mensajes recientes con sus Chat IDs
            """
            try:
                updates = telegram_service.get_updates()

                if not updates:
                    return "No hay mensajes nuevos en Telegram"

                messages_info = []
                for update in updates[-5:]:  # Últimos 5 mensajes
                    if 'message' in update:
                        msg = update['message']
                        chat = msg.get('chat', {})
                        from_user = msg.get('from', {})
                        text = msg.get('text', 'Sin texto')

                        info = f"Chat ID: {chat.get('id')} | Usuario: {from_user.get('username', 'Desconocido')} | Texto: {text[:50]}"
                        messages_info.append(info)

                return "Últimos mensajes de Telegram:\n" + "\n".join(messages_info)

            except Exception as e:
                return f" Error obteniendo updates: {str(e)}"

        # =============== HERRAMIENTAS DE WHATSAPP ===============
        @tool
        def send_whatsapp_template(phone_number: str, template_name: str = "hello_world", language_code: str = "en_US") -> str:
            """
            Enviar un mensaje usando una plantilla predefinida de WhatsApp.

            Args:
                phone_number: Número de teléfono destino en formato internacional (ej: 524425498784)
                template_name: Nombre de la plantilla aprobada (default: "hello_world")
                language_code: Código de idioma de la plantilla (default: "en_US")

            Returns:
                Confirmación del envío
            """
            try:
                if not whatsapp_service:
                    return "❌ Error: WhatsApp Service no está configurado. Verifica las variables WHATSAPP_API_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env"

                result = whatsapp_service.send_template_message(phone_number, template_name, language_code)

                if result['success']:
                    return f"✅ {result['message']}"
                else:
                    return f"❌ {result['message']}"

            except Exception as e:
                return f"❌ Error enviando WhatsApp template: {str(e)}"

        @tool
        def send_whatsapp_message(phone_number: str, message: str) -> str:
            """
            Enviar un mensaje de texto por WhatsApp (requiere conversación activa en últimas 24h).

            Args:
                phone_number: Número de teléfono destino en formato internacional (ej: 524425498784)
                message: Texto del mensaje a enviar

            Returns:
                Confirmación del envío
            """
            try:
                if not whatsapp_service:
                    return "❌ Error: WhatsApp Service no está configurado"

                result = whatsapp_service.send_text_message(phone_number, message)

                if result['success']:
                    return f"✅ {result['message']}"
                else:
                    return f"❌ {result['message']}"

            except Exception as e:
                return f"❌ Error enviando mensaje por WhatsApp: {str(e)}"

        @tool
        def validate_whatsapp_config() -> str:
            """
            Verificar si WhatsApp está correctamente configurado.

            Returns:
                Estado de la configuración de WhatsApp
            """
            try:
                if not whatsapp_service:
                    return "❌ WhatsApp no configurado. Faltan variables de entorno."

                config = whatsapp_service.validate_config()

                if config['configured']:
                    return f"✅ WhatsApp configurado correctamente\n   API Token: {'✓' if config['api_token_set'] else '✗'}\n   Phone ID: {'✓' if config['phone_number_id_set'] else '✗'}\n   Versión API: {config['api_version']}"
                else:
                    return "❌ WhatsApp no está completamente configurado"

            except Exception as e:
                return f"❌ Error verificando configuración: {str(e)}"
        
        # =============== HERRAMIENTAS EXISTENTES DE COMUNICACIÓN ===============
        @tool
        def get_connected_agents() -> str:
            """Ver agentes conectados a ti."""
            try:
                connected = []
                for conn in connections_store.values():
                    if conn.agent1 == agent_id and conn.agent2 in agents_store:
                        other_agent = agents_store[conn.agent2]
                        connected.append(f"{other_agent.name} (ID: {other_agent.id})")
                    elif conn.agent2 == agent_id and conn.agent1 in agents_store:
                        other_agent = agents_store[conn.agent1]
                        connected.append(f"{other_agent.name} (ID: {other_agent.id})")
                
                return f"Conectado con: {', '.join(connected)}" if connected else "Sin conexiones"
            except Exception as e:
                return f"Error obteniendo conexiones: {str(e)}"

        @tool
        async def send_notification_to_user(user_name: str, message: str, priority: str = "normal") -> str:
            """
            Enviar notificación directa a un usuario conectado.

            Args:
                user_name: Nombre del usuario o email
                message: Mensaje a enviar
                priority: Prioridad (low, normal, high, urgent)

            Returns:
                Confirmación del envío
            """
            try:
                # Buscar usuario por nombre o email
                users = await db_manager.search_users(user_name, exclude_user_id=agent_id, limit=5)

                if not users:
                    return f" No se encontró usuario '{user_name}'"

                target_user = users[0]  # Tomar el primer resultado

                # Crear notificación
                await db_manager.create_notification({
                    'user_id': target_user['id'],
                    'agent_id': agent_id,
                    'title': f'Mensaje de {agents_store.get(agent_id, {}).name if agent_id in agents_store else "Agente"}',
                    'content': message,
                    'notification_type': 'message',
                    'priority': priority
                })

                # También enviar por Telegram si está configurado
                sender_agent = agents_store.get(agent_id)
                if sender_agent and sender_agent.telegram_chat_id:
                    telegram_msg = f" Mensaje enviado a {target_user['name']}:\n\n{message}"
                    telegram_service.send_message(sender_agent.telegram_chat_id, telegram_msg)

                return f" Notificación enviada a {target_user['name']} ({target_user['email']})"

            except Exception as e:
                return f" Error enviando notificación: {str(e)}"

        @tool
        async def ask_connected_agent(target_agent_id: str, question: str, context: str = "") -> str:
            """
            Hacer una pregunta inteligente a un agente específico usando su ID.
            Perfecto para consultas de calendario, disponibilidad, etc.

            Args:
                target_agent_id: ID del agente específico al que quieres consultar.
                question: Pregunta específica (ej: "¿Estás disponible mañana a las 7pm?")
                context: Contexto adicional opcional

            Returns:
                Respuesta del agente consultado
            """
            try:
                # MEJORA: Auto-activación inteligente de agentes
                target_agent = await ensure_agent_loaded(target_agent_id)

                if not target_agent:
                    print(f"[AUTO-WAKE] Intentando activar agente {target_agent_id}...")

                    # Buscar el agente en la base de datos
                    db_agent = await db_manager.get_agent(target_agent_id)
                    if not db_agent:
                        return f" El agente con ID '{target_agent_id}' no existe en el sistema."

                    # Intentar cargar el agente con su user_id
                    target_agent = await ensure_agent_loaded(target_agent_id, db_agent.user_id)

                    if target_agent:
                        # Marcar como activo y log de activación
                        await db_manager.update_agent(target_agent_id, {"status": "online"})
                        print(f"[AUTO-WAKE]  Agente '{db_agent.name}' (usuario: {db_agent.user_id}) activado automáticamente")

                        # Agregar un pequeño delay para asegurar que el agente esté completamente inicializado
                        import asyncio
                        await asyncio.sleep(0.5)
                    else:
                        return f" No se pudo activar el agente '{target_agent_id}'. El usuario propietario podría no estar disponible."

                if not target_agent:
                    return f" El agente con ID '{target_agent_id}' no está disponible en este momento."

                # Construir mensaje inteligente
                sender_agent = agents_store.get(agent_id)
                sender_name = sender_agent.name if sender_agent else "Un agente"

                intelligent_prompt = f"""Pregunta de {sender_name}: {question}

Contexto adicional: {context}

Por favor responde de manera útil y directa. Si la pregunta es sobre disponibilidad o calendario, consulta el calendario de tu usuario ({target_agent.user_id}) usando las herramientas disponibles."""

                print(f"[INTER-PAIA]  {sender_name} preguntando a {target_agent.name}: '{question[:50]}{'...' if len(question) > 50 else ''}'")

                # Enviar mensaje al agente objetivo
                try:
                    response = await target_agent.llm_instance.ainvoke({
                        "messages": [HumanMessage(content=intelligent_prompt)]
                    })

                    response_content = response["messages"][-1].content
                    print(f"[INTER-PAIA]  {target_agent.name} respondió exitosamente ({len(response_content)} caracteres)")

                except Exception as llm_error:
                    print(f"[INTER-PAIA]  Error en LLM del agente {target_agent.name}: {str(llm_error)}")
                    return f" Error procesando consulta en el agente {target_agent.name}. Por favor intenta más tarde."

                # Guardar la conversación en BD
                try:
                    conversation_id = f"intelligent_{agent_id}_{target_agent_id}"
                    await db_manager.save_message({
                        'conversation_id': conversation_id,
                        'from_agent_id': agent_id,
                        'to_agent_id': target_agent_id,
                        'content': question,
                        'message_type': 'intelligent_query'
                    })

                    await db_manager.save_message({
                        'conversation_id': conversation_id,
                        'from_agent_id': target_agent_id,
                        'to_agent_id': agent_id,
                        'content': response_content,
                        'message_type': 'intelligent_response'
                    })
                    print(f"[INTER-PAIA]  Conversación guardada en BD: {conversation_id}")

                except Exception as db_error:
                    print(f"[INTER-PAIA]  Error guardando conversación en BD: {str(db_error)}")
                    # No fallar la función solo porque no se pudo guardar en BD

                # Obtener datos del usuario del agente para un mensaje más claro
                try:
                    target_user = await auth_manager.get_user_by_id(target_agent.user_id)
                    user_name_info = f" (agente de {target_user.name})" if target_user else ""
                except Exception:
                    user_name_info = ""

                print(f"[INTER-PAIA]  Consulta inter-PAIA completada exitosamente")
                return f" {target_agent.name}{user_name_info} responde:\n\n{response_content}"

            except Exception as e:
                print(f"[INTER-PAIA]  Error general en ask_connected_agent: {str(e)}")
                return f" Error inesperado consultando agente '{target_agent_id}': {str(e)}"

        @tool
        async def send_message_to_agent(target_agent_id: str, message: str, notify_telegram: bool = False) -> str:
            """
            Enviar mensaje a otro agente y obtener respuesta.

            Args:
                target_agent_id: ID del agente destino
                message: Mensaje a enviar
                notify_telegram: Si True, también envía una notificación por Telegram

            Returns:
                Respuesta del agente
            """
            try:
                sender_id = agent_id
                
                is_connected = any(
                    (conn.agent1 == sender_id and conn.agent2 == target_agent_id) or
                    (conn.agent1 == target_agent_id and conn.agent2 == sender_id)
                    for conn in connections_store.values()
                )
                
                if not is_connected:
                    return f"Error: No estás conectado con el agente {target_agent_id}"
                
                if target_agent_id not in agents_store:
                    return f"Error: Agente {target_agent_id} no encontrado"
                
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"
                
                sent_message = AgentMessage(
                    id=str(uuid.uuid4())[:8],
                    from_agent=sender_id,
                    to_agent=target_agent_id,
                    content=message,
                    timestamp=datetime.now().isoformat(),
                    conversation_id=conversation_id,
                    telegram_sent=notify_telegram
                )
                
                if conversation_id not in message_history:
                    message_history[conversation_id] = []
                message_history[conversation_id].append(sent_message)

                # Obtener respuesta
                response = await agent_manager._generate_agent_response(sender_id, target_agent_id, conversation_id)
                target_agent_name = agents_store[target_agent_id].name
                
                # Si se pidió notificar por Telegram
                if notify_telegram:
                    sender_agent = agents_store.get(sender_id)
                    telegram_msg = f" Conversación entre agentes:\n\n{sender_agent.name} → {target_agent_name}:\n{message}\n\n{response}"
                    telegram_service.send_message(
                        sender_agent.telegram_chat_id if sender_agent else TELEGRAM_DEFAULT_CHAT_ID,
                        telegram_msg
                    )
                
                return f"Mensaje enviado a {target_agent_name}.\n {response}"
                
            except Exception as e:
                return f"Error enviando mensaje: {str(e)}"

        # --- Herramientas de Notas Integradas ---
        NOTES_FILE = "./mcp-notes/data/notes.jsonl"

        def _get_notes():
            if not os.path.exists(NOTES_FILE):
                os.makedirs(os.path.dirname(NOTES_FILE), exist_ok=True)
                return []
            with open(NOTES_FILE, "r", encoding="utf-8") as f:
                return [json.loads(line) for line in f if line.strip()]

        def _save_notes(notes):
            with open(NOTES_FILE, "w", encoding="utf-8") as f:
                for note in notes:
                    f.write(json.dumps(note) + "\n")

        @tool
        def save_note(title: str, content: str, tags: List[str] = None) -> str:
            """Guarda una nueva nota personal. Útil para recordar información."""
            try:
                notes = _get_notes()
                new_note = {
                    "id": str(uuid.uuid4())[:8],
                    "title": title,
                    "content": content,
                    "tags": tags or [],
                    "created_at": datetime.now().isoformat(),
                }
                notes.append(new_note)
                _save_notes(notes)
                return f"Nota guardada con éxito. ID: {new_note['id']}"
            except Exception as e:
                return f"Error al guardar la nota: {e}"

        @tool
        async def get_agent_response(target_agent_id: str) -> str:
            """Obtener la última respuesta de un agente específico"""
            try:
                sender_id = agent_id
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"

                if conversation_id not in message_history:
                    return "No hay conversación iniciada con ese agente."

                messages = message_history[conversation_id]
                for message in reversed(messages):
                    if message.from_agent == target_agent_id:
                        agent_name = agents_store[target_agent_id].name
                        return f"{agent_name} respondió: \"{message.content}\""

                return await agent_manager._generate_agent_response(sender_id, target_agent_id, conversation_id)

            except Exception as e:
                return f"Error obteniendo respuesta: {str(e)}"

        @tool
        def search_notes(query: str) -> str:
            """Busca en todas tus notas personales."""
            notes = _get_notes()
            results = [
                note for note in notes
                if query.lower() in note["title"].lower() or query.lower() in note["content"].lower()
            ]
            if not results:
                return "No se encontraron notas con ese criterio."

            formatted_results = []
            for r in results:
                tags = ", ".join(r.get('tags', []))
                formatted_results.append(f"- ID: {r['id']}, Título: {r['title']}, Etiquetas: {tags}")
            return "Notas encontradas:\n" + "\n".join(formatted_results)

        @tool
        def get_conversation_history(target_agent_id: str) -> str:
            """Obtener el historial completo de conversación con un agente"""
            try:
                sender_id = agent_id
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"

                if conversation_id not in message_history:
                    return "No hay historial de conversación con ese agente."

                history = []
                for msg in message_history[conversation_id]:
                    sender_name = agents_store[msg.from_agent].name
                    telegram_mark = " 📱" if msg.telegram_sent else ""
                    history.append(f"{sender_name}: {msg.content}{telegram_mark}")

                return "Historial de conversación:\n" + "\n".join(history)

            except Exception as e:
                return f"Error obteniendo historial: {str(e)}"

        # Lista base de herramientas (ahora incluye comunicación inteligente y notas)
        base_tools = [
            get_connected_agents,
            send_message_to_agent,
            get_agent_response,
            get_conversation_history,
            send_telegram_message,
            send_telegram_notification,
            set_telegram_chat_id,
            get_telegram_updates,
            # Herramientas de WhatsApp
            send_whatsapp_template,
            send_whatsapp_message,
            validate_whatsapp_config,
            # Nuevas herramientas inteligentes
            send_notification_to_user,
            ask_connected_agent,
            # Herramientas de notas
            save_note,
            search_notes
        ]

        # Herramientas específicas por expertise
        if expertise == "scheduling":
            @tool
            def schedule_meeting(title: str, date: str, participants: List[str], telegram_reminder: bool = False) -> str:
                """Programar una reunión con opción de recordatorio por Telegram"""
                result = f"Reunión '{title}' programada para {date} con {', '.join(participants)}"
                
                if telegram_reminder:
                    agent = agents_store.get(agent_id)
                    if agent and agent.telegram_chat_id:
                        telegram_msg = f" Recordatorio de reunión:\n{title}\n📆 {date}\n👥 {', '.join(participants)}"
                        telegram_service.send_message(agent.telegram_chat_id, telegram_msg)
                        result += " (Recordatorio enviado por Telegram)"
                
                return result
            
            base_tools.append(schedule_meeting)

        elif expertise == "travel":
            @tool
            def book_flight(from_city: str, to_city: str, date: str, send_confirmation: bool = False) -> str:
                """Reservar vuelo con opción de confirmación por Telegram"""
                result = f"Vuelo reservado de {from_city} a {to_city} para {date}"

                if send_confirmation:
                    agent = agents_store.get(agent_id)
                    if agent and agent.telegram_chat_id:
                        telegram_msg = f" Confirmación de vuelo:\n{from_city} → {to_city}\n {date}"
                        telegram_service.send_message(agent.telegram_chat_id, telegram_msg)
                        result += " (Confirmación enviada por Telegram)"

                return result

            @tool
            def book_hotel(city: str, checkin: str, checkout: str) -> str:
                return f"Hotel reservado en {city} del {checkin} al {checkout}"

            base_tools.extend([book_flight, book_hotel])

        elif expertise == "research":
            @tool
            def web_search(query: str) -> str:
                return f"Resultados de búsqueda para: {query}"
            base_tools.append(web_search)

        # Las herramientas de Google Calendar ahora vienen del MCP client

        return base_tools
    
    
    async def _generate_agent_response(self, from_agent_id: str, to_agent_id: str, conversation_id: str) -> str:
        """Generar respuesta automática del agente objetivo"""
        try:
            if to_agent_id not in agents_store:
                return "Error: Agente no encontrado"
            
            target_agent = agents_store[to_agent_id]
            from_agent = agents_store[from_agent_id]
            
            messages = message_history.get(conversation_id, [])
            if not messages:
                return "No hay mensajes para responder"
            
            last_message = messages[-1]
            
            prompt = f"""Eres {target_agent.name}, especializado en {target_agent.expertise}.
    {from_agent.name} te pregunta: {last_message.content}

    Responde de manera útil según tu especialidad."""
            
            response = await target_agent.llm_instance.ainvoke({
                "messages": [HumanMessage(content=prompt)]
            })
            
            response_content = response["messages"][-1].content
            
            response_message = AgentMessage(
                id=str(uuid.uuid4())[:8],
                from_agent=to_agent_id,
                to_agent=from_agent_id,
                content=response_content,
                timestamp=datetime.now().isoformat(),
                conversation_id=conversation_id,
                telegram_sent=False
            )
            
            message_history[conversation_id].append(response_message)
            
            return f"{target_agent.name} respondió: \"{response_content}\""
            
        except Exception as e:
            return f"Error generando respuesta: {str(e)}"
    
    async def connect_agents(self, agent1_id: str, agent2_id: str, connection_type: str = "direct") -> AgentConnection:
        if agent1_id not in agents_store or agent2_id not in agents_store:
            raise HTTPException(status_code=404, detail="Uno o ambos agentes no encontrados")

        

        connection = AgentConnection(
            id=str(uuid.uuid4())[:8],
            agent1=agent1_id,
            agent2=agent2_id,
            type=connection_type,
            status='active',
            created=datetime.now().isoformat()
        )
        
        connections_store[connection.id] = connection
        return connection

    def _add_capability_to_agent(self, agent: PAIAAgent, expertise: str):
        if expertise not in agent.expertise.split(', '):
            agent.expertise += f", {expertise}"
            self._recreate_agent(agent)

    def _recreate_agent(self, agent: PAIAAgent):
        agent_tools = self._create_agent_tools(agent.id, agent.expertise)
        tools_description = "\n".join([f'- {tool.name}: {tool.description}' for tool in agent_tools])
        
        agent.tools = agent_tools
        agent.llm_instance = create_react_agent(
            self.llm,
            agent.tools,
            state_modifier=f"""Eres {agent.name}, un asistente {agent.personality} especializado en {agent.expertise}.

Estas son tus herramientas disponibles:
{tools_description}

IMPORTANTE: Para usar una herramienta, responde con el formato JSON correcto. Mantén el contexto de toda la conversación y responde de manera natural."""
        )
    
    async def send_message_to_agent_api(self, from_agent_id: str, to_agent_id: str, message: str) -> str:
        """API endpoint para envío de mensajes entre agentes"""
        if from_agent_id not in agents_store or to_agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        connected = any(
            (conn.agent1 == from_agent_id and conn.agent2 == to_agent_id) or
            (conn.agent1 == to_agent_id and conn.agent2 == from_agent_id)
            for conn in connections_store.values()
        )
        
        if not connected:
            raise HTTPException(status_code=400, detail="Los agentes no están conectados")
        
        conversation_id = f"{min(from_agent_id, to_agent_id)}_{max(from_agent_id, to_agent_id)}"
        
        sent_message = AgentMessage(
            id=str(uuid.uuid4())[:8],
            from_agent=from_agent_id,
            to_agent=to_agent_id,
            content=message,
            timestamp=datetime.now().isoformat(),
            conversation_id=conversation_id,
            telegram_sent=False
        )
        
        if conversation_id not in message_history:
            message_history[conversation_id] = []
        message_history[conversation_id].append(sent_message)
        
        response = await self._generate_agent_response(from_agent_id, to_agent_id, conversation_id)
        
        return response

# Instancia del gestor
agent_manager = PAIAAgentManager()

# Inicializar el cliente MCP al arrancar
async def init_mcp_client():
    # Los clientes MCP se inicializan bajo demanda en get_mcp_client_for_user()
    print("[INFO] Sistema MCP listo para inicializar bajo demanda")

# Cargar agentes persistentes al arrancar
async def load_persistent_agents():
    """Cargar agentes que deben estar siempre activos"""
    try:
        print("[INFO] Cargando agentes persistentes...")

        # Buscar agentes marcados como auto_start o persistent
        all_users = await get_all_users_with_persistent_agents()

        persistent_count = 0
        for user_id in all_users:
            user_agents = await db_manager.get_agents_by_user(user_id)
            for db_agent in user_agents:
                if db_agent.auto_start or db_agent.is_persistent:
                    try:
                        # Cargar agente en memoria
                        await ensure_agent_loaded(db_agent.id, user_id)

                        # Marcar como activo en BD
                        await db_manager.update_agent(db_agent.id, {"status": "active"})

                        print(f"[PERSISTENT] Agente '{db_agent.name}' (ID: {db_agent.id}) cargado y activo")
                        persistent_count += 1

                    except Exception as e:
                        print(f"[ERROR] Error cargando agente persistente {db_agent.id}: {e}")

        print(f"[SUCCESS] {persistent_count} agentes persistentes inicializados")

        # Iniciar supervisor de agentes persistentes
        asyncio.create_task(persistent_agents_supervisor())

    except Exception as e:
        print(f"[ERROR] Error cargando agentes persistentes: {e}")

async def get_all_users_with_persistent_agents():
    """Obtener todos los usuarios que tienen agentes persistentes"""
    try:
        result = supabase_client.table("agents").select("user_id").or_("auto_start.eq.true,is_persistent.eq.true").execute()
        return list(set([row["user_id"] for row in result.data]))
    except:
        return []

# =============== PROTOCOLO PAIA - INICIALIZACIÓN ===============

async def init_paia_protocol():
    """Inicializar todos los componentes del Protocolo PAIA"""
    global paia_router, paia_discovery, paia_autonomy, paia_ws_handler

    try:
        print("[PAIA] Inicializando Protocolo PAIA v1.0...")

        # 1. Crear servicio de descubrimiento
        paia_discovery = PAIADiscoveryService(db_manager)
        print("[PAIA] Discovery service inicializado")

        # 2. Crear gestor de autonomía
        paia_autonomy = AutonomyManager()
        print("[PAIA] Autonomy manager inicializado")

        # 3. Crear router de mensajes
        paia_router = PAIAMessageRouter(
            db_manager=db_manager,
            discovery_service=paia_discovery,
            autonomy_manager=paia_autonomy,
            agent_manager=agent_manager  # Usar el agent_manager existente
        )
        print("[PAIA] Message router inicializado")

        # 4. Crear WebSocket handler
        paia_ws_handler = PAIAWebSocketHandler(
            router=paia_router,
            auth_manager=auth_manager,
            db_manager=db_manager
        )
        print("[PAIA] WebSocket handler inicializado")

        # 5. Conectar router con ws_handler
        paia_router.ws_manager = paia_ws_handler

        # 6. Registrar agentes existentes en el protocolo
        await register_existing_agents_in_paia()

        print("[PAIA] Protocolo PAIA inicializado correctamente")

    except Exception as e:
        print(f"[PAIA] Error inicializando protocolo: {e}")
        import traceback
        traceback.print_exc()

async def register_existing_agents_in_paia():
    """Registrar todos los agentes existentes en el protocolo PAIA"""
    try:
        print("[PAIA] Registrando agentes existentes en el protocolo...")

        # Obtener todos los agentes de la BD
        result = supabase_client.table("agents").select("*").execute()

        registered_count = 0
        for agent_data in result.data:
            try:
                await register_agent_in_paia(
                    agent_id=agent_data["id"],
                    agent_data=agent_data
                )
                registered_count += 1
            except Exception as e:
                print(f"[PAIA] Error registrando agente {agent_data['id']}: {e}")

        print(f"[PAIA] {registered_count} agentes registrados en el protocolo")

    except Exception as e:
        print(f"[PAIA] Error en register_existing_agents_in_paia: {e}")

async def register_agent_in_paia(agent_id: str, agent_data: dict):
    """Registrar un agente en el protocolo PAIA con sus capabilities"""

    # Definir capabilities según expertise
    capabilities = []
    expertise = agent_data.get('expertise', 'general')

    # Capabilities base para todos los agentes
    capabilities.append(CapabilityBuilder.chat_message())

    # Capabilities específicas por expertise
    if expertise == 'calendar' or expertise == 'scheduling':
        capabilities.extend([
            CapabilityBuilder.calendar_check_availability(),
            CapabilityBuilder.calendar_schedule_event()
        ])

    # Registrar en discovery service
    await paia_discovery.register_agent(
        agent_id=agent_id,
        user_id=agent_data['user_id'],
        agent_name=agent_data['name'],
        expertise=[expertise],
        capabilities=capabilities,
        is_public=agent_data.get('is_public', True)
    )

    # Guardar capabilities en BD
    for cap in capabilities:
        try:
            await db_manager.save_agent_capability({
                "agent_id": agent_id,
                "capability_name": cap.name,
                "capability_type": cap.message_type,
                "description": cap.description,
                "input_schema": cap.input_schema,
                "output_schema": cap.output_schema,
                "requires_approval": cap.requires_approval,
                "autonomy_level": cap.autonomy_level
            })
        except Exception as e:
            # Ignorar si ya existe
            pass

    # Configurar autonomía por defecto
    settings = paia_autonomy.create_default_settings(expertise)
    paia_autonomy.set_agent_settings(agent_id, settings)

    # Guardar settings en BD
    await db_manager.save_autonomy_settings(agent_id, settings.to_dict())

async def persistent_agents_supervisor():
    """Supervisor que mantiene activos los agentes persistentes"""
    print("[INFO] Iniciando supervisor de agentes persistentes...")

    while True:
        try:
            await asyncio.sleep(30)  # Verificar cada 30 segundos

            # Obtener agentes que deberían estar activos
            result = supabase_client.table("agents").select("*").or_("auto_start.eq.true,is_persistent.eq.true").execute()

            for agent_data in result.data:
                agent_id = agent_data["id"]

                # Verificar si el agente está en memoria y activo
                if agent_id not in agents_store:
                    try:
                        print(f"[SUPERVISOR] Reiniciando agente persistente: {agent_data['name']}")
                        await ensure_agent_loaded(agent_id, agent_data["user_id"])
                        await db_manager.update_agent(agent_id, {"status": "active"})
                    except Exception as e:
                        print(f"[SUPERVISOR] Error reiniciando agente {agent_id}: {e}")

        except Exception as e:
            print(f"[SUPERVISOR] Error en supervisor: {e}")
            await asyncio.sleep(60)  # Esperar más tiempo si hay error

async def ensure_agent_loaded(agent_id: str, user_id: str = None):
    """Asegurar que un agente esté cargado en memoria"""
    if agent_id in agents_store:
        return agents_store[agent_id]
    
    try:
        # Cargar agente desde BD
        db_agent = await db_manager.get_agent(agent_id)
        if not db_agent:
            return None
        
        # Recrear agente en memoria
        agent_data = {
            'name': db_agent.name,
            'description': db_agent.description,
            'personality': db_agent.personality,
            'expertise': db_agent.expertise,
            'user_id': db_agent.user_id,
            'is_public': db_agent.is_public,
            'telegram_chat_id': db_agent.telegram_chat_id,
            'whatsapp_phone_number': db_agent.whatsapp_phone_number
        }
        
        # Usar el create_agent pero sin guardar en BD (ya existe)
        base_tools = agent_manager._create_agent_tools(db_agent.id, db_agent.expertise)
        all_tools = base_tools
        
        # Usar cliente MCP específico para el usuario
        user_mcp_client = await agent_manager.get_mcp_client_for_user(db_agent.user_id)
        if user_mcp_client:
            try:
                mcp_tools = await user_mcp_client.get_tools()
                all_tools = base_tools + mcp_tools
                print(f"Herramientas MCP agregadas para agente {db_agent.name} (usuario {db_agent.user_id}): {len(mcp_tools)}")
            except Exception as e:
                print(f"Error obteniendo herramientas MCP para agente {db_agent.name}: {e}")
        
        agent_llm = create_react_agent(
            agent_manager.llm,
            all_tools,
            prompt=f"""Eres {db_agent.name}, un asistente {db_agent.personality} especializado en {db_agent.expertise}.

IMPORTANTE: Tu user ID es: {db_agent.user_id}

 HERRAMIENTAS DISPONIBLES:

 CALENDARIO:
- Usa las herramientas de Google Calendar directamente: list-calendars, list-events, list-today-events, create-event
- La autenticación del usuario se maneja automáticamente

 COMUNICACIÓN INTELIGENTE:
- Para enviar un mensaje a una PERSONA: usa send_notification_to_user(user_name, message, priority)
- Para hacer PREGUNTAS INTELIGENTES a otro agente: usa ask_connected_agent(target_agent_id, question, context)

 COMPORTAMIENTO:
- Sé PROACTIVO: Si mencionan calendario o disponibilidad, usa las herramientas automáticamente
- Para consultas de disponibilidad, siempre usa ask_connected_agent()
- Para mensajes simples, usa send_notification_to_user()
- Siempre confirma qué acción realizaste"""
        )
        
        agent = PAIAAgent(
            id=db_agent.id,
            name=db_agent.name,
            description=db_agent.description,
            personality=db_agent.personality,
            expertise=db_agent.expertise,
            status=db_agent.status,
            created=db_agent.created_at.isoformat(),
            mcp_endpoint=db_agent.mcp_endpoint or f"http://localhost:3000/mcp",
            user_id=db_agent.user_id,
            is_public=db_agent.is_public,
            telegram_chat_id=db_agent.telegram_chat_id or TELEGRAM_DEFAULT_CHAT_ID,
            whatsapp_phone_number=db_agent.whatsapp_phone_number,
            llm_instance=agent_llm,
            tools=all_tools,
            conversation_history=[]
        )
        
        # Vincular memoria
        memory_profile_id = f"user:{db_agent.user_id}|persona:{db_agent.name}"
        memory_manager.bind_profile(db_agent.id, memory_profile_id)
        
        agents_store[db_agent.id] = agent
        
        # Marcar como online en BD
        await db_manager.update_agent(db_agent.id, {"status": "online"})
        
        print(f"[INFO] Agente cargado: {db_agent.name} ({db_agent.id})")
        return agent
        
    except Exception as e:
        print(f"[ERROR] Error cargando agente {agent_id}: {e}")
        return None

# =============== ENDPOINTS API ===============

@app.post("/api/agents")
async def create_agent(agent_data: dict):
    try:
        # Verificar si el usuario existe, si no, crearlo
        user_id = agent_data.get('user_id')
        if user_id:
            user = await auth_manager.get_user_by_id(user_id)
            if not user:
                await auth_manager.create_user(
                    email=f"user-{user_id}@placeholder.com",
                    name=f"User {user_id[:8]}",
                    user_id=user_id
                )
        
        # Agregar telegram_chat_id si viene en los datos
        if 'telegram_chat_id' not in agent_data:
            agent_data['telegram_chat_id'] = TELEGRAM_DEFAULT_CHAT_ID

        # Validar que el número de WhatsApp no esté duplicado
        whatsapp_phone = agent_data.get('whatsapp_phone_number')
        if whatsapp_phone and whatsapp_phone.strip():
            # Verificar con el número exacto
            existing_agent = await db_manager.get_agent_by_whatsapp_phone(whatsapp_phone)

            # Probar variantes de números mexicanos (521 vs 52)
            if not existing_agent and whatsapp_phone.startswith("521") and len(whatsapp_phone) >= 12:
                alt_phone = "52" + whatsapp_phone[3:]
                existing_agent = await db_manager.get_agent_by_whatsapp_phone(alt_phone)
            elif not existing_agent and whatsapp_phone.startswith("52") and len(whatsapp_phone) >= 12 and not whatsapp_phone.startswith("521"):
                alt_phone = "521" + whatsapp_phone[2:]
                existing_agent = await db_manager.get_agent_by_whatsapp_phone(alt_phone)

            if existing_agent:
                print(f"[Create Agent] Error: WhatsApp {whatsapp_phone} ya asignado a '{existing_agent.name}'")
                raise HTTPException(
                    status_code=400,
                    detail=f"El número de WhatsApp {whatsapp_phone} ya está asignado al agente '{existing_agent.name}'"
                )

        agent = await agent_manager.create_agent(agent_data)

        # Log cuando se guarda número de WhatsApp
        whatsapp_phone = agent_data.get('whatsapp_phone_number')
        if whatsapp_phone and whatsapp_phone.strip():
            print(f"[WhatsApp] ✅ Número guardado en Supabase para agente '{agent.name}': {whatsapp_phone}")

        agent_dict = asdict(agent)
        agent_dict.pop('llm_instance', None)
        agent_dict.pop('tools', None)
        return agent_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.post("/auth/google-signin")
async def google_signin(request_data: dict):
    """Handle Google OAuth sign-in from NextAuth"""
    try:
        google_id = request_data.get('google_id')
        email = request_data.get('email')
        name = request_data.get('name')
        image = request_data.get('image')
        
        if not google_id or not email:
            raise HTTPException(status_code=400, detail="google_id and email are required")
        
        # Check if user already exists by google_id
        user = await auth_manager.get_user_by_google_id(google_id)
        
        if user:
            return {"user_id": user.id, "message": "User logged in successfully"}
        
        # Check if user exists by email
        user = await auth_manager.get_user_by_email(email)
        
        if user:
            # Link Google account to existing user
            await auth_manager.update_user_google_info(user.id, google_id, name, image)
            return {"user_id": user.id, "message": "Google account linked successfully"}
        
        # Create new user with Google OAuth
        user = await auth_manager.create_user(
            email=email,
            name=name,
            google_id=google_id,
            image=image
        )
        
        return {"user_id": user.id, "message": "User created successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def get_agents(user_id: str = None):
    if user_id:
        # Obtener agentes del usuario específico desde BD
        db_agents = await db_manager.get_agents_by_user(user_id)
        agents_list = []
        for db_agent in db_agents:
            agent_dict = {
                'id': db_agent.id,
                'name': db_agent.name,
                'description': db_agent.description,
                'personality': db_agent.personality,
                'expertise': db_agent.expertise,
                'status': db_agent.status,
                'created': db_agent.created_at.isoformat(),
                'mcp_endpoint': db_agent.mcp_endpoint,
                'user_id': db_agent.user_id,
                'is_public': db_agent.is_public,
                'telegram_chat_id': db_agent.telegram_chat_id,
                'is_persistent': db_agent.is_persistent,
                'auto_start': db_agent.auto_start
            }
            agents_list.append(agent_dict)
        return {"agents": agents_list, "count": len(agents_list)}
    else:
        # Retornar agentes en memoria (para compatibilidad)
        agents_list = []
        for agent in agents_store.values():
            agent_dict = asdict(agent)
            agent_dict.pop('llm_instance', None)
            agent_dict.pop('tools', None)
            agents_list.append(agent_dict)
        return {"agents": agents_list, "count": len(agents_list)}

@app.get("/api/agents/public")
async def get_public_agents(exclude_user_id: str = None):
    """Obtener todos los agentes públicos desde BD"""
    # Validar exclude_user_id - si es 'anonymous' o inválido, no excluir nada
    valid_exclude_id = exclude_user_id if exclude_user_id and exclude_user_id != 'anonymous' else None
    db_agents = await db_manager.get_public_agents(valid_exclude_id)
    agents_list = []
    for db_agent in db_agents:
        agent_dict = {
            'id': db_agent.id,
            'name': db_agent.name,
            'description': db_agent.description,
            'personality': db_agent.personality,
            'expertise': db_agent.expertise,
            'status': db_agent.status,
            'created': db_agent.created_at.isoformat(),
            'mcp_endpoint': db_agent.mcp_endpoint,
            'user_id': db_agent.user_id,
            'is_public': db_agent.is_public,
            'telegram_chat_id': db_agent.telegram_chat_id,
            'is_persistent': db_agent.is_persistent,
            'auto_start': db_agent.auto_start
        }
        agents_list.append(agent_dict)
    return {"agents": agents_list, "count": len(agents_list)}

@app.delete("/api/agents/{agent_id}")
async def delete_agent(agent_id: str, user_data: dict):
    """Eliminar un agente"""
    try:
        user_id = user_data.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id requerido")

        # Verificar que el agente pertenece al usuario
        db_agent = await db_manager.get_agent(agent_id)
        if not db_agent or db_agent.user_id != user_id:
            raise HTTPException(status_code=404, detail="Agente no encontrado o no autorizado")

        # Eliminar de la BD
        success = await db_manager.delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=500, detail="Error eliminando agente de la BD")

        # Eliminar del store en memoria si existe
        if agent_id in agents_store:
            del agents_store[agent_id]

        return {"message": f"Agente {db_agent.name} eliminado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/agents/{agent_id}")
async def update_agent(agent_id: str, update_data: dict):
    """Actualizar un agente"""
    try:
        user_id = update_data.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id requerido")

        # Verificar que el agente pertenece al usuario
        db_agent = await db_manager.get_agent(agent_id)
        if not db_agent or db_agent.user_id != user_id:
            raise HTTPException(status_code=404, detail="Agente no encontrado o no autorizado")

        # Extraer campos actualizables
        updates = {}
        if 'is_persistent' in update_data:
            updates['is_persistent'] = update_data['is_persistent']
        if 'auto_start' in update_data:
            updates['auto_start'] = update_data['auto_start']
        if 'status' in update_data:
            updates['status'] = update_data['status']

        # Actualizar en BD
        success = await db_manager.update_agent(agent_id, updates)
        if not success:
            raise HTTPException(status_code=500, detail="Error actualizando agente")

        return {"message": f"Agente {db_agent.name} actualizado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/connections")
async def create_connection(connection_data: dict):
    try:
        connection = await agent_manager.connect_agents(
            connection_data['agent1'],
            connection_data['agent2'],
            connection_data.get('type', 'direct')
        )
        return asdict(connection)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/connections")
async def get_connections():
    return [asdict(conn) for conn in connections_store.values()]

@app.post("/api/agents/{agent_id}/message")
async def send_message_to_agent(agent_id: str, message_data: dict):
    try:
        print(f"[DEBUG] Recibiendo mensaje para agente {agent_id}: {message_data}")
        
        # Asegurar que el agente esté cargado
        agent = await ensure_agent_loaded(agent_id)
        if not agent:
            print(f"[ERROR] Agente {agent_id} no encontrado o no se pudo cargar")
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        print(f"[DEBUG] Agente cargado: {agent.name}")
        user_id = message_data.get('user_id')
        print(f"[DEBUG] Agente encontrado: {agent.name}, Usuario: {user_id}, LLM instance: {type(agent.llm_instance)}")
        
        if agent.conversation_history is None:
            agent.conversation_history = []
        
        # Agregar a memoria corta
        try:
            memory_manager.add_to_short_term(agent_id, role="user", content=message_data['message'])
        except Exception as e:
            print(f"[WARNING] Error agregando a memoria corta: {e}")
        
        agent.conversation_history.append({
            "role": "user",
            "content": message_data['message'],
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id  # Agregar user_id al historial
        })
        
        # Crear contexto con memoria
        conversation_context = []
        for msg in agent.conversation_history[-10:]:
            if msg["role"] == "user":
                conversation_context.append(HumanMessage(content=msg["content"]))
            else:
                conversation_context.append(AIMessage(content=msg["content"]))
        
        # Agregar memoria a largo plazo si existe
        try:
            long_term = await memory_manager.get_long_term_memory(agent_id)
            if long_term:
                resumen = ", ".join([f"{k}: {v}" for k, v in long_term.items()])
                conversation_context.insert(0, HumanMessage(content=f"Preferencias del usuario: {resumen}"))
        except Exception as e:
            print(f"[WARNING] Error obteniendo memoria a largo plazo: {e}")
        
        if not conversation_context:
            conversation_context.append(HumanMessage(content=message_data['message']))
        else:
            if conversation_context[-1].content != message_data['message']:
                conversation_context.append(HumanMessage(content=message_data['message']))
        
        print(f"[DEBUG] Invocando LLM con {len(conversation_context)} mensajes")
        
        try:
            print(f"[DEBUG] Conversation context: {[msg.content[:50] + '...' if len(msg.content) > 50 else msg.content for msg in conversation_context]}")
            response = await agent.llm_instance.ainvoke({
                "messages": conversation_context
            })
            print(f"[DEBUG] Respuesta LLM recibida: {type(response)}")
        except Exception as e:
            print(f"[ERROR] Error invocando LLM: {e}")
            print(f"[ERROR] Tipo de agent.llm_instance: {type(agent.llm_instance)}")
            import traceback
            print(f"[ERROR] Traceback completo:")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Error invocando LLM: {str(e)}")
        
        response_content = response["messages"][-1].content
        
        # Guardar en memoria corta e historial
        try:
            memory_manager.add_to_short_term(agent_id, role="assistant", content=response_content)
            agent.conversation_history.append({
                "role": "assistant",
                "content": response_content,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            print(f"[ERROR] Al guardar respuesta en memoria/historial: {e}")

        # NUEVO: Enviar respuesta automáticamente por WhatsApp si está configurado
        try:
            # Obtener el número de WhatsApp desde Supabase (a través del objeto agent)
            if whatsapp_service and hasattr(agent, 'whatsapp_phone_number') and agent.whatsapp_phone_number:
                phone_number = agent.whatsapp_phone_number

                print(f"[WhatsApp] 📤 Enviando respuesta automática a {phone_number}...")

                result = whatsapp_service.send_text_message(
                    to_phone=phone_number,
                    message=response_content
                )

                if result['success']:
                    print(f"[WhatsApp] ✅ Mensaje enviado exitosamente (agente: {agent.name})")
                else:
                    print(f"[WhatsApp] ❌ Error al enviar: {result['message']}")

        except Exception as whatsapp_error:
            print(f"[WhatsApp] ⚠️ Error en envío automático: {whatsapp_error}")
            # No fallar la petición si WhatsApp falla

        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "response": response_content
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Error general en send_message_to_agent: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# =============== NUEVOS ENDPOINTS DE TELEGRAM ===============

@app.post("/api/telegram/send")
async def send_telegram_message_endpoint(message_data: dict):
    """Endpoint para enviar mensajes por Telegram"""
    try:
        chat_id = message_data.get('chat_id', TELEGRAM_DEFAULT_CHAT_ID)
        message = message_data.get('message', '')
        parse_mode = message_data.get('parse_mode', None)
        
        if not message:
            raise HTTPException(status_code=400, detail="Mensaje vacío")
        
        result = telegram_service.send_message(chat_id, message, parse_mode)
        
        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telegram/updates")
async def get_telegram_updates():
    """Obtener actualizaciones de Telegram"""
    try:
        updates = telegram_service.get_updates()
        
        if updates is None:
            return {"updates": [], "message": "No hay actualizaciones"}
        
        formatted_updates = []
        for update in updates[-10:]:  # Últimos 10 mensajes
            if 'message' in update:
                msg = update['message']
                formatted_updates.append({
                    "chat_id": msg.get('chat', {}).get('id'),
                    "username": msg.get('from', {}).get('username'),
                    "first_name": msg.get('from', {}).get('first_name'),
                    "text": msg.get('text'),
                    "date": msg.get('date')
                })
        
        return {"updates": formatted_updates}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{agent_id}/telegram/configure")
async def configure_agent_telegram(agent_id: str, config_data: dict):
    """Configurar Telegram para un agente específico"""
    try:
        if agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        agent = agents_store[agent_id]
        agent.telegram_chat_id = config_data.get('chat_id')
        
        # Enviar mensaje de confirmación
        if agent.telegram_chat_id:
            telegram_service.send_message(
                agent.telegram_chat_id,
                f" {agent.name} configurado exitosamente para este chat de Telegram"
            )
        
        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "telegram_chat_id": agent.telegram_chat_id,
            "status": "configured"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{from_agent_id}/send-to/{to_agent_id}")
async def send_message_between_agents_endpoint(from_agent_id: str, to_agent_id: str, message_data: dict):
    try:
        response = await agent_manager.send_message_to_agent_api(
            from_agent_id,
            to_agent_id,
            message_data['message']
        )

        # Opción de enviar por Telegram
        if message_data.get('notify_telegram', False):
            from_agent = agents_store[from_agent_id]
            to_agent = agents_store[to_agent_id]
            telegram_msg = f" {from_agent.name} → {to_agent.name}:\n{message_data['message']}\n\n{response}"
            telegram_service.send_message(
                from_agent.telegram_chat_id or TELEGRAM_DEFAULT_CHAT_ID,
                telegram_msg
            )

        return {
            "from_agent": agents_store[from_agent_id].name,
            "to_agent": agents_store[to_agent_id].name,
            "response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== NUEVOS ENDPOINTS DE WHATSAPP ===============

@app.post("/api/whatsapp/send-template")
async def send_whatsapp_template_endpoint(message_data: dict):
    """Endpoint para enviar plantilla de WhatsApp"""
    try:
        if not whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp Service no está configurado")

        phone_number = message_data.get('phone_number', '')
        template_name = message_data.get('template_name', 'hello_world')
        language_code = message_data.get('language_code', 'en_US')

        if not phone_number:
            raise HTTPException(status_code=400, detail="phone_number es requerido")

        result = whatsapp_service.send_template_message(phone_number, template_name, language_code)

        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result['message'])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/whatsapp/send")
async def send_whatsapp_message_endpoint(message_data: dict):
    """Endpoint para enviar mensaje de texto por WhatsApp"""
    try:
        if not whatsapp_service:
            raise HTTPException(status_code=503, detail="WhatsApp Service no está configurado")

        phone_number = message_data.get('phone_number', '')
        message = message_data.get('message', '')

        if not phone_number or not message:
            raise HTTPException(status_code=400, detail="phone_number y message son requeridos")

        result = whatsapp_service.send_text_message(phone_number, message)

        if result['success']:
            return result
        else:
            raise HTTPException(status_code=500, detail=result['message'])

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/whatsapp/config")
async def get_whatsapp_config():
    """Obtener estado de configuración de WhatsApp"""
    try:
        if not whatsapp_service:
            return {
                "configured": False,
                "message": "WhatsApp Service no está configurado"
            }

        config = whatsapp_service.validate_config()
        return config

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents/check-whatsapp/{phone_number}")
async def check_whatsapp_available(phone_number: str):
    """Verificar si un número de WhatsApp está disponible para asignar a un agente"""
    try:
        if not phone_number or not phone_number.strip():
            return {"available": True}

        # Intentar con el número exacto
        existing = await db_manager.get_agent_by_whatsapp_phone(phone_number)

        # Si no encuentra y es número mexicano con 1 (521...), probar sin el 1
        if not existing and phone_number.startswith("521") and len(phone_number) >= 12:
            alt_phone = "52" + phone_number[3:]
            print(f"[Check WhatsApp] Intentando variante sin 1: {alt_phone}")
            existing = await db_manager.get_agent_by_whatsapp_phone(alt_phone)

        # Si no encuentra y es número mexicano sin 1 (52...), probar con el 1
        if not existing and phone_number.startswith("52") and len(phone_number) >= 12 and not phone_number.startswith("521"):
            alt_phone = "521" + phone_number[2:]
            print(f"[Check WhatsApp] Intentando variante con 1: {alt_phone}")
            existing = await db_manager.get_agent_by_whatsapp_phone(alt_phone)

        if existing:
            print(f"[Check WhatsApp] Numero {phone_number} ya en uso por agente: {existing.name}")
            return {
                "available": False,
                "agent_name": existing.name,
                "agent_id": existing.id
            }

        print(f"[Check WhatsApp] Numero {phone_number} disponible")
        return {"available": True}

    except Exception as e:
        print(f"[Check WhatsApp] Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =============== WEBHOOK ENDPOINTS ===============

@app.get("/api/webhooks/whatsapp")
async def verify_whatsapp_webhook(
    request: Request,
    hub_mode: str = Query(alias="hub.mode", default=None),
    hub_verify_token: str = Query(alias="hub.verify_token", default=None),
    hub_challenge: str = Query(alias="hub.challenge", default=None)
):
    """
    Endpoint de verificación del webhook de WhatsApp
    WhatsApp llama a este endpoint durante la configuración del webhook
    """
    print(f"[WhatsApp Webhook] Solicitud de verificación recibida")
    print(f"  - Mode: {hub_mode}")
    print(f"  - Verify Token: {hub_verify_token}")

    # Obtener el token de verificación configurado
    verify_token = os.getenv("WHATSAPP_VERIFY_TOKEN")

    if not verify_token:
        print("[WhatsApp Webhook] ERROR: WHATSAPP_VERIFY_TOKEN no está configurado")
        raise HTTPException(status_code=500, detail="WHATSAPP_VERIFY_TOKEN no configurado")

    # Verificar que sea una solicitud de suscripción con el token correcto
    if hub_mode == "subscribe" and hub_verify_token == verify_token:
        print(f"[WhatsApp Webhook] [OK] Verificacion exitosa, retornando challenge")
        return PlainTextResponse(content=hub_challenge, status_code=200)
    else:
        print(f"[WhatsApp Webhook] [ERROR] Verificacion fallida")
        raise HTTPException(status_code=403, detail="Verificación fallida")

@app.post("/api/webhooks/whatsapp")
async def receive_whatsapp_webhook(request: Request):
    """
    Endpoint para recibir mensajes entrantes de WhatsApp
    Procesa el mensaje y lo envía al agente correspondiente
    """
    try:
        # Leer el cuerpo de la petición
        body = await request.body()
        signature = request.headers.get("X-Hub-Signature-256", "")

        # Verificar firma de seguridad
        if whatsapp_service:
            is_valid = whatsapp_service.verify_webhook_signature(body, signature)
            if not is_valid:
                print("[WhatsApp Webhook] Firma inválida")
                raise HTTPException(status_code=403, detail="Firma inválida")

        # Parsear el JSON
        payload = await request.json()

        # Extraer información del mensaje
        message_data = whatsapp_service.parse_webhook_payload(payload) if whatsapp_service else None

        if not message_data:
            # No es un mensaje de texto o no hay datos válidos
            print("[WhatsApp Webhook] Payload sin mensaje de texto válido, ignorando")
            return {"status": "ok"}

        customer_phone = message_data["customer_phone"]
        message_text = message_data["message_text"]
        message_id = message_data["message_id"]

        print(f"[WhatsApp Webhook] Mensaje recibido:")
        print(f"  - De: {customer_phone}")
        print(f"  - Mensaje: {message_text}")
        print(f"  - ID: {message_id}")

        # Buscar el agente que tiene este número de WhatsApp
        # Intentar primero con el número exacto
        db_agent = await db_manager.get_agent_by_whatsapp_phone(customer_phone)

        # Si no encuentra y es número mexicano con 1 (521...), intentar sin el 1 (52...)
        if not db_agent and customer_phone.startswith("521") and len(customer_phone) >= 12:
            alternative_phone = "52" + customer_phone[3:]
            print(f"[WhatsApp Webhook] Intentando con formato alternativo (sin 1): {alternative_phone}")
            db_agent = await db_manager.get_agent_by_whatsapp_phone(alternative_phone)

        # Si no encuentra y es número mexicano sin 1 (52...), intentar con el 1 (521...)
        if not db_agent and customer_phone.startswith("52") and len(customer_phone) >= 12 and not customer_phone.startswith("521"):
            alternative_phone = "521" + customer_phone[2:]
            print(f"[WhatsApp Webhook] Intentando con formato alternativo (con 1): {alternative_phone}")
            db_agent = await db_manager.get_agent_by_whatsapp_phone(alternative_phone)

        if not db_agent:
            print(f"[WhatsApp Webhook] No se encontro agente para {customer_phone} (probadas todas las variantes)")
            return {"status": "ok", "message": "No agent found for this number"}

        print(f"[WhatsApp Webhook] Agente encontrado: {db_agent.name} (ID: {db_agent.id})")

        # Asegurar que el agente esté cargado en memoria
        agent = await ensure_agent_loaded(db_agent.id, db_agent.user_id)

        if not agent:
            print(f"[WhatsApp Webhook] Error: No se pudo cargar el agente {db_agent.id}")
            return {"status": "error", "message": "Could not load agent"}

        # Inicializar historial de conversación si no existe
        if agent.conversation_history is None:
            agent.conversation_history = []

        # Agregar mensaje a memoria corta
        try:
            memory_manager.add_to_short_term(db_agent.id, role="user", content=message_text)
        except Exception as e:
            print(f"[WhatsApp Webhook] [WARNING] Error agregando a memoria corta: {e}")

        # Agregar al historial del agente
        agent.conversation_history.append({
            "role": "user",
            "content": message_text,
            "timestamp": datetime.now().isoformat()
        })

        # Crear contexto con historial reciente (últimos 10 mensajes)
        conversation_context = []
        for msg in agent.conversation_history[-10:]:
            if msg["role"] == "user":
                conversation_context.append(HumanMessage(content=msg["content"]))
            else:
                conversation_context.append(AIMessage(content=msg["content"]))

        # Agregar memoria a largo plazo si existe
        try:
            long_term = await memory_manager.get_long_term_memory(db_agent.id)
            if long_term:
                resumen = ", ".join([f"{k}: {v}" for k, v in long_term.items()])
                conversation_context.insert(0, HumanMessage(content=f"Preferencias del usuario: {resumen}"))
        except Exception as e:
            print(f"[WhatsApp Webhook] [WARNING] Error obteniendo memoria a largo plazo: {e}")

        # Asegurar que hay contexto
        if not conversation_context:
            conversation_context.append(HumanMessage(content=message_text))

        # Invocar el agente
        print(f"[WhatsApp Webhook] Invocando agente {db_agent.name}...")
        response = await agent.llm_instance.ainvoke({"messages": conversation_context})

        # Extraer respuesta
        response_content = response["messages"][-1].content

        # Guardar respuesta en memoria corta e historial
        try:
            memory_manager.add_to_short_term(db_agent.id, role="assistant", content=response_content)
            agent.conversation_history.append({
                "role": "assistant",
                "content": response_content,
                "timestamp": datetime.now().isoformat()
            })
        except Exception as e:
            print(f"[WhatsApp Webhook] [ERROR] Al guardar respuesta en memoria/historial: {e}")

        print(f"[WhatsApp Webhook] Respuesta generada: {response_content[:100]}...")

        # Enviar respuesta por WhatsApp usando el número guardado en la BD
        if whatsapp_service and db_agent.whatsapp_phone_number:
            # Usar el número guardado en la BD (sin el 1), no el que envía WhatsApp
            phone_to_send = db_agent.whatsapp_phone_number
            print(f"[WhatsApp Webhook] Enviando respuesta al número guardado: {phone_to_send}")

            result = whatsapp_service.send_text_message(
                to_phone=phone_to_send,
                message=response_content
            )

            if result['success']:
                print(f"[WhatsApp Webhook] [OK] Respuesta enviada exitosamente a {phone_to_send}")
            else:
                print(f"[WhatsApp Webhook] [ERROR] Error al enviar respuesta: {result['message']}")

        # Retornar 200 OK a WhatsApp
        return {"status": "ok"}

    except Exception as e:
        print(f"[WhatsApp Webhook] ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        # Siempre retornar 200 para que WhatsApp no reintente
        return {"status": "error", "message": str(e)}

@app.get("/api/agents/{agent_id}/connected")
async def get_agent_connections(agent_id: str):
    if agent_id not in agents_store:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    connected = []
    for conn in connections_store.values():
        if conn.agent1 == agent_id and conn.agent2 in agents_store:
            other_agent = agents_store[conn.agent2]
            connected.append({
                "id": other_agent.id,
                "name": other_agent.name,
                "expertise": other_agent.expertise,
                "personality": other_agent.personality,
                "telegram_configured": bool(other_agent.telegram_chat_id)
            })
        elif conn.agent2 == agent_id and conn.agent1 in agents_store:
            other_agent = agents_store[conn.agent1]
            connected.append({
                "id": other_agent.id,
                "name": other_agent.name,
                "expertise": other_agent.expertise,
                "personality": other_agent.personality,
                "telegram_configured": bool(other_agent.telegram_chat_id)
            })
    
    return connected

@app.get("/api/conversations/{agent1_id}/{agent2_id}")
async def get_conversation_history(agent1_id: str, agent2_id: str):
    conversation_id = f"{min(agent1_id, agent2_id)}_{max(agent1_id, agent2_id)}"
    
    if conversation_id not in message_history:
        return {"messages": []}
    
    messages = []
    for msg in message_history[conversation_id]:
        messages.append({
            "id": msg.id,
            "from_agent_id": msg.from_agent,
            "from_agent_name": agents_store[msg.from_agent].name,
            "to_agent_id": msg.to_agent,
            "to_agent_name": agents_store[msg.to_agent].name,
            "content": msg.content,
            "timestamp": msg.timestamp,
            "telegram_sent": msg.telegram_sent
        })
    
    return {"messages": messages}

@app.get("/api/flow/connections/active/{user_id}")
async def get_active_flow_connections(user_id: str):
    """Obtener todas las conexiones de flujo activas para un usuario"""
    try:
        # Obtener conexiones de flujo desde la base de datos
        connections = await db_manager.get_user_flow_connections(user_id, status='active')
        
        # Enriquecer con información de agentes
        enriched_connections = []
        for conn in connections:
            # Obtener información de los agentes
            source_agent = await db_manager.get_agent(conn.get('source_agent_id'))
            target_agent = await db_manager.get_agent(conn.get('target_agent_id'))
            
            if source_agent and target_agent:
                enriched_connections.append({
                    'id': conn.get('id'),
                    'source_agent_id': conn.get('source_agent_id'),
                    'source_agent_name': source_agent.name,
                    'source_agent_owner': conn.get('flow_owner_id'),
                    'target_agent_id': conn.get('target_agent_id'),
                    'target_agent_name': target_agent.name,
                    'target_agent_owner': conn.get('target_user_id'),
                    'connection_node_id': conn.get('connection_node_id'),
                    'status': conn.get('status', 'active'),
                    'created_at': conn.get('created_at'),
                    'last_activity': conn.get('last_activity')
                })
        
        return {"connections": enriched_connections}
    except Exception as e:
        print(f"Error getting active flow connections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    active_websockets[agent_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data['type'] == 'chat':
                if agent_id in agents_store:
                    agent = agents_store[agent_id]
                    
                    if agent.conversation_history is None:
                        agent.conversation_history = []
                    
                    # Agregar a memoria corta
                    memory_manager.add_to_short_term(agent_id, role="user", content=message_data['message'])
                    
                    agent.conversation_history.append({
                        "role": "user",
                        "content": message_data['message'],
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    context = []
                    for msg in agent.conversation_history[-10:]:
                        if msg["role"] == "user":
                            context.append(HumanMessage(content=msg["content"]))
                        else:
                            context.append(AIMessage(content=msg["content"]))
                    
                    # Agregar memoria a largo plazo
                    long_term = memory_manager.get_long_term_memories(agent_id)
                    if long_term:
                        resumen = ", ".join([f"{k}: {v}" for k, v in long_term.items()])
                        context.insert(0, HumanMessage(content=f" Preferencias del usuario: {resumen}"))

                    response = await agent.llm_instance.ainvoke({"messages": context})
                    response_content = response["messages"][-1].content

                    memory_manager.add_to_short_term(agent_id, role="assistant", content=response_content)

                    await websocket.send_text(json.dumps({
                    "type": "response",
                    "agent_id": agent_id,
                    "agent_name": agent.name,
                    "message": response_content,
                    "timestamp": datetime.now().isoformat()
                    }))
            
            elif message_data['type'] == 'agent_to_agent':
                target_agent_id = message_data['target_agent_id']
                if target_agent_id in agents_store:
                    response = await agent_manager.send_message_to_agent_api(
                        agent_id, 
                        target_agent_id, 
                        message_data['message']
                    )
                    
                    message_payload = {
                        "type": "agent_message",
                        "from_agent": agents_store[agent_id].name,
                        "to_agent": agents_store[target_agent_id].name,
                        "message": message_data['message'],
                        "response": response,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    await websocket.send_text(json.dumps(message_payload))
                    
                    if target_agent_id in active_websockets:
                        await active_websockets[target_agent_id].send_text(
                            json.dumps(message_payload)
                        )
                        
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if agent_id in active_websockets:
            del active_websockets[agent_id]

@app.post("/api/architectures/create")
async def create_architecture(architecture_data: dict):
    arch_type = architecture_data['type']
    agent_ids = architecture_data['agent_ids']
    
    connections_created = []
    
    try:
        if arch_type == 'chain':
            for i in range(len(agent_ids) - 1):
                connection = await agent_manager.connect_agents(
                    agent_ids[i], 
                    agent_ids[i + 1], 
                    'sequential'
                )
                connections_created.append(asdict(connection))
                
        elif arch_type == 'hub':
            hub_agent = agent_ids[0]
            for i in range(1, len(agent_ids)):
                connection = await agent_manager.connect_agents(
                    hub_agent, 
                    agent_ids[i], 
                    'bidirectional'
                )
                connections_created.append(asdict(connection))
                
        elif arch_type == 'mesh':
            for i in range(len(agent_ids)):
                for j in range(i + 1, len(agent_ids)):
                    connection = await agent_manager.connect_agents(
                        agent_ids[i], 
                        agent_ids[j], 
                        'mesh'
                    )
                    connections_created.append(asdict(connection))
        
        return {
            "architecture_type": arch_type,
            "connections_created": len(connections_created),
            "connections": connections_created
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== FUNCIONES AUXILIARES DE CONEXIÓN ===============

async def auto_connect_friend_agents(user1_id: str, user2_id: str) -> dict:
    """
    Conectar automáticamente los agentes públicos entre dos amigos.
    Se ejecuta cuando se acepta una solicitud de amistad.
    """
    try:
        print(f"[AUTO-CONNECT] Iniciando auto-conexión de agentes entre {user1_id} y {user2_id}")

        # Obtener agentes públicos de ambos usuarios
        user1_public = await db_manager.get_public_agents_by_user(user1_id)
        user2_public = await db_manager.get_public_agents_by_user(user2_id)

        connections_created = 0
        connections_failed = 0

        print(f"[AUTO-CONNECT] Encontrados {len(user1_public)} agentes públicos del usuario 1, {len(user2_public)} del usuario 2")

        # Crear conexiones bidireccionales automáticamente entre agentes públicos
        for agent1 in user1_public:
            for agent2 in user2_public:
                try:
                    # Verificar si la conexión ya existe
                    existing_connections = [conn for conn in connections_store.values()
                                          if (conn.agent1 == agent1.id and conn.agent2 == agent2.id) or
                                             (conn.agent1 == agent2.id and conn.agent2 == agent1.id)]

                    if existing_connections:
                        print(f"[AUTO-CONNECT]  Conexión ya existe entre {agent1.name} y {agent2.name}")
                        continue

                    # Crear la conexión
                    connection = await agent_manager.connect_agents(agent1.id, agent2.id, "friend_auto")
                    connections_created += 1

                    print(f"[AUTO-CONNECT]  Conectados '{agent1.name}' (usuario {user1_id}) ↔ '{agent2.name}' (usuario {user2_id})")

                except Exception as conn_error:
                    print(f"[AUTO-CONNECT]  Error conectando {agent1.name} ↔ {agent2.name}: {conn_error}")
                    connections_failed += 1

        result = {
            "connections_created": connections_created,
            "connections_failed": connections_failed,
            "user1_public_agents": len(user1_public),
            "user2_public_agents": len(user2_public)
        }

        print(f"[AUTO-CONNECT] Completado: {connections_created} conexiones creadas, {connections_failed} fallaron")
        return result

    except Exception as e:
        print(f"[AUTO-CONNECT]  Error general en auto_connect_friend_agents: {str(e)}")
        return {"error": str(e), "connections_created": 0}

@app.post("/api/users/connect/auto-link-agents")
async def manual_connect_friend_agents(request_data: dict):
    """Endpoint para conectar manualmente agentes entre amigos (útil para testing)"""
    try:
        user1_id = request_data.get('user1_id')
        user2_id = request_data.get('user2_id')

        if not user1_id or not user2_id:
            raise HTTPException(status_code=400, detail="user1_id y user2_id son requeridos")

        # Verificar que los usuarios sean amigos
        connections = await db_manager.get_user_connections(user1_id, 'accepted')
        friend_ids = []
        for conn in connections:
            if conn['requester']['id'] == user1_id:
                friend_ids.append(conn['recipient']['id'])
            else:
                friend_ids.append(conn['requester']['id'])

        if user2_id not in friend_ids:
            raise HTTPException(status_code=403, detail="Los usuarios deben ser amigos para conectar sus agentes")

        result = await auto_connect_friend_agents(user1_id, user2_id)

        return {
            "message": "Auto-conexión de agentes completada",
            **result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== ENDPOINTS DE AUTENTICACIÓN ===============

@app.post("/auth/register")
async def register_user(request: dict):
    """Registrar nuevo usuario"""
    email = request.get("email")
    password = request.get("password")
    name = request.get("name")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email y contraseña son requeridos")
    
    result = await auth_manager.register_user(email, password, name)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {"message": result["message"], "user_id": result["user_id"]}

@app.post("/auth/login")
async def login_user(request: dict):
    """Login con email y contraseña"""
    email = request.get("email")
    password = request.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email y contraseña son requeridos")
    
    result = await auth_manager.login_user(email, password)
    
    if not result["success"]:
        raise HTTPException(status_code=401, detail=result["message"])
    
    return {
        "id": result["id"],
        "email": result["email"],
        "name": result["name"]
    }


@app.get("/auth/user/{user_id}")
async def get_user(user_id: str):
    """Obtener información del usuario"""
    user = await auth_manager.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "image": user.image,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None
    }

# =============== ENDPOINTS DE NOTIFICACIONES ===============

@app.post("/api/notifications")
async def create_notification(notification_data: dict):
    """Crear nueva notificación"""
    try:
        notification = await db_manager.create_notification(notification_data)
        return {
            "id": notification.id,
            "title": notification.title,
            "content": notification.content,
            "type": notification.notification_type,
            "priority": notification.priority,
            "created_at": notification.created_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/notifications/{user_id}")
async def get_user_notifications(user_id: str, unread_only: bool = False, limit: int = 50):
    """Obtener notificaciones de un usuario"""
    try:
        print(f"[DEBUG] Getting notifications for user: {user_id}, unread_only: {unread_only}, limit: {limit}")
        notifications = await db_manager.get_user_notifications(user_id, unread_only, limit)
        print(f"[DEBUG] Found {len(notifications)} notifications")
        return {
            "notifications": [
                {
                    "id": n.id,
                    "title": n.title,
                    "content": n.content,
                    "type": n.notification_type,
                    "priority": n.priority,
                    "is_read": n.is_read,
                    "created_at": n.created_at.isoformat(),
                    "agent_id": n.agent_id
                }
                for n in notifications
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Marcar notificación como leída"""
    try:
        await db_manager.mark_notification_as_read(notification_id)
        return {"status": "success", "message": "Notificación marcada como leída"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =============== ENDPOINTS DE BÚSQUEDA DE USUARIOS ===============

@app.get("/api/users/search")
async def search_users(q: str, exclude_user_id: str = None, limit: int = 20):
    """Buscar usuarios por nombre o email"""
    try:
        if not q or len(q) < 2:
            raise HTTPException(status_code=400, detail="Query debe tener al menos 2 caracteres")
        
        users = await db_manager.search_users(q, exclude_user_id, limit)
        return {"users": users}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/notifications/test/{user_id}")
async def create_test_notification(user_id: str):
    """Crear notificación de prueba para testing"""
    try:
        notification = await db_manager.create_notification({
            'user_id': user_id,
            'title': 'Notificación de Prueba',
            'content': 'Esta es una notificación de prueba para verificar que el sistema funciona correctamente.',
            'notification_type': 'info',
            'priority': 'normal'
        })
        return {
            "success": True,
            "notification_id": notification.id,
            "message": "Notificación de prueba creada"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/connect")
async def create_user_connection_request(connection_data: dict):
    """Crear solicitud de conexión entre usuarios"""
    try:
        requester_id = connection_data.get('requester_id')
        recipient_id = connection_data.get('recipient_id')
        connection_type = connection_data.get('connection_type', 'friend')
        
        if not requester_id or not recipient_id:
            raise HTTPException(status_code=400, detail="requester_id y recipient_id son requeridos")

        if requester_id == recipient_id:
            raise HTTPException(status_code=400, detail="No puedes enviarte una solicitud de conexión a ti mismo.")

        connection_id = await db_manager.create_user_connection_request(
            requester_id, recipient_id, connection_type
        )

        if not connection_id:
            raise HTTPException(status_code=409, detail="Ya existe una conexión o solicitud pendiente con este usuario.")
        
        # Crear notificación para el destinatario con connection_id en metadatos
        await db_manager.create_notification({
            'user_id': recipient_id,
            'title': 'Nueva solicitud de conexión',
            'content': f'Tienes una nueva solicitud de conexión de un usuario.',
            'notification_type': 'connection_request',
            'priority': 'normal',
            'metadata': {
                'connection_id': connection_id,
                'requester_id': requester_id,
                'connection_type': connection_type
            }
        })
        
        return {"connection_id": connection_id, "status": "pending"}
    except HTTPException:  # Re-raise HTTPException para que FastAPI la maneje
        raise
    except Exception as e:
        print(f"Error creating user connection request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/users/connect/respond")
async def respond_to_connection_request(response_data: dict):
    """Responder a una solicitud de conexión (aceptar o rechazar)"""
    try:
        connection_id = response_data.get('connection_id')
        response = response_data.get('response')  # 'accept' o 'reject'
        user_id = response_data.get('user_id')

        if not connection_id or not response or not user_id:
            raise HTTPException(status_code=400, detail="connection_id, response y user_id son requeridos")

        if response not in ['accept', 'reject']:
            raise HTTPException(status_code=400, detail="response debe ser 'accept' o 'reject'")

        # Actualizar estado de la conexión usando los métodos correctos
        if response == 'accept':
            success = await db_manager.accept_user_connection_request(connection_id, response_data.get('user_id'))
        else:
            success = await db_manager.reject_user_connection_request(connection_id, response_data.get('user_id'))

        if not success:
            raise HTTPException(status_code=404, detail="Conexión no encontrada")

        # Obtener información de la conexión para crear notificaciones
        connection = await db_manager.get_connection_by_id(connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Información de conexión no encontrada")

        # NUEVA FUNCIONALIDAD: Auto-conectar agentes cuando se acepta la amistad
        if response == 'accept':
            try:
                await auto_connect_friend_agents(connection['requester_id'], connection['recipient_id'])
            except Exception as auto_connect_error:
                print(f"[AUTO-CONNECT]  Error auto-conectando agentes de amigos: {auto_connect_error}")

        # Crear notificación para el solicitante
        requester_notification_content = (
            f"Tu solicitud de conexión fue {'aceptada' if response == 'accept' else 'rechazada'}"
        )

        await db_manager.create_notification({
            'user_id': connection['requester_id'],
            'title': f'Solicitud de conexión {'aceptada' if response == 'accept' else 'rechazada'}',
            'content': requester_notification_content,
            'notification_type': 'success' if response == 'accept' else 'info',
            'priority': 'normal'
        })

        return {
            "success": True,
            "status": "accepted" if response == 'accept' else "rejected",
            "connection_id": connection_id,
            "message": f"Conexión {'aceptada' if response == 'accept' else 'rechazada'} correctamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}/connections")
async def get_user_connections(user_id: str, status: str = 'accepted'):
    """Obtener las conexiones/amigos de un usuario"""
    try:
        connections = await db_manager.get_user_connections(user_id, status)
        return {"connections": connections, "count": len(connections)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flow/connections")
async def create_flow_connection(connection_data: dict):
    """Crear una conexión de flujo entre usuarios"""
    try:
        flow_owner_id = connection_data.get('flow_owner_id')
        target_user_id = connection_data.get('target_user_id')
        connection_node_id = connection_data.get('connection_node_id')
        
        if not flow_owner_id or not target_user_id or not connection_node_id:
            raise HTTPException(status_code=400, detail="flow_owner_id, target_user_id y connection_node_id son requeridos")
        
        # Verificar que ambos usuarios existan y sean amigos (conexión social)
        friends_connections = await db_manager.get_user_connections(flow_owner_id, 'accepted')
        
        # Extraer el ID del amigo de cada conexión
        friend_ids = []
        for conn in friends_connections:
            if conn['requester']['id'] == flow_owner_id:
                friend_ids.append(conn['recipient']['id'])
            else:
                friend_ids.append(conn['requester']['id'])

        is_friend = target_user_id in friend_ids
        
        if not is_friend:
            raise HTTPException(
                status_code=403, 
                detail="Solo puedes crear conexiones de flujo con usuarios que sean tus amigos"
            )
        
        connection_id = await db_manager.create_flow_connection(connection_data)
        
        return {
            "flow_connection_id": connection_id, 
            "status": "active",
            "message": "Conexión de flujo creada exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/flow/connections/{flow_owner_id}")
async def get_flow_connections(flow_owner_id: str):
    """Obtener las conexiones de flujo de un usuario"""
    try:
        connections = await db_manager.get_flow_connections(flow_owner_id)
        return {"flow_connections": connections, "count": len(connections)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/flow/connections/{connection_id}")
async def delete_flow_connection(connection_id: str):
    """Eliminar una conexión de flujo"""
    try:
        success = await db_manager.delete_flow_connection(connection_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conexión de flujo no encontrada")
        
        return {"message": "Conexión de flujo eliminada exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/flows/save")
async def save_flow(flow_data: dict):
    """Guardar un flujo en el backend"""
    try:
        user_id = flow_data.get('user_id')
        name = flow_data.get('name')
        flow_data_content = flow_data.get('flow_data')
        
        if not user_id or not name or not flow_data_content:
            raise HTTPException(status_code=400, detail="user_id, name y flow_data son requeridos")
        
        flow_id = await db_manager.save_flow(flow_data)
        
        return {
            "flow_id": flow_id,
            "message": f"Flujo '{name}' guardado exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/flows/user/{user_id}")
async def get_user_flows(user_id: str):
    """Obtener los flujos guardados de un usuario"""
    try:
        flows = await db_manager.get_user_flows(user_id)
        return {"flows": flows, "count": len(flows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@app.get("/api/users/{user_id}/public-flows")
async def get_public_flows_by_user(user_id: str):
    """Obtener los flujos públicos de un amigo."""
    try:
        # Por seguridad, podríamos verificar si el usuario que hace la petición es amigo
        # del user_id solicitado, pero por ahora lo dejamos abierto.
        flows = await db_manager.get_public_flows_by_user(user_id)
        return {"flows": flows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/flows/friends/{user_id}/active")
async def get_friends_active_flows(user_id: str):
    """Obtener flujos activos de amigos"""
    try:
        flows = await db_manager.get_friends_active_flows(user_id)
        return {"active_flows": flows, "count": len(flows)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/flows/{flow_id}")
async def update_flow(flow_id: str, flow_data: dict):
    """Actualizar un flujo completo"""
    try:
        updates = {
            'name': flow_data.get('name'),
            'description': flow_data.get('description'),
            'flow_data': json.dumps(flow_data.get('flow_data', {})),
            'is_public': flow_data.get('is_public', False),
            'metadata': json.dumps(flow_data.get('metadata', {}))
        }

        success = await db_manager.update_flow(flow_id, updates)

        if not success:
            raise HTTPException(status_code=404, detail="Flujo no encontrado")

        return {
            "message": "Flujo actualizado exitosamente",
            "flow_id": flow_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/flows/{flow_id}/status")
async def update_flow_status(flow_id: str, status_data: dict):
    """Actualizar el estado de un flujo (activo/inactivo)"""
    try:
        is_active = status_data.get('is_active', False)
        success = await db_manager.update_flow_status(flow_id, is_active)

        if not success:
            raise HTTPException(status_code=404, detail="Flujo no encontrado")

        return {
            "message": f"Flujo {'activado' if is_active else 'desactivado'} exitosamente"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/flows/{flow_id}")
async def delete_flow(flow_id: str, user_data: dict):
    """Eliminar un flujo"""
    try:
        user_id = user_data.get('user_id')
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id es requerido")
        
        success = await db_manager.delete_flow(flow_id, user_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Flujo no encontrado o sin permisos")
        
        return {"message": "Flujo eliminado exitosamente"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    telegram_status = "configured" if TELEGRAM_BOT_TOKEN != "TU_TOKEN_AQUI" else "not_configured"
    whatsapp_status = "configured" if whatsapp_service and whatsapp_service.validate_config()['configured'] else "not_configured"

    return {
        "status": "healthy",
        "agents_count": len(agents_store),
        "connections_count": len(connections_store),
        "active_websockets": len(active_websockets),
        "conversations_count": len(message_history),
        "telegram_status": telegram_status,
        "whatsapp_status": whatsapp_status,
        "database_connected": True,
        "timestamp": datetime.now().isoformat()
    }

# =============== PROTOCOLO PAIA - ENDPOINTS ===============

@app.get("/api/paia/health")
async def paia_health_check():
    """Health check del protocolo PAIA"""
    if not paia_router or not paia_discovery or not paia_autonomy:
        return {
            "status": "not_initialized",
            "protocol_version": "1.0",
            "message": "Protocolo PAIA no inicializado"
        }

    try:
        online_agents = len(paia_discovery.get_online_agents()) if hasattr(paia_discovery, 'get_online_agents') else 0
        total_agents = len(paia_discovery.get_all_registered_agents()) if hasattr(paia_discovery, 'get_all_registered_agents') else 0

        return {
            "status": "healthy",
            "protocol_version": "1.0",
            "total_agents": total_agents,
            "online_agents": online_agents,
            "active_connections": len(paia_ws_handler.active_connections) if paia_ws_handler and hasattr(paia_ws_handler, 'active_connections') else 0
        }
    except Exception as e:
        return {
            "status": "error",
            "protocol_version": "1.0",
            "error": str(e)
        }

@app.get("/api/paia/discover/{user_id}")
async def discover_agents_paia(
    user_id: str,
    target_name: str = None,
    expertise: str = None
):
    """Descubrir agentes disponibles mediante el protocolo PAIA"""
    if not paia_discovery:
        raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

    try:
        if target_name:
            # Descubrir por nombre de usuario
            agent = await paia_discovery.discover_agent_by_name(
                requester_user_id=user_id,
                target_name=target_name
            )

            if agent:
                return {"agent": agent.to_dict()}
            else:
                return {"error": "Agent not found"}

        elif expertise:
            # Descubrir por expertise
            agents = await paia_discovery.discover_agents_by_expertise(
                requester_user_id=user_id,
                expertise=expertise
            )

            return {"agents": [agent.to_dict() for agent in agents]}

        else:
            raise HTTPException(status_code=400, detail="Provide either target_name or expertise")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/paia/autonomy/{agent_id}")
async def configure_autonomy(agent_id: str, settings_data: dict):
    """Configurar autonomía de un agente"""
    if not paia_autonomy:
        raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

    try:
        # Verificar que el agente existe
        db_agent = await db_manager.get_agent(agent_id)
        if not db_agent:
            raise HTTPException(status_code=404, detail="Agente no encontrado")

        # Verificar autorización
        user_id = settings_data.get('user_id')
        if not user_id or db_agent.user_id != user_id:
            raise HTTPException(status_code=403, detail="No autorizado")

        # Crear configuración de autonomía
        settings = AutonomySettings.from_dict(settings_data.get('settings', {}))

        # Aplicar en el manager
        paia_autonomy.set_agent_settings(agent_id, settings)

        # Guardar en BD
        await db_manager.save_autonomy_settings(agent_id, settings.to_dict())

        return {
            "success": True,
            "message": f"Autonomía configurada para agente {agent_id}",
            "settings": settings.to_dict()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/paia/capabilities/{agent_id}")
async def get_agent_capabilities_paia(agent_id: str):
    """Obtener capabilities de un agente"""
    try:
        # Obtener de BD
        capabilities = await db_manager.get_agent_capabilities(agent_id)

        return {
            "agent_id": agent_id,
            "capabilities": capabilities
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/paia/autonomy/{agent_id}")
async def get_autonomy_settings_endpoint(agent_id: str):
    """Obtener configuración de autonomía de un agente"""
    try:
        settings = await db_manager.get_autonomy_settings(agent_id)

        if not settings:
            # Retornar configuración por defecto
            return {
                "agent_id": agent_id,
                "default_level": "supervised",
                "rules": []
            }

        return {
            "agent_id": agent_id,
            **settings
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))






if __name__ == "__main__":
    print("Iniciando PAIA Platform Backend...")
    print("")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )