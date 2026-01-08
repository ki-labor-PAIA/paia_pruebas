---
description: Plan de mejora para intercomunicación de agentes PAIA
---

# Plan de Mejora: Intercomunicación de Agentes PAIA

## 📋 Resumen del Flujo Actual

### Flujo de Usuario
1. **Crear Agente PAIA**
   - Usuario crea agente con nombre, instrucciones y personalidad
   - Botón: "Crear Agente PAIA"

2. **Añadir Nodo de Conexión**
   - Usuario va al botón de sidebar izquierdo
   - Clic en "Añadir Nodo Conexión"
   - Aparece nodo en canvas

3. **Conectar Agente con Nodo**
   - Usuario conecta su agente con el nodo de conexión

4. **Seleccionar Amigo**
   - Doble clic en nodo de conexión
   - Muestra lista de amigos
   - **PROBLEMA**: Si usuario A tiene de amigo a B, en la interfaz de B no aparece A como amigo

5. **Seleccionar Tipo de Conexión**
   - **Conectar con Persona**: Envía notificación
   - **Conectar con Agente**: Muestra agentes del amigo

6. **Comunicación de Agentes**
   - Cuando usuario envía mensaje al agente
   - El agente del otro usuario debería recibir el mensaje
   - **PROBLEMA**: Esta parte no funciona correctamente

## 🐛 Problemas Identificados

### 1. Sistema de Amigos Unidireccional
**Problema**: Las conexiones de amistad no son bidireccionales
- Si A agrega a B como amigo, B no ve a A en su lista
- Esto rompe el flujo de conexión de agentes

**Ubicación**: 
- `FriendsPanel.js` - Renderizado de amigos
- Backend API - Lógica de conexiones

### 2. Comunicación Entre Agentes No Funciona
**Problema**: Los mensajes no se transmiten entre agentes de diferentes usuarios
- No hay sistema de routing de mensajes
- No hay notificaciones en tiempo real
- No hay visualización de estado de comunicación

**Ubicación**:
- `ChatModal.js` - Interfaz de chat
- `PAIASimulator.js` - Lógica de mensajes
- Backend - Routing de mensajes entre agentes

### 3. Falta Visualización de Estado
**Problema**: No se ve claramente cuando dos agentes están comunicándose
- No hay indicadores visuales de conexión activa
- No hay historial de mensajes entre agentes
- No hay feedback de entrega de mensajes

## 🎯 Soluciones Propuestas

### Solución 1: Arreglar Sistema de Amigos Bidireccional

#### Frontend (`FriendsPanel.js`)
```javascript
// Modificar renderFriend para mostrar correctamente ambos lados de la conexión
const renderFriend = (connection, index) => {
    // Ya está bien implementado, el problema está en el backend
    const friend = connection.requester.id === userId 
        ? connection.recipient 
        : connection.requester;
    // ... resto del código
}
```

#### Backend (API)
```python
# Asegurar que getUserConnections devuelva conexiones bidireccionales
# Cuando A es requester y B es recipient, ambos deben ver la conexión
```

### Solución 2: Implementar Sistema de Routing de Mensajes

#### Nuevo Componente: `AgentCommunicationManager`
```javascript
// src/hooks/useAgentCommunication.js
export function useAgentCommunication() {
    const [activeConnections, setActiveConnections] = useState([]);
    const [messageQueue, setMessageQueue] = useState([]);
    
    // Enviar mensaje a agente conectado
    const sendToConnectedAgent = async (message, connectionId) => {
        // 1. Buscar conexión activa
        // 2. Enviar mensaje al backend
        // 3. Backend enruta al agente del otro usuario
        // 4. Actualizar UI con estado de envío
    };
    
    // Recibir mensajes de agentes conectados
    const receiveFromConnectedAgent = (message) => {
        // 1. Actualizar historial de chat
        // 2. Mostrar notificación
        // 3. Actualizar nodo de conexión
    };
    
    return {
        sendToConnectedAgent,
        receiveFromConnectedAgent,
        activeConnections
    };
}
```

#### Backend: Endpoint de Routing
```python
@app.post("/api/agent-messages/send")
async def send_agent_message(
    from_agent_id: str,
    to_agent_id: str,
    message: str,
    connection_id: str
):
    # 1. Validar que existe conexión entre agentes
    # 2. Obtener agente destino
    # 3. Procesar mensaje con LLM del agente destino
    # 4. Enviar respuesta de vuelta
    # 5. Guardar en historial
    pass
```

### Solución 3: Mejorar Visualización de Comunicación

#### Actualizar `ConnectionNode.js`
```javascript
// Agregar indicadores visuales de comunicación activa
{isActivelyCommun icating && (
    <div style={{
        position: 'absolute',
        top: '-5px',
        right: '-5px',
        width: '12px',
        height: '12px',
        background: '#10B981',
        borderRadius: '50%',
        animation: 'pulse 2s infinite'
    }} />
)}

// Mostrar contador de mensajes pendientes
{pendingMessages > 0 && (
    <div style={{
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        background: '#EF4444',
        borderRadius: '50%',
        padding: '2px 6px',
        fontSize: '10px',
        fontWeight: 'bold'
    }}>
        {pendingMessages}
    </div>
)}
```

