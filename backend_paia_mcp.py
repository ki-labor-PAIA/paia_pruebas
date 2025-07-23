import asyncio
import json
import uuid
import docker
import psutil
from datetime import datetime
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, WebSocket, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage
import uvicorn
import os
import redis
import asyncpg
from contextlib import asynccontextmanager

# Configuración
os.getenv("GOOGLE_API_KEY")

# Base de datos y cache
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost/paia_db")

# Configuración de puertos para MCP servers
MCP_BASE_PORT = 4000
MAX_MCP_SERVERS = 10000  # Soporte para 10k usuarios simultáneos

app = FastAPI(title="PAIA Platform Backend - Scalable", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seguridad básica
security = HTTPBearer()

# =================== MODELOS DE DATOS ===================

@dataclass
class PAIAUser:
    id: str
    email: str
    name: str
    mcp_server_port: int
    mcp_server_url: str
    status: str  # active, inactive, suspended
    created: str
    plan: str  # free, premium, enterprise
    max_agents: int

@dataclass
class PAIAAgent:
    id: str
    user_id: str
    name: str
    description: str
    personality: str
    expertise: str
    status: str
    created: str
    is_public: bool  # ¿Puede conectarse con agentes de otros usuarios?
    tags: List[str]  # Para búsqueda y discovery

@dataclass
class AgentConnection:
    id: str
    agent1_id: str
    agent1_user_id: str
    agent2_id: str
    agent2_user_id: str
    type: str  # direct, hub, mesh
    status: str  # pending, active, blocked
    is_cross_user: bool  # ¿Conexión entre usuarios diferentes?
    created: str
    approved_at: Optional[str] = None

@dataclass
class ConversationThread:
    id: str
    agent1_id: str
    agent2_id: str
    agent1_user_id: str
    agent2_user_id: str
    created: str
    last_activity: str
    message_count: int
    is_cross_user: bool

@dataclass
class AgentMessage:
    id: str
    thread_id: str
    from_agent_id: str
    to_agent_id: str
    from_user_id: str
    to_user_id: str
    content: str
    timestamp: str
    delivery_status: str  # sent, delivered, read, failed

# =================== GESTORES ===================

class DatabaseManager:
    def __init__(self):
        self.pool = None
    
    async def init_db(self):
        self.pool = await asyncpg.create_pool(DATABASE_URL)
        await self._create_tables()
    
    async def _create_tables(self):
        async with self.pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR PRIMARY KEY,
                    email VARCHAR UNIQUE,
                    name VARCHAR,
                    mcp_server_port INTEGER,
                    mcp_server_url VARCHAR,
                    status VARCHAR,
                    created TIMESTAMP,
                    plan VARCHAR,
                    max_agents INTEGER
                );
                
                CREATE TABLE IF NOT EXISTS agents (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR REFERENCES users(id),
                    name VARCHAR,
                    description TEXT,
                    personality VARCHAR,
                    expertise VARCHAR,
                    status VARCHAR,
                    created TIMESTAMP,
                    is_public BOOLEAN,
                    tags TEXT[]
                );
                
                CREATE TABLE IF NOT EXISTS connections (
                    id VARCHAR PRIMARY KEY,
                    agent1_id VARCHAR REFERENCES agents(id),
                    agent1_user_id VARCHAR,
                    agent2_id VARCHAR REFERENCES agents(id),
                    agent2_user_id VARCHAR,
                    type VARCHAR,
                    status VARCHAR,
                    is_cross_user BOOLEAN,
                    created TIMESTAMP,
                    approved_at TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS conversation_threads (
                    id VARCHAR PRIMARY KEY,
                    agent1_id VARCHAR,
                    agent2_id VARCHAR,
                    agent1_user_id VARCHAR,
                    agent2_user_id VARCHAR,
                    created TIMESTAMP,
                    last_activity TIMESTAMP,
                    message_count INTEGER,
                    is_cross_user BOOLEAN
                );
                
                CREATE TABLE IF NOT EXISTS messages (
                    id VARCHAR PRIMARY KEY,
                    thread_id VARCHAR REFERENCES conversation_threads(id),
                    from_agent_id VARCHAR,
                    to_agent_id VARCHAR,
                    from_user_id VARCHAR,
                    to_user_id VARCHAR,
                    content TEXT,
                    timestamp TIMESTAMP,
                    delivery_status VARCHAR
                );
                
                -- Índices para performance
                CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
                CREATE INDEX IF NOT EXISTS idx_agents_public ON agents(is_public);
                CREATE INDEX IF NOT EXISTS idx_connections_agents ON connections(agent1_id, agent2_id);
                CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
                CREATE INDEX IF NOT EXISTS idx_threads_agents ON conversation_threads(agent1_id, agent2_id);
            """)

class MCPServerManager:
    def __init__(self):
        self.docker_client = docker.from_env()
        self.active_servers: Dict[str, dict] = {}  # user_id -> server_info
        self.port_manager = PortManager()
    
    async def create_user_mcp_server(self, user_id: str) -> dict:
        """Crea un servidor MCP dedicado para un usuario"""
        try:
            port = await self.port_manager.allocate_port()
            container_name = f"paia-mcp-{user_id}"
            
            # Verificar si ya existe
            try:
                existing = self.docker_client.containers.get(container_name)
                existing.remove(force=True)
            except docker.errors.NotFound:
                pass
            
            # Crear nuevo contenedor MCP
            container = self.docker_client.containers.run(
                image="paia-mcp-server:latest",  # Imagen personalizada
                name=container_name,
                ports={'3000/tcp': port},
                environment={
                    'USER_ID': user_id,
                    'GOOGLE_API_KEY': os.environ["GOOGLE_API_KEY"],
                    'REDIS_URL': REDIS_URL,
                    'DATABASE_URL': DATABASE_URL
                },
                detach=True,
                restart_policy={"Name": "unless-stopped"}
            )
            
            # Esperar que el servidor esté listo
            await asyncio.sleep(3)
            
            server_info = {
                'user_id': user_id,
                'container_id': container.id,
                'port': port,
                'url': f"http://localhost:{port}/mcp",
                'status': 'running',
                'created': datetime.now().isoformat()
            }
            
            self.active_servers[user_id] = server_info
            return server_info
            
        except Exception as e:
            await self.port_manager.release_port(port)
            raise HTTPException(status_code=500, detail=f"Error creando servidor MCP: {str(e)}")
    
    async def get_user_mcp_client(self, user_id: str) -> MultiServerMCPClient:
        """Obtiene cliente MCP para un usuario específico"""
        if user_id not in self.active_servers:
            await self.create_user_mcp_server(user_id)
        
        server_info = self.active_servers[user_id]
        
        client = MultiServerMCPClient({
            f"user-{user_id}": {
                "url": server_info['url'],
                "transport": "streamable_http"
            }
        })
        
        return client
    
    async def stop_user_mcp_server(self, user_id: str):
        """Detiene el servidor MCP de un usuario"""
        if user_id in self.active_servers:
            server_info = self.active_servers[user_id]
            try:
                container = self.docker_client.containers.get(server_info['container_id'])
                container.stop()
                container.remove()
                await self.port_manager.release_port(server_info['port'])
                del self.active_servers[user_id]
            except Exception as e:
                print(f"Error deteniendo servidor MCP {user_id}: {e}")

class PortManager:
    def __init__(self):
        self.allocated_ports: Set[int] = set()
        self.next_port = MCP_BASE_PORT
    
    async def allocate_port(self) -> int:
        """Asigna un puerto disponible"""
        while self.next_port in self.allocated_ports or self._is_port_in_use(self.next_port):
            self.next_port += 1
            if self.next_port > MCP_BASE_PORT + MAX_MCP_SERVERS:
                raise HTTPException(status_code=503, detail="No hay puertos disponibles")
        
        port = self.next_port
        self.allocated_ports.add(port)
        self.next_port += 1
        return port
    
    async def release_port(self, port: int):
        """Libera un puerto"""
        self.allocated_ports.discard(port)
    
    def _is_port_in_use(self, port: int) -> bool:
        """Verifica si un puerto está en uso"""
        return port in [conn.laddr.port for conn in psutil.net_connections()]

class CrossUserCommunicationManager:
    def __init__(self, db_manager: DatabaseManager, mcp_manager: MCPServerManager):
        self.db = db_manager
        self.mcp = mcp_manager
    
    async def send_cross_user_message(self, from_agent_id: str, to_agent_id: str, message: str, from_user_id: str) -> str:
        """Envía mensaje entre agentes de diferentes usuarios"""
        
        # 1. Verificar conexión existe
        async with self.db.pool.acquire() as conn:
            connection = await conn.fetchrow("""
                SELECT * FROM connections 
                WHERE (agent1_id = $1 AND agent2_id = $2) 
                   OR (agent1_id = $2 AND agent2_id = $1)
                AND status = 'active'
            """, from_agent_id, to_agent_id)
            
            if not connection:
                raise HTTPException(status_code=400, detail="Agentes no están conectados")
            
            # 2. Obtener información del agente destino
            to_agent = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", to_agent_id)
            to_user_id = to_agent['user_id']
        
        # 3. Obtener cliente MCP del usuario destino
        to_user_mcp = await self.mcp.get_user_mcp_client(to_user_id)
        
        # 4. Crear thread de conversación si no existe
        thread_id = await self._get_or_create_thread(from_agent_id, to_agent_id, from_user_id, to_user_id)
        
        # 5. Guardar mensaje enviado
        message_id = str(uuid.uuid4())[:8]
        async with self.db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO messages (id, thread_id, from_agent_id, to_agent_id, from_user_id, to_user_id, content, timestamp, delivery_status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'sent')
            """, message_id, thread_id, from_agent_id, to_agent_id, from_user_id, to_user_id, message, datetime.now())
        
        # 6. Enviar mensaje via MCP
        try:
            tools = await to_user_mcp.get_tools()
            
            # Buscar herramienta de recepción de mensajes
            receive_tool = None
            for tool in tools:
                if tool.name == "receive_cross_user_message":
                    receive_tool = tool
                    break
            
            if receive_tool:
                response = await receive_tool.ainvoke({
                    "from_agent_id": from_agent_id,
                    "to_agent_id": to_agent_id,
                    "message": message,
                    "thread_id": thread_id
                })
                
                # Actualizar estado del mensaje
                async with self.db.pool.acquire() as conn:
                    await conn.execute("""
                        UPDATE messages SET delivery_status = 'delivered' WHERE id = $1
                    """, message_id)
                
                return response
            else:
                raise Exception("Agente destino no tiene herramienta de recepción")
                
        except Exception as e:
            # Marcar mensaje como fallido
            async with self.db.pool.acquire() as conn:
                await conn.execute("""
                    UPDATE messages SET delivery_status = 'failed' WHERE id = $1
                """, message_id)
            
            raise HTTPException(status_code=500, detail=f"Error enviando mensaje: {str(e)}")
    
    async def _get_or_create_thread(self, agent1_id: str, agent2_id: str, user1_id: str, user2_id: str) -> str:
        """Obtiene o crea un hilo de conversación"""
        
        # Normalizar IDs para consistencia
        a1, a2 = sorted([agent1_id, agent2_id])
        u1 = user1_id if agent1_id == a1 else user2_id
        u2 = user2_id if agent1_id == a1 else user1_id
        
        async with self.db.pool.acquire() as conn:
            thread = await conn.fetchrow("""
                SELECT id FROM conversation_threads 
                WHERE agent1_id = $1 AND agent2_id = $2
            """, a1, a2)
            
            if thread:
                # Actualizar última actividad
                await conn.execute("""
                    UPDATE conversation_threads 
                    SET last_activity = $1 
                    WHERE id = $2
                """, datetime.now(), thread['id'])
                return thread['id']
            else:
                # Crear nuevo thread
                thread_id = str(uuid.uuid4())[:8]
                await conn.execute("""
                    INSERT INTO conversation_threads 
                    (id, agent1_id, agent2_id, agent1_user_id, agent2_user_id, created, last_activity, message_count, is_cross_user)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8)
                """, thread_id, a1, a2, u1, u2, datetime.now(), datetime.now(), u1 != u2)
                return thread_id

