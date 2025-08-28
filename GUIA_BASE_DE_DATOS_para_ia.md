# 🗄️ GUÍA DE DISEÑO DE BASE DE DATOS - PAIA V1.0
*Para Backend Developer #1*

---

## 🎯 **PROPÓSITO DE ESTA GUÍA**
Esta guía te ayudará a entender **qué** necesitas crear, **por qué** es importante, y **cómo** estructurar la base de datos para PAIA V1.0. No es tu trabajo completo, sino el contexto necesario para que tomes las decisiones correctas.

---

## 📊 **CONTEXTO DEL PROYECTO ACTUAL**

### **Estado Actual (Sin BD)**
El sistema PAIA actualmente funciona con **almacenamiento en memoria**:
```python
# Ubicación: paia_backend.py líneas 65-69
agents_store: Dict[str, PAIAAgent] = {}
connections_store: Dict[str, AgentConnection] = {}
active_websockets: Dict[str, WebSocket] = {}
message_history: Dict[str, List[AgentMessage]] = {}
```

**Problema**: Cuando se reinicia el servidor, se pierden todos los datos.

### **Tu Misión V1.0**
Migrar de **almacenamiento en memoria** a **base de datos persistente individual por usuario** que soporte:
- ✅ **Agentes PAIA** (los que ya existen)
- ✅ **Emails** (nueva funcionalidad)
- ✅ **Eventos de Calendario** (nueva funcionalidad)
- ✅ **Notas** (nueva funcionalidad)
- ✅ **Memoria de Agentes** (nueva funcionalidad)
- ✅ **Usuarios individuales** (multiusuario)

---

## 🏗️ **ARQUITECTURA DE BASE DE DATOS RECOMENDADA**

### **Opción 1: PostgreSQL (Recomendado)**
- **Pro**: Mejor para relaciones complejas, JSON nativo, escalable
- **Con**: Más setup inicial
- **Ideal para**: Proyecto real con múltiples usuarios

### **Opción 2: SQLite (Para desarrollo rápido)**
- **Pro**: Sin setup, archivo único, fácil debugging
- **Con**: Un solo usuario simultáneo
- **Ideal para**: Testing y desarrollo

### **Recomendación**: Empieza con **PostgreSQL** desde el inicio.

---

## 📋 **ENTIDADES PRINCIPALES Y SUS PROPÓSITOS**

