"""
Telegram Service for sending and receiving messages via Telegram Bot API.
"""
from typing import Dict, List, Optional, Any
import requests


class TelegramService:
    """
    Service for interacting with Telegram Bot API.

    Attributes:
        token: Bot token from BotFather
        base_url: Base URL for Telegram API
    """

    def __init__(self, token: str) -> None:
        """
        Initialize Telegram service with bot token.

        Args:
            token: Bot token obtained from BotFather
        """
        self.token: str = token
        self.base_url: str = f"https://api.telegram.org/bot{token}"

    def send_message(
        self,
        chat_id: str,
        message: str,
        parse_mode: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send a message via Telegram.

        Args:
            chat_id: Telegram chat ID to send message to
            message: Text message to send
            parse_mode: Optional parse mode (e.g., "Markdown", "HTML")

        Returns:
            Dictionary with 'success' (bool), 'message' (str), and optional 'data'
        """
        url: str = f"{self.base_url}/sendMessage"

        data: Dict[str, str] = {
            'chat_id': chat_id,
            'text': message
        }

        if parse_mode:
            data['parse_mode'] = parse_mode

        try:
            response = requests.post(url, data=data, timeout=10)

            if response.status_code == 200:
                return {
                    'success': True,
                    'message': 'Mensaje enviado exitosamente por Telegram',
                    'data': response.json()
                }
            else:
                return {
                    'success': False,
                    'message': f'Error al enviar mensaje: {response.text}'
                }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error de conexión: {str(e)}'
            }

    def get_updates(self) -> Optional[List[Dict[str, Any]]]:
        """
        Get recent messages/updates from Telegram to discover chat IDs.

        Returns:
            List of update objects, or None if error occurred
        """
        url: str = f"{self.base_url}/getUpdates"

        try:
            response = requests.get(url, timeout=10)

            if response.status_code == 200:
                data: Dict[str, Any] = response.json()
                return data.get('result', [])
            else:
                return None
        except Exception as e:
            print(f"Error obteniendo updates: {e}")
            return None
