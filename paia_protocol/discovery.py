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
    Usa lazy loading para cargar agentes bajo demanda.
    """

    def __init__(self, db_manager):
        """
        Args:
            db_manager: Gestor de base de datos (compatible con DatabaseManager)
        """
        self.db_manager = db_manager
        self._agent_registry: Dict[str, AgentProfile] = {}
        self._capability_builder_func = None  # Funcion para construir capabilities

    def set_capability_builder(self, builder_func):
        """Configurar funcion que construye capabilities segun expertise"""
        self._capability_builder_func = builder_func

    async def _load_agent_from_db(self, agent_id: str) -> Optional[AgentProfile]:
        """
        Cargar un agente desde la BD y registrarlo en cache.

        Args:
            agent_id: ID del agente a cargar

        Returns:
            AgentProfile si se encontro, None si no existe
        """
        try:
            # Buscar agente en BD
            agent_data = await self.db_manager.get_agent(agent_id)
            if not agent_data:
                return None

            # Obtener campos (soporta tanto objeto DBAgent como dict)
            if hasattr(agent_data, 'expertise'):
                expertise = agent_data.expertise or 'general'
                user_id = agent_data.user_id
                agent_name = agent_data.name
                is_public = agent_data.is_public
            else:
                expertise = agent_data.get('expertise', 'general')
                user_id = agent_data['user_id']
                agent_name = agent_data['name']
                is_public = agent_data.get('is_public', True)

            # Construir capabilities segun expertise
            capabilities = []

            # Siempre agregar chat
            capabilities.append(CapabilityBuilder.chat_message())

            # Capabilities por expertise
            if expertise in ('calendar', 'scheduling'):
                capabilities.extend([
                    CapabilityBuilder.calendar_check_availability(),
                    CapabilityBuilder.calendar_schedule_event()
                ])

            # Crear perfil
            profile = AgentProfile(
                agent_id=agent_id,
                user_id=user_id,
                agent_name=agent_name,
                expertise=[expertise],
                capabilities=capabilities,
                status="online",
                is_public=is_public
            )

            # Guardar en cache
            self._agent_registry[agent_id] = profile
            return profile

        except Exception as e:
            print(f"[DISCOVERY] Error cargando agente {agent_id} desde BD: {e}")
            return None

    async def _ensure_agent_loaded(self, agent_id: str) -> Optional[AgentProfile]:
        """
        Asegurar que un agente este en el registry (lazy loading).

        Args:
            agent_id: ID del agente

        Returns:
            AgentProfile si existe, None si no
        """
        # Si ya esta en cache, retornarlo
        if agent_id in self._agent_registry:
            return self._agent_registry[agent_id]

        # Si no, cargarlo de la BD
        return await self._load_agent_from_db(agent_id)

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

            print(f"[DISCOVERY] Agente registrado: {agent_name} ({agent_id})")
            return True

        except Exception as e:
            print(f"[DISCOVERY] Error registrando agente {agent_id}: {e}")
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
        """Obtener el perfil completo de un agente (con lazy loading)"""
        return await self._ensure_agent_loaded(agent_id)

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

            # 3. Obtener agentes públicos del usuario objetivo desde BD
            db_agents = await self.db_manager.get_agents_by_user(target_user['id'])

            if not db_agents:
                print(f"[DISCOVERY] Usuario '{target_name}' no tiene agentes")
                return None

            # Filtrar solo publicos y cargar en cache
            agents = []
            for db_agent in db_agents:
                if db_agent.is_public if hasattr(db_agent, 'is_public') else db_agent.get('is_public', True):
                    agent_id = db_agent.id if hasattr(db_agent, 'id') else db_agent['id']
                    profile = await self._ensure_agent_loaded(agent_id)
                    if profile and profile.is_public:
                        agents.append(profile)

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

            # Buscar agentes con la expertise en BD (solo entre amigos por seguridad)
            matching_agents = []

            # Buscar en agentes de amigos
            for friend_id in friend_ids:
                friend_agents = await self.db_manager.get_agents_by_user(friend_id)
                for db_agent in friend_agents:
                    agent_expertise = db_agent.expertise if hasattr(db_agent, 'expertise') else db_agent.get('expertise', 'general')
                    is_public = db_agent.is_public if hasattr(db_agent, 'is_public') else db_agent.get('is_public', True)

                    if is_public and agent_expertise == expertise:
                        agent_id = db_agent.id if hasattr(db_agent, 'id') else db_agent['id']
                        profile = await self._ensure_agent_loaded(agent_id)
                        if profile:
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

            # Buscar agentes con la capability en BD (solo de amigos)
            matching_agents = []

            for friend_id in friend_ids:
                friend_agents = await self.db_manager.get_agents_by_user(friend_id)
                for db_agent in friend_agents:
                    is_public = db_agent.is_public if hasattr(db_agent, 'is_public') else db_agent.get('is_public', True)

                    if is_public:
                        agent_id = db_agent.id if hasattr(db_agent, 'id') else db_agent['id']
                        profile = await self._ensure_agent_loaded(agent_id)
                        if profile and any(cap.message_type == capability_type for cap in profile.capabilities):
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

    def get_cached_agents(self) -> List[AgentProfile]:
        """Obtener agentes actualmente en cache (solo los que ya se cargaron)"""
        return list(self._agent_registry.values())

    def get_cached_agents_count(self) -> int:
        """Obtener cantidad de agentes en cache"""
        return len(self._agent_registry)

    def clear_cache(self):
        """Limpiar cache de agentes (para liberar memoria)"""
        self._agent_registry.clear()
        print("[DISCOVERY] Cache de agentes limpiado")

    def remove_from_cache(self, agent_id: str):
        """Remover un agente especifico del cache"""
        if agent_id in self._agent_registry:
            del self._agent_registry[agent_id]


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
