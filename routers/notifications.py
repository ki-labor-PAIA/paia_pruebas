"""
Notifications routers for PAIA Backend.
Handles notification management for users.
"""
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Query


def create_notifications_router(db_manager: Any) -> APIRouter:
    """
    Create notifications router with dependencies.

    Args:
        db_manager: DatabaseManager instance for database operations

    Returns:
        Configured APIRouter with notification endpoints
    """
    router = APIRouter()

    @router.post("/api/notifications")
    async def create_notification_endpoint(notification_data: dict) -> Dict[str, Any]:
        """
        Crear una notificacion para un usuario.

        Args:
            notification_data: Dictionary with notification details

        Returns:
            Notification ID and success message

        Raises:
            HTTPException: If required fields missing or creation fails
        """
        try:
            notification_id = await db_manager.create_notification(notification_data)
            return {
                "notification_id": notification_id,
                "message": "Notificacion creada exitosamente"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/notifications/{user_id}")
    async def get_user_notifications(
        user_id: str,
        unread_only: bool = Query(default=False),
        limit: int = Query(default=50)
    ) -> Dict[str, Any]:
        """
        Obtener las notificaciones de un usuario.

        Args:
            user_id: User ID to query notifications
            unread_only: Filter only unread notifications
            limit: Maximum number of notifications to return

        Returns:
            List of notifications and count

        Raises:
            HTTPException: If retrieval fails
        """
        try:
            notifications = await db_manager.get_user_notifications(
                user_id,
                unread_only=unread_only,
                limit=limit
            )
            return {"notifications": notifications, "count": len(notifications)}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/notifications/{notification_id}/read")
    async def mark_notification_as_read(notification_id: str) -> Dict[str, str]:
        """
        Marcar una notificacion como leida.

        Args:
            notification_id: Notification ID to mark as read

        Returns:
            Success message

        Raises:
            HTTPException: If notification not found or operation fails
        """
        try:
            success = await db_manager.mark_notification_as_read(notification_id)
            if not success:
                raise HTTPException(status_code=404, detail="Notificacion no encontrada")
            return {"message": "Notificacion marcada como leida"}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.post("/api/notifications/test/{user_id}")
    async def create_test_notification(user_id: str, test_data: dict = None) -> Dict[str, Any]:
        """
        Crear notificacion de prueba para testing.

        Args:
            user_id: User ID to receive test notification
            test_data: Optional test notification data

        Returns:
            Notification ID and success message

        Raises:
            HTTPException: If creation fails
        """
        try:
            notification_data = {
                'user_id': user_id,
                'title': 'Notificacion de Prueba',
                'content': 'Esta es una notificacion de prueba del sistema PAIA.',
                'notification_type': 'info',
                'priority': 'normal',
                'metadata': test_data if test_data else {}
            }

            notification_id = await db_manager.create_notification(notification_data)
            return {
                "notification_id": notification_id,
                "message": "Notificacion de prueba creada exitosamente"
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
