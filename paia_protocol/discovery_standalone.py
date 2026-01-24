"""
PAIA Protocol - Discovery Service Standalone
Discovery adaptado para usar con el servidor PAIA standalone
"""

from typing import Dict, Any, Optional, List
from .discovery import AgentProfile, AgentCapability


class PAIADiscoveryServiceStandalone:
    """
    Discovery service adaptado para servidor standalone.
    Usa PAIAStorage en lugar de db_manager.
    """

    def __init__(self, storage):
        """
        Args:
            storage: Instancia de PAIAStorage
        """
        self.storage = storage
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
        """Registrar un agente en el sistema de descubrimiento"""
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

            # Guardar capabilities en BD
            for cap in capabilities:
                await self.storage.add_capability({
                    'agent_id': agent_id,
                    'capability_name': cap.name,
                    'capability_type': cap.message_type,
                    'description': cap.description,
                    'requires_approval': cap.requires_approval,
                    'autonomy_level': cap.autonomy_level
                })

            print(f"[DISCOVERY] ✓ Agente registrado: {agent_name} ({agent_id})")
            return True

        except Exception as e:
            print(f"[DISCOVERY] ✗ Error registrando agente {agent_id}: {e}")
            return False

    async def unregister_agent(self, agent_id: str) -> bool:
        """Quitar un agente del registro"""
        if agent_id in self._agent_registry:
            del self._agent_registry[agent_id]
            await self.storage.update_agent_status(agent_id, "offline")
            print(f"[DISCOVERY] Agente {agent_id} desregistrado")
            return True
        return False

    async def update_agent_status(self, agent_id: str, status: str) -> bool:
        """Actualizar el estado de un agente"""
        if agent_id in self._agent_registry:
            self._agent_registry[agent_id].status = status
            await self.storage.update_agent_status(agent_id, status)
            return True
        return False

    async def get_agent_profile(self, agent_id: str) -> Optional[AgentProfile]:
        """Obtener el perfil completo de un agente"""
        # Primero intentar del registry en memoria
        if agent_id in self._agent_registry:
            return self._agent_registry[agent_id]

        # Si no está en memoria, buscar en BD
        agent = await self.storage.get_agent(agent_id)
        if agent:
            capabilities = await self.storage.get_agent_capabilities(agent_id)
            caps = [
                AgentCapability(
                    id=cap['capability_name'],
                    name=cap['capability_name'],
                    description=cap['description'],
                    message_type=cap['capability_type'],
                    requires_approval=cap['requires_approval'],
                    autonomy_level=cap['autonomy_level']
                )
                for cap in capabilities
            ]

            profile = AgentProfile(
                agent_id=agent['id'],
                user_id=agent['user_id'],
                agent_name=agent['name'],
                expertise=[agent['expertise']],
                capabilities=caps,
                status=agent['status'],
                is_public=agent['is_public']
            )

            return profile

        return None

    async def discover_agent_by_name(
        self,
        requester_user_id: str,
        target_name: str,
        capability: Optional[str] = None
    ) -> Optional[AgentProfile]:
        """Descubrir un agente por nombre de usuario"""
        try:
            # Buscar en conexiones sociales (amigos)
            connections = await self.storage.get_user_connections(requester_user_id, 'accepted')

            # Buscar el usuario objetivo por nombre
            target_user = None
            for conn in connections:
                if conn['requester_id'] == requester_user_id:
                    if target_name.lower() in conn['recipient_name'].lower():
                        target_user = {'id': conn['recipient_id'], 'name': conn['recipient_name']}
                        break
                else:
                    if target_name.lower() in conn['requester_name'].lower():
                        target_user = {'id': conn['requester_id'], 'name': conn['requester_name']}
                        break

            if not target_user:
                print(f"[DISCOVERY] No se encontró usuario '{target_name}' en amigos")
                return None

            # Obtener agentes públicos del usuario objetivo
            all_agents = await self.storage.get_agents_by_user(target_user['id'])
            public_agents = [a for a in all_agents if a['is_public']]

            if not public_agents:
                print(f"[DISCOVERY] Usuario '{target_name}' no tiene agentes públicos")
                return None

            # Si se especificó capability, filtrar
            if capability:
                for agent in public_agents:
                    if capability in agent['expertise']:
                        return await self.get_agent_profile(agent['id'])

            # Retornar el primer agente público
            return await self.get_agent_profile(public_agents[0]['id'])

        except Exception as e:
            print(f"[DISCOVERY] Error en discover_agent_by_name: {e}")
            return None

    async def discover_agents_by_expertise(
        self,
        requester_user_id: str,
        expertise: str,
        friends_only: bool = True
    ) -> List[AgentProfile]:
        """Descubrir agentes por expertise"""
        try:
            # Obtener lista de amigos
            friend_ids = set()
            if friends_only:
                connections = await self.storage.get_user_connections(requester_user_id, 'accepted')

                for conn in connections:
                    if conn['requester_id'] == requester_user_id:
                        friend_ids.add(conn['recipient_id'])
                    else:
                        friend_ids.add(conn['requester_id'])

            # Buscar agentes públicos
            public_agents = await self.storage.get_public_agents(exclude_user_id=requester_user_id)

            matching_agents = []
            for agent in public_agents:
                # Verificar que sea amigo (si se requiere)
                if friends_only and agent['user_id'] not in friend_ids:
                    continue

                # Verificar expertise
                if expertise in agent['expertise']:
                    profile = await self.get_agent_profile(agent['id'])
                    if profile:
                        matching_agents.append(profile)

            print(f"[DISCOVERY] Encontrados {len(matching_agents)} agentes con expertise '{expertise}'")
            return matching_agents

        except Exception as e:
            print(f"[DISCOVERY] Error en discover_agents_by_expertise: {e}")
            return []

    async def can_communicate(
        self,
        from_user_id: str,
        to_agent_id: str
    ) -> tuple[bool, Optional[str]]:
        """Verificar si un usuario puede comunicarse con un agente"""
        # Obtener agente destino
        to_agent = await self.storage.get_agent(to_agent_id)
        if not to_agent:
            return False, "Agente no encontrado"

        # Si el agente no es público
        if not to_agent['is_public']:
            if from_user_id != to_agent['user_id']:
                return False, "Agente no es público"

        # Si es el mismo usuario, permitir
        if from_user_id == to_agent['user_id']:
            return True, None

        # Verificar si son amigos
        are_friends = await self.storage.are_friends(from_user_id, to_agent['user_id'])

        if are_friends:
            return True, None

        return False, "No hay conexión social con el dueño del agente"

    def get_all_registered_agents(self) -> List[AgentProfile]:
        """Obtener todos los agentes registrados en memoria"""
        return list(self._agent_registry.values())

    def get_online_agents(self) -> List[AgentProfile]:
        """Obtener solo agentes online"""
        return [
            profile for profile in self._agent_registry.values()
            if profile.status == "online"
        ]

    def is_user_online(self, user_id: str) -> bool:
        """Verificar si un usuario tiene agentes online"""
        for profile in self._agent_registry.values():
            if profile.user_id == user_id and profile.status == "online":
                return True
        return False
