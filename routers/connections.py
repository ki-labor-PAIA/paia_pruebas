"""
Connections routers for PAIA Backend.
Handles agent connections and relationships.
"""
from typing import Dict, Any, List
from dataclasses import asdict
from fastapi import APIRouter, HTTPException


def create_connections_router(
    agent_manager: Any,  # Puede ser dict con 'agent_manager' key o instancia directa
    connections_store: Dict[str, Any]
) -> APIRouter:
    """
    Create connections router with dependencies.

    Args:
        agent_manager: Contenedor de servicios o PAIAAgentManager directo
        connections_store: Global connections storage

    Returns:
        Configured APIRouter with connection endpoints
    """
    router = APIRouter()

    def get_agent_manager():
        """Obtener el agent_manager actual del contenedor de servicios"""
        if isinstance(agent_manager, dict):
            return agent_manager.get('agent_manager')
        return agent_manager

    @router.post("/api/connections")
    async def create_connection(connection_data: dict) -> Dict[str, Any]:
        """
        Create a connection between two agents.

        Args:
            connection_data: Dictionary containing agent1, agent2, and optional type

        Returns:
            Connection information

        Raises:
            HTTPException: If connection creation fails
        """
        try:
            manager = get_agent_manager()
            if not manager:
                raise HTTPException(
                    status_code=503,
                    detail="Agent Manager no inicializado"
                )

            connection = await manager.connect_agents(
                connection_data['agent1'],
                connection_data['agent2'],
                connection_data.get('type', 'direct')
            )
            return asdict(connection)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/connections")
    async def get_connections() -> List[Dict[str, Any]]:
        """
        Get all active connections.

        Returns:
            List of all connections
        """
        return [asdict(conn) for conn in connections_store.values()]

    return router
