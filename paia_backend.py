import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from langchain_mcp_adapters.client import MultiServerMCPClient, load_mcp_tools 
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage
from long_term_store_pg import LongTermStorePG
import uvicorn
import os
import requests  # Para Telegram
import httpx  # Para verificar servidor MCP
from memory_manager import MemoryManager, Message
from auth_manager import AuthManager
from dotenv import load_dotenv
load_dotenv()
app = FastAPI(title="PAIA Platform Backend", version="1.0.0")

# === MEMORIA PERSISTENTE (Postgres) ===
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:root@localhost:5432/paia")
lt_store = LongTermStorePG(DATABASE_URL)
memory_manager = MemoryManager(long_term_backend=lt_store)

# === AUTENTICACIÓN ===
auth_manager = AuthManager(DATABASE_URL)

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

# Inicializa tablas al arrancar FastAPI (no crea la base, solo las tablas)
@app.on_event("startup")
async def on_startup():
    await lt_store.init_db()
    await auth_manager.init_db()
    await init_mcp_client()

# Configuración
os.environ["GOOGLE_API_KEY"] = "AIzaSyDrciW_INkcadba7Qu3VjaiSKsInO1VBCQ"

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
        self.mcp_client = None
    
    async def setup_mcp_client(self) -> None:
        """Configurar cliente MCP con Google Calendar"""
        try:
                    self.mcp_client = MultiServerMCPClient({
                        "google_calendar": {
                            "url": "http://127.0.0.1:3000/api/mcp",
                            "transport": "streamable_http"
                        }
                    })
                    print("Cliente MCP configurado para Google Calendar TypeScript")
        except Exception as e:
            print(f"WARNING: Error configurando MCP cliente: {e}")
            self.mcp_client = None
    
    async def create_agent(self, agent_data: dict) -> PAIAAgent:
        agent_id = str(uuid.uuid4())[:8]
        
        # Crear herramientas base del agente
        base_tools = self._create_agent_tools(agent_id, agent_data['expertise'])
        
        # Obtener herramientas MCP si están disponibles y crear wrappers
        all_tools = base_tools
        if self.mcp_client:
            try:
                mcp_tools = await self.mcp_client.get_tools()
                
                # Usar herramientas MCP directamente (sin wrappers)
                all_tools = base_tools + mcp_tools
                print(f"Herramientas MCP agregadas: {len(mcp_tools)}")
            except Exception as e:
                print(f"Error obteniendo herramientas MCP: {e}")
        
        # Crear instancia del agente con TODAS las herramientas
        user_id = agent_data.get('user_id', 'usuario-anonimo')
        agent_llm = create_react_agent(
            self.llm,
            all_tools,
            prompt=f"Eres {agent_data['name']}, un asistente {agent_data['personality']} especializado en {agent_data['expertise']}. \n\nIMPORTANTE: Tu user ID es: {user_id}\n\nCuando uses herramientas de Google Calendar (list-calendars, list-events, list-today-events, create-event), SIEMPRE incluye el parámetro userId con el valor: {user_id}\n\nCuando el usuario mencione calendario, citas o eventos, usa las herramientas de Google Calendar automáticamente. Si mencionan comunicarse con otros agentes, usa get_connected_agents() y send_message_to_agent(). Sé proactivo y usa las herramientas disponibles."
        )
        
        agent = PAIAAgent(
           id=agent_id,
           name=agent_data['name'],
           description=agent_data['description'],
           personality=agent_data['personality'],
           expertise=agent_data['expertise'],
           status='online',
           created=datetime.now().isoformat(),
           mcp_endpoint=f"http://localhost:{3000 + len(agents_store)}/mcp",
           user_id=agent_data.get('user_id', 'anonymous'),
           is_public=agent_data.get('is_public', True),
           telegram_chat_id=agent_data.get('telegram_chat_id', TELEGRAM_DEFAULT_CHAT_ID),
           llm_instance=agent_llm,
           tools=all_tools,
           conversation_history=[]
        )
        
        # (NUEVO) Vincular perfil estable para memoria larga
        user_id = agent.user_id or "anonymous"
        memory_profile_id = f"user:{user_id}|persona:{agent.name}"
        memory_manager.bind_profile(agent_id, memory_profile_id)
        
        agents_store[agent_id] = agent
        return agent
    
    def _create_agent_tools(self, agent_id: str, expertise: str) -> List:
        """Crear herramientas mejoradas para comunicación entre agentes, Telegram y Google Calendar"""
        
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
                    return "❌ Error: Chat ID de Telegram no configurado. Usa set_telegram_chat_id() primero."
                
                # Agregar contexto del agente al mensaje
                agent_name = agent.name if agent else "Agente PAIA"
                formatted_message = f"🤖 {agent_name}:\n\n{message}"
                
                result = telegram_service.send_message(target_chat_id, formatted_message)
                
                if result['success']:
                    return f"✅ Mensaje enviado exitosamente por Telegram al chat {target_chat_id}"
                else:
                    return f"❌ Error enviando por Telegram: {result['message']}"
                    
            except Exception as e:
                return f"❌ Error en Telegram: {str(e)}"
        
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
                    return "❌ Error: Chat ID de Telegram no configurado"
                
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
                    return f"✅ Notificación enviada por Telegram (Prioridad: {priority})"
                else:
                    return f"❌ Error: {result['message']}"
                    
            except Exception as e:
                return f"❌ Error enviando notificación: {str(e)}"
        
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
                    return f"✅ Chat ID de Telegram configurado: {chat_id}"
                else:
                    return "❌ Error: Agente no encontrado"
            except Exception as e:
                return f"❌ Error configurando Chat ID: {str(e)}"
        
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
                return f"❌ Error obteniendo updates: {str(e)}"
        
        # =============== HERRAMIENTAS EXISTENTES DE COMUNICACIÓN ===============
        @tool
        def get_connected_agents() -> str:
            """Ver agentes conectados"""
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
                
                # Verificar conexión
                is_connected = any(
                    (conn.agent1 == sender_id and conn.agent2 == target_agent_id) or
                    (conn.agent1 == target_agent_id and conn.agent2 == sender_id)
                    for conn in connections_store.values()
                )
                
                if not is_connected:
                    return f"Error: No estás conectado con el agente {target_agent_id}"
                
                if target_agent_id not in agents_store:
                    return f"Error: Agente {target_agent_id} no encontrado"
                
                # Crear ID de conversación único
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"
                
                # Guardar mensaje enviado
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
                    telegram_msg = f"💬 Conversación entre agentes:\n\n{sender_agent.name} → {target_agent_name}:\n{message}\n\n{response}"
                    telegram_service.send_message(
                        sender_agent.telegram_chat_id if sender_agent else TELEGRAM_DEFAULT_CHAT_ID,
                        telegram_msg
                    )
                
                return f"✓ Mensaje enviado a {target_agent_name}.\n🤖 {response}"
                
            except Exception as e:
                return f"Error enviando mensaje: {str(e)}"

        @tool
        async def get_agent_response(target_agent_id: str) -> str:
            """Obtener la respuesta más reciente de un agente específico"""
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
        
        # Lista base de herramientas (ahora incluye Telegram)
        base_tools = [
            get_connected_agents, 
            send_message_to_agent, 
            get_agent_response, 
            get_conversation_history,
            send_telegram_message,
            send_telegram_notification,
            set_telegram_chat_id,
            get_telegram_updates
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
                        telegram_msg = f"📅 Recordatorio de reunión:\n{title}\n📆 {date}\n👥 {', '.join(participants)}"
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
                        telegram_msg = f"✈️ Confirmación de vuelo:\n{from_city} → {to_city}\n📅 {date}"
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
    await agent_manager.setup_mcp_client()

# =============== ENDPOINTS API ===============

@app.post("/api/agents")
async def create_agent(agent_data: dict):
    try:
        # Agregar telegram_chat_id si viene en los datos
        if 'telegram_chat_id' not in agent_data:
            agent_data['telegram_chat_id'] = TELEGRAM_DEFAULT_CHAT_ID
            
        agent = await agent_manager.create_agent(agent_data)
        agent_dict = asdict(agent)
        agent_dict.pop('llm_instance', None)
        agent_dict.pop('tools', None)
        return agent_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def get_agents(user_id: str = None):
    agents_list = []
    for agent in agents_store.values():
        agent_dict = asdict(agent)
        agent_dict.pop('llm_instance', None)
        agent_dict.pop('tools', None)
        
        # Si se especifica user_id, filtrar solo agentes de ese usuario
        if user_id and agent.user_id != user_id:
            continue
            
        agents_list.append(agent_dict)
    return agents_list

@app.get("/api/agents/public")
async def get_public_agents(exclude_user_id: str = None):
    """Obtener todos los agentes públicos, opcionalmente excluyendo los de un usuario específico"""
    agents_list = []
    for agent in agents_store.values():
        if agent.is_public and (not exclude_user_id or agent.user_id != exclude_user_id):
            agent_dict = asdict(agent)
            agent_dict.pop('llm_instance', None)
            agent_dict.pop('tools', None)
            agents_list.append(agent_dict)
    return agents_list

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
        
        if agent_id not in agents_store:
            print(f"[ERROR] Agente {agent_id} no encontrado en agents_store")
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        agent = agents_store[agent_id]
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
                f"✅ {agent.name} configurado exitosamente para este chat de Telegram"
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
            telegram_msg = f"💬 {from_agent.name} → {to_agent.name}:\n{message_data['message']}\n\n{response}"
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
                        context.insert(0, HumanMessage(content=f"🧠 Preferencias del usuario: {resumen}"))

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

@app.post("/auth/google-signin")
async def google_signin(request: dict):
    """Login/registro con Google OAuth"""
    email = request.get("email")
    name = request.get("name")
    google_id = request.get("google_id")
    image = request.get("image")
    
    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Email y Google ID son requeridos")
    
    result = await auth_manager.google_signin(email, name, google_id, image)
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    
    return {
        "user_id": result["user_id"],
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

@app.get("/api/health")
async def health_check():
    telegram_status = "configured" if TELEGRAM_BOT_TOKEN != "TU_TOKEN_AQUI" else "not_configured"
    
    return {
        "status": "healthy",
        "agents_count": len(agents_store),
        "connections_count": len(connections_store),
        "active_websockets": len(active_websockets),
        "conversations_count": len(message_history),
        "telegram_status": telegram_status,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("Iniciando PAIA Platform Backend con Telegram Integration...")
    print("Funcionalidades:")
    print("   - Comunicacion async entre agentes")
    print("   - Contexto de conversacion persistente")
    print("   - Reconocimiento automatico de conexiones")
    print("   - Respuestas inmediatas sin errores de loop")
    print("   - Memoria persistente con PostgreSQL")
    print("   - Soporte multi-usuario")
    print("   - TELEGRAM: Integracion completa con notificaciones")
    print("")
    print("IMPORTANTE: Configura tu token de Telegram y Chat ID en las lineas 21-22")
    print("")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )