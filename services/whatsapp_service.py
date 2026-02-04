"""
WhatsApp Business API Service
Módulo para enviar mensajes a través de WhatsApp Cloud API (Facebook Graph API)
"""

import os
import requests
import hmac
import hashlib
from typing import Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class WhatsAppService:
    """Servicio para interactuar con WhatsApp Business API"""

    def __init__(self, api_token: str = None, phone_number_id: str = None, api_version: str = None):
        """
        Inicializa el servicio de WhatsApp

        Args:
            api_token: Token de autorización de WhatsApp Cloud API
            phone_number_id: ID del número de teléfono de WhatsApp Business
            api_version: Versión de la API de Graph (default: v22.0)
        """
        self.api_token = api_token or os.getenv("WHATSAPP_API_TOKEN")
        self.phone_number_id = phone_number_id or os.getenv("WHATSAPP_PHONE_NUMBER_ID")
        self.api_version = api_version or os.getenv("WHATSAPP_VERSION", "v22.0")

        if not self.api_token:
            raise ValueError("WHATSAPP_API_TOKEN no está configurado en .env")
        if not self.phone_number_id:
            raise ValueError("WHATSAPP_PHONE_NUMBER_ID no está configurado en .env")

        self.base_url = f"https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages"
        self.headers = {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }

    def send_template_message(
        self,
        to_phone: str,
        template_name: str = "hello_world",
        language_code: str = "en_US"
    ) -> Dict:
        """
        Envía un mensaje usando una plantilla predefinida de WhatsApp

        Args:
            to_phone: Número de teléfono destino (formato internacional sin +, ej: 524425498784)
            template_name: Nombre de la plantilla aprobada (default: "hello_world")
            language_code: Código de idioma (default: "en_US")

        Returns:
            Dict con keys: success (bool), message (str), data (dict opcional)
        """
        # Limpiar el número de teléfono (remover caracteres no numéricos excepto +)
        clean_phone = ''.join(filter(str.isdigit, to_phone))

        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {
                    "code": language_code
                }
            }
        }

        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=10
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'message': f'Plantilla "{template_name}" enviada exitosamente a {clean_phone}',
                    'data': response.json()
                }
            else:
                error_data = response.json() if response.text else {}
                error_message = error_data.get('error', {}).get('message', response.text)
                return {
                    'success': False,
                    'message': f'Error al enviar plantilla: {error_message}',
                    'data': error_data
                }

        except requests.exceptions.Timeout:
            return {
                'success': False,
                'message': 'Error: Timeout al conectar con WhatsApp API'
            }
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'message': f'Error de conexión: {str(e)}'
            }
        except Exception as e:
            return {
                'success': False,
                'message': f'Error inesperado: {str(e)}'
            }

    def send_text_message(self, to_phone: str, message: str) -> Dict:
        """
        Envía un mensaje de texto directo (requiere conversación iniciada en últimas 24h)

        Args:
            to_phone: Número de teléfono destino (formato internacional)
            message: Texto del mensaje

        Returns:
            Dict con keys: success (bool), message (str), data (dict opcional)
        """
        clean_phone = ''.join(filter(str.isdigit, to_phone))

        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": clean_phone,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": message
            }
        }

        try:
            response = requests.post(
                self.base_url,
                headers=self.headers,
                json=payload,
                timeout=10
            )

            if response.status_code == 200:
                return {
                    'success': True,
                    'message': f'Mensaje enviado exitosamente a {clean_phone}',
                    'data': response.json()
                }
            else:
                error_data = response.json() if response.text else {}
                error_message = error_data.get('error', {}).get('message', response.text)
                return {
                    'success': False,
                    'message': f'Error al enviar mensaje: {error_message}',
                    'data': error_data
                }

        except Exception as e:
            return {
                'success': False,
                'message': f'Error: {str(e)}'
            }

    def validate_config(self) -> Dict:
        """
        Valida que la configuración de WhatsApp sea correcta

        Returns:
            Dict con status de la configuración
        """
        return {
            'configured': bool(self.api_token and self.phone_number_id),
            'api_token_set': bool(self.api_token),
            'phone_number_id_set': bool(self.phone_number_id),
            'api_version': self.api_version,
            'base_url': self.base_url
        }

    # =============== WEBHOOK METHODS ===============

    def verify_webhook_signature(self, request_body: bytes, signature_header: str) -> bool:
        """
        Verifica la firma del webhook para asegurar que viene de WhatsApp

        Args:
            request_body: El cuerpo de la petición en bytes (sin parsear)
            signature_header: El valor del header X-Hub-Signature-256

        Returns:
            bool: True si la firma es válida, False en caso contrario
        """
        app_secret = os.getenv("WHATSAPP_APP_SECRET")
        if not app_secret:
            print("[WARNING] WHATSAPP_APP_SECRET no configurado, no se puede verificar firma")
            return True  # En desarrollo, permitir sin verificación

        try:
            # Calcular la firma esperada
            expected_signature = hmac.new(
                app_secret.encode('utf-8'),
                request_body,
                hashlib.sha256
            ).hexdigest()

            # Extraer la firma recibida (formato: "sha256=<hash>")
            received_signature = signature_header.replace('sha256=', '') if signature_header else ''

            # Comparación segura
            return hmac.compare_digest(expected_signature, received_signature)
        except Exception as e:
            print(f"[ERROR] Error verificando firma del webhook: {e}")
            return False

    def get_media_url(self, media_id: str) -> Optional[str]:
        """Obtener la URL temporal del medio desde la API de Graph"""
        try:
            url = f"https://graph.facebook.com/{self.api_version}/{media_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                return data.get("url")
            else:
                print(f"[WhatsAppService] Error obteniendo media url: {response.status_code} {response.text}")
                return None
        except Exception as e:
            print(f"[WhatsAppService] get_media_url error: {e}")
            return None

    def download_media(self, media_id: str) -> Optional[bytes]:
        """Descargar el contenido del media y devolver los bytes"""
        try:
            media_url = self.get_media_url(media_id)
            if not media_url:
                return None
            # Descargar contenido con el mismo token
            response = requests.get(media_url, headers=self.headers, timeout=20)
            if response.status_code == 200:
                return response.content
            print(f"[WhatsAppService] Error descargando media: {response.status_code} {response.text}")
            return None
        except Exception as e:
            print(f"[WhatsAppService] download_media error: {e}")
            return None

    def parse_webhook_payload(self, payload: Dict) -> Optional[Dict]:
        """
        Extrae la información relevante del payload del webhook

        Args:
            payload: El payload JSON recibido del webhook

        Returns:
            Dict con: customer_phone, message_text, message_id, timestamp, attachment (opcional)
            None si el payload no contiene un mensaje válido
        """
        try:
            # Verificar estructura básica
            if payload.get("object") != "whatsapp_business_account":
                return None

            entry = payload.get("entry", [])
            if not entry:
                return None

            changes = entry[0].get("changes", [])
            if not changes:
                return None

            value = changes[0].get("value", {})
            messages = value.get("messages", [])

            if not messages:
                # Puede ser una notificación de estado, no un mensaje
                return None

            message = messages[0]
            message_type = message.get("type")

            customer_phone = message.get("from")
            message_id = message.get("id")
            timestamp = message.get("timestamp")

            # Texto
            if message_type == "text":
                message_text = message.get("text", {}).get("body")
                if not customer_phone or not message_text:
                    return None
                return {
                    "customer_phone": customer_phone,
                    "message_text": message_text,
                    "message_id": message_id,
                    "timestamp": timestamp,
                    "metadata": value.get("metadata", {})
                }

            # Document / Image / Audio / Video
            if message_type in ("document", "image", "audio", "video"):
                media = message.get(message_type, {})
                media_id = media.get("id")
                mime_type = media.get("mime_type") or media.get("mimetype")
                filename = media.get("filename") or media.get("caption")

                if not customer_phone or not media_id:
                    return None

                return {
                    "customer_phone": customer_phone,
                    "message_text": None,
                    "message_id": message_id,
                    "timestamp": timestamp,
                    "attachment": {
                        "type": message_type,
                        "media_id": media_id,
                        "mime_type": mime_type,
                        "filename": filename
                    },
                    "metadata": value.get("metadata", {})
                }

            # Otros tipos no soportados por ahora
            print(f"[WhatsApp Webhook] Tipo de mensaje no soportado: {message_type}")
            return None

        except Exception as e:
            print(f"[ERROR] Error parseando payload del webhook: {e}")
            return None


# Instancia global para uso directo si se necesita
if __name__ == "__main__":
    # Test básico de configuración
    try:
        service = WhatsAppService()
        config = service.validate_config()
        print("✅ WhatsApp Service configurado correctamente:")
        print(f"   - API Token: {'✓' if config['api_token_set'] else '✗'}")
        print(f"   - Phone Number ID: {'✓' if config['phone_number_id_set'] else '✗'}")
        print(f"   - API Version: {config['api_version']}")
        print(f"   - Base URL: {config['base_url']}")
    except Exception as e:
        print(f"❌ Error en configuración de WhatsApp: {e}")
