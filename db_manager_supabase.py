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
    whatsapp_phone_number: Optional[str]
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
            "personality": agent_data["personality"],
            "expertise": agent_data["expertise"],
            "status": agent_data.get("status", "inactive"),
            "mcp_endpoint": agent_data.get("mcp_endpoint", ""),
            "is_public": agent_data.get("is_public", False),
            "telegram_chat_id": agent_data.get("telegram_chat_id"),
            "whatsapp_phone_number": agent_data.get("whatsapp_phone_number"),
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

    async def get_public_agents(self, exclude_user_id: str = None) -> List[DBAgent]:
        """Obtener todos los agentes públicos, opcionalmente excluyendo un usuario"""
        query = self.client.table("agents").select("*").eq("is_public", True)
        if exclude_user_id:
            query = query.neq("user_id", exclude_user_id)
        result = query.execute()
        return [self._dict_to_agent(row) for row in result.data]

    async def get_public_agents_by_user(self, user_id: str) -> List[DBAgent]:
        """Obtener todos los agentes públicos de un usuario específico"""
        result = self.client.table("agents").select("*").eq("user_id", user_id).eq("is_public", True).execute()
        return [self._dict_to_agent(row) for row in result.data]

    async def get_agent_by_whatsapp_phone(self, phone_number: str) -> Optional[DBAgent]:
        """Obtener un agente por su número de WhatsApp asociado"""
        result = self.client.table("agents").select("*").eq("whatsapp_phone_number", phone_number).execute()
        if result.data:
            return self._dict_to_agent(result.data[0])
        return None

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

    async def get_user_connections(self, user_id: str, status: str = 'accepted') -> List[Dict]:
        """Obtener las conexiones sociales de un usuario"""
        try:
            result = self.client.table("user_connections").select("*").or_(
                f"user1_id.eq.{user_id},user2_id.eq.{user_id}"
            ).eq("status", status).execute()

            connections = []
            for row in result.data:
                # Obtener información del requester (user1) y recipient (user2)
                requester_result = self.client.table("users").select("id, name, email, image").eq("id", row["user1_id"]).single().execute()
                recipient_result = self.client.table("users").select("id, name, email, image").eq("id", row["user2_id"]).single().execute()

                connection_data = {
                    "connection_id": row["id"],
                    "requester": {
                        "id": row["user1_id"],
                        "name": requester_result.data.get("name") if requester_result.data else "Usuario",
                        "email": requester_result.data.get("email") if requester_result.data else "",
                        "image": requester_result.data.get("image") if requester_result.data else None
                    },
                    "recipient": {
                        "id": row["user2_id"],
                        "name": recipient_result.data.get("name") if recipient_result.data else "Usuario",
                        "email": recipient_result.data.get("email") if recipient_result.data else "",
                        "image": recipient_result.data.get("image") if recipient_result.data else None
                    },
                    "status": row["status"],
                    "created_at": row["created_at"]
                }
                connections.append(connection_data)

            return connections
        except Exception as e:
            print(f"Error obteniendo conexiones de usuario: {e}")
            return []

    async def get_connection_by_id(self, connection_id: str) -> Optional[Dict]:
        """Obtener una conexión social específica por ID"""
        try:
            result = self.client.table("user_connections").select("*").eq("id", connection_id).single().execute()
            if result.data:
                return {
                    "connection_id": result.data["id"],
                    "requester_id": result.data["user1_id"],
                    "recipient_id": result.data["user2_id"],
                    "status": result.data["status"],
                    "created_at": result.data["created_at"]
                }
            return None
        except Exception as e:
            print(f"Error obteniendo conexión por ID: {e}")
            return None

    # =============== FLOW CONNECTIONS ===============
    async def create_flow_connection(self, connection_data: Dict) -> str:
        """Crear una conexión de flujo entre usuarios"""
        try:
            flow_connection_id = str(uuid.uuid4())
            now = datetime.utcnow()

            data = {
                "id": flow_connection_id,
                "flow_owner_id": connection_data["flow_owner_id"],
                "target_user_id": connection_data["target_user_id"],
                "connection_node_id": connection_data["connection_node_id"],
                "connection_type": connection_data.get("connection_type", "user"),
                "target_agent_id": connection_data.get("target_agent_id"),
                "metadata": connection_data.get("metadata", {}),
                "status": "active",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }

            result = self.client.table("flow_connections").insert(data).execute()
            if result.data:
                return flow_connection_id
            raise Exception("Failed to create flow connection")

        except Exception as e:
            print(f"Error creando conexión de flujo: {e}")
            raise e

    async def delete_flow_connection(self, connection_id: str) -> bool:
        """Eliminar una conexión de flujo"""
        try:
            result = self.client.table("flow_connections").delete().eq("id", connection_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"Error eliminando conexión de flujo: {e}")
            return False

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

    async def get_user_notifications(self, user_id: str, unread_only: bool = False, limit: int = 50) -> List[DBNotification]:
        """Obtener notificaciones de un usuario"""
        query = self.client.table("notifications").select("*").eq("user_id", user_id)

        if unread_only:
            query = query.eq("is_read", False)

        result = query.order("created_at", desc=True).limit(limit).execute()
        return [self._dict_to_notification(row) for row in result.data]

    # =============== FLOWS ===============
    async def get_user_flows(self, user_id: str) -> List[Dict]:
        """Obtener flujos guardados de un usuario"""
        result = self.client.table("saved_flows").select("*").eq("user_id", user_id).execute()
        return result.data

    async def get_public_flows_by_user(self, user_id: str) -> List[Dict]:
        """Obtener flujos públicos de un usuario específico"""
        result = self.client.table("saved_flows").select("*").eq("user_id", user_id).eq("is_public", True).execute()
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

    async def delete_flow(self, flow_id: str, user_id: str = None) -> bool:
        """Eliminar un flujo"""
        query = self.client.table("saved_flows").delete().eq("id", flow_id)

        # Verificar que el flujo pertenece al usuario si se proporciona user_id
        if user_id:
            query = query.eq("user_id", user_id)

        result = query.execute()
        return len(result.data) > 0

    async def update_flow_status(self, flow_id: str, is_active: bool) -> bool:
        """Actualizar el estado activo/inactivo de un flujo"""
        updates = {
            "is_active": is_active,
            "updated_at": datetime.utcnow().isoformat()
        }
        result = self.client.table("saved_flows").update(updates).eq("id", flow_id).execute()
        return len(result.data) > 0

    async def get_friends_active_flows(self, user_id: str) -> List[Dict]:
        """Obtener flujos activos y públicos de amigos conectados"""
        try:
            # 1. Get accepted connections for this user
            connections = await self.get_user_connections(user_id, status='accepted')

            if not connections:
                return []

            # 2. Extract friend user IDs
            friend_ids = []
            for conn in connections:
                if conn.get('user1_id') == user_id:
                    friend_ids.append(conn.get('user2_id'))
                elif conn.get('user2_id') == user_id:
                    friend_ids.append(conn.get('user1_id'))

            if not friend_ids:
                return []

            # 3. Query flows from friends that are active and public
            flows_result = self.client.table("saved_flows").select(
                "id, name, description, user_id, is_public, is_active, version, created_at, updated_at, flow_data, tags, metadata"
            ).in_("user_id", friend_ids).eq("is_active", True).eq("is_public", True).order("updated_at", desc=True).execute()

            flows = flows_result.data

            # 4. Enrich with owner information
            enriched_flows = []
            for flow in flows:
                # Get owner information
                owner_result = self.client.table("users").select("name, email, image").eq("id", flow['user_id']).execute()

                if owner_result.data:
                    owner = owner_result.data[0]
                    flow['owner_name'] = owner.get('name', 'Unknown')
                    flow['owner_email'] = owner.get('email', '')
                    flow['owner_image'] = owner.get('image', '')
                else:
                    flow['owner_name'] = 'Unknown'
                    flow['owner_email'] = ''
                    flow['owner_image'] = ''

                # Add activated_at (use updated_at as proxy for when it was activated)
                flow['activated_at'] = flow.get('updated_at')

                enriched_flows.append(flow)

            return enriched_flows

        except Exception as e:
            print(f"Error getting friends active flows: {e}")
            return []

    # =============== INITIALIZATION ===============
    async def init_db(self):
        """Initialize database - Not needed for Supabase as tables are managed via SQL"""
        # This method is kept for compatibility with the original interface
        # but doesn't need to do anything as Supabase tables are created via SQL
        pass

    # =============== USERS ===============
    async def search_users(self, query: str, exclude_user_id: str = None, limit: int = 20) -> List[Dict]:
        """Buscar usuarios por nombre o email"""
        try:
            # Construir query de búsqueda
            search_query = self.client.table("users").select("id, name, email")

            # Buscar por nombre o email (case insensitive)
            search_query = search_query.or_(f"name.ilike.%{query}%,email.ilike.%{query}%")

            # Excluir usuario específico si se proporciona
            if exclude_user_id:
                search_query = search_query.neq("id", exclude_user_id)

            # Limitar resultados
            search_query = search_query.limit(limit)

            result = search_query.execute()
            return result.data

        except Exception as e:
            print(f"Error buscando usuarios: {e}")
            return []

    # =============== USER CONNECTIONS ===============
    async def create_user_connection_request(self, requester_id: str, recipient_id: str,
                                           connection_type: str = "friend") -> str:
        """Crear una solicitud de conexión entre usuarios"""
        try:
            connection_id = str(uuid.uuid4())
            now = datetime.utcnow()

            data = {
                "id": connection_id,
                "user1_id": requester_id,
                "user2_id": recipient_id,
                "connection_type": connection_type,
                "status": "pending",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat()
            }

            result = self.client.table("user_connections").insert(data).execute()
            if result.data:
                return connection_id
            raise Exception("Failed to create user connection request")

        except Exception as e:
            print(f"Error creando solicitud de conexión: {e}")
            raise e

    async def accept_user_connection_request(self, connection_id: str, user_id: str) -> bool:
        """Aceptar una solicitud de conexión"""
        try:
            # Verificar que el usuario sea el recipient de la conexión
            result = self.client.table("user_connections").select("*").eq("id", connection_id).single().execute()

            if not result.data:
                return False

            connection = result.data
            if connection["user2_id"] != user_id:
                return False

            # Actualizar estado a accepted
            update_result = self.client.table("user_connections").update({
                "status": "accepted",
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", connection_id).execute()

            return len(update_result.data) > 0

        except Exception as e:
            print(f"Error aceptando conexión: {e}")
            return False

    async def reject_user_connection_request(self, connection_id: str, user_id: str) -> bool:
        """Rechazar una solicitud de conexión"""
        try:
            # Verificar que el usuario sea el recipient de la conexión
            result = self.client.table("user_connections").select("*").eq("id", connection_id).single().execute()

            if not result.data:
                return False

            connection = result.data
            if connection["user2_id"] != user_id:
                return False

            # Actualizar estado a rejected
            update_result = self.client.table("user_connections").update({
                "status": "rejected",
                "updated_at": datetime.utcnow().isoformat()
            }).eq("id", connection_id).execute()

            return len(update_result.data) > 0

        except Exception as e:
            print(f"Error rechazando conexión: {e}")
            return False

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
            telegram_chat_id=data.get("telegram_chat_id"),
            whatsapp_phone_number=data.get("whatsapp_phone_number"),
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

    # =============== PROTOCOLO PAIA - AGENT CAPABILITIES ===============

    async def save_agent_capability(self, capability_data: Dict) -> str:
        """Guardar una capability de un agente"""
        capability_id = str(uuid.uuid4())
        now = datetime.utcnow()

        data = {
            "id": capability_id,
            "agent_id": capability_data["agent_id"],
            "capability_name": capability_data["capability_name"],
            "capability_type": capability_data["capability_type"],
            "description": capability_data.get("description", ""),
            "input_schema": capability_data.get("input_schema"),
            "output_schema": capability_data.get("output_schema"),
            "requires_approval": capability_data.get("requires_approval", False),
            "autonomy_level": capability_data.get("autonomy_level", "supervised"),
            "enabled": capability_data.get("enabled", True),
            "created_at": now.isoformat()
        }

        result = self.client.table("agent_capabilities").insert(data).execute()
        if result.data:
            return capability_id
        raise Exception("Failed to save capability")

    async def get_agent_capabilities(self, agent_id: str) -> List[Dict]:
        """Obtener todas las capabilities de un agente"""
        result = self.client.table("agent_capabilities").select("*").eq(
            "agent_id", agent_id
        ).eq("enabled", True).execute()
        return result.data if result.data else []

    # =============== PROTOCOLO PAIA - CONVERSATIONS ===============

    async def get_or_create_conversation(self, agent1_id: str, agent2_id: str) -> str:
        """Obtener o crear conversación entre dos agentes usando función de PostgreSQL"""
        try:
            # Usar la función SQL que creamos en la migración
            result = self.client.rpc('get_or_create_conversation', {
                'p_agent1_id': agent1_id,
                'p_agent2_id': agent2_id
            }).execute()

            if result.data:
                return result.data
            raise Exception("Failed to get/create conversation")
        except Exception as e:
            print(f"Error en get_or_create_conversation: {e}")
            raise e

    async def get_conversation(self, agent1_id: str, agent2_id: str) -> Optional[Dict]:
        """Obtener conversación existente entre dos agentes"""
        # Ordenar IDs para búsqueda
        if agent1_id > agent2_id:
            agent1_id, agent2_id = agent2_id, agent1_id

        result = self.client.table("agent_conversations").select("*").eq(
            "agent1_id", agent1_id
        ).eq("agent2_id", agent2_id).execute()

        return result.data[0] if result.data else None

    # =============== PROTOCOLO PAIA - MESSAGES ===============

    async def save_message_paia(self, message_data: Dict) -> Dict:
        """Guardar mensaje del protocolo PAIA"""
        message_id = str(uuid.uuid4())
        now = datetime.utcnow()

        data = {
            "id": message_id,
            "conversation_id": message_data["conversation_id"],
            "from_agent_id": message_data["from_agent_id"],
            "to_agent_id": message_data["to_agent_id"],
            "message_type": message_data["message_type"],
            "payload": message_data["payload"],
            "metadata": message_data.get("metadata", {}),
            "status": message_data.get("status", "sent"),
            "created_at": now.isoformat()
        }

        result = self.client.table("agent_messages_paia").insert(data).execute()
        if result.data:
            return result.data[0]
        raise Exception("Failed to save message")

    async def update_message_status(self, message_id: str, status: str) -> bool:
        """Actualizar estado de un mensaje"""
        updates = {"status": status}

        if status == "delivered":
            updates["delivered_at"] = datetime.utcnow().isoformat()
        elif status == "read":
            updates["read_at"] = datetime.utcnow().isoformat()

        result = self.client.table("agent_messages_paia").update(updates).eq(
            "id", message_id
        ).execute()
        return len(result.data) > 0

    async def get_conversation_messages(self, conversation_id: str, limit: int = 50) -> List[Dict]:
        """Obtener mensajes de una conversación"""
        result = self.client.table("agent_messages_paia").select("*").eq(
            "conversation_id", conversation_id
        ).order("created_at", desc=True).limit(limit).execute()
        return result.data if result.data else []

    # =============== PROTOCOLO PAIA - AUTONOMY SETTINGS ===============

    async def get_autonomy_settings(self, agent_id: str) -> Optional[Dict]:
        """Obtener configuración de autonomía de un agente"""
        result = self.client.table("autonomy_settings").select("*").eq(
            "agent_id", agent_id
        ).execute()
        return result.data[0] if result.data else None

    async def save_autonomy_settings(self, agent_id: str, settings: Dict) -> bool:
        """Guardar o actualizar configuración de autonomía"""
        now = datetime.utcnow()

        # Verificar si ya existe
        existing = await self.get_autonomy_settings(agent_id)

        data = {
            "agent_id": agent_id,
            "default_level": settings.get("default_level", "supervised"),
            "rules": settings.get("rules", []),
            "updated_at": now.isoformat()
        }

        if existing:
            # Actualizar
            result = self.client.table("autonomy_settings").update(data).eq(
                "agent_id", agent_id
            ).execute()
        else:
            # Insertar
            data["created_at"] = now.isoformat()
            result = self.client.table("autonomy_settings").insert(data).execute()

        return len(result.data) > 0