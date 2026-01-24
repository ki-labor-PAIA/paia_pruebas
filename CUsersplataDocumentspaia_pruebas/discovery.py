"""
PAIA Protocol - Discovery Service
Sistema de descubrimiento de agentes a través de conexiones sociales
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass


@dataclass
class AgentCapability:
    """Representa una capacidad de un agente"""
    id: str
    name: str
    description: str
    message_type: str
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    requires_approval: bool = False
    autonomy_level: str = "supervised"


@dataclass
class AgentProfile:
    """Perfil de un agente en el registro PAIA"""
    agent_id: str
    user_id: str
    agent_name: str
    expertise: List[str]
    capabilities: List[AgentCapability]
    status: str = "online"  # online, offline, busy
    last_seen: Optional[str] = None
    is_public: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convertir a diccionario"""
        return {
            "agent_id": self.agent_id,
            "user_id": self.user_id,
            "agent_name": self.agent_name,
            "expertise": self.expertise,
            "capabilities": [
                {
                    "id": cap.id,
                    "name": cap.name,
                    "description": cap.description,
                    "message_type": cap.message_type,
                    "requires_approval": cap.requires_approval,
                    "autonomy_level": cap.autonomy_level
                }
                for cap in self.capabilities
            ],
            "status": self.status,
            "last_seen": self.last_seen,
            "is_public": self.is_public
        }