### **1. 👤 USUARIOS (users)**
**¿Para qué?**: Separar datos de cada persona que use PAIA
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- Nunca almacenar contraseñas en texto plano
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Configuraciones del usuario
    settings JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC'
);
```

### **2. 🤖 AGENTES PAIA (agents)**
**¿Para qué?**: Los asistentes IA que crea cada usuario
```sql
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    personality TEXT NOT NULL,
    expertise TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'online', -- 'online', 'offline', 'busy'
    
    -- Configuraciones técnicas
    mcp_endpoint VARCHAR(255),
    is_public BOOLEAN DEFAULT false,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Índice para búsquedas rápidas por usuario
    INDEX idx_agents_user_id (user_id),
    INDEX idx_agents_status (status)
);
```

### **3. 🔗 CONEXIONES ENTRE AGENTES (agent_connections)**
**¿Para qué?**: Qué agentes pueden hablar entre sí
```sql
CREATE TABLE agent_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent1_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    agent2_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    connection_type VARCHAR(50) DEFAULT 'bidirectional', -- 'bidirectional', 'one_way'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'blocked'
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Prevenir conexiones duplicadas
    UNIQUE(agent1_id, agent2_id),
    -- Un agente no se puede conectar consigo mismo
    CHECK (agent1_id != agent2_id),
    
    INDEX idx_connections_agent1 (agent1_id),
    INDEX idx_connections_agent2 (agent2_id)
);
```

### **4. 💬 MENSAJES ENTRE AGENTES (agent_messages)**
**¿Para qué?**: Conversaciones entre agentes
```sql
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(100) NOT NULL, -- Para agrupar mensajes de la misma conversación
    from_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    to_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'system', 'error'
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para conversaciones
    INDEX idx_messages_conversation (conversation_id),
    INDEX idx_messages_timestamp (created_at DESC),
    INDEX idx_messages_agents (from_agent_id, to_agent_id)
);
```

---

## 🆕 **NUEVAS ENTIDADES PARA V1.0**

### **5. 📧 EMAILS (emails)**
**¿Para qué?**: Almacenar emails conectados de Gmail/Outlook
```sql
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Identificadores externos
    external_id VARCHAR(255), -- ID del email en Gmail/Outlook
    external_thread_id VARCHAR(255), -- ID del hilo de conversación
    
    -- Contenido del email
    subject VARCHAR(500),
    body_text TEXT,
    body_html TEXT,
    from_address VARCHAR(255) NOT NULL,
    to_addresses TEXT[], -- Array de direcciones
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    
    -- Metadatos
    is_read BOOLEAN DEFAULT false,
    is_important BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    labels TEXT[], -- Etiquetas de Gmail o carpetas de Outlook
    
    -- Timestamps
    sent_at TIMESTAMP,
    received_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Índices para búsquedas eficientes
    INDEX idx_emails_user_id (user_id),
    INDEX idx_emails_sent_at (sent_at DESC),
    INDEX idx_emails_subject (subject),
    INDEX idx_emails_from (from_address)
);
```

### **6. 📅 EVENTOS DE CALENDARIO (calendar_events)**
**¿Para qué?**: Eventos sincronizados de Google Calendar/Outlook
```sql
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Identificadores externos
    external_id VARCHAR(255), -- ID del evento en Google/Outlook
    external_calendar_id VARCHAR(255), -- ID del calendario fuente
    
    -- Información del evento
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(500),
    
    -- Tiempo
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_all_day BOOLEAN DEFAULT false,
    
    -- Configuración
    status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'tentative', 'cancelled'
    visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'private'
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_events_user_id (user_id),
    INDEX idx_events_start_time (start_time),
    INDEX idx_events_title (title)
);
```

### **7. 📝 NOTAS (notes)**
**¿Para qué?**: Sistema de notas que los agentes pueden crear y buscar
```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL, -- Qué agente creó la nota (opcional)
    
    -- Contenido
    title VARCHAR(255),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'markdown', -- 'plain', 'markdown', 'html'
    
    -- Organización
    tags TEXT[], -- Array de tags para organización
    category VARCHAR(100),
    is_private BOOLEAN DEFAULT false,
    
    -- Para búsqueda de texto completo
    search_vector tsvector,
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_notes_user_id (user_id),
    INDEX idx_notes_agent_id (agent_id),
    INDEX idx_notes_tags (tags),
    INDEX idx_notes_updated (updated_at DESC),
    INDEX idx_notes_search (search_vector) -- Para búsqueda full-text
);
```

### **8. 🧠 MEMORIA DE AGENTES (agent_memory)**
**¿Para qué?**: Los agentes recuerdan información entre conversaciones
```sql
CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipos de memoria
    memory_type VARCHAR(50) NOT NULL, -- 'short_term', 'long_term', 'fact', 'preference'
    
    -- Contenido
    key VARCHAR(255), -- Clave para acceso rápido (ej: "usuario_nombre")
    value JSONB NOT NULL, -- Valor flexible (texto, JSON, etc.)
    context TEXT, -- Contexto donde se aprendió esto
    
    -- Control de expiración
    expires_at TIMESTAMP, -- Para memoria a corto plazo
    importance_score INTEGER DEFAULT 5, -- 1-10, para limpiar memoria menos importante
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    accessed_at TIMESTAMP DEFAULT NOW(), -- Última vez que se usó
    access_count INTEGER DEFAULT 0,
    
    INDEX idx_memory_agent (agent_id),
    INDEX idx_memory_type (memory_type),
    INDEX idx_memory_key (key),
    INDEX idx_memory_expires (expires_at)
);
```

### **9. 🔐 INTEGRACIONES EXTERNAS (external_integrations)**
**¿Para qué?**: Guardar tokens OAuth y configuraciones de Gmail, Outlook, etc.
```sql
CREATE TABLE external_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Tipo de integración
    integration_type VARCHAR(50) NOT NULL, -- 'gmail', 'outlook', 'google_calendar', 'outlook_calendar'
    
    -- Configuración OAuth
    access_token TEXT, -- Encriptado
    refresh_token TEXT, -- Encriptado
    token_expires_at TIMESTAMP,
    
    -- Configuración específica
    settings JSONB DEFAULT '{}', -- Configuraciones específicas por tipo
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'syncing', 'success', 'error'
    
    -- Metadatos
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_integrations_user (user_id),
    INDEX idx_integrations_type (integration_type),
    UNIQUE(user_id, integration_type) -- Un usuario, una integración por tipo
);
```

---

## 🔗 **RELACIONES ENTRE TABLAS**

```
USUARIOS (users)
    ├── 1:N → AGENTES (agents)
    ├── 1:N → EMAILS (emails)  
    ├── 1:N → EVENTOS (calendar_events)
    ├── 1:N → NOTAS (notes)
    ├── 1:N → MEMORIA (agent_memory)
    └── 1:N → INTEGRACIONES (external_integrations)