# =================== SISTEMA PRINCIPAL ===================

class PAIAScalableManager:
    def __init__(self, db_manager: DatabaseManager, mcp_manager: MCPServerManager):
        self.db = db_manager
        self.mcp = mcp_manager
        self.cross_comm = CrossUserCommunicationManager(db_manager, mcp_manager)
        self.redis = None
    
    async def init_redis(self):
        import aioredis
        self.redis = await aioredis.from_url(REDIS_URL)
    
    async def create_user(self, user_data: dict) -> PAIAUser:
        """Crea un nuevo usuario con su servidor MCP dedicado"""
        user_id = str(uuid.uuid4())[:8]
        
        # Crear servidor MCP
        mcp_info = await self.mcp.create_user_mcp_server(user_id)
        
        # Determinar plan y límites
        plan = user_data.get('plan', 'free')
        max_agents = {'free': 3, 'premium': 20, 'enterprise': 100}[plan]
        
        user = PAIAUser(
            id=user_id,
            email=user_data['email'],
            name=user_data['name'],
            mcp_server_port=mcp_info['port'],
            mcp_server_url=mcp_info['url'],
            status='active',
            created=datetime.now().isoformat(),
            plan=plan,
            max_agents=max_agents
        )
        
        # Guardar en DB
        async with self.db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO users (id, email, name, mcp_server_port, mcp_server_url, status, created, plan, max_agents)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, user.id, user.email, user.name, user.mcp_server_port, user.mcp_server_url, 
                user.status, datetime.now(), user.plan, user.max_agents)
        
        return user
    
    async def create_agent(self, user_id: str, agent_data: dict) -> PAIAAgent:
        """Crea un agente dentro del servidor MCP del usuario"""
        
        # Verificar límites del usuario
        async with self.db.pool.acquire() as conn:
            user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            agent_count = await conn.fetchval("SELECT COUNT(*) FROM agents WHERE user_id = $1", user_id)
            if agent_count >= user['max_agents']:
                raise HTTPException(status_code=400, detail=f"Límite de agentes alcanzado ({user['max_agents']})")
        
        agent_id = str(uuid.uuid4())[:8]
        
        agent = PAIAAgent(
            id=agent_id,
            user_id=user_id,
            name=agent_data['name'],
            description=agent_data['description'],
            personality=agent_data['personality'],
            expertise=agent_data['expertise'],
            status='online',
            created=datetime.now().isoformat(),
            is_public=agent_data.get('is_public', False),
            tags=agent_data.get('tags', [])
        )
        
        # Guardar en DB
        async with self.db.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO agents (id, user_id, name, description, personality, expertise, status, created, is_public, tags)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, agent.id, agent.user_id, agent.name, agent.description, agent.personality, 
                agent.expertise, agent.status, datetime.now(), agent.is_public, agent.tags)
        
        # Crear agente en el servidor MCP del usuario
        await self._deploy_agent_to_mcp(user_id, agent)
        
        return agent
    
    async def _deploy_agent_to_mcp(self, user_id: str, agent: PAIAAgent):
        """Despliega un agente en el servidor MCP del usuario"""
        try:
            mcp_client = await self.mcp.get_user_mcp_client(user_id)
            tools = await mcp_client.get_tools()
            
            # Buscar herramienta de creación de agentes
            for tool in tools:
                if tool.name == "create_agent":
                    await tool.ainvoke({
                        "agent_id": agent.id,
                        "name": agent.name,
                        "description": agent.description,
                        "personality": agent.personality,
                        "expertise": agent.expertise
                    })
                    break
                    
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error desplegando agente: {str(e)}")
    
    async def discover_public_agents(self, user_id: str, expertise: str = None, tags: List[str] = None) -> List[dict]:
        """Descubre agentes públicos de otros usuarios"""
        conditions = ["is_public = true", "user_id != $1"]
        params = [user_id]
        param_count = 1
        
        if expertise:
            param_count += 1
            conditions.append(f"expertise = ${param_count}")
            params.append(expertise)
        
        if tags:
            param_count += 1
            conditions.append(f"tags && ${param_count}")
            params.append(tags)
        
        query = f"""
            SELECT a.*, u.name as owner_name 
            FROM agents a 
            JOIN users u ON a.user_id = u.id 
            WHERE {' AND '.join(conditions)}
            LIMIT 20
        """
        
        async with self.db.pool.acquire() as conn:
            agents = await conn.fetch(query, *params)
            
        return [dict(agent) for agent in agents]

