"""
PAIA Protocol routers for PAIA Backend.
Handles PAIA protocol endpoints for agent discovery, capabilities, requests, chat, and autonomy.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query
from paia_protocol import (
    PAIAMessageRouter,
    PAIADiscoveryService,
    AutonomyManager,
    AutonomySettings
)


def create_paia_router(
    paia_router: Optional[PAIAMessageRouter],
    paia_discovery: Optional[PAIADiscoveryService],
    paia_autonomy: Optional[AutonomyManager],
    db_manager: Any
) -> APIRouter:
    """
    Create PAIA protocol router with dependencies.

    Args:
        paia_router: PAIA message router instance
        paia_discovery: PAIA discovery service instance
        paia_autonomy: PAIA autonomy manager instance
        db_manager: Database manager instance

    Returns:
        Configured APIRouter with PAIA protocol endpoints
    """
    router = APIRouter()

    @router.post("/api/paia/register")
    async def register_agent_paia(registration_data: dict) -> Dict[str, Any]:
        """
        Register agent in PAIA protocol.

        Args:
            registration_data: Dictionary containing agent registration information

        Returns:
            Registration confirmation with agent info

        Raises:
            HTTPException: If PAIA protocol not initialized or registration fails
        """
        if not paia_discovery:
            raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

        try:
            agent_id = registration_data.get('agent_id')
            user_id = registration_data.get('user_id')
            agent_name = registration_data.get('agent_name')
            expertise = registration_data.get('expertise', [])
            capabilities = registration_data.get('capabilities', [])
            is_public = registration_data.get('is_public', True)

            if not agent_id or not user_id or not agent_name:
                raise HTTPException(
                    status_code=400,
                    detail="agent_id, user_id y agent_name son requeridos"
                )

            await paia_discovery.register_agent(
                agent_id=agent_id,
                user_id=user_id,
                agent_name=agent_name,
                expertise=expertise,
                capabilities=capabilities,
                is_public=is_public
            )

            return {
                "success": True,
                "message": f"Agente {agent_name} registrado en protocolo PAIA",
                "agent_id": agent_id,
                "protocol_version": "1.0"
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/paia/capabilities/{agent_id}")
    async def get_agent_capabilities_paia(agent_id: str) -> Dict[str, Any]:
        """
        Get agent capabilities in PAIA protocol.

        Args:
            agent_id: Agent ID to query capabilities

        Returns:
            Agent capabilities list

        Raises:
            HTTPException: If capabilities cannot be retrieved
        """
        try:
            capabilities = await db_manager.get_agent_capabilities(agent_id)

            return {
                "agent_id": agent_id,
                "capabilities": capabilities,
                "protocol_version": "1.0"
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/paia/request")
    async def send_paia_request(request_data: dict) -> Dict[str, Any]:
        """
        Send PAIA request message to an agent.

        Args:
            request_data: Dictionary containing request details

        Returns:
            Request confirmation with message ID

        Raises:
            HTTPException: If PAIA router not initialized or request fails
        """
        if not paia_router:
            raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

        try:
            from_agent_id = request_data.get('from_agent_id')
            to_agent_id = request_data.get('to_agent_id')
            user_id = request_data.get('user_id')
            action = request_data.get('action')
            params = request_data.get('params', {})

            if not from_agent_id or not to_agent_id or not user_id or not action:
                raise HTTPException(
                    status_code=400,
                    detail="from_agent_id, to_agent_id, user_id y action son requeridos"
                )

            message = {
                "type": "paia.request",
                "from_agent_id": from_agent_id,
                "to_agent_id": to_agent_id,
                "payload": {
                    "action": action,
                    "params": params
                },
                "metadata": {}
            }

            result = await paia_router.route_message(message, user_id)

            if not result.get('success'):
                raise HTTPException(
                    status_code=400,
                    detail=result.get('error', 'Error enviando request')
                )

            return {
                "success": True,
                "message_id": result.get('message_id'),
                "status": result.get('status'),
                "protocol_version": "1.0"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/paia/chat")
    async def send_paia_chat(chat_data: dict) -> Dict[str, Any]:
        """
        Send PAIA chat message to an agent.

        Args:
            chat_data: Dictionary containing chat message details

        Returns:
            Chat message confirmation with message ID

        Raises:
            HTTPException: If PAIA router not initialized or message fails
        """
        if not paia_router:
            raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

        try:
            from_agent_id = chat_data.get('from_agent_id')
            to_agent_id = chat_data.get('to_agent_id')
            user_id = chat_data.get('user_id')
            content = chat_data.get('content')
            intent = chat_data.get('intent', 'question')
            conversation_id = chat_data.get('conversation_id')

            if not from_agent_id or not to_agent_id or not user_id or not content:
                raise HTTPException(
                    status_code=400,
                    detail="from_agent_id, to_agent_id, user_id y content son requeridos"
                )

            message = {
                "type": "paia.chat.message",
                "from_agent_id": from_agent_id,
                "to_agent_id": to_agent_id,
                "payload": {
                    "content": content,
                    "intent": intent
                },
                "metadata": {}
            }

            if conversation_id:
                message["metadata"]["conversation_id"] = conversation_id

            result = await paia_router.route_message(message, user_id)

            if not result.get('success'):
                raise HTTPException(
                    status_code=400,
                    detail=result.get('error', 'Error enviando mensaje')
                )

            return {
                "success": True,
                "message_id": result.get('message_id'),
                "status": result.get('status'),
                "conversation_id": result.get('conversation_id'),
                "protocol_version": "1.0"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/paia/autonomy/{agent_id}")
    async def configure_autonomy(agent_id: str, settings_data: dict) -> Dict[str, Any]:
        """
        Configure agent autonomy settings.

        Args:
            agent_id: Agent ID to configure
            settings_data: Dictionary containing autonomy settings

        Returns:
            Confirmation of autonomy configuration

        Raises:
            HTTPException: If PAIA autonomy not initialized or configuration fails
        """
        if not paia_autonomy:
            raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

        try:
            db_agent = await db_manager.get_agent(agent_id)
            if not db_agent:
                raise HTTPException(status_code=404, detail="Agente no encontrado")

            user_id = settings_data.get('user_id')
            if not user_id or db_agent.user_id != user_id:
                raise HTTPException(status_code=403, detail="No autorizado")

            settings = AutonomySettings.from_dict(settings_data.get('settings', {}))

            paia_autonomy.set_agent_settings(agent_id, settings)

            await db_manager.save_autonomy_settings(agent_id, settings.to_dict())

            return {
                "success": True,
                "message": f"Autonomia configurada para agente {agent_id}",
                "settings": settings.to_dict(),
                "protocol_version": "1.0"
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/paia/autonomy/{agent_id}")
    async def get_autonomy_settings_endpoint(agent_id: str) -> Dict[str, Any]:
        """
        Get agent autonomy settings.

        Args:
            agent_id: Agent ID to query

        Returns:
            Autonomy settings for the agent

        Raises:
            HTTPException: If settings cannot be retrieved
        """
        try:
            settings = await db_manager.get_autonomy_settings(agent_id)

            if not settings:
                return {
                    "agent_id": agent_id,
                    "default_level": "supervised",
                    "rules": [],
                    "protocol_version": "1.0"
                }

            return {
                "agent_id": agent_id,
                **settings,
                "protocol_version": "1.0"
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/paia/discover/{user_id}")
    async def discover_agents_paia(
        user_id: str,
        target_name: str = None,
        expertise: str = None
    ) -> Dict[str, Any]:
        """
        Discover agents using PAIA protocol.

        Args:
            user_id: User ID requesting discovery
            target_name: Optional target agent name
            expertise: Optional expertise filter

        Returns:
            Discovered agents matching criteria

        Raises:
            HTTPException: If PAIA discovery not initialized or discovery fails
        """
        if not paia_discovery:
            raise HTTPException(status_code=503, detail="Protocolo PAIA no inicializado")

        try:
            if target_name:
                agent = await paia_discovery.discover_agent_by_name(
                    requester_user_id=user_id,
                    target_name=target_name
                )

                if agent:
                    return {
                        "agent": agent.to_dict(),
                        "protocol_version": "1.0"
                    }
                else:
                    return {
                        "error": "Agent not found",
                        "protocol_version": "1.0"
                    }

            elif expertise:
                agents = await paia_discovery.discover_agents_by_expertise(
                    requester_user_id=user_id,
                    expertise=expertise
                )

                return {
                    "agents": [agent.to_dict() for agent in agents],
                    "protocol_version": "1.0"
                }

            else:
                raise HTTPException(
                    status_code=400,
                    detail="Provide either target_name or expertise"
                )

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