class PAIADiscoveryService:
    """
    Servicio de descubrimiento de agentes PAIA.
    Permite encontrar agentes a través de conexiones sociales.
    """

    def __init__(self, db_manager):
        """
        Args:
            db_manager: Gestor de base de datos (compatible con DatabaseManager)
        """
        self.db_manager = db_manager
        self._agent_registry: Dict[str, AgentProfile] = {}

    async def register_agent(
        self,
        agent_id: str,
        user_id: str,
        agent_name: str,
        expertise: List[str],
        capabilities: List[AgentCapability],
        is_public: bool = True
    ) -> bool:
        """
        Registrar un agente en el sistema de descubrimiento.

        Args:
            agent_id: ID único del agente
            user_id: ID del usuario propietario
            agent_name: Nombre del agente
            expertise: Lista de áreas de expertise
            capabilities: Lista de capacidades
            is_public: Si el agente es público

        Returns:
            True si se registró exitosamente
        """
        try:
            profile = AgentProfile(
                agent_id=agent_id,
                user_id=user_id,
                agent_name=agent_name,
                expertise=expertise,
                capabilities=capabilities,
                status="online",
                is_public=is_public
            )

            self._agent_registry[agent_id] = profile

            print(f"[DISCOVERY] ✓ Agente registrado: {agent_name} ({agent_id})")
            return True

        except Exception as e:
            print(f"[DISCOVERY] ✗ Error registrando agente {agent_id}: {e}")
            return False

    async def unregister_agent(self, agent_id: str) -> bool:
        """Quitar un agente del registro"""
        if agent_id in self._agent_registry:
            del self._agent_registry[agent_id]
            print(f"[DISCOVERY] Agente {agent_id} desregistrado")
            return True
        return False

    async def update_agent_status(self, agent_id: str, status: str) -> bool:
        """Actualizar el estado de un agente (online, offline, busy)"""
        if agent_id in self._agent_registry:
            self._agent_registry[agent_id].status = status
            return True
        return False

    async def get_agent_profile(self, agent_id: str) -> Optional[AgentProfile]:
        """Obtener el perfil completo de un agente"""
        return self._agent_registry.get(agent_id)

    async def discover_agent_by_name(
        self,
        requester_user_id: str,
        target_name: str,
        capability: Optional[str] = None
    ) -> Optional[AgentProfile]:
        """
        Descubrir un agente por nombre de usuario a través de conexiones sociales.

        Args:
            requester_user_id: ID del usuario que busca
            target_name: Nombre del usuario objetivo
            capability: Capacidad específica requerida (opcional)

        Returns:
            AgentProfile del agente encontrado, o None
        """
        try:
            # 1. Buscar usuario por nombre en conexiones sociales
            users = await self.db_manager.search_users(
                target_name,
                exclude_user_id=requester_user_id,
                limit=5
            )

            if not users:
                print(f"[DISCOVERY] No se encontró usuario '{target_name}'")
                return None

            target_user = users[0]  # Tomar el primer resultado

            # 2. Verificar que sean amigos
            connections = await self.db_manager.get_user_connections(
                requester_user_id,
                'accepted'
            )

            friend_ids = []
            for conn in connections:
                if conn['requester']['id'] == requester_user_id:
                    friend_ids.append(conn['recipient']['id'])
                else:
                    friend_ids.append(conn['requester']['id'])

            if target_user['id'] not in friend_ids:
                print(f"[DISCOVERY] Usuario '{target_name}' no es amigo de {requester_user_id}")
                return None

            # 3. Obtener agentes públicos del usuario objetivo
            agents = [
                profile for profile in self._agent_registry.values()
                if profile.user_id == target_user['id'] and profile.is_public
            ]

            if not agents:
                print(f"[DISCOVERY] Usuario '{target_name}' no tiene agentes públicos")
                return None

            # 4. Filtrar por capability si se especificó
            if capability:
                suitable_agents = [
                    agent for agent in agents
                    if capability in agent.expertise or
                    any(cap.name == capability for cap in agent.capabilities)
                ]

                if suitable_agents:
                    return suitable_agents[0]
                else:
                    print(f"[DISCOVERY] No se encontró agente con capability '{capability}'")
                    return None

            # Retornar el primer agente público
            return agents[0]

        except Exception as e:
            print(f"[DISCOVERY] Error en discover_agent_by_name: {e}")
            return None

    async def discover_agents_by_expertise(
        self,
        requester_user_id: str,
        expertise: str,
        friends_only: bool = True
    ) -> List[AgentProfile]:
        """
        Descubrir agentes por expertise.

        Args:
            requester_user_id: ID del usuario que busca
            expertise: Expertise requerida (calendar, tasks, finance, etc.)
            friends_only: Solo buscar en agentes de amigos

        Returns:
            Lista de AgentProfile que cumplen el criterio
        """
        try:
            # Obtener lista de amigos
            friend_ids = set()
            if friends_only:
                connections = await self.db_manager.get_user_connections(
                    requester_user_id,
                    'accepted'
                )

                for conn in connections:
                    if conn['requester']['id'] == requester_user_id:
                        friend_ids.add(conn['recipient']['id'])
                    else:
                        friend_ids.add(conn['requester']['id'])

            # Buscar agentes con la expertise
            matching_agents = []
            for profile in self._agent_registry.values():
                # Verificar que sea público
                if not profile.is_public:
                    continue

                # Verificar que sea amigo (si se requiere)
                if friends_only and profile.user_id not in friend_ids:
                    continue

                # Verificar expertise
                if expertise in profile.expertise:
                    matching_agents.append(profile)

            print(f"[DISCOVERY] Encontrados {len(matching_agents)} agentes con expertise '{expertise}'")
            return matching_agents

        except Exception as e:
            print(f"[DISCOVERY] Error en discover_agents_by_expertise: {e}")
            return []

    async def discover_agents_by_capability(
        self,
        requester_user_id: str,
        capability_type: str,
        friends_only: bool = True
    ) -> List[AgentProfile]:
        """
        Descubrir agentes por tipo de mensaje que soportan.

        Args:
            requester_user_id: ID del usuario que busca
            capability_type: Tipo de mensaje PAIA (ej: paia.request.calendar.check_availability)
            friends_only: Solo buscar en agentes de amigos

        Returns:
            Lista de AgentProfile que soportan esa capability
        """
        try:
            # Obtener lista de amigos
            friend_ids = set()
            if friends_only:
                connections = await self.db_manager.get_user_connections(
                    requester_user_id,
                    'accepted'
                )

                for conn in connections:
                    if conn['requester']['id'] == requester_user_id:
                        friend_ids.add(conn['recipient']['id'])
                    else:
                        friend_ids.add(conn['requester']['id'])

            # Buscar agentes con la capability
            matching_agents = []
            for profile in self._agent_registry.values():
                # Verificar que sea público
                if not profile.is_public:
                    continue

                # Verificar que sea amigo (si se requiere)
                if friends_only and profile.user_id not in friend_ids:
                    continue

                # Verificar capability
                if any(cap.message_type == capability_type for cap in profile.capabilities):
                    matching_agents.append(profile)

            print(f"[DISCOVERY] Encontrados {len(matching_agents)} agentes con capability '{capability_type}'")
            return matching_agents

        except Exception as e:
            print(f"[DISCOVERY] Error en discover_agents_by_capability: {e}")
            return []

    async def get_agent_capabilities(self, agent_id: str) -> List[AgentCapability]:
        """Obtener las capacidades de un agente"""
        profile = await self.get_agent_profile(agent_id)
        if profile:
            return profile.capabilities
        return []

    async def can_communicate(
        self,
        from_user_id: str,
        to_agent_id: str
    ) -> tuple[bool, Optional[str]]:
        """
        Verificar si un usuario puede comunicarse con un agente.

        Args:
            from_user_id: ID del usuario emisor
            to_agent_id: ID del agente receptor

        Returns:
            (can_communicate, reason)
        """
        # Obtener perfil del agente destino
        to_profile = await self.get_agent_profile(to_agent_id)
        if not to_profile:
            return False, "Agente no encontrado"

        # Si el agente no es público
        if not to_profile.is_public:
            # Solo el dueño puede comunicarse
            if from_user_id != to_profile.user_id:
                return False, "Agente no es público"

        # Verificar si son amigos
        connections = await self.db_manager.get_user_connections(
            from_user_id,
            'accepted'
        )

        friend_ids = []
        for conn in connections:
            if conn['requester']['id'] == from_user_id:
                friend_ids.append(conn['recipient']['id'])
            else:
                friend_ids.append(conn['requester']['id'])

        # El usuario puede comunicarse si:
        # 1. Es el dueño del agente
        # 2. Es amigo del dueño del agente
        if from_user_id == to_profile.user_id or to_profile.user_id in friend_ids:
            return True, None

        return False, "No hay conexión social con el dueño del agente"

    def get_all_registered_agents(self) -> List[AgentProfile]:
        """Obtener todos los agentes registrados"""
        return list(self._agent_registry.values())

    def get_online_agents(self) -> List[AgentProfile]:
        """Obtener solo agentes online"""
        return [
            profile for profile in self._agent_registry.values()
            if profile.status == "online"
        ]


