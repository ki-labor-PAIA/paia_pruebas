"""
Telegram tools for PAIA agents.
Provides functions to send messages and notifications via Telegram Bot API.
"""
from typing import Optional, Dict, Any
from langchain_core.tools import tool


def create_telegram_tools(
    agent_id: str,
    agents_store: Dict[str, Any],
    telegram_service: Any,
    telegram_default_chat_id: str
):
    """
    Create Telegram tools for a specific agent.

    Args:
        agent_id: ID of the agent these tools belong to
        agents_store: Global agents storage dictionary
        telegram_service: TelegramService instance
        telegram_default_chat_id: Default chat ID to use

    Returns:
        List of Telegram tool functions
    """

    @tool
    def send_telegram_message(message: str, chat_id: Optional[str] = None) -> str:
        """
        Send a message via Telegram.

        Args:
            message: The message to send
            chat_id: Telegram chat ID (optional, uses configured default)

        Returns:
            Confirmation of send status
        """
        try:
            agent = agents_store.get(agent_id)
            target_chat_id = chat_id or (agent.telegram_chat_id if agent else telegram_default_chat_id)

            if not target_chat_id or target_chat_id == "TU_CHAT_ID_AQUI":
                return "❌ Error: Chat ID de Telegram no configurado. Usa set_telegram_chat_id() primero."

            # Add agent context to message
            agent_name = agent.name if agent else "Agente PAIA"
            formatted_message = f"🤖 {agent_name}:\n\n{message}"

            result = telegram_service.send_message(target_chat_id, formatted_message)

            if result['success']:
                return f"✅ Mensaje enviado exitosamente por Telegram al chat {target_chat_id}"
            else:
                return f"❌ Error enviando por Telegram: {result['message']}"

        except Exception as e:
            return f"❌ Error en Telegram: {str(e)}"

    @tool
    def send_telegram_notification(title: str, content: str, priority: str = "normal") -> str:
        """
        Send a formatted notification via Telegram.

        Args:
            title: Notification title
            content: Message content
            priority: Priority level (low, normal, high, urgent)

        Returns:
            Confirmation of send status
        """
        try:
            agent = agents_store.get(agent_id)
            chat_id = agent.telegram_chat_id if agent else telegram_default_chat_id

            if not chat_id or chat_id == "TU_CHAT_ID_AQUI":
                return "❌ Error: Chat ID de Telegram no configurado"

            # Format according to priority
            priority_emojis = {
                "low": "ℹ️",
                "normal": "📢",
                "high": "⚠️",
                "urgent": "🚨"
            }

            emoji = priority_emojis.get(priority, "📢")
            agent_name = agent.name if agent else "Agente PAIA"

            formatted_message = f"{emoji} <b>{title}</b>\n\n{content}\n\n<i>— {agent_name}</i>"

            result = telegram_service.send_message(chat_id, formatted_message, parse_mode="HTML")

            if result['success']:
                return f"✅ Notificación enviada por Telegram (Prioridad: {priority})"
            else:
                return f"❌ Error: {result['message']}"

        except Exception as e:
            return f"❌ Error enviando notificación: {str(e)}"

    @tool
    def set_telegram_chat_id(chat_id: str) -> str:
        """
        Configure the Telegram Chat ID for this agent.

        Args:
            chat_id: The Telegram chat ID

        Returns:
            Confirmation of configuration
        """
        try:
            agent = agents_store.get(agent_id)
            if agent:
                agent.telegram_chat_id = chat_id
                return f"✅ Chat ID de Telegram configurado: {chat_id}"
            else:
                return "❌ Error: Agente no encontrado"
        except Exception as e:
            return f"❌ Error configurando Chat ID: {str(e)}"

    @tool
    def get_telegram_updates() -> str:
        """
        Get recent Telegram messages to discover Chat IDs.

        Returns:
            List of recent messages with their Chat IDs
        """
        try:
            updates = telegram_service.get_updates()

            if not updates:
                return "No hay mensajes nuevos en Telegram"

            messages_info = []
            for update in updates[-5:]:  # Last 5 messages
                if 'message' in update:
                    msg = update['message']
                    chat = msg.get('chat', {})
                    from_user = msg.get('from', {})
                    text = msg.get('text', 'Sin texto')

                    info = f"Chat ID: {chat.get('id')} | Usuario: {from_user.get('username', 'Desconocido')} | Texto: {text[:50]}"
                    messages_info.append(info)

            return "Últimos mensajes de Telegram:\n" + "\n".join(messages_info)

        except Exception as e:
            return f"❌ Error obteniendo updates: {str(e)}"

    return [
        send_telegram_message,
        send_telegram_notification,
        set_telegram_chat_id,
        get_telegram_updates
    ]
