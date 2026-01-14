# Mapa de Migración - Dónde Está Cada Cosa Ahora

Este documento te ayuda a encontrar código que fue movido durante la refactorización.

## Backend Python

### De `paia_backend.py` a Servicios

| Código Original | Nueva Ubicación | Líneas |
|----------------|-----------------|---------|
| `class PAIAAgentManager` completa | `services/agent_service.py` | 1-450 |
| `get_mcp_client_for_user()` | `services/mcp_service.py` → `get_mcp_client_for_user()` | 40-60 |
| `init_mcp_client()` | `services/mcp_service.py` → `init_mcp_service()` | 140-150 |
| Gestión de memoria | `services/memory_service.py` → `MemoryService` | 1-180 |
| `TelegramService` class | `services/telegram_service.py` | 1-200 |
| `WhatsAppService` class | `services/whatsapp_service.py` | 1-206 |

### De `paia_backend.py` a Tools

| Código Original | Nueva Ubicación |
|----------------|-----------------|
| Herramientas de Telegram inline | `tools/telegram_tools.py` → `create_telegram_tools()` |
| Herramientas de WhatsApp inline | `tools/whatsapp_tools.py` → `create_whatsapp_tools()` |
| Herramientas de comunicación | `tools/communication_tools.py` → `create_communication_tools()` |
| Herramientas de notas | `tools/notes_tools.py` → `create_notes_tools()` |
| Herramientas por expertise | `tools/expertise_tools.py` → `get_expertise_tools()` |

### De `paia_backend.py` a Routers

| Endpoints Originales | Nueva Ubicación |
|---------------------|-----------------|
| `GET /api/health` | `routers/health.py` |
| `POST /auth/register`, `/auth/login` | `routers/auth.py` |
| `GET/POST/PUT/DELETE /api/agents/*` | `routers/agents.py` |
| `GET/POST /api/connections/*` | `routers/connections.py` |
| `POST /api/telegram/*` | `routers/telegram.py` |
| `POST /api/webhooks/whatsapp` | `routers/whatsapp.py` |
| `GET /api/notifications/*` | `routers/notifications.py` |
| `GET /api/users/*` | `routers/users.py` |
| `GET/POST/PUT/DELETE /api/flows/*` | `routers/flows.py` |
| `POST /api/paia/*` | `routers/paia.py` |
| WebSocket `/ws` | `routers/websocket.py` |

## Frontend React

### De `pages/index.js` a Componentes

| Código Original (index.js) | Nueva Ubicación | Líneas Originales |
|---------------------------|-----------------|-------------------|
| Header JSX | `components/home/Header.js` | ~50 |
| Navegación de tabs | `components/home/TabNavigation.js` | ~40 |
| Tab de flujos completo | `components/home/flows/FlowsTab.js` | ~200 |
| Tarjeta de flujo individual | `components/home/flows/FlowCard.js` | ~150 |
| Tab de flujos activos | `components/home/flows/ActiveFlowsTab.js` | ~100 |
| Tab de agentes | `components/home/agents/AgentsTab.js` | ~100 |
| Tarjeta de agente | `components/home/agents/AgentCard.js` | ~50 |
| Tab de agentes públicos | `components/home/agents/PublicAgentsTab.js` | ~100 |
| Tab de amigos | `components/home/friends/FriendsTab.js` | ~150 |
| Tarjeta de amigo | `components/home/friends/FriendCard.js` | ~80 |

### De `pages/index.js` a Hooks

| Código Original (index.js) | Nueva Ubicación | Descripción |
|---------------------------|-----------------|-------------|
| Estados de modales | `hooks/useModals.js` | `showConnectUser`, `showCreateAgent`, etc. |
| `loadMyFlows()` | `hooks/useFlowsData.js` → `loadFlows()` | Cargar flujos del usuario |
| `handleFlowStatusToggle()` | `hooks/useFlowsData.js` → `toggleFlowStatus()` | Toggle estado flujo |
| `handleDeleteFlow()` | `hooks/useFlowsData.js` → `deleteFlow()` | Eliminar flujo |
| `loadMyAgents()` | `hooks/useAgentsData.js` → `loadAgents()` | Cargar agentes |
| `handleAgentCreated()` | `hooks/useAgentsData.js` → `createAgent()` | Crear agente |
| `loadFriends()` | `hooks/useFriendsData.js` → `loadFriends()` | Cargar amigos |
| `loadPublicAgents()` | `hooks/usePublicData.js` → `loadPublicAgents()` | Cargar agentes públicos |
| `loadFriendsActiveFlows()` | `hooks/usePublicData.js` → `loadActiveFlows()` | Cargar flujos activos |

### De `pages/index.js` a Constantes

| Código Original | Nueva Ubicación |
|----------------|-----------------|
| Tutorial steps array | `constants/tutorialSteps.js` |

### De `PAIASimulator.js` a Hooks

| Código Original (PAIASimulator.js) | Nueva Ubicación | Descripción |
|-----------------------------------|-----------------|-------------|
| `addLogMessage()` | `hooks/useMessageSystem.js` | Sistema de logs |
| `addDecisionMessage()` | `hooks/useMessageSystem.js` | Decisiones |
| `addMessageToNodeHistory()` | `hooks/useMessageSystem.js` | Historial de nodos |
| `addActor()` | `hooks/useNodeManagement.js` | Crear nodo actor |
| `createConfiguredAgent()` | `hooks/useNodeManagement.js` | Crear agente configurado |
| `addTelegramNode()` | `hooks/useNodeManagement.js` | Agregar nodo Telegram |
| `addConnectionNode()` | `hooks/useNodeManagement.js` | Agregar nodo conexión |
| `addCalendarNode()` | `hooks/useNodeManagement.js` | Agregar nodo calendario |
| `handleUserConnection()` | `hooks/useNodeManagement.js` | Manejar conexión usuario |
| `loadPublicAgents()` | `hooks/useNodeManagement.js` | Cargar agentes públicos |
| `addPublicAgentToCanvas()` | `hooks/useNodeManagement.js` | Agregar agente al canvas |
| `runFlow()` | `hooks/useFlowExecution.js` | Ejecutar flujo |
| `stopFlow()` | `hooks/useFlowExecution.js` | Detener flujo |
| `animateEdge()` | `hooks/useFlowExecution.js` | Animar edge |

