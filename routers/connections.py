"""
Connections routers for PAIA Backend.
Handles agent connections and relationships.
"""
from typing import Dict, Any, List
from dataclasses import asdict
from fastapi import APIRouter, HTTPException


def create_connections_router(
    agent_manager: Any,
    connections_store: Dict[str, Any]
) -> APIRouter:
    """
    Create connections router with dependencies.

    Args:
        agent_manager: PAIAAgentManager instance for managing agent connections
        connections_store: Global connections storage

    Returns:
        Configured APIRouter with connection endpoints
    """
    router = APIRouter()

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
            connection = await agent_manager.connect_agents(
                connection_data['agent1'],
                connection_data['agent2'],
                connection_data.get('type', 'direct')
            )
            return asdict(connection)
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
