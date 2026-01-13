"""
Telegram routers for PAIA Backend.
Handles Telegram messaging integration.
"""
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException


def create_telegram_router(
    telegram_service: Any,
    telegram_default_chat_id: str
) -> APIRouter:
    """
    Create Telegram router with dependencies.

    Args:
        telegram_service: TelegramService instance for Telegram operations
        telegram_default_chat_id: Default chat ID for Telegram messages

    Returns:
        Configured APIRouter with Telegram endpoints
    """
    router = APIRouter()

    @router.post("/api/telegram/send")
    async def send_telegram_message_endpoint(message_data: dict) -> Dict[str, Any]:
        """
        Endpoint para enviar mensajes por Telegram.

        Args:
            message_data: Dictionary containing chat_id, message, and optional parse_mode

        Returns:
            Result of the send operation

        Raises:
            HTTPException: If message is empty or send fails
        """
        try:
            chat_id = message_data.get('chat_id', telegram_default_chat_id)
            message = message_data.get('message', '')
            parse_mode = message_data.get('parse_mode', None)

            if not message:
                raise HTTPException(status_code=400, detail="Mensaje vacío")

            result = telegram_service.send_message(chat_id, message, parse_mode)

            if result['success']:
                return result
            else:
                raise HTTPException(status_code=500, detail=result['message'])

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @router.get("/api/telegram/updates")
    async def get_telegram_updates() -> Dict[str, Any]:
        """
        Obtener actualizaciones de Telegram.

        Returns:
            Dictionary containing formatted updates from Telegram
        """
        try:
            updates = telegram_service.get_updates()

            if updates is None:
                return {"updates": [], "message": "No hay actualizaciones"}

            formatted_updates = []
            for update in updates[-10:]:
                if 'message' in update:
                    msg = update['message']
                    formatted_updates.append({
                        "chat_id": msg.get('chat', {}).get('id'),
                        "username": msg.get('from', {}).get('username'),
                        "first_name": msg.get('from', {}).get('first_name'),
                        "text": msg.get('text'),
                        "date": msg.get('date')
                    })

            return {"updates": formatted_updates}

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    return router
