"""
WhatsApp tools for PAIA agents.
Provides functions to send messages via WhatsApp Business API.
"""
from typing import Optional, Any
from langchain_core.tools import tool


def create_whatsapp_tools(whatsapp_service: Optional[Any]):
    """
    Create WhatsApp tools.

    Args:
        whatsapp_service: WhatsAppService instance or None

    Returns:
        List of WhatsApp tool functions
    """

    @tool
    def send_whatsapp_template(
        phone_number: str,
        template_name: str = "hello_world",
        language_code: str = "en_US"
    ) -> str:
        """
        Send a message using a predefined WhatsApp template.

        Args:
            phone_number: Destination phone number in international format (e.g., 524425498784)
            template_name: Name of approved template (default: "hello_world")
            language_code: Template language code (default: "en_US")

        Returns:
            Confirmation of send status
        """
        try:
            if not whatsapp_service:
                return "❌ Error: WhatsApp Service no está configurado. Verifica las variables WHATSAPP_API_TOKEN y WHATSAPP_PHONE_NUMBER_ID en .env"

            result = whatsapp_service.send_template_message(phone_number, template_name, language_code)

            if result['success']:
                return f"✅ {result['message']}"
            else:
                return f"❌ {result['message']}"

        except Exception as e:
            return f"❌ Error enviando WhatsApp template: {str(e)}"

    @tool
    def send_whatsapp_message(phone_number: str, message: str) -> str:
        """
        Send a text message via WhatsApp (requires active conversation within 24h).

        Args:
            phone_number: Destination phone number in international format (e.g., 524425498784)
            message: Text message to send

        Returns:
            Confirmation of send status
        """
        try:
            if not whatsapp_service:
                return "❌ Error: WhatsApp Service no está configurado"

            result = whatsapp_service.send_text_message(phone_number, message)

            if result['success']:
                return f"✅ {result['message']}"
            else:
                return f"❌ {result['message']}"

        except Exception as e:
            return f"❌ Error enviando mensaje por WhatsApp: {str(e)}"

    @tool
    def validate_whatsapp_config() -> str:
        """
        Verify if WhatsApp is correctly configured.

        Returns:
            WhatsApp configuration status
        """
        try:
            if not whatsapp_service:
                return "❌ WhatsApp no configurado. Faltan variables de entorno."

            config = whatsapp_service.validate_config()

            if config['configured']:
                return f"""✅ WhatsApp configurado correctamente
   API Token: {'✓' if config['api_token_set'] else '✗'}
   Phone ID: {'✓' if config['phone_number_id_set'] else '✗'}
   Versión API: {config['api_version']}"""
            else:
                return "❌ WhatsApp no está completamente configurado"

        except Exception as e:
            return f"❌ Error verificando configuración: {str(e)}"

    return [
        send_whatsapp_template,
        send_whatsapp_message,
        validate_whatsapp_config
    ]