# =================== INSTANCIAS GLOBALES ===================

db_manager = DatabaseManager()
mcp_manager = MCPServerManager()
paia_manager = PAIAScalableManager(db_manager, mcp_manager)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await db_manager.init_db()
    await paia_manager.init_redis()
    yield
    # Shutdown
    if db_manager.pool:
        await db_manager.pool.close()

app.router.lifespan_context = lifespan

# =================== AUTH HELPERS ===================

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """Extrae user_id del token (simplificado)"""
    # En producción: validar JWT, etc.
    token = credentials.credentials
    if token == "demo_token":
        return "demo_user"
    return token  # Simplificado para este ejemplo

# =================== ENDPOINTS API ===================

@app.post("/api/users")
async def create_user(user_data: dict):
    """Crea un nuevo usuario con servidor MCP dedicado"""
    try:
        user = await paia_manager.create_user(user_data)
        return asdict(user)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents")
async def create_agent(agent_data: dict, user_id: str = Depends(get_current_user)):
    """Crea agente - COMPATIBLE con frontend existente"""
    try:
        agent = await paia_manager.create_agent(user_id, agent_data)
        return asdict(agent)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def get_agents(user_id: str = Depends(get_current_user)):
    """Lista agentes del usuario - COMPATIBLE"""
    async with db_manager.pool.acquire() as conn:
        agents = await conn.fetch("SELECT * FROM agents WHERE user_id = $1", user_id)
    return [dict(agent) for agent in agents]

