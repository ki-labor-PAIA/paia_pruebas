# db_manager.py
import os
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import (
    MetaData, Table, Column, String, DateTime, Boolean, Text, Integer, 
    select, insert, update, delete, and_, or_
)
from sqlalchemy.dialects.postgresql import JSONB

@dataclass
class DBAgent:
    id: str
    user_id: str
    name: str
    description: str
    personality: str
    expertise: str
    status: str
    mcp_endpoint: str
    is_public: bool
    telegram_chat_id: Optional[str]
    is_persistent: bool
    auto_start: bool
    created_at: datetime
    updated_at: datetime

@dataclass
class DBConnection:
    id: str
    agent1_id: str
    agent2_id: str
    connection_type: str
    status: str
    created_at: datetime

@dataclass
class DBMessage:
    id: str
    conversation_id: str
    from_agent_id: str
    to_agent_id: str
    content: str
    message_type: str
    is_read: bool
    telegram_sent: bool
    created_at: datetime

@dataclass
class DBNotification:
    id: str
    user_id: str
    agent_id: Optional[str]
    title: str
    content: str
    notification_type: str
    priority: str
    is_read: bool
    is_dismissed: bool
    sent_telegram: bool
    sent_email: bool
    created_at: datetime
    read_at: Optional[datetime]
    dismissed_at: Optional[datetime]

