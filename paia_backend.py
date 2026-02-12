import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, WebSocket, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from dotenv import load_dotenv
import os

# Cargar variables de entorno ANTES de importar módulos que las usan
load_dotenv()

from langchain_mcp_adapters.client import load_mcp_tools 
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

# === SERVICIOS ===
from services.whatsapp_service import WhatsAppService
from services.telegram_service import TelegramService
from services.agent_service import PAIAAgentManager
from services.memory_service import MemoryService
from services.mcp_service import MCPService, init_mcp_service
from services.gmail_service import GmailService

# RAG Service (POC) - inicializado en startup
rag_service: Optional[object] = None

# === HERRAMIENTAS ===
from tools.telegram_tools import create_telegram_tools
from tools.whatsapp_tools import create_whatsapp_tools
from tools.communication_tools import create_communication_tools
from tools.notes_tools import create_notes_tools
from tools.expertise_tools import get_expertise_tools

# === ROUTERS ===
from routers.health import create_health_router
from routers.auth import create_auth_router
from routers.google_auth import create_google_auth_router
from routers.agents import create_agents_router
from routers.connections import create_connections_router
from routers.telegram import create_telegram_router
from routers.whatsapp import create_whatsapp_router
from routers.rag import create_rag_router
from routers.notifications import create_notifications_router
from routers.users import create_users_router
from routers.flows import create_flows_router
from routers.paia import create_paia_router
from routers.websocket import create_websocket_router
from routers.emails import create_emails_router

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

# === IMPORTS DE CONFIGURACIÓN Y MODELOS ===
from config.settings import (
    API_TITLE,
    API_VERSION,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_DEFAULT_CHAT_ID,
    CORS_ORIGINS,
    CORS_ALLOW_CREDENTIALS,
    CORS_ALLOW_METHODS,
    CORS_ALLOW_HEADERS,
    LLM_MODEL,
    LLM_TEMPERATURE,
)
from models.agent import PAIAAgent, AgentConnection, AgentMessage

app = FastAPI(title=API_TITLE, version=API_VERSION)


# === MEMORIA PERSISTENTE (Supabase) ===
lt_store = LongTermStoreSupabase()
memory_service = MemoryService(lt_store)
memory_manager = memory_service.memory_manager  # Para compatibilidad con código existente


# === AUTENTICACIÓN ===
auth_manager = AuthManager()

# === GESTOR DE BASE DE DATOS ===
db_manager = DatabaseManager()

# === SERVICIOS DE MENSAJERÍA ===
telegram_service = TelegramService(TELEGRAM_BOT_TOKEN)

# === SERVICIO MCP ===
mcp_service: Optional[MCPService] = None

# === SERVICIO GMAIL ===
gmail_service = GmailService(db_manager)

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

    # Inicializar EmbeddingService + VectorStore (pgvector support)
    from services.embedding_service import EmbeddingService
    from services.vector_store_supabase import VectorStoreSupabase
    from services.rag_service import RAGService

    global embedding_service, vector_store, rag_service
    try:
        embedding_service = EmbeddingService()
        vector_store = VectorStoreSupabase()
        print("[INFO] EmbeddingService y VectorStore inicializados")
    except Exception as e:
        print(f"[WARNING] No se pudo inicializar EmbeddingService (continuando con fallback): {e}")
        embedding_service = None
        vector_store = None

    # Inicializar RAG Service con capacidades de embeddings si están disponibles
    rag_service = RAGService(lt_store, embedding_service=embedding_service, vector_store=vector_store)
    services['rag_service'] = rag_service
    services['embedding_service'] = embedding_service
    services['vector_store'] = vector_store

    await init_mcp_client()
    await load_persistent_agents()
    await init_paia_protocol()  # Inicializar protocolo PAIA

# Configuración
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=CORS_ALLOW_CREDENTIALS,
    allow_methods=CORS_ALLOW_METHODS,
    allow_headers=CORS_ALLOW_HEADERS,
)

# Storage en memoria
agents_store: Dict[str, PAIAAgent] = {}
connections_store: Dict[str, AgentConnection] = {}
active_websockets: Dict[str, WebSocket] = {}
message_history: Dict[str, List[AgentMessage]] = {}  # conversation_id -> messages

# === GESTOR DE AGENTES (inicializado después del startup) ===
agent_manager: Optional[PAIAAgentManager] = None

# Contenedor para referencias que se inicializan en startup
services = {
    'agent_manager': None,
    'mcp_service': None
}

# Inicializar el cliente MCP al arrancar
async def init_mcp_client():
    """Inicializar el servicio MCP"""
    global mcp_service, agent_manager

    # Inicializar servicio MCP
    mcp_service = await init_mcp_service()

    # Inicializar gestor de agentes con todos los servicios
    agent_manager = PAIAAgentManager(
        db_manager=db_manager,
        memory_manager=memory_manager,
        telegram_service=telegram_service,
        whatsapp_service=whatsapp_service,
        auth_manager=auth_manager,
        get_mcp_client_func=mcp_service.get_mcp_client_for_user,
        gmail_service=gmail_service
    )

    # Inyectar stores globales compartidos
    agent_manager.set_stores(agents_store, connections_store, message_history)

    # Actualizar referencia en el contenedor de servicios
    services['agent_manager'] = agent_manager
    services['mcp_service'] = mcp_service

    print("[INFO] Agent Manager y MCP Service inicializados")

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

        # Nota: Los agentes se cargan bajo demanda (lazy loading)
        # No es necesario registrar todos al inicio

        print("[PAIA] Protocolo PAIA inicializado correctamente (lazy loading habilitado)")

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
        user_mcp_client = await agent_manager.get_mcp_client_func(db_agent.user_id)
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