@app.get("/api/agents/discover")
async def discover_agents(user_id: str = Depends(get_current_user), expertise: str = None, tags: str = None):
    """Descubre agentes públicos de otros usuarios - NUEVA FUNCIONALIDAD"""
    tag_list = tags.split(',') if tags else None
    agents = await paia_manager.discover_public_agents(user_id, expertise, tag_list)
    return agents

@app.post("/api/connections")
async def create_connection(connection_data: dict, user_id: str = Depends(get_current_user)):
    """Crea conexión - COMPATIBLE, ahora soporta cross-user"""
    try:
        agent1_id = connection_data['agent1']
        agent2_id = connection_data['agent2']
        
        # Verificar ownership y permisos
        async with db_manager.pool.acquire() as conn:
            agent1 = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", agent1_id)
            agent2 = await conn.fetchrow("SELECT * FROM agents WHERE id = $2", agent2_id)
            
            if not agent1 or not agent2:
                raise HTTPException(status_code=404, detail="Agente no encontrado")
            
            # Verificar que el usuario puede conectar estos agentes
            if agent1['user_id'] != user_id and not agent1['is_public']:
                raise HTTPException(status_code=403, detail="No tienes permiso para conectar este agente")
            
            is_cross_user = agent1['user_id'] != agent2['user_id']
            
            connection = AgentConnection(
                id=str(uuid.uuid4())[:8],
                agent1_id=agent1_id,
                agent1_user_id=agent1['user_id'],
                agent2_id=agent2_id,
                agent2_user_id=agent2['user_id'],
                type=connection_data.get('type', 'direct'),
                status='active' if not is_cross_user else 'pending',  # Cross-user requiere aprobación
                is_cross_user=is_cross_user,
                created=datetime.now().isoformat()
            )
            
            await conn.execute("""
                INSERT INTO connections (id, agent1_id, agent1_user_id, agent2_id, agent2_user_id, type, status, is_cross_user, created)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, connection.id, connection.agent1_id, connection.agent1_user_id, 
                connection.agent2_id, connection.agent2_user_id, connection.type, 
                connection.status, connection.is_cross_user, datetime.now())
        
        return asdict(connection)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/connections")
async def get_connections(user_id: str = Depends(get_current_user)):
    """Lista conexiones - COMPATIBLE"""
    async with db_manager.pool.acquire() as conn:
        connections = await conn.fetch("""
            SELECT * FROM connections 
            WHERE agent1_user_id = $1 OR agent2_user_id = $1
        """, user_id)
    return [dict(conn) for conn in connections]

@app.post("/api/agents/{agent_id}/message")
async def send_message_to_agent(agent_id: str, message_data: dict, user_id: str = Depends(get_current_user)):
    """Envía mensaje a agente - COMPATIBLE, ahora via MCP"""
    try:
        # Verificar ownership
        async with db_manager.pool.acquire() as conn:
            agent = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", agent_id)
            if not agent or agent['user_id'] != user_id:
                raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        # Obtener cliente MCP del usuario
        mcp_client = await mcp_manager.get_user_mcp_client(user_id)
        tools = await mcp_client.get_tools()
        
        # Buscar herramienta de chat
        for tool in tools:
            if tool.name == "chat_with_agent":
                response = await tool.ainvoke({
                    "agent_id": agent_id,
                    "message": message_data['message']
                })
                
                return {
                    "agent_id": agent_id,
                    "agent_name": agent['name'],
                    "response": response
                }
        
        raise HTTPException(status_code=500, detail="Herramienta de chat no disponible")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{from_agent_id}/send-to/{to_agent_id}")
async def send_message_between_agents(from_agent_id: str, to_agent_id: str, message_data: dict, user_id: str = Depends(get_current_user)):
    """Envía mensaje entre agentes - COMPATIBLE, ahora soporta cross-user"""
    try:
        # Verificar ownership del agente origen
        async with db_manager.pool.acquire() as conn:
            from_agent = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", from_agent_id)
            to_agent = await conn.fetchrow("SELECT * FROM agents WHERE id = $2", to_agent_id)
            
            if not from_agent or from_agent['user_id'] != user_id:
                raise HTTPException(status_code=403, detail="No tienes permiso para usar este agente")
        
        if from_agent['user_id'] == to_agent['user_id']:
            # Comunicación intra-usuario via MCP local
            mcp_client = await mcp_manager.get_user_mcp_client(user_id)
            tools = await mcp_client.get_tools()
            
            for tool in tools:
                if tool.name == "send_agent_message":
                    response = await tool.ainvoke({
                        "from_agent_id": from_agent_id,
                        "to_agent_id": to_agent_id,
                        "message": message_data['message']
                    })
                    break
        else:
            # Comunicación cross-user
            response = await paia_manager.cross_comm.send_cross_user_message(
                from_agent_id, to_agent_id, message_data['message'], user_id
            )
        
        return {
            "from_agent": from_agent['name'],
            "to_agent": to_agent['name'],
            "response": response
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents/{agent_id}/connected")
async def get_agent_connections(agent_id: str, user_id: str = Depends(get_current_user)):
    """Obtiene agentes conectados - COMPATIBLE"""
    async with db_manager.pool.acquire() as conn:
        # Verificar ownership
        agent = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", agent_id)
        if not agent or agent['user_id'] != user_id:
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        # Obtener conexiones
        connections = await conn.fetch("""
            SELECT a.*, c.type as connection_type, c.is_cross_user, u.name as owner_name
            FROM connections c
            JOIN agents a ON (
                CASE 
                    WHEN c.agent1_id = $1 THEN a.id = c.agent2_id 
                    ELSE a.id = c.agent1_id 
                END
            )
            JOIN users u ON a.user_id = u.id
            WHERE (c.agent1_id = $1 OR c.agent2_id = $1) AND c.status = 'active'
        """, agent_id)
        
        connected = []
        for conn in connections:
            connected.append({
                "id": conn['id'],
                "name": conn['name'],
                "expertise": conn['expertise'],
                "personality": conn['personality'],
                "owner_name": conn['owner_name'],
                "connection_type": conn['connection_type'],
                "is_cross_user": conn['is_cross_user']
            })
        
        return connected

@app.get("/api/conversations/{agent1_id}/{agent2_id}")
async def get_conversation_history(agent1_id: str, agent2_id: str, user_id: str = Depends(get_current_user)):
    """Obtiene historial de conversación - COMPATIBLE"""
    try:
        # Verificar que el usuario tiene acceso a al menos uno de los agentes
        async with db_manager.pool.acquire() as conn:
            agent1 = await conn.fetchrow("SELECT * FROM agents WHERE id = $1", agent1_id)
            agent2 = await conn.fetchrow("SELECT * FROM agents WHERE id = $2", agent2_id)
            
            if not agent1 or not agent2:
                raise HTTPException(status_code=404, detail="Agente no encontrado")
            
            has_access = (agent1['user_id'] == user_id or agent2['user_id'] == user_id)
            if not has_access:
                raise HTTPException(status_code=403, detail="Sin acceso a esta conversación")
            
            # Obtener thread
            a1, a2 = sorted([agent1_id, agent2_id])
            thread = await conn.fetchrow("""
                SELECT * FROM conversation_threads 
                WHERE agent1_id = $1 AND agent2_id = $2
            """, a1, a2)
            
            if not thread:
                return {"messages": []}
            
            # Obtener mensajes
            messages = await conn.fetch("""
                SELECT m.*, 
                       a1.name as from_agent_name,
                       a2.name as to_agent_name,
                       u1.name as from_user_name,
                       u2.name as to_user_name
                FROM messages m
                JOIN agents a1 ON m.from_agent_id = a1.id
                JOIN agents a2 ON m.to_agent_id = a2.id
                JOIN users u1 ON m.from_user_id = u1.id
                JOIN users u2 ON m.to_user_id = u2.id
                WHERE m.thread_id = $1
                ORDER BY m.timestamp ASC
            """, thread['id'])
            
            message_list = []
            for msg in messages:
                message_list.append({
                    "id": msg['id'],
                    "from_agent_id": msg['from_agent_id'],
                    "from_agent_name": msg['from_agent_name'],
                    "from_user_name": msg['from_user_name'],
                    "to_agent_id": msg['to_agent_id'],
                    "to_agent_name": msg['to_agent_name'],
                    "to_user_name": msg['to_user_name'],
                    "content": msg['content'],
                    "timestamp": msg['timestamp'],
                    "delivery_status": msg['delivery_status']
                })
            
            return {"messages": message_list}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =================== NUEVOS ENDPOINTS PARA ESCALABILIDAD ===================

@app.get("/api/network/stats")
async def get_network_stats(user_id: str = Depends(get_current_user)):
    """Estadísticas de la red de agentes del usuario"""
    async with db_manager.pool.acquire() as conn:
        stats = await conn.fetchrow("""
            SELECT 
                COUNT(DISTINCT a.id) as my_agents,
                COUNT(DISTINCT CASE WHEN c.is_cross_user THEN c.id END) as cross_user_connections,
                COUNT(DISTINCT CASE WHEN NOT c.is_cross_user THEN c.id END) as internal_connections,
                COUNT(DISTINCT t.id) as active_conversations,
                COALESCE(SUM(t.message_count), 0) as total_messages
            FROM agents a
            LEFT JOIN connections c ON (a.id = c.agent1_id OR a.id = c.agent2_id)
            LEFT JOIN conversation_threads t ON (a.id = t.agent1_id OR a.id = t.agent2_id)
            WHERE a.user_id = $1
        """, user_id)
        
        return dict(stats)

@app.post("/api/connections/{connection_id}/approve")
async def approve_connection(connection_id: str, user_id: str = Depends(get_current_user)):
    """Aprueba una conexión cross-user pendiente"""
    async with db_manager.pool.acquire() as conn:
        connection = await conn.fetchrow("""
            SELECT * FROM connections WHERE id = $1
        """, connection_id)
        
        if not connection:
            raise HTTPException(status_code=404, detail="Conexión no encontrada")
        
        # Verificar que el usuario puede aprobar (owner del agente2)
        if connection['agent2_user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Sin permisos para aprobar")
        
        if connection['status'] != 'pending':
            raise HTTPException(status_code=400, detail="Conexión no está pendiente")
        
        await conn.execute("""
            UPDATE connections 
            SET status = 'active', approved_at = $1 
            WHERE id = $2
        """, datetime.now(), connection_id)
        
        return {"message": "Conexión aprobada", "connection_id": connection_id}

@app.get("/api/connections/pending")
async def get_pending_connections(user_id: str = Depends(get_current_user)):
    """Obtiene conexiones pendientes de aprobación"""
    async with db_manager.pool.acquire() as conn:
        pending = await conn.fetch("""
            SELECT c.*, 
                   a1.name as requester_agent_name,
                   a2.name as target_agent_name,
                   u1.name as requester_user_name
            FROM connections c
            JOIN agents a1 ON c.agent1_id = a1.id
            JOIN agents a2 ON c.agent2_id = a2.id
            JOIN users u1 ON c.agent1_user_id = u1.id
            WHERE c.agent2_user_id = $1 AND c.status = 'pending'
            ORDER BY c.created DESC
        """, user_id)
        
        return [dict(conn) for conn in pending]

@app.post("/api/architectures/create")
async def create_architecture(architecture_data: dict, user_id: str = Depends(get_current_user)):
    """Crea arquitecturas - COMPATIBLE, mejorado para cross-user"""
    arch_type = architecture_data['type']
    agent_ids = architecture_data['agent_ids']
    
    connections_created = []
    
    try:
        # Verificar que el usuario tiene acceso a todos los agentes o son públicos
        async with db_manager.pool.acquire() as conn:
            agents = await conn.fetch("""
                SELECT * FROM agents WHERE id = ANY($1)
            """, agent_ids)
            
            for agent in agents:
                if agent['user_id'] != user_id and not agent['is_public']:
                    raise HTTPException(status_code=403, detail=f"Sin acceso al agente {agent['name']}")
        
        if arch_type == 'chain':
            for i in range(len(agent_ids) - 1):
                connection_data = {
                    'agent1': agent_ids[i],
                    'agent2': agent_ids[i + 1],
                    'type': 'sequential'
                }
                # Reutilizar el endpoint de conexión existente
                conn_response = await create_connection(connection_data, user_id)
                connections_created.append(conn_response)
                
        elif arch_type == 'hub':
            hub_agent = agent_ids[0]
            for i in range(1, len(agent_ids)):
                connection_data = {
                    'agent1': hub_agent,
                    'agent2': agent_ids[i],
                    'type': 'bidirectional'
                }
                conn_response = await create_connection(connection_data, user_id)
                connections_created.append(conn_response)
                
        elif arch_type == 'mesh':
            for i in range(len(agent_ids)):
                for j in range(i + 1, len(agent_ids)):
                    connection_data = {
                        'agent1': agent_ids[i],
                        'agent2': agent_ids[j],
                        'type': 'mesh'
                    }
                    conn_response = await create_connection(connection_data, user_id)
                    connections_created.append(conn_response)
        
        return {
            "architecture_type": arch_type,
            "connections_created": len(connections_created),
            "connections": connections_created
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# =================== WEBSOCKETS ESCALABLES ===================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}  # user_id -> {connection_id -> websocket}
    
    async def connect(self, websocket: WebSocket, user_id: str, connection_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = {}
        self.active_connections[user_id][connection_id] = websocket
    
    def disconnect(self, user_id: str, connection_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].pop(connection_id, None)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
    
    async def send_to_user(self, user_id: str, message: dict):
        """Envía mensaje a todas las conexiones de un usuario"""
        if user_id in self.active_connections:
            disconnected = []
            for connection_id, websocket in self.active_connections[user_id].items():
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.append(connection_id)
            
            # Limpiar conexiones muertas
            for conn_id in disconnected:
                self.disconnect(user_id, conn_id)

manager = ConnectionManager()

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    connection_id = str(uuid.uuid4())[:8]
    await manager.connect(websocket, user_id, connection_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data['type'] == 'chat':
                # Chat directo con agente via MCP
                agent_id = message_data['agent_id']
                
                try:
                    mcp_client = await mcp_manager.get_user_mcp_client(user_id)
                    tools = await mcp_client.get_tools()
                    
                    for tool in tools:
                        if tool.name == "chat_with_agent":
                            response = await tool.ainvoke({
                                "agent_id": agent_id,
                                "message": message_data['message']
                            })
                            
                            await websocket.send_text(json.dumps({
                                "type": "response",
                                "agent_id": agent_id,
                                "message": response,
                                "timestamp": datetime.now().isoformat()
                            }))
                            break
                            
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Error: {str(e)}"
                    }))
            
            elif message_data['type'] == 'agent_to_agent':
                # Comunicación entre agentes
                from_agent_id = message_data['from_agent_id']
                to_agent_id = message_data['to_agent_id']
                message = message_data['message']
                
                try:
                    # Usar el endpoint existente
                    response_data = {"message": message}
                    result = await send_message_between_agents(from_agent_id, to_agent_id, response_data, user_id)
                    
                    await websocket.send_text(json.dumps({
                        "type": "agent_message",
                        "from_agent": result['from_agent'],
                        "to_agent": result['to_agent'],
                        "message": message,
                        "response": result['response'],
                        "timestamp": datetime.now().isoformat()
                    }))
                    
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "error",
                        "message": f"Error: {str(e)}"
                    }))
                        
    except Exception as e:
        print(f"WebSocket error for user {user_id}: {e}")
    finally:
        manager.disconnect(user_id, connection_id)

# =================== HEALTH & MONITORING ===================

@app.get("/api/health")
async def health_check():
    """Health check expandido para monitoreo"""
    try:
        # Stats de base de datos
        async with db_manager.pool.acquire() as conn:
            db_stats = await conn.fetchrow("""
                SELECT 
                    (SELECT COUNT(*) FROM users) as total_users,
                    (SELECT COUNT(*) FROM agents) as total_agents,
                    (SELECT COUNT(*) FROM connections) as total_connections,
                    (SELECT COUNT(*) FROM conversation_threads) as total_threads,
                    (SELECT COUNT(*) FROM messages) as total_messages
            """)
        
        # Stats de MCP servers
        active_mcp_servers = len(mcp_manager.active_servers)
        
        # Stats de WebSocket
        active_websockets = sum(len(conns) for conns in manager.active_connections.values())
        
        return {
            "status": "healthy",
            "database": dict(db_stats),
            "mcp_servers": {
                "active": active_mcp_servers,
                "max_capacity": MAX_MCP_SERVERS
            },
            "websockets": {
                "active_connections": active_websockets,
                "connected_users": len(manager.active_connections)
            },
            "system": {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_percent": psutil.disk_usage('/').percent
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/api/admin/mcp-servers")
async def list_mcp_servers():
    """Lista todos los servidores MCP activos (admin)"""
    return {
        "active_servers": mcp_manager.active_servers,
        "port_allocation": {
            "allocated_ports": list(mcp_manager.port_manager.allocated_ports),
            "next_port": mcp_manager.port_manager.next_port
        }
    }

@app.post("/api/admin/cleanup")
async def cleanup_inactive_resources():
    """Limpia recursos inactivos (admin)"""
    cleaned = {
        "mcp_servers": 0,
        "database_records": 0
    }
    
    try:
        # Limpiar servidores MCP de usuarios inactivos
        async with db_manager.pool.acquire() as conn:
            inactive_users = await conn.fetch("""
                SELECT id FROM users 
                WHERE status = 'inactive' 
                AND created < NOW() - INTERVAL '30 days'
            """)
            
            for user in inactive_users:
                if user['id'] in mcp_manager.active_servers:
                    await mcp_manager.stop_user_mcp_server(user['id'])
                    cleaned['mcp_servers'] += 1
        
        return cleaned
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("🚀 Iniciando PAIA Platform Backend Escalable...")
    print("📊 Capacidades:")
    print(f"   - 🏗️  Soporte para {MAX_MCP_SERVERS} usuarios simultáneos")
    print("   - 🔗 Comunicación cross-user via MCP")
    print("   - 🌐 Red social de agentes")
    print("   - 📱 APIs compatibles con frontend existente")
    print("   - 🗄️  PostgreSQL + Redis para persistencia")
    print("   - 🐳 Docker para aislamiento de agentes")
    print("   - 📡 WebSockets escalables")
    print("")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info",
        workers=1  # Single worker para mantener estado consistente
    )