class DatabaseManager:
    def __init__(self, database_url: str):
        self.engine = create_async_engine(database_url, echo=False, pool_pre_ping=True)
        self.Session = async_sessionmaker(self.engine, expire_on_commit=False)
        
        # Definir tablas usando SQLAlchemy Core
        self.metadata = MetaData()
        
        self.agents = Table(
            "agents", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("user_id", String(36), nullable=False),
            Column("name", String(100), nullable=False),
            Column("description", Text),
            Column("personality", Text, nullable=False),
            Column("expertise", Text, nullable=False),
            Column("status", String(20), default='offline'),
            Column("mcp_endpoint", String(255)),
            Column("is_public", Boolean, default=False),
            Column("telegram_chat_id", String(255)),
            Column("is_persistent", Boolean, default=False),
            Column("auto_start", Boolean, default=False),
            Column("created_at", DateTime, nullable=False),
            Column("updated_at", DateTime, nullable=False)
        )
        
        self.agent_connections = Table(
            "agent_connections", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("agent1_id", String(36), nullable=False),
            Column("agent2_id", String(36), nullable=False),
            Column("connection_type", String(50), default='bidirectional'),
            Column("status", String(20), default='active'),
            Column("created_at", DateTime, nullable=False)
        )
        
        self.agent_messages = Table(
            "agent_messages", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("conversation_id", String(100), nullable=False),
            Column("from_agent_id", String(36), nullable=False),
            Column("to_agent_id", String(36), nullable=False),
            Column("content", Text, nullable=False),
            Column("message_type", String(50), default='text'),
            Column("is_read", Boolean, default=False),
            Column("telegram_sent", Boolean, default=False),
            Column("created_at", DateTime, nullable=False)
        )
        
        self.notifications = Table(
            "notifications", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("user_id", String(36), nullable=False),
            Column("agent_id", String(36)),
            Column("title", String(255), nullable=False),
            Column("content", Text, nullable=False),
            Column("notification_type", String(50), default='info'),
            Column("priority", String(20), default='normal'),
            Column("is_read", Boolean, default=False),
            Column("is_dismissed", Boolean, default=False),
            Column("sent_telegram", Boolean, default=False),
            Column("sent_email", Boolean, default=False),
            Column("created_at", DateTime, nullable=False),
            Column("read_at", DateTime),
            Column("dismissed_at", DateTime)
        )
        
        self.workflows = Table(
            "workflows", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("user_id", String(36), nullable=False),
            Column("name", String(255), nullable=False),
            Column("description", Text),
            Column("workflow_data", JSONB, nullable=False),
            Column("is_public", Boolean, default=False),
            Column("is_active", Boolean, default=True),
            Column("auto_start", Boolean, default=False),
            Column("schedule_config", JSONB),
            Column("execution_count", Integer, default=0),
            Column("last_executed_at", DateTime),
            Column("created_at", DateTime, nullable=False),
            Column("updated_at", DateTime, nullable=False)
        )
        
        self.user_connections = Table(
            "user_connections", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("requester_id", String(36), nullable=False),
            Column("recipient_id", String(36), nullable=False),
            Column("status", String(20), default='pending'),
            Column("connection_type", String(50), default='friend'),
            Column("can_see_workflows", Boolean, default=False),
            Column("can_connect_agents", Boolean, default=False),
            Column("can_send_notifications", Boolean, default=True),
            Column("created_at", DateTime, nullable=False),
            Column("updated_at", DateTime, nullable=False)
        )
        
        # Tabla para conexiones de flujo (nodos de conexión en canvas)
        self.flow_connections = Table(
            "flow_connections", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("flow_owner_id", String(36), nullable=False),  # Usuario dueño del flujo
            Column("target_user_id", String(36), nullable=False),  # Usuario con quien se conecta
            Column("target_agent_id", String(36), nullable=True),  # Agente específico (opcional)
            Column("connection_node_id", String(36), nullable=False),  # ID del nodo en el canvas
            Column("connection_type", String(50), default='agent'),  # 'agent', 'workflow', 'notification'
            Column("status", String(20), default='active'),  # 'active', 'paused', 'disconnected'
            Column("permissions", JSONB, nullable=True),  # Permisos específicos del flujo
            Column("metadata", JSONB, nullable=True),  # Datos adicionales de configuración
            Column("created_at", DateTime, nullable=False),
            Column("updated_at", DateTime, nullable=False)
        )
        
        # Tabla para flujos guardados
        self.saved_flows = Table(
            "saved_flows", self.metadata,
            Column("id", String(36), primary_key=True),
            Column("user_id", String(36), nullable=False),  # Dueño del flujo
            Column("name", String(100), nullable=False),  # Nombre identificador
            Column("description", Text, nullable=True),  # Descripción opcional
            Column("flow_data", JSONB, nullable=False),  # Datos del flujo (nodes, edges, etc.)
            Column("is_public", Boolean, default=False),  # Si es público para amigos
            Column("is_active", Boolean, default=False),  # Si está ejecutándose
            Column("version", Integer, default=1),  # Versión del flujo
            Column("tags", JSONB, nullable=True),  # Tags para categorización
            Column("metadata", JSONB, nullable=True),  # Metadatos adicionales
            Column("created_at", DateTime, nullable=False),
            Column("updated_at", DateTime, nullable=False)
        )

    async def init_db(self):
        """Inicializar las tablas gestionadas por este manager"""
        async with self.engine.begin() as conn:
            await conn.run_sync(self.metadata.create_all)

    # ============== GESTIÓN DE AGENTES ==============
    
    async def create_agent(self, agent_data: dict) -> DBAgent:
        """Crear un nuevo agente en la BD"""
        agent_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        async with self.Session() as session:
            stmt = insert(self.agents).values(
                id=agent_id,
                user_id=agent_data['user_id'],
                name=agent_data['name'],
                description=agent_data.get('description', ''),
                personality=agent_data['personality'],
                expertise=agent_data['expertise'],
                status='online',
                mcp_endpoint=agent_data.get('mcp_endpoint', ''),
                is_public=agent_data.get('is_public', False),
                telegram_chat_id=agent_data.get('telegram_chat_id'),
                is_persistent=agent_data.get('is_persistent', False),
                auto_start=agent_data.get('auto_start', False),
                created_at=now,
                updated_at=now
            )
            await session.execute(stmt)
            await session.commit()
            
            return DBAgent(
                id=agent_id,
                user_id=agent_data['user_id'],
                name=agent_data['name'],
                description=agent_data.get('description', ''),
                personality=agent_data['personality'],
                expertise=agent_data['expertise'],
                status='online',
                mcp_endpoint=agent_data.get('mcp_endpoint', ''),
                is_public=agent_data.get('is_public', False),
                telegram_chat_id=agent_data.get('telegram_chat_id'),
                is_persistent=agent_data.get('is_persistent', False),
                auto_start=agent_data.get('auto_start', False),
                created_at=now,
                updated_at=now
            )

    async def get_agents_by_user(self, user_id: str) -> List[DBAgent]:
        """Obtener todos los agentes de un usuario"""
        async with self.Session() as session:
            stmt = select(self.agents).where(self.agents.c.user_id == user_id)
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            return [
                DBAgent(
                    id=row.id,
                    user_id=row.user_id,
                    name=row.name,
                    description=row.description,
                    personality=row.personality,
                    expertise=row.expertise,
                    status=row.status,
                    mcp_endpoint=row.mcp_endpoint,
                    is_public=row.is_public,
                    telegram_chat_id=row.telegram_chat_id,
                    is_persistent=row.is_persistent,
                    auto_start=row.auto_start,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
                for row in rows
            ]

    async def get_public_agents(self, exclude_user_id: str = None) -> List[DBAgent]:
        """Obtener todos los agentes públicos"""
        async with self.Session() as session:
            stmt = select(self.agents).where(self.agents.c.is_public == True)
            if exclude_user_id:
                stmt = stmt.where(self.agents.c.user_id != exclude_user_id)
            
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            return [
                DBAgent(
                    id=row.id,
                    user_id=row.user_id,
                    name=row.name,
                    description=row.description,
                    personality=row.personality,
                    expertise=row.expertise,
                    status=row.status,
                    mcp_endpoint=row.mcp_endpoint,
                    is_public=row.is_public,
                    telegram_chat_id=row.telegram_chat_id,
                    is_persistent=row.is_persistent,
                    auto_start=row.auto_start,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
                for row in rows
            ]

    async def get_agent_by_id(self, agent_id: str) -> Optional[DBAgent]:
        """Obtener un agente por su ID"""
        async with self.Session() as session:
            stmt = select(self.agents).where(self.agents.c.id == agent_id)
            result = await session.execute(stmt)
            row = result.fetchone()
            
            if row:
                return DBAgent(
                    id=row.id,
                    user_id=row.user_id,
                    name=row.name,
                    description=row.description,
                    personality=row.personality,
                    expertise=row.expertise,
                    status=row.status,
                    mcp_endpoint=row.mcp_endpoint,
                    is_public=row.is_public,
                    telegram_chat_id=row.telegram_chat_id,
                    is_persistent=row.is_persistent,
                    auto_start=row.auto_start,
                    created_at=row.created_at,
                    updated_at=row.updated_at
                )
            return None

    async def update_agent_status(self, agent_id: str, status: str):
        """Actualizar el estado de un agente"""
        async with self.Session() as session:
            stmt = update(self.agents).where(
                self.agents.c.id == agent_id
            ).values(status=status, updated_at=datetime.utcnow())
            await session.execute(stmt)
            await session.commit()

    # ============== GESTIÓN DE CONEXIONES ==============
    
    async def create_connection(self, agent1_id: str, agent2_id: str, connection_type: str = "bidirectional") -> DBConnection:
        """Crear conexión entre agentes"""
        connection_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        async with self.Session() as session:
            stmt = insert(self.agent_connections).values(
                id=connection_id,
                agent1_id=agent1_id,
                agent2_id=agent2_id,
                connection_type=connection_type,
                status='active',
                created_at=now
            )
            await session.execute(stmt)
            await session.commit()
            
            return DBConnection(
                id=connection_id,
                agent1_id=agent1_id,
                agent2_id=agent2_id,
                connection_type=connection_type,
                status='active',
                created_at=now
            )

    async def get_agent_connections(self, agent_id: str) -> List[str]:
        """Obtener IDs de agentes conectados"""
        async with self.Session() as session:
            stmt = select(
                self.agent_connections.c.agent1_id,
                self.agent_connections.c.agent2_id
            ).where(
                or_(
                    self.agent_connections.c.agent1_id == agent_id,
                    self.agent_connections.c.agent2_id == agent_id
                )
            ).where(self.agent_connections.c.status == 'active')
            
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            connected_ids = []
            for row in rows:
                if row.agent1_id == agent_id:
                    connected_ids.append(row.agent2_id)
                else:
                    connected_ids.append(row.agent1_id)
            
            return connected_ids

    async def are_agents_connected(self, agent1_id: str, agent2_id: str) -> bool:
        """Verificar si dos agentes están conectados"""
        async with self.Session() as session:
            stmt = select(self.agent_connections.c.id).where(
                or_(
                    and_(
                        self.agent_connections.c.agent1_id == agent1_id,
                        self.agent_connections.c.agent2_id == agent2_id
                    ),
                    and_(
                        self.agent_connections.c.agent1_id == agent2_id,
                        self.agent_connections.c.agent2_id == agent1_id
                    )
                )
            ).where(self.agent_connections.c.status == 'active')
            
            result = await session.execute(stmt)
            return result.fetchone() is not None

    # ============== GESTIÓN DE MENSAJES ==============
    
    async def save_message(self, message_data: dict) -> DBMessage:
        """Guardar mensaje en BD"""
        message_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        async with self.Session() as session:
            stmt = insert(self.agent_messages).values(
                id=message_id,
                conversation_id=message_data['conversation_id'],
                from_agent_id=message_data['from_agent_id'],
                to_agent_id=message_data['to_agent_id'],
                content=message_data['content'],
                message_type=message_data.get('message_type', 'text'),
                is_read=False,
                telegram_sent=message_data.get('telegram_sent', False),
                created_at=now
            )
            await session.execute(stmt)
            await session.commit()
            
            return DBMessage(
                id=message_id,
                conversation_id=message_data['conversation_id'],
                from_agent_id=message_data['from_agent_id'],
                to_agent_id=message_data['to_agent_id'],
                content=message_data['content'],
                message_type=message_data.get('message_type', 'text'),
                is_read=False,
                telegram_sent=message_data.get('telegram_sent', False),
                created_at=now
            )

    async def get_conversation_history(self, conversation_id: str, limit: int = 50) -> List[DBMessage]:
        """Obtener historial de conversación"""
        async with self.Session() as session:
            stmt = select(self.agent_messages).where(
                self.agent_messages.c.conversation_id == conversation_id
            ).order_by(self.agent_messages.c.created_at.asc()).limit(limit)
            
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            return [
                DBMessage(
                    id=row.id,
                    conversation_id=row.conversation_id,
                    from_agent_id=row.from_agent_id,
                    to_agent_id=row.to_agent_id,
                    content=row.content,
                    message_type=row.message_type,
                    is_read=row.is_read,
                    telegram_sent=row.telegram_sent,
                    created_at=row.created_at
                )
                for row in rows
            ]

    # ============== GESTIÓN DE NOTIFICACIONES ==============
    
    async def create_notification(self, notification_data: dict) -> DBNotification:
        """Crear nueva notificación"""
        notification_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        async with self.Session() as session:
            stmt = insert(self.notifications).values(
                id=notification_id,
                user_id=notification_data['user_id'],
                agent_id=notification_data.get('agent_id'),
                title=notification_data['title'],
                content=notification_data['content'],
                notification_type=notification_data.get('notification_type', 'info'),
                priority=notification_data.get('priority', 'normal'),
                is_read=False,
                is_dismissed=False,
                sent_telegram=notification_data.get('sent_telegram', False),
                sent_email=notification_data.get('sent_email', False),
                created_at=now,
                read_at=None,
                dismissed_at=None
            )
            await session.execute(stmt)
            await session.commit()
            
            return DBNotification(
                id=notification_id,
                user_id=notification_data['user_id'],
                agent_id=notification_data.get('agent_id'),
                title=notification_data['title'],
                content=notification_data['content'],
                notification_type=notification_data.get('notification_type', 'info'),
                priority=notification_data.get('priority', 'normal'),
                is_read=False,
                is_dismissed=False,
                sent_telegram=notification_data.get('sent_telegram', False),
                sent_email=notification_data.get('sent_email', False),
                created_at=now,
                read_at=None,
                dismissed_at=None
            )

    async def get_user_notifications(self, user_id: str, unread_only: bool = False, limit: int = 50) -> List[DBNotification]:
        """Obtener notificaciones de un usuario"""
        async with self.Session() as session:
            stmt = select(self.notifications).where(self.notifications.c.user_id == user_id)
            
            if unread_only:
                stmt = stmt.where(self.notifications.c.is_read == False)
            
            stmt = stmt.order_by(self.notifications.c.created_at.desc()).limit(limit)
            
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            return [
                DBNotification(
                    id=row.id,
                    user_id=row.user_id,
                    agent_id=row.agent_id,
                    title=row.title,
                    content=row.content,
                    notification_type=row.notification_type,
                    priority=row.priority,
                    is_read=row.is_read,
                    is_dismissed=row.is_dismissed,
                    sent_telegram=row.sent_telegram,
                    sent_email=row.sent_email,
                    created_at=row.created_at,
                    read_at=row.read_at,
                    dismissed_at=row.dismissed_at
                )
                for row in rows
            ]

    async def mark_notification_as_read(self, notification_id: str):
        """Marcar notificación como leída"""
        async with self.Session() as session:
            stmt = update(self.notifications).where(
                self.notifications.c.id == notification_id
            ).values(is_read=True, read_at=datetime.utcnow())
            await session.execute(stmt)
            await session.commit()

    # ============== GESTIÓN DE USUARIOS Y CONEXIONES ==============
    
    async def create_user_connection_request(self, requester_id: str, recipient_id: str, connection_type: str = "friend"):
        """Crear solicitud de conexión entre usuarios, evitando duplicados."""
        async with self.Session() as session:
            # 1. Verificar si ya existe una conexión en cualquier dirección
            existing_connection_stmt = select(self.user_connections.c.id).where(
                or_(
                    and_(self.user_connections.c.requester_id == requester_id, self.user_connections.c.recipient_id == recipient_id),
                    and_(self.user_connections.c.requester_id == recipient_id, self.user_connections.c.recipient_id == requester_id)
                )
            )
            result = await session.execute(existing_connection_stmt)
            if result.fetchone():
                # Si ya existe, no hacer nada y devolver None
                return None

            # 2. Si no existe, crear la nueva solicitud
            connection_id = str(uuid.uuid4())[:8]
            now = datetime.utcnow()
            
            stmt = insert(self.user_connections).values(
                id=connection_id,
                requester_id=requester_id,
                recipient_id=recipient_id,
                status='pending',
                connection_type=connection_type,
                can_see_workflows=False,
                can_connect_agents=False,
                can_send_notifications=True,
                created_at=now,
                updated_at=now
            )
            await session.execute(stmt)
            await session.commit()
            return connection_id

    async def search_users(self, search_term: str, exclude_user_id: str = None, limit: int = 20) -> List[dict]:
        """Buscar usuarios por nombre o email"""
        async with self.Session() as session:
            # Necesitamos importar la tabla de usuarios desde auth_manager
            from sqlalchemy import text
            
            query = """
            SELECT id, name, email, image 
            FROM users 
            WHERE (name ILIKE :search OR email ILIKE :search)
            AND is_active = true
            """
            
            if exclude_user_id:
                query += " AND id != :exclude_user_id"
            
            query += " LIMIT :limit"
            
            params = {
                'search': f'%{search_term}%',
                'limit': limit
            }
            
            if exclude_user_id:
                params['exclude_user_id'] = exclude_user_id
            
            result = await session.execute(text(query), params)
            rows = result.fetchall()
            
            return [
                {
                    'id': row.id,
                    'name': row.name,
                    'email': row.email,
                    'image': row.image
                }
                for row in rows
            ]

    async def update_connection_status(self, connection_id: str, new_status: str) -> bool:
        """Actualizar el estado de una conexión"""
        async with self.Session() as session:
            from sqlalchemy import update
            
            stmt = update(self.user_connections).where(
                self.user_connections.c.id == connection_id
            ).values(
                status=new_status,
                updated_at=datetime.utcnow()
            )
            
            result = await session.execute(stmt)
            await session.commit()
            
            return result.rowcount > 0

    async def get_connection_by_id(self, connection_id: str) -> dict:
        """Obtener información de una conexión por ID"""
        async with self.Session() as session:
            from sqlalchemy import select
            
            stmt = select(self.user_connections).where(
                self.user_connections.c.id == connection_id
            )
            
            result = await session.execute(stmt)
            row = result.fetchone()
            
            if row:
                return {
                    'id': row.id,
                    'requester_id': row.requester_id,
                    'recipient_id': row.recipient_id,
                    'status': row.status,
                    'connection_type': row.connection_type,
                    'created_at': row.created_at,
                    'updated_at': row.updated_at
                }
            return None

    async def get_user_connections(self, user_id: str, status: str = 'accepted') -> List[dict]:
        """Obtener las conexiones de un usuario, devolviendo detalles del requester y recipient."""
        async with self.Session() as session:
            from sqlalchemy import text
            
            query = """
            SELECT 
                uc.id as connection_id, 
                uc.status, 
                uc.connection_type, 
                uc.created_at,
                uc.requester_id,
                uc.recipient_id,
                req.name as requester_name,
                req.email as requester_email,
                req.image as requester_image,
                rec.name as recipient_name,
                rec.email as recipient_email,
                rec.image as recipient_image
            FROM user_connections uc
            JOIN users req ON uc.requester_id = req.id
            JOIN users rec ON uc.recipient_id = rec.id
            WHERE (uc.requester_id = :user_id OR uc.recipient_id = :user_id)
            AND uc.status = :status
            ORDER BY uc.created_at DESC
            """
            
            result = await session.execute(text(query), {'user_id': user_id, 'status': status})
            rows = result.fetchall()
            
            return [
                {
                    'connection_id': row.connection_id,
                    'status': row.status,
                    'connection_type': row.connection_type,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'requester': {
                        'id': row.requester_id,
                        'name': row.requester_name,
                        'email': row.requester_email,
                        'image': row.requester_image
                    },
                    'recipient': {
                        'id': row.recipient_id,
                        'name': row.recipient_name,
                        'email': row.recipient_email,
                        'image': row.recipient_image
                    }
                }
                for row in rows
            ]

    # ============== GESTIÓN DE CONEXIONES DE FLUJO ==============
    
    async def create_flow_connection(self, connection_data: dict) -> str:
        """Crear una conexión de flujo entre usuarios"""
        connection_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        async with self.Session() as session:
            stmt = insert(self.flow_connections).values(
                id=connection_id,
                flow_owner_id=connection_data.get('flow_owner_id'),
                target_user_id=connection_data.get('target_user_id'),
                target_agent_id=connection_data.get('target_agent_id'),
                connection_node_id=connection_data.get('connection_node_id'),
                connection_type=connection_data.get('connection_type', 'agent'),
                status=connection_data.get('status', 'active'),
                permissions=connection_data.get('permissions'),
                metadata=connection_data.get('metadata'),
                created_at=now,
                updated_at=now
            )
            await session.execute(stmt)
            await session.commit()
            return connection_id

    async def get_flow_connections(self, flow_owner_id: str) -> List[dict]:
        """Obtener las conexiones de flujo de un usuario"""
        async with self.Session() as session:
            from sqlalchemy import select, text
            
            query = """
            SELECT 
                fc.id, fc.target_user_id, fc.target_agent_id, fc.connection_node_id,
                fc.connection_type, fc.status, fc.permissions, fc.metadata,
                fc.created_at, fc.updated_at,
                u.name as target_user_name, u.email as target_user_email,
                u.image as target_user_image
            FROM flow_connections fc
            JOIN users u ON fc.target_user_id = u.id
            WHERE fc.flow_owner_id = :flow_owner_id
            AND fc.status = 'active'
            ORDER BY fc.created_at DESC
            """
            
            result = await session.execute(text(query), {
                'flow_owner_id': flow_owner_id
            })
            rows = result.fetchall()
            
            return [
                {
                    'connection_id': row.id,
                    'target_user_id': row.target_user_id,
                    'target_user_name': row.target_user_name,
                    'target_user_email': row.target_user_email,
                    'target_user_image': row.target_user_image,
                    'target_agent_id': row.target_agent_id,
                    'connection_node_id': row.connection_node_id,
                    'connection_type': row.connection_type,
                    'status': row.status,
                    'permissions': row.permissions,
                    'metadata': row.metadata,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None
                }
                for row in rows
            ]

    async def update_flow_connection_status(self, connection_id: str, new_status: str) -> bool:
        """Actualizar el estado de una conexión de flujo"""
        async with self.Session() as session:
            from sqlalchemy import update
            
            stmt = update(self.flow_connections).where(
                self.flow_connections.c.id == connection_id
            ).values(
                status=new_status,
                updated_at=datetime.utcnow()
            )
            
            result = await session.execute(stmt)
            await session.commit()
            
            return result.rowcount > 0

    async def delete_flow_connection(self, connection_id: str) -> bool:
        """Eliminar una conexión de flujo"""
        async with self.Session() as session:
            from sqlalchemy import delete
            
            stmt = delete(self.flow_connections).where(
                self.flow_connections.c.id == connection_id
            )
            
            result = await session.execute(stmt)
            await session.commit()
            
            return result.rowcount > 0

    # ============== GESTIÓN DE FLUJOS GUARDADOS ==============
    
    async def save_flow(self, flow_data: dict) -> str:
        """Guardar un flujo en la base de datos"""
        flow_id = str(uuid.uuid4())[:8]
        now = datetime.utcnow()
        
        async with self.Session() as session:
            stmt = insert(self.saved_flows).values(
                id=flow_id,
                user_id=flow_data.get('user_id'),
                name=flow_data.get('name'),
                description=flow_data.get('description'),
                flow_data=flow_data.get('flow_data'),
                is_public=flow_data.get('is_public', False),
                is_active=flow_data.get('is_active', False),
                version=flow_data.get('version', 1),
                tags=flow_data.get('tags'),
                metadata=flow_data.get('metadata'),
                created_at=now,
                updated_at=now
            )
            await session.execute(stmt)
            await session.commit()
            return flow_id

    async def get_user_flows(self, user_id: str) -> List[dict]:
        """Obtener los flujos guardados de un usuario"""
        async with self.Session() as session:
            from sqlalchemy import select
            
            stmt = select(self.saved_flows).where(
                self.saved_flows.c.user_id == user_id
            ).order_by(self.saved_flows.c.updated_at.desc())
            
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            return [
                {
                    'id': row.id,
                    'name': row.name,
                    'description': row.description,
                    'flow_data': row.flow_data,
                    'is_public': row.is_public,
                    'is_active': row.is_active,
                    'version': row.version,
                    'tags': row.tags,
                    'metadata': row.metadata,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None
                }
                for row in rows
            ]

    async def get_public_flows_by_user(self, user_id: str) -> List[dict]:
        """Obtener los flujos públicos de un usuario específico."""
        async with self.Session() as session:
            stmt = select(self.saved_flows).where(
                and_(
                    self.saved_flows.c.user_id == user_id,
                    self.saved_flows.c.is_public == True
                )
            ).order_by(self.saved_flows.c.updated_at.desc())
            
            result = await session.execute(stmt)
            rows = result.fetchall()
            
            return [
                {
                    'id': row.id,
                    'name': row.name,
                    'description': row.description,
                    'flow_data': row.flow_data,
                    'is_public': row.is_public,
                    'is_active': row.is_active,
                    'version': row.version,
                    'tags': row.tags,
                    'metadata': row.metadata,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None
                }
                for row in rows
            ]

    async def get_friends_active_flows(self, user_id: str) -> List[dict]:
        """Obtener flujos activos de amigos"""
        async with self.Session() as session:
            from sqlalchemy import text
            
            query = """
            SELECT 
                sf.id, sf.name, sf.description, sf.is_active, sf.tags, sf.metadata,
                sf.created_at, sf.updated_at,
                u.id as owner_id, u.name as owner_name, u.email as owner_email,
                u.image as owner_image,
                uc.connection_type
            FROM saved_flows sf
            JOIN users u ON sf.user_id = u.id
            JOIN user_connections uc ON (
                (uc.requester_id = :user_id AND uc.recipient_id = sf.user_id) OR
                (uc.recipient_id = :user_id AND uc.requester_id = sf.user_id)
            )
            WHERE sf.is_public = true 
            AND sf.is_active = true
            AND uc.status = 'accepted'
            AND sf.user_id != :user_id
            ORDER BY sf.updated_at DESC
            """
            
            result = await session.execute(text(query), {'user_id': user_id})
            rows = result.fetchall()
            
            return [
                {
                    'id': row.id,
                    'name': row.name,
                    'description': row.description,
                    'is_active': row.is_active,
                    'tags': row.tags,
                    'metadata': row.metadata,
                    'created_at': row.created_at.isoformat() if row.created_at else None,
                    'updated_at': row.updated_at.isoformat() if row.updated_at else None,
                    'owner': {
                        'id': row.owner_id,
                        'name': row.owner_name,
                        'email': row.owner_email,
                        'image': row.owner_image
                    },
                    'connection_type': row.connection_type
                }
                for row in rows
            ]

    async def update_flow_status(self, flow_id: str, is_active: bool) -> bool:
        """Actualizar el estado activo/inactivo de un flujo"""
        async with self.Session() as session:
            from sqlalchemy import update
            
            stmt = update(self.saved_flows).where(
                self.saved_flows.c.id == flow_id
            ).values(
                is_active=is_active,
                updated_at=datetime.utcnow()
            )
            
            result = await session.execute(stmt)
            await session.commit()
            
            return result.rowcount > 0

    async def delete_flow(self, flow_id: str, user_id: str) -> bool:
        """Eliminar un flujo (solo el dueño puede eliminarlo)"""
        async with self.Session() as session:
            from sqlalchemy import delete
            
            stmt = delete(self.saved_flows).where(
                self.saved_flows.c.id == flow_id,
                self.saved_flows.c.user_id == user_id
            )
            
            result = await session.execute(stmt)
            await session.commit()
            
            return result.rowcount > 0