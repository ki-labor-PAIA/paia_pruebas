# 🚀 Guía de Configuración Local para PAIA

Esta guía te ayudará a configurar el proyecto PAIA en tu entorno local de desarrollo.

---

## 📋 Requisitos Previos

- **Node.js** 18 o superior
- **Python** 3.10 o superior
- **Git**
- **Cuenta de Google Cloud Platform**
- **Cuenta de Supabase** (gratuita)

---

## 1️⃣ Clonar el Repositorio

```bash
git clone https://github.com/ki-labor-PAIA/paia_pruebas.git
cd paia_pruebas
```

---

## 2️⃣ Configurar Google Cloud Console

### Crear Proyecto OAuth

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services → Credentials**
4. Haz clic en **"Create Credentials" → "OAuth 2.0 Client ID"**
5. Selecciona **"Web application"**

### Configurar Redirect URIs (IMPORTANTE)

Agrega estos **3 redirect URIs** para desarrollo local:

```
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/mcp/oauth2callback
http://localhost:3000/api/auth/google-calendar/callback
```

### Habilitar APIs necesarias

Ve a **APIs & Services → Library** y habilita:

- ✅ **Gmail API**
- ✅ **Google Calendar API**
- ✅ **Google People API**

### Guardar Credenciales

Copia tu **Client ID** y **Client Secret**, los necesitarás en el paso siguiente.

---

## 3️⃣ Configurar Supabase

### Crear Proyecto Supabase

1. Ve a [Supabase](https://supabase.com/)
2. Crea una cuenta gratuita
3. Crea un nuevo proyecto
4. Ve a **Settings → API**
5. Copia:
   - **Project URL** (SUPABASE_URL)
   - **anon public** key (SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY)

### Crear Tablas Necesarias

Ejecuta el script de creación de tablas:

```bash
python create_table.py
```

O manualmente en el **SQL Editor** de Supabase ejecuta las queries que están en el archivo.

---

## 4️⃣ Configurar Variables de Entorno

### Backend: Crear archivo `.env`

En la raíz del proyecto (`/paia_pruebas/`), crea un archivo `.env`:

```env
# Google API
GOOGLE_API_KEY=tu-gemini-api-key

# Google OAuth
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/mcp/oauth2callback

# Supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-service-role-key

# Opcional: Telegram
TELEGRAM_BOT_TOKEN=tu-bot-token
TELEGRAM_DEFAULT_CHAT_ID=tu-chat-id

# Opcional: WhatsApp
WHATSAPP_API_TOKEN=tu-token
WHATSAPP_PHONE_NUMBER_ID=tu-phone-id
```

### Frontend: Crear archivo `.env.local`

En `/paia_pruebas/paia-simulator/`, crea un archivo `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-aleatorio-muy-seguro

# Google OAuth (MISMAS credenciales que el backend)
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret

# Backend URL (para API routes server-side)
BACKEND_URL=http://localhost:8000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

**IMPORTANTE:** El `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` deben ser **exactamente iguales** en ambos archivos.

---

## 5️⃣ Instalar Dependencias

### Backend (Python)

```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En Mac/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### Frontend (Node.js)

```bash
cd paia-simulator
npm install
cd ..
```

---

## 6️⃣ Ejecutar el Proyecto

### Opción 1: Ejecutar Backend y Frontend por separado

**Terminal 1 - Backend:**
```bash
# Activar entorno virtual si no está activo
source venv/bin/activate  # o venv\Scripts\activate en Windows

# Ejecutar backend
python paia_backend.py
```

El backend estará disponible en: `http://localhost:8000`

**Terminal 2 - Frontend:**
```bash
cd paia-simulator
npm run dev
```

El frontend estará disponible en: `http://localhost:3000`

### Opción 2: Usar scripts (si están disponibles)

```bash
./Start_Paia.sh  # Mac/Linux
# o
Start_Paia.bat   # Windows (si existe)
```

---

## 7️⃣ Verificar que Todo Funciona

1. **Abrir navegador**: Ve a `http://localhost:3000`
2. **Registrarse/Login**: Crea una cuenta o inicia sesión
3. **Crear Agente**: Intenta crear un agente de prueba
4. **Probar OAuth**:
   - Click en "Connect Gmail" → debería abrir Google OAuth
   - Click en "Connect Calendar" → debería abrir Google OAuth

---

## 🔧 Solución de Problemas Comunes

### "invalid_client" en OAuth

✅ **Solución**: Verifica que:
- El `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` sean correctos
- Los redirect URIs estén configurados exactamente como se indica arriba
- Ambos archivos `.env` tengan las mismas credenciales

### "Supabase connection error"

✅ **Solución**: Verifica que:
- Las URLs de Supabase sean correctas
- Las API keys sean válidas
- El proyecto de Supabase esté activo

### Backend no arranca

✅ **Solución**: Verifica que:
- El entorno virtual esté activado
- Todas las dependencias estén instaladas: `pip install -r requirements.txt`
- El archivo `.env` exista y tenga las variables correctas

### Frontend no arranca

✅ **Solución**: Verifica que:
- Las dependencias estén instaladas: `npm install`
- El archivo `.env.local` exista
- El puerto 3000 no esté ocupado

---

## 📝 Diferencias entre Local y Producción

| Aspecto | Local | Producción |
|---------|-------|------------|
| **URLs** | localhost:3000, localhost:8000 | https://paia.haielab.org |
| **Redirect URIs** | http://localhost:3000/... | https://paia.haielab.org/... |
| **Nginx** | ❌ No necesario | ✅ Sí (reverse proxy) |
| **HTTPS** | ❌ No necesario | ✅ Sí (certificado SSL) |
| **Build** | `npm run dev` (desarrollo) | `npm run build && npm start` |

---

## 🎯 Siguiente Paso

Una vez que todo funcione en local, puedes:

1. **Desarrollar nuevas funcionalidades**
2. **Probar cambios antes de subirlos**
3. **Contribuir al proyecto** con Pull Requests

---

## 💡 Consejos

- **No subas tu `.env` a GitHub** (ya está en `.gitignore`)
- **Usa credenciales diferentes** para desarrollo y producción
- **Mantén tus API keys seguras**
- **Regenera tus secrets** si los expones accidentalmente

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Next.js Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

---

**¿Problemas?** Abre un issue en GitHub o contacta al equipo de desarrollo.