#### Actualizar `ChatModal.js`
```javascript
// Agregar sección de "Conversaciones con Agentes Conectados"
<div className="connected-agents-section">
    <h4>Agentes Conectados</h4>
    {connectedAgents.map(agent => (
        <div key={agent.id} className="connected-agent-item">
            <div className="agent-avatar">🤖</div>
            <div className="agent-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-owner">{agent.ownerName}</div>
            </div>
            <div className="connection-status">
                {agent.isOnline ? '🟢' : '🔴'}
            </div>
        </div>
    ))}
</div>

// Mostrar historial de mensajes entre agentes
<div className="agent-conversation-history">
    {agentMessages.map(msg => (
        <div className={`message ${msg.direction}`}>
            <div className="message-header">
                <span className="agent-name">{msg.fromAgent}</span>
                <span className="timestamp">{msg.timestamp}</span>
            </div>
            <div className="message-content">{msg.content}</div>
        </div>
    ))}
</div>
```

## 📝 Plan de Implementación

### Fase 1: Arreglar Sistema de Amigos (1-2 horas)
1. ✅ Revisar lógica de backend para conexiones bidireccionales
2. ✅ Actualizar `FriendsPanel.js` si es necesario
3. ✅ Probar flujo completo de agregar amigos

### Fase 2: Implementar Routing de Mensajes (3-4 horas)
1. ✅ Crear hook `useAgentCommunication`
2. ✅ Implementar endpoints en backend
3. ✅ Integrar con `PAIASimulator.js`
4. ✅ Probar envío y recepción de mensajes

### Fase 3: Mejorar Visualización (2-3 horas)
1. ✅ Actualizar `ConnectionNode.js` con indicadores
2. ✅ Actualizar `ChatModal.js` con sección de agentes conectados
3. ✅ Agregar animaciones y feedback visual
4. ✅ Implementar notificaciones en tiempo real

### Fase 4: Testing y Refinamiento (1-2 horas)
1. ✅ Probar flujo completo end-to-end
2. ✅ Verificar casos edge (agente offline, conexión perdida, etc.)
3. ✅ Optimizar performance
4. ✅ Documentar cambios

## 🎨 Mejoras de UX Adicionales

### 1. Indicador de "Agente Escribiendo..."
```javascript
// Cuando el agente del otro usuario está procesando
<div className="agent-typing-indicator">
    <span>🤖 {connectedAgentName} está pensando</span>
    <div className="typing-dots">
        <span>.</span><span>.</span><span>.</span>
    </div>
</div>
```

### 2. Timeline de Comunicación
```javascript
// Mostrar línea de tiempo de interacciones
<div className="communication-timeline">
    {events.map(event => (
        <div className="timeline-event">
            <div className="event-icon">{event.icon}</div>
            <div className="event-description">{event.description}</div>
            <div className="event-time">{event.timestamp}</div>
        </div>
    ))}
</div>
```

### 3. Panel de Estado de Conexiones
```javascript
// Panel flotante mostrando todas las conexiones activas
<div className="connections-status-panel">
    <h4>Conexiones Activas</h4>
    {activeConnections.map(conn => (
        <div className="connection-item">
            <div className="connection-agents">
                {conn.myAgent.name} ↔️ {conn.theirAgent.name}
            </div>
            <div className="connection-stats">
                <span>📨 {conn.messageCount} mensajes</span>
                <span>⏱️ {conn.lastActivity}</span>
            </div>
        </div>
    ))}
</div>
```

## 🔧 Archivos a Modificar

### Frontend
1. `src/components/FriendsPanel.js` - Sistema de amigos bidireccional
2. `src/components/ConnectionNode.js` - Indicadores visuales
3. `src/components/ChatModal.js` - Interfaz de comunicación
4. `src/components/PAIASimulator.js` - Lógica de routing
5. `src/hooks/useAgentCommunication.js` - **NUEVO** Hook de comunicación
6. `src/utils/api.js` - Nuevos endpoints

### Backend
1. `paia_backend.py` - Endpoints de routing de mensajes
2. Agregar tabla `agent_messages` en Supabase
3. Agregar tabla `agent_connections` en Supabase

## 📊 Estructura de Datos

### Tabla: `agent_connections`
```sql
CREATE TABLE agent_connections (
    id UUID PRIMARY KEY,
    source_user_id UUID REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    source_agent_id UUID REFERENCES agents(id),
    target_agent_id UUID REFERENCES agents(id),
    connection_node_id VARCHAR,
    flow_id UUID,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP
);
```

### Tabla: `agent_messages`
```sql
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY,
    connection_id UUID REFERENCES agent_connections(id),
    from_agent_id UUID REFERENCES agents(id),
    to_agent_id UUID REFERENCES agents(id),
    message_content TEXT,
    message_type VARCHAR DEFAULT 'text',
    status VARCHAR DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP,
    read_at TIMESTAMP
);
```

## ✅ Checklist de Implementación

- [ ] Arreglar sistema de amigos bidireccional
- [ ] Crear hook `useAgentCommunication`
- [ ] Implementar endpoints de routing en backend
- [ ] Actualizar `ConnectionNode.js` con indicadores
- [ ] Actualizar `ChatModal.js` con sección de agentes
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar animaciones de comunicación
- [ ] Probar flujo completo
- [ ] Documentar cambios
- [ ] Deploy y testing en producción

## 🚀 Próximos Pasos

¿Por dónde quieres que empecemos? Sugiero:

1. **Primero**: Arreglar el sistema de amigos bidireccional (más crítico)
2. **Segundo**: Implementar el routing básico de mensajes
3. **Tercero**: Mejorar la visualización y UX

¿Te parece bien este plan?