# ==================== CAPABILITY BUILDERS ====================

class CapabilityBuilder:
    """Helper para construir capabilities de manera fácil"""

    @staticmethod
    def calendar_check_availability() -> AgentCapability:
        """Capability para verificar disponibilidad en calendario"""
        return AgentCapability(
            id="check_availability",
            name="Verificar Disponibilidad",
            description="Consultar disponibilidad en calendario",
            message_type="paia.request.calendar.check_availability",
            requires_approval=False,
            autonomy_level="full_auto"
        )

    @staticmethod
    def calendar_schedule_event() -> AgentCapability:
        """Capability para agendar eventos"""
        return AgentCapability(
            id="schedule_event",
            name="Agendar Evento",
            description="Agendar evento en calendario",
            message_type="paia.request.calendar.schedule_event",
            requires_approval=True,
            autonomy_level="supervised"
        )

    @staticmethod
    def task_delegate() -> AgentCapability:
        """Capability para delegar tareas"""
        return AgentCapability(
            id="delegate_task",
            name="Delegar Tarea",
            description="Recibir delegación de tarea",
            message_type="paia.request.task.delegate",
            requires_approval=True,
            autonomy_level="manual"
        )

    @staticmethod
    def chat_message() -> AgentCapability:
        """Capability para mensajes de chat"""
        return AgentCapability(
            id="chat",
            name="Chat",
            description="Conversación natural",
            message_type="paia.chat.message",
            requires_approval=False,
            autonomy_level="full_auto"
        )
