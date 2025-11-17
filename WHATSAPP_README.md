# WhatsApp Business API - Integración PAIA

## 📋 Resumen

Esta integración permite a los agentes PAIA enviar mensajes de WhatsApp usando la API de WhatsApp Business (Facebook Graph API).

## 🚀 Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# WhatsApp Business API (Facebook Graph API)
WHATSAPP_API_TOKEN=tu-token-de-whatsapp-cloud-api
WHATSAPP_PHONE_NUMBER_ID=tu-phone-number-id
WHATSAPP_VERSION=v22.0
```

### 2. Obtener Credenciales

1. **API Token**:
   - Ve a [Facebook Developers](https://developers.facebook.com/apps)
   - Selecciona tu app o crea una nueva
   - Ve a WhatsApp > API Setup
   - Copia el "Temporary Access Token" o genera uno permanente

2. **Phone Number ID**:
   - En la misma página de API Setup
   - Copia el "Phone number ID" (no el número de teléfono, sino el ID)

### 3. Verificar Configuración

Ejecuta el script de prueba:

```bash
python test_whatsapp.py
```

O verifica desde Python:

```python
from whatsapp_service import WhatsAppService

service = WhatsAppService()
config = service.validate_config()
print(config)
```

## 📡 API Endpoints

### 1. Enviar Plantilla de WhatsApp

```http
POST /api/whatsapp/send-template
Content-Type: application/json

{
  "phone_number": "524425498784",
  "template_name": "hello_world",
  "language_code": "en_US"
}
```

**Ejemplo con cURL:**

```bash
curl -X POST http://localhost:8000/api/whatsapp/send-template \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "524425498784",
    "template_name": "hello_world",
    "language_code": "en_US"
  }'
```

### 2. Enviar Mensaje de Texto

```http
POST /api/whatsapp/send
Content-Type: application/json

{
  "phone_number": "524425498784",
  "message": "Hola! Este es un mensaje de prueba"
}
```

**Nota**: Para enviar mensajes de texto, debe existir una conversación activa (iniciada en las últimas 24 horas).

### 3. Verificar Configuración

```http
GET /api/whatsapp/config
```

**Respuesta:**

```json
{
  "configured": true,
  "api_token_set": true,
  "phone_number_id_set": true,
  "api_version": "v22.0",
  "base_url": "https://graph.facebook.com/v22.0/815754798289654/messages"
}
```

## 🤖 Herramientas para Agentes

Los agentes PAIA tienen acceso automático a estas herramientas:

### 1. `send_whatsapp_template()`

Envía una plantilla predefinida de WhatsApp.

```python
# El agente puede usarla así:
send_whatsapp_template(
    phone_number="524425498784",
    template_name="hello_world",
    language_code="en_US"
)
```

**Parámetros:**
- `phone_number` (str): Número en formato internacional sin +
- `template_name` (str): Nombre de la plantilla aprobada (default: "hello_world")
- `language_code` (str): Código de idioma (default: "en_US")

**Retorna:** Mensaje de confirmación o error

### 2. `send_whatsapp_message()`

Envía un mensaje de texto directo.

```python
send_whatsapp_message(
    phone_number="524425498784",
    message="Hola! Tu cita está confirmada para mañana a las 10am"
)
```

**Parámetros:**
- `phone_number` (str): Número en formato internacional
- `message` (str): Texto del mensaje

**Retorna:** Mensaje de confirmación o error

### 3. `validate_whatsapp_config()`

Verifica que WhatsApp esté configurado correctamente.

```python
validate_whatsapp_config()
```

**Retorna:** Estado detallado de la configuración

## 💡 Ejemplos de Uso

### Desde un Agente

Cuando creas un agente, este automáticamente tiene acceso a las herramientas de WhatsApp:

```python
# El usuario le dice al agente:
# "Envíale un mensaje de WhatsApp a Mari al 524425498784"

# El agente ejecutará automáticamente:
send_whatsapp_template(
    phone_number="524425498784",
    template_name="hello_world",
    language_code="en_US"
)
```

### Desde el Backend

```python
from whatsapp_service import WhatsAppService

service = WhatsAppService()

# Enviar plantilla
result = service.send_template_message(
    to_phone="524425498784",
    template_name="hello_world",
    language_code="en_US"
)

if result['success']:
    print("✅ Mensaje enviado")
else:
    print(f"❌ Error: {result['message']}")
```

### Desde el Frontend (JavaScript/React)

```javascript
// Enviar plantilla
const response = await fetch('http://localhost:8000/api/whatsapp/send-template', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    phone_number: '524425498784',
    template_name: 'hello_world',
    language_code: 'en_US'
  })
});

const result = await response.json();
console.log(result);
```

## 📝 Formato de Número de Teléfono

Los números deben estar en **formato internacional sin el símbolo +**:

✅ Correcto:
- `524425498784` (México)
- `5491123456789` (Argentina)
- `12025551234` (USA)

❌ Incorrecto:
- `+524425498784` (con +)
- `4425498784` (sin código de país)
- `+52 442 549 8784` (con espacios)

## 🔍 Troubleshooting

### Error: "WHATSAPP_API_TOKEN no está configurado en .env"

**Solución**: Verifica que el archivo `.env` contenga las variables de WhatsApp.

### Error: "Error al enviar plantilla: Invalid OAuth access token"

**Solución**:
- El token ha expirado. Genera uno nuevo desde Facebook Developers.
- Verifica que el token esté correctamente copiado sin espacios adicionales.

### Error: "Message failed to send because more than 24 hours have passed"

**Solución**:
- Solo puedes enviar mensajes de texto si el usuario inició una conversación en las últimas 24 horas.
- Usa plantillas (`send_whatsapp_template`) para iniciar nuevas conversaciones.

### El mensaje no llega

**Verifica**:
1. Que el número de teléfono esté registrado como "Test Number" en WhatsApp Business
2. Que el formato del número sea correcto (sin + y con código de país)
3. Que la plantilla esté aprobada en tu cuenta de WhatsApp Business

## 🔐 Seguridad

- **Nunca** compartas tu `WHATSAPP_API_TOKEN` en repositorios públicos
- Agrega `.env` a tu `.gitignore`
- Rota el token periódicamente desde Facebook Developers
- Usa tokens permanentes en producción, no tokens temporales

## 📚 Referencias

- [WhatsApp Cloud API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates)
- [Error Codes](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

## 🆘 Soporte

Si encuentras problemas:

1. Verifica la configuración con `python test_whatsapp.py`
2. Revisa los logs del backend
3. Consulta el endpoint `/api/whatsapp/config`
4. Verifica el health check en `/api/health`

---

**Última actualización**: 2025-11-06
