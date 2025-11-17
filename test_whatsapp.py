"""
Script de prueba para WhatsApp Business API
Verifica la configuración y envía un mensaje de prueba
"""

import sys
import os
from dotenv import load_dotenv

# Fix para Windows - configurar encoding UTF-8
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Cargar variables de entorno
load_dotenv()

# Importar el servicio de WhatsApp
from whatsapp_service import WhatsAppService

def test_whatsapp_configuration():
    """Prueba la configuración de WhatsApp"""
    print("=" * 60)
    print("PRUEBA DE CONFIGURACIÓN DE WHATSAPP")
    print("=" * 60)
    print()

    try:
        # Crear instancia del servicio
        print("1️⃣ Inicializando WhatsApp Service...")
        service = WhatsAppService()
        print("   ✅ Servicio inicializado correctamente")
        print()

        # Validar configuración
        print("2️⃣ Validando configuración...")
        config = service.validate_config()

        print(f"   • API Token configurado: {'✅' if config['api_token_set'] else '❌'}")
        print(f"   • Phone Number ID: {'✅' if config['phone_number_id_set'] else '❌'}")
        print(f"   • Versión de API: {config['api_version']}")
        print(f"   • Base URL: {config['base_url']}")
        print()

        if not config['configured']:
            print("❌ WhatsApp no está completamente configurado")
            print("   Verifica las variables en el archivo .env:")
            print("   - WHATSAPP_API_TOKEN")
            print("   - WHATSAPP_PHONE_NUMBER_ID")
            print("   - WHATSAPP_VERSION (opcional)")
            return False

        print("✅ Configuración completa y válida")
        return True

    except Exception as e:
        print(f"❌ Error durante la prueba: {e}")
        return False

def test_send_template(phone_number: str = None):
    """Prueba el envío de una plantilla de WhatsApp"""
    print()
    print("=" * 60)
    print("PRUEBA DE ENVÍO DE PLANTILLA")
    print("=" * 60)
    print()

    if not phone_number:
        phone_number = input("Ingresa el número de teléfono de prueba (ej: 524425498784): ").strip()

    if not phone_number:
        print("❌ Número de teléfono requerido")
        return False

    try:
        service = WhatsAppService()

        print(f"📱 Enviando plantilla 'hello_world' a {phone_number}...")
        result = service.send_template_message(
            to_phone=phone_number,
            template_name="hello_world",
            language_code="en_US"
        )

        if result['success']:
            print(f"✅ {result['message']}")
            if 'data' in result:
                print(f"   📊 Respuesta de API: {result['data']}")
            return True
        else:
            print(f"❌ {result['message']}")
            if 'data' in result:
                print(f"   📊 Detalles del error: {result['data']}")
            return False

    except Exception as e:
        print(f"❌ Error enviando mensaje: {e}")
        return False

def main():
    """Función principal de pruebas"""
    print()
    print("🔧 SCRIPT DE PRUEBA - WHATSAPP BUSINESS API")
    print()

    # Paso 1: Verificar configuración
    config_ok = test_whatsapp_configuration()

    if not config_ok:
        print()
        print("⚠️ Configura WhatsApp antes de continuar")
        sys.exit(1)

    # Paso 2: Preguntar si quiere enviar mensaje de prueba
    print()
    send_test = input("¿Deseas enviar un mensaje de prueba? (s/n): ").strip().lower()

    if send_test == 's':
        test_send_template()
    else:
        print("✅ Configuración verificada. No se enviaron mensajes.")

    print()
    print("=" * 60)
    print("PRUEBA COMPLETADA")
    print("=" * 60)
    print()
    print("📝 RESUMEN:")
    print("   - Servicio WhatsApp: ✅ Configurado")
    print("   - Endpoints disponibles:")
    print("     • POST /api/whatsapp/send-template")
    print("     • POST /api/whatsapp/send")
    print("     • GET /api/whatsapp/config")
    print()
    print("🔧 HERRAMIENTAS PARA AGENTES:")
    print("   - send_whatsapp_template(phone_number, template_name, language_code)")
    print("   - send_whatsapp_message(phone_number, message)")
    print("   - validate_whatsapp_config()")
    print()

if __name__ == "__main__":
    main()
