# db_manager_supabase.py
import os
import uuid
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
from supabase_config import supabase_client

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

@dataclass
class DBNote:
    id: str
    agent_id: str
    title: str
    content: str
    tags: List[str]
    created_at: datetime
    updated_at: datetime

class DatabaseManager:
    def __init__(self):
        self.client = supabase_client

    # =============== AGENTS ===============
    async def create_agent(self, agent_data: Dict) -> DBAgent:
        """Crear un nuevo agente"""
        agent_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = {
            "id": agent_id,
            "user_id": agent_data["user_id"],
            "name": agent_data["name"],
            "description": agent_data.get("description", ""),
            "personality": agent_data.get("personality", ""),
            "expertise": agent_data.get("expertise", ""),
            "status": agent_data.get("status", "inactive"),
            "mcp_endpoint": agent_data.get("mcp_endpoint", ""),
            "is_public": agent_data.get("is_public", False),
            "telegram_chat_id": agent_data.get("telegram_chat_id"),
            "is_persistent": agent_data.get("is_persistent", False),
            "auto_start": agent_data.get("auto_start", False),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        result = self.client.table("agents").insert(data).execute()
        if result.data:
            return self._dict_to_agent(result.data[0])
        raise Exception("Failed to create agent")

    async def get_agent(self, agent_id: str) -> Optional[DBAgent]:
        """Obtener un agente por ID"""
        result = self.client.table("agents").select("*").eq("id", agent_id).execute()
        if result.data:
            return self._dict_to_agent(result.data[0])
        return None

    async def get_agents_by_user(self, user_id: str) -> List[DBAgent]:
        """Obtener todos los agentes de un usuario"""
        result = self.client.table("agents").select("*").eq("user_id", user_id).execute()
        return [self._dict_to_agent(row) for row in result.data]

    async def update_agent(self, agent_id: str, updates: Dict) -> bool:
        """Actualizar un agente"""
        updates["updated_at"] = datetime.utcnow().isoformat()
        result = self.client.table("agents").update(updates).eq("id", agent_id).execute()
        return len(result.data) > 0

    async def delete_agent(self, agent_id: str) -> bool:
        """Eliminar un agente"""
        result = self.client.table("agents").delete().eq("id", agent_id).execute()
        return len(result.data) > 0

    # =============== CONNECTIONS ===============
    async def create_connection(self, agent1_id: str, agent2_id: str, connection_type: str = "standard") -> DBConnection:
        """Crear una conexión entre agentes"""
        connection_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = {
            "id": connection_id,
            "agent1_id": agent1_id,
            "agent2_id": agent2_id,
            "connection_type": connection_type,
            "status": "active",
            "created_at": now.isoformat()
        }
        
        result = self.client.table("agent_connections").insert(data).execute()
        if result.data:
            return self._dict_to_connection(result.data[0])
        raise Exception("Failed to create connection")

    async def get_agent_connections(self, agent_id: str) -> List[DBConnection]:
        """Obtener todas las conexiones de un agente"""
        result = self.client.table("agent_connections").select("*").or_(
            f"agent1_id.eq.{agent_id},agent2_id.eq.{agent_id}"
        ).execute()
        return [self._dict_to_connection(row) for row in result.data]

    # =============== MESSAGES ===============
    async def save_message(self, message_data: Dict) -> DBMessage:
        """Guardar un mensaje"""
        message_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = {
            "id": message_id,
            "conversation_id": message_data["conversation_id"],
            "from_agent_id": message_data["from_agent_id"],
            "to_agent_id": message_data["to_agent_id"],
            "content": message_data["content"],
            "message_type": message_data.get("message_type", "text"),
            "is_read": message_data.get("is_read", False),
            "telegram_sent": message_data.get("telegram_sent", False),
            "created_at": now.isoformat()
        }
        
        result = self.client.table("agent_messages").insert(data).execute()
        if result.data:
            return self._dict_to_message(result.data[0])
        raise Exception("Failed to save message")

    async def get_conversation_messages(self, conversation_id: str, limit: int = 50) -> List[DBMessage]:
        """Obtener mensajes de una conversación"""
        result = self.client.table("agent_messages").select("*").eq(
            "conversation_id", conversation_id
        ).order("created_at", desc=True).limit(limit).execute()
        return [self._dict_to_message(row) for row in result.data]

    # =============== NOTIFICATIONS ===============
    async def create_notification(self, notification_data: Dict) -> DBNotification:
        """Crear una notificación"""
        notification_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = {
            "id": notification_id,
            "user_id": notification_data["user_id"],
            "agent_id": notification_data.get("agent_id"),
            "title": notification_data["title"],
            "content": notification_data["content"],
            "notification_type": notification_data.get("notification_type", "info"),
            "priority": notification_data.get("priority", "normal"),
            "is_read": False,
            "is_dismissed": False,
            "sent_telegram": False,
            "sent_email": False,
            "created_at": now.isoformat()
        }
        
        result = self.client.table("notifications").insert(data).execute()
        if result.data:
            return self._dict_to_notification(result.data[0])
        raise Exception("Failed to create notification")

    async def get_user_notifications(self, user_id: str, unread_only: bool = False) -> List[DBNotification]:
        """Obtener notificaciones de un usuario"""
        query = self.client.table("notifications").select("*").eq("user_id", user_id)
        
        if unread_only:
            query = query.eq("is_read", False)
        
        result = query.order("created_at", desc=True).execute()
        return [self._dict_to_notification(row) for row in result.data]

    # =============== FLOWS ===============
    async def get_user_flows(self, user_id: str) -> List[Dict]:
        """Obtener flujos guardados de un usuario"""
        result = self.client.table("saved_flows").select("*").eq("user_id", user_id).execute()
        return result.data

    async def save_flow(self, flow_data: Dict) -> Dict:
        """Guardar un flujo"""
        flow_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = {
            "id": flow_id,
            "user_id": flow_data["user_id"],
            "name": flow_data["name"],
            "description": flow_data.get("description", ""),
            "flow_data": flow_data["flow_data"],
            "is_public": flow_data.get("is_public", False),
            "is_active": flow_data.get("is_active", False),
            "version": flow_data.get("version", 1),
            "tags": flow_data.get("tags", []),
            "metadata": flow_data.get("metadata", {}),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        result = self.client.table("saved_flows").insert(data).execute()
        if result.data:
            return result.data[0]
        raise Exception("Failed to save flow")

    async def update_flow(self, flow_id: str, updates: Dict) -> bool:
        """Actualizar un flujo"""
        updates["updated_at"] = datetime.utcnow().isoformat()
        result = self.client.table("saved_flows").update(updates).eq("id", flow_id).execute()
        return len(result.data) > 0

    async def delete_flow(self, flow_id: str) -> bool:
        """Eliminar un flujo"""
        result = self.client.table("saved_flows").delete().eq("id", flow_id).execute()
        return len(result.data) > 0

    # =============== INITIALIZATION ===============
    async def init_db(self):
        """Initialize database - Not needed for Supabase as tables are managed via SQL"""
        # This method is kept for compatibility with the original interface
        # but doesn't need to do anything as Supabase tables are created via SQL
        pass

    # =============== HELPER METHODS ===============
    def _dict_to_agent(self, data: Dict) -> DBAgent:
        """Convertir diccionario a DBAgent"""
        return DBAgent(
            id=data["id"],
            user_id=data["user_id"],
            name=data["name"],
            description=data["description"],
            personality=data["personality"],
            expertise=data["expertise"],
            status=data["status"],
            mcp_endpoint=data["mcp_endpoint"],
            is_public=data["is_public"],
            telegram_chat_id=data["telegram_chat_id"],
            is_persistent=data["is_persistent"],
            auto_start=data["auto_start"],
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(data["updated_at"].replace('Z', '+00:00'))
        )

    def _dict_to_connection(self, data: Dict) -> DBConnection:
        """Convertir diccionario a DBConnection"""
        return DBConnection(
            id=data["id"],
            agent1_id=data["agent1_id"],
            agent2_id=data["agent2_id"],
            connection_type=data["connection_type"],
            status=data["status"],
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00'))
        )

    def _dict_to_message(self, data: Dict) -> DBMessage:
        """Convertir diccionario a DBMessage"""
        return DBMessage(
            id=data["id"],
            conversation_id=data["conversation_id"],
            from_agent_id=data["from_agent_id"],
            to_agent_id=data["to_agent_id"],
            content=data["content"],
            message_type=data["message_type"],
            is_read=data["is_read"],
            telegram_sent=data["telegram_sent"],
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00'))
        )

    def _dict_to_notification(self, data: Dict) -> DBNotification:
        """Convertir diccionario a DBNotification"""
        return DBNotification(
            id=data["id"],
            user_id=data["user_id"],
            agent_id=data["agent_id"],
            title=data["title"],
            content=data["content"],
            notification_type=data["notification_type"],
            priority=data["priority"],
            is_read=data["is_read"],
            is_dismissed=data["is_dismissed"],
            sent_telegram=data["sent_telegram"],
            sent_email=data["sent_email"],
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00')),
            read_at=datetime.fromisoformat(data["read_at"].replace('Z', '+00:00')) if data["read_at"] else None,
            dismissed_at=datetime.fromisoformat(data["dismissed_at"].replace('Z', '+00:00')) if data["dismissed_at"] else None
        )

    # =============== NOTES ===============
    async def create_note(self, note_data: Dict) -> DBNote:
        """Crear una nueva nota"""
        note_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        data = {
            "id": note_id,
            "agent_id": note_data["agent_id"],
            "title": note_data["title"],
            "content": note_data["content"],
            "tags": note_data.get("tags", []),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        
        result = self.client.table("notes").insert(data).execute()
        if result.data:
            return self._dict_to_note(result.data[0])
        raise Exception("Failed to create note")

    async def get_note(self, note_id: str) -> Optional[DBNote]:
        """Obtener una nota por ID"""
        result = self.client.table("notes").select("*").eq("id", note_id).execute()
        if result.data:
            return self._dict_to_note(result.data[0])
        return None

    async def update_note(self, note_id: str, updates: Dict) -> bool:
        """Actualizar una nota"""
        updates["updated_at"] = datetime.utcnow().isoformat()
        result = self.client.table("notes").update(updates).eq("id", note_id).execute()
        return len(result.data) > 0

    async def delete_note(self, note_id: str) -> bool:
        """Eliminar una nota"""
        result = self.client.table("notes").delete().eq("id", note_id).execute()
        return len(result.data) > 0

    async def list_notes(self, agent_id: str, query: Optional[str] = None) -> List[DBNote]:
        """Listar notas de un agente, opcionalmente filtradas por query"""
        base_query = self.client.table("notes").select("*").eq("agent_id", agent_id)
        
        if query:
            # Supabase doesn't have a direct 'ILIKE' for arrays, so we'll do a simpler text search
            # For more complex search, a full-text search solution would be needed
            base_query = base_query.ilike("title", f"%{query}%").ilike("content", f"%{query}%")
            
        result = base_query.order("created_at", desc=True).execute()
        return [self._dict_to_note(row) for row in result.data]

    def _dict_to_note(self, data: Dict) -> DBNote:
        """Convertir diccionario a DBNote"""
        return DBNote(
            id=data["id"],
            agent_id=data["agent_id"],
            title=data["title"],
            content=data["content"],
            tags=data["tags"],
            created_at=datetime.fromisoformat(data["created_at"].replace('Z', '+00:00')),
            updated_at=datetime.fromisoformat(data["updated_at"].replace('Z', '+00:00'))
        )