### De `PAIASimulator.js` a Utils

| Código Original (PAIASimulator.js) | Nueva Ubicación | Líneas |
|-----------------------------------|-----------------|---------|
| Lógica de procesamiento de edges | `utils/flowExecutor.js` → `processEdgeInteraction()` | ~100 |
| Lógica de ConnectionNode flow | `utils/flowExecutor.js` → `handleConnectionNodeFlow()` | ~80 |
| Activar nodos Telegram | `utils/flowExecutor.js` → `activateTelegramNodes()` | ~20 |
| Desactivar nodos Telegram | `utils/flowExecutor.js` → `deactivateTelegramNodes()` | ~10 |
| Validar flujo | `utils/flowExecutor.js` → `validateFlow()` | ~10 |

### De `PAIASimulator.js` a Constantes

| Código Original | Nueva Ubicación |
|----------------|-----------------|
| `personalityColors` | `components/PAIASimulator/constants.js` |
| `initialNodes` | `components/PAIASimulator/constants.js` |
| `initialEdges` | `components/PAIASimulator/constants.js` |
| `getAgentColor()` | `components/PAIASimulator/constants.js` |

## Búsqueda Rápida por Función

### "¿Dónde está la función que...?"

| Busco código que... | Está en... |
|---------------------|-----------|
| Crea un agente con LLM | `services/agent_service.py` → `create_agent()` |
| Conecta dos agentes | `services/agent_service.py` → `connect_agents()` |
| Envía mensaje entre agentes | `services/agent_service.py` → `send_message_to_agent_api()` |
| Gestiona memoria de agente | `services/memory_service.py` → `MemoryService` |
| Obtiene cliente MCP | `services/mcp_service.py` → `get_mcp_client_for_user()` |
| Crea herramientas de Telegram | `tools/telegram_tools.py` → `create_telegram_tools()` |
| Procesa interacción entre nodos | `utils/flowExecutor.js` → `processEdgeInteraction()` |
| Ejecuta un flujo completo | `hooks/useFlowExecution.js` → `runFlow()` |
| Carga flujos del usuario | `hooks/useFlowsData.js` → `loadFlows()` |
| Crea nodo en el canvas | `hooks/useNodeManagement.js` → `addActor()` / `createConfiguredAgent()` |
| Muestra modales | `hooks/useModals.js` |
| Gestiona logs del simulador | `hooks/useMessageSystem.js` |

## Imports Actualizados

### Backend Python

```python
# ✅ Nuevos imports
from services.agent_service import PAIAAgentManager
from services.memory_service import MemoryService
from services.mcp_service import MCPService, init_mcp_service
from tools.telegram_tools import create_telegram_tools
from routers.agents import create_agents_router

# ❌ Ya no existen (estaban inline)
# class PAIAAgentManager dentro de paia_backend.py
```

### Frontend React

```javascript
// ✅ Nuevos imports
import useFlowsData from '@/hooks/useFlowsData';
import useAgentsData from '@/hooks/useAgentsData';
import useNodeManagement from '@/hooks/useNodeManagement';
import useFlowExecution from '@/hooks/useFlowExecution';
import FlowsTab from '@/components/home/flows/FlowsTab';
import { processEdgeInteraction } from '@/utils/flowExecutor';

// ❌ Ya no existen (estaban inline)
// const loadMyFlows = async () => { ... }
// const runFlow = async () => { ... }
```

## Cambios en Nombres

| Nombre Original | Nombre Nuevo | Razón |
|----------------|--------------|-------|
| `loadMyFlows()` | `loadFlows(userId)` | Más genérico, recibe userId |
| `loadMyAgents()` | `loadAgents(userId)` | Más genérico, recibe userId |
| `memory_manager` | `memory_service.memory_manager` | Encapsulado en servicio |
| - | `agent_manager` inicializado en startup | Inyección de dependencias |

## Tips de Migración

### Si estabas trabajando en `paia_backend.py`

1. **Agregando un endpoint**: Ahora va en `routers/[recurso].py`
2. **Agregando lógica de negocio**: Ahora va en `services/[nombre]_service.py`
3. **Agregando herramienta de agente**: Ahora va en `tools/[nombre]_tools.py`

### Si estabas trabajando en `pages/index.js`

1. **Agregando componente de UI**: Ahora va en `components/home/[feature]/`
2. **Agregando lógica de datos**: Ahora va en `hooks/use[Feature]Data.js`
3. **Agregando funciones helper**: Ahora va en `utils/[nombre]Helper.js`

### Si estabas trabajando en `PAIASimulator.js`

1. **Agregando gestión de nodos**: Ahora va en `hooks/useNodeManagement.js`
2. **Agregando lógica de flujos**: Ahora va en `hooks/useFlowExecution.js` o `utils/flowExecutor.js`
3. **Agregando constantes**: Ahora va en `components/PAIASimulator/constants.js`

---

**Última actualización**: 2026-01-12
**Versión**: 1.0