# =============== FUNCIONES AUXILIARES ===============

async def auto_connect_friend_agents(user1_id: str, user2_id: str) -> dict:
    """
    Conectar automaticamente los agentes publicos entre dos amigos.
    Se ejecuta cuando se acepta una solicitud de amistad.
    """
    try:
        print(f"[AUTO-CONNECT] Iniciando auto-conexion de agentes entre {user1_id} y {user2_id}")

        user1_public = await db_manager.get_public_agents_by_user(user1_id)
        user2_public = await db_manager.get_public_agents_by_user(user2_id)

        connections_created = 0
        connections_failed = 0

        print(f"[AUTO-CONNECT] Encontrados {len(user1_public)} agentes publicos del usuario 1, {len(user2_public)} del usuario 2")

        for agent1 in user1_public:
            for agent2 in user2_public:
                try:
                    existing_connections = [conn for conn in connections_store.values()
                                          if (conn.agent1 == agent1.id and conn.agent2 == agent2.id) or
                                             (conn.agent1 == agent2.id and conn.agent2 == agent1.id)]

                    if existing_connections:
                        print(f"[AUTO-CONNECT]  Conexion ya existe entre {agent1.name} y {agent2.name}")
                        continue

                    connection = await agent_manager.connect_agents(agent1.id, agent2.id, "friend_auto")
                    connections_created += 1

                    print(f"[AUTO-CONNECT]  Conectados '{agent1.name}' (usuario {user1_id}) <-> '{agent2.name}' (usuario {user2_id})")

                except Exception as conn_error:
                    print(f"[AUTO-CONNECT]  Error conectando {agent1.name} <-> {agent2.name}: {conn_error}")
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

# =============== ENDPOINTS API ===============

# Incluir routers
health_router = create_health_router(
    agents_store=agents_store,
    connections_store=connections_store,
    active_websockets=active_websockets,
    message_history=message_history,
    telegram_bot_token=TELEGRAM_BOT_TOKEN,
    whatsapp_service=whatsapp_service,
    paia_router=paia_router,
    paia_discovery=paia_discovery,
    paia_autonomy=paia_autonomy,
    paia_ws_handler=paia_ws_handler
)
app.include_router(health_router)

auth_router = create_auth_router(auth_manager=auth_manager)
app.include_router(auth_router)

google_auth_router = create_google_auth_router(db_manager=db_manager)
app.include_router(google_auth_router)

emails_router = create_emails_router(gmail_service=gmail_service, auth_manager=auth_manager)
app.include_router(emails_router)

agents_router = create_agents_router(
    agents_store=agents_store,
    connections_store=connections_store,
    agent_manager=services,  # Pasar contenedor de servicios
    auth_manager=auth_manager,
    db_manager=db_manager,
    memory_manager=memory_manager,
    ensure_agent_loaded_func=ensure_agent_loaded,
    whatsapp_service=whatsapp_service,
    telegram_default_chat_id=TELEGRAM_DEFAULT_CHAT_ID,
    register_agent_in_paia_func=register_agent_in_paia  # Para registrar capabilities y autonomia
)
app.include_router(agents_router)

# === ROUTERS ADICIONALES ===

connections_router = create_connections_router(
    agent_manager=services,  # Pasar contenedor de servicios
    connections_store=connections_store
)
app.include_router(connections_router)

telegram_router = create_telegram_router(
    telegram_service=telegram_service,
    telegram_default_chat_id=TELEGRAM_DEFAULT_CHAT_ID
)
app.include_router(telegram_router)

whatsapp_router = create_whatsapp_router(
    whatsapp_service=whatsapp_service,
    db_manager=db_manager,
    memory_manager=memory_manager,
    ensure_agent_loaded_func=ensure_agent_loaded,
    rag_service=services.get('rag_service')
)
app.include_router(whatsapp_router)

# Rutas RAG (POC)
rag_router = create_rag_router(services.get('rag_service'))
app.include_router(rag_router)

notifications_router = create_notifications_router(db_manager=db_manager)
app.include_router(notifications_router)

users_router = create_users_router(
    db_manager=db_manager,
    auth_manager=auth_manager,
    auto_connect_friend_agents_func=auto_connect_friend_agents
)
app.include_router(users_router)

flows_router = create_flows_router(db_manager=db_manager)
app.include_router(flows_router)

paia_protocol_router = create_paia_router(
    paia_router=paia_router,
    paia_discovery=paia_discovery,
    paia_autonomy=paia_autonomy,
    db_manager=db_manager
)
app.include_router(paia_protocol_router)

websocket_router = create_websocket_router(paia_ws_handler=paia_ws_handler)
app.include_router(websocket_router)

# =============== ENDPOINTS UNICOS (NO EN ROUTERS) ===============

@app.get("/debug_ping")
async def debug_ping():
    return {"message": "pong", "status": "ok"}


@app.get("/api/conversations/{agent1_id}/{agent2_id}")
async def get_conversation_history(agent1_id: str, agent2_id: str):
    """Obtener historial de conversacion entre dos agentes"""
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

@app.post("/api/architectures/create")
async def create_architecture(architecture_data: dict):
    """Crear arquitectura de agentes (chain, hub, mesh)"""
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


# =============== STARTUP ===============

if __name__ == "__main__":
    print("Iniciando PAIA Platform Backend...")
    print("")

    # Imprimir rutas registradas para debugging
    print("=== RUTAS REGISTRADAS ===")
    for route in app.routes:
        if hasattr(route, "path"):
            methods = ",".join(route.methods) if hasattr(route, "methods") else "WebSocket"
            print(f"Ruta: {route.path} [{methods}]")
    print("=========================")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )