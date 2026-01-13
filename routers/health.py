"""
Health check routers for PAIA Backend.
Provides system health monitoring endpoints.
"""
from typing import Dict, Any, Optional, Callable
from datetime import datetime
from fastapi import APIRouter


def create_health_router(
    agents_store: Dict[str, Any],
    connections_store: Dict[str, Any],
    active_websockets: Dict[str, Any],
    message_history: Dict[str, Any],
    telegram_bot_token: str,
    whatsapp_service: Optional[Any],
    paia_router: Optional[Any],
    paia_discovery: Optional[Any],
    paia_autonomy: Optional[Any],
    paia_ws_handler: Optional[Any]
) -> APIRouter:
    """
    Create health check router with dependencies.

    Args:
        agents_store: Global agents storage
        connections_store: Global connections storage
        active_websockets: Active WebSocket connections
        message_history: Message history storage
        telegram_bot_token: Telegram bot token
        whatsapp_service: WhatsApp service instance
        paia_router: PAIA protocol router
        paia_discovery: PAIA discovery service
        paia_autonomy: PAIA autonomy manager
        paia_ws_handler: PAIA WebSocket handler

    Returns:
        Configured APIRouter with health endpoints
    """
    router = APIRouter()

    @router.get("/api/health")
    async def health_check() -> Dict[str, Any]:
        """
        General health check endpoint.

        Returns system status including agents, connections, and service configurations.
        """
        telegram_status = "configured" if telegram_bot_token != "TU_TOKEN_AQUI" else "not_configured"
        whatsapp_status = "configured" if whatsapp_service and whatsapp_service.validate_config()['configured'] else "not_configured"

        return {
            "status": "healthy",
            "agents_count": len(agents_store),
            "connections_count": len(connections_store),
            "active_websockets": len(active_websockets),
            "conversations_count": len(message_history),
            "telegram_status": telegram_status,
            "whatsapp_status": whatsapp_status,
            "database_connected": True,
            "timestamp": datetime.now().isoformat()
        }

    @router.get("/api/paia/health")
    async def paia_health_check() -> Dict[str, Any]:
        """
        Health check del protocolo PAIA.

        Returns PAIA protocol status and agent statistics.
        """
        if not paia_router or not paia_discovery or not paia_autonomy:
            return {
                "status": "not_initialized",
                "protocol_version": "1.0",
                "message": "Protocolo PAIA no inicializado"
            }

        try:
            online_agents = len(paia_discovery.get_online_agents()) if hasattr(paia_discovery, 'get_online_agents') else 0
            total_agents = len(paia_discovery.get_all_registered_agents()) if hasattr(paia_discovery, 'get_all_registered_agents') else 0

            return {
                "status": "healthy",
                "protocol_version": "1.0",
                "total_agents": total_agents,
                "online_agents": online_agents,
                "active_connections": len(paia_ws_handler.active_connections) if paia_ws_handler and hasattr(paia_ws_handler, 'active_connections') else 0
            }
        except Exception as e:
            return {
                "status": "error",
                "protocol_version": "1.0",
                "error": str(e)
            }

    return router
