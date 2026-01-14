"""
Users routers for PAIA Backend.
Handles user search, connections, and profile management.
"""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException


def create_users_router(
    db_manager: Any,
    auth_manager: Any,
    auto_connect_friend_agents_func: Any
) -> APIRouter:
    """
    Create users router with dependencies.

    Args:
        db_manager: DatabaseManager instance for database operations
        auth_manager: AuthManager instance for user authentication
        auto_connect_friend_agents_func: Function to auto-connect agents when users become friends

    Returns:
        Configured APIRouter with user endpoints
    """
    router = APIRouter()

    @router.get("/api/users/search")
    async def search_users(q: str, exclude_user_id: str = None, limit: int = 20) -> Dict[str, Any]:
        """
        Buscar usuarios por nombre o email.

        Args:
            q: Search query string (minimum 2 characters)
            exclude_user_id: Optional user ID to exclude from results
            limit: Maximum number of results to return

        Returns:
            List of matching users

        Raises:
            HTTPException: If query is too short or search fails
        """
        try:
            if not q or len(q) < 2:
                raise HTTPException(status_code=400, detail="Query debe tener al menos 2 caracteres")

            users = await db_manager.search_users(q, exclude_user_id, limit)
            return {"users": users}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/users/{user_id}/public-flows")
    async def get_public_flows_by_user(user_id: str) -> Dict[str, Any]:
        """
        Obtener los flujos publicos de un amigo.

        Args:
            user_id: ID of the user whose public flows to retrieve

        Returns:
            List of public flows

        Raises:
            HTTPException: If retrieval fails
        """
        try:
            flows = await db_manager.get_public_flows_by_user(user_id)
            return {"flows": flows}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/users/{user_id}/connections")
    async def get_user_connections(user_id: str, status: str = 'accepted') -> Dict[str, Any]:
        """
        Obtener las conexiones/amigos de un usuario.

        Args:
            user_id: ID of the user
            status: Connection status filter (default: 'accepted')

        Returns:
            List of user connections and count

        Raises:
            HTTPException: If retrieval fails
        """
        try:
            connections = await db_manager.get_user_connections(user_id, status)
            return {"connections": connections, "count": len(connections)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/users/connect")
    async def create_user_connection_request(connection_data: dict) -> Dict[str, Any]:
        """
        Crear solicitud de conexion entre usuarios.

        Args:
            connection_data: Dictionary with requester_id, recipient_id, and connection_type

        Returns:
            Connection ID and status

        Raises:
            HTTPException: If request is invalid or creation fails
        """
        try:
            requester_id = connection_data.get('requester_id')
            recipient_id = connection_data.get('recipient_id')
            connection_type = connection_data.get('connection_type', 'friend')

            if not requester_id or not recipient_id:
                raise HTTPException(status_code=400, detail="requester_id y recipient_id son requeridos")

            if requester_id == recipient_id:
                raise HTTPException(status_code=400, detail="No puedes enviarte una solicitud de conexion a ti mismo.")

            connection_id = await db_manager.create_user_connection_request(
                requester_id, recipient_id, connection_type
            )

            if not connection_id:
                raise HTTPException(status_code=409, detail="Ya existe una conexion o solicitud pendiente con este usuario.")

            await db_manager.create_notification({
                'user_id': recipient_id,
                'title': 'Nueva solicitud de conexion',
                'content': f'Tienes una nueva solicitud de conexion de un usuario.',
                'notification_type': 'connection_request',
                'priority': 'normal',
                'metadata': {
                    'connection_id': connection_id,
                    'requester_id': requester_id,
                    'connection_type': connection_type
                }
            })

            return {"connection_id": connection_id, "status": "pending"}
        except HTTPException:
            raise
        except Exception as e:
            print(f"Error creating user connection request: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/users/connect/respond")
    async def respond_to_connection_request(response_data: dict) -> Dict[str, Any]:
        """
        Responder a una solicitud de conexion (aceptar o rechazar).

        Args:
            response_data: Dictionary with connection_id, response ('accept' or 'reject'), and user_id

        Returns:
            Success status and message

        Raises:
            HTTPException: If request is invalid or operation fails
        """
        try:
            connection_id = response_data.get('connection_id')
            response = response_data.get('response')
            user_id = response_data.get('user_id')

            if not connection_id or not response or not user_id:
                raise HTTPException(status_code=400, detail="connection_id, response y user_id son requeridos")

            if response not in ['accept', 'reject']:
                raise HTTPException(status_code=400, detail="response debe ser 'accept' o 'reject'")

            if response == 'accept':
                success = await db_manager.accept_user_connection_request(connection_id, user_id)
            else:
                success = await db_manager.reject_user_connection_request(connection_id, user_id)

            if not success:
                raise HTTPException(status_code=404, detail="Conexion no encontrada")

            connection = await db_manager.get_connection_by_id(connection_id)
            if not connection:
                raise HTTPException(status_code=404, detail="Informacion de conexion no encontrada")

            if response == 'accept':
                try:
                    await auto_connect_friend_agents_func(connection['requester_id'], connection['recipient_id'])
                except Exception as auto_connect_error:
                    print(f"[AUTO-CONNECT] Error auto-conectando agentes de amigos: {auto_connect_error}")

            requester_notification_content = (
                f"Tu solicitud de conexion fue {'aceptada' if response == 'accept' else 'rechazada'}"
            )

            await db_manager.create_notification({
                'user_id': connection['requester_id'],
                'title': f'Solicitud de conexion {'aceptada' if response == 'accept' else 'rechazada'}',
                'content': requester_notification_content,
                'notification_type': 'success' if response == 'accept' else 'info',
                'priority': 'normal'
            })

            return {
                "success": True,
                "status": "accepted" if response == 'accept' else "rejected",
                "connection_id": connection_id,
                "message": f"Conexion {'aceptada' if response == 'accept' else 'rechazada'} correctamente"
            }
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