AGENTES (agents)
    ├── N:N → CONEXIONES (agent_connections) 
    ├── 1:N → MENSAJES (agent_messages)
    ├── 1:N → NOTAS (notes) [opcional]
    └── 1:N → MEMORIA (agent_memory)
```

---

## 🚀 **PASOS RECOMENDADOS PARA IMPLEMENTAR**

### **Semana 1 - Tu Entregable:**

#### **1. Configuración Inicial (Lunes)**
```bash
# Instalar PostgreSQL localmente
# Ubuntu/Debian:
sudo apt install postgresql postgresql-contrib

# macOS:
brew install postgresql

# Windows:
# Descargar desde https://www.postgresql.org/download/windows/
```

#### **2. Crear Base de Datos (Martes)**
```sql
-- Conectarte como superuser y crear la BD
CREATE DATABASE paia_v1_db;
CREATE USER paia_user WITH PASSWORD 'tu_password_seguro';
GRANT ALL PRIVILEGES ON DATABASE paia_v1_db TO paia_user;
```

#### **3. Crear Tablas (Miércoles - Jueves)**
- Crear archivo `database_schema.sql` con todas las tablas de arriba
- Ejecutar: `psql -d paia_v1_db -U paia_user -f database_schema.sql`

#### **4. Testing y Documentación (Viernes)**
- Insertar datos de prueba
- Crear script `setup_database.py` para automatizar el proceso
- Documentar el proceso de instalación

### **Herramientas Recomendadas:**
- **ORM**: SQLAlchemy (para Python) o Prisma
- **Migraciones**: Alembic (con SQLAlchemy)
- **Cliente GUI**: pgAdmin o DBeaver

---

## 💡 **CONSIDERACIONES IMPORTANTES**

### **🔒 Seguridad**
- **NUNCA** almacenes contraseñas en texto plano
- **Encripta** tokens OAuth antes de guardarlos
- **Usa** UUIDs para IDs públicos (más seguros que números secuenciales)

### **⚡ Performance**
- **Índices** en columnas que se buscan frecuentemente
- **Paginación** para listas grandes (emails, mensajes)
- **Particionado** por usuario si crece mucho

### **🧪 Testing**
- **Datos de prueba** para cada tabla
- **Scripts** para limpiar y resetear la BD durante desarrollo
- **Tests** para verificar integridad referencial

### **📈 Escalabilidad**
- **Conexion pooling** para manejar múltiples usuarios
- **Índices** optimizados desde el inicio
- **Backup** automático configurado

---

## 🎯 **CRITERIOS DE ÉXITO PARA VIERNES**

### ✅ **Mínimo Viable:**
- [ ] PostgreSQL instalado y funcionando
- [ ] Base de datos `paia_v1_db` creada
- [ ] **Todas** las 9 tablas creadas con relaciones correctas
- [ ] Script `setup_database.py` funcional
- [ ] Documentación de instalación

### ✅ **Ideal:**
- [ ] Datos de prueba insertados
- [ ] Conexión desde Python funcionando
- [ ] Tests básicos de integridad
- [ ] Performance testing inicial

---

## 🤝 **APOYO DEL EQUIPO**

- **Frontend devs**: Necesitarán saber qué datos pueden consultar
- **Backend dev #2**: Trabajará con la tabla `agent_memory`
- **Backend dev #3**: Usará las tablas `emails` e `external_integrations`
- **Backend dev #4**: Usará las tablas `calendar_events` e `external_integrations`
- **Backend dev #5**: Trabajará con la tabla `notes`

**¡Tu trabajo es la base de todo el proyecto! 🚀**

---

*Documento creado para Backend Developer #1 - PAIA V1.0*  
*Si tienes dudas técnicas específicas, pregunta en el canal del equipo*