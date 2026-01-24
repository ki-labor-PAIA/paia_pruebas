# Guía de Mantenimiento - Proyecto PAIA Refactorizado

## Tabla de Contenidos
1. [Estructura del Proyecto](#estructura-del-proyecto)
2. [Cómo Agregar Nuevas Funcionalidades](#cómo-agregar-nuevas-funcionalidades)
3. [Dónde Ubicar Nuevo Código](#dónde-ubicar-nuevo-código)
4. [Patrones y Convenciones](#patrones-y-convenciones)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

---

## Estructura del Proyecto

### Backend (Python)

```
paia_backend.py (main)           → Punto de entrada, inicialización
├── config/settings.py           → Todas las configuraciones
├── models/agent.py              → Modelos de datos
├── services/                    → Lógica de negocio
│   ├── agent_service.py         → Gestión de agentes
│   ├── memory_service.py        → Memoria a largo plazo
│   ├── mcp_service.py          → Cliente MCP
│   ├── telegram_service.py     → Integración Telegram
│   └── whatsapp_service.py     → Integración WhatsApp
├── tools/                       → Herramientas para agentes
│   ├── telegram_tools.py
│   ├── whatsapp_tools.py
│   ├── communication_tools.py
│   ├── notes_tools.py
│   └── expertise_tools.py
└── routers/                     → Endpoints de API
    ├── health.py
    ├── auth.py
    ├── agents.py
    └── ... (otros routers)
```

### Frontend (React)

```
paia-simulator/src/
├── pages/index.js               → Página principal (Home)
├── components/
│   ├── PAIASimulator/          → Simulador de flujos
│   │   ├── index.js            → Componente principal
│   │   └── constants.js        → Constantes del simulador
│   └── home/                    → Componentes de la home
│       ├── Header.js
│       ├── TabNavigation.js
│       ├── flows/              → Tab de flujos
│       ├── agents/             → Tab de agentes
│       └── friends/            → Tab de amigos
├── hooks/                       → Lógica reutilizable
│   ├── useMessageSystem.js     → Logs y decisiones
│   ├── useModals.js            → Gestión de modales
│   ├── useFlowsData.js         → Datos de flujos
│   ├── useAgentsData.js        → Datos de agentes
│   ├── useFriendsData.js       → Datos de amigos
│   ├── usePublicData.js        → Datos públicos
│   ├── useNodeManagement.js    → Gestión de nodos
│   └── useFlowExecution.js     → Ejecución de flujos
└── utils/                       → Funciones puras
    └── flowExecutor.js         → Lógica de ejecución
```

---

## Cómo Agregar Nuevas Funcionalidades

### 1. Agregar un Nuevo Endpoint al Backend

**Ejemplo: Crear endpoint para estadísticas de agentes**

#### Paso 1: Crear el router
```python
# routers/statistics.py
from fastapi import APIRouter, Depends
from typing import Dict

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

@router.get("/agents/{agent_id}")
async def get_agent_statistics(agent_id: str) -> Dict:
    """Obtener estadísticas de un agente."""
    # Tu lógica aquí
    return {
        "agent_id": agent_id,
        "total_messages": 100,
        "success_rate": 0.95
    }
```

#### Paso 2: Registrar el router
```python
# paia_backend.py
from routers.statistics import router as statistics_router

# En la sección de routers
app.include_router(statistics_router)
```

#### Paso 3: Si necesitas lógica de negocio compleja, crear un servicio
```python
# services/statistics_service.py
class StatisticsService:
    def __init__(self, db_manager):
        self.db_manager = db_manager

    async def calculate_agent_stats(self, agent_id: str):
        # Lógica compleja aquí
        pass
```

### 2. Agregar un Nuevo Componente al Frontend

**Ejemplo: Crear componente para estadísticas**

#### Paso 1: Crear el componente
```javascript
// components/home/statistics/StatisticsTab.js
export default function StatisticsTab({ statistics, onRefresh }) {
  return (
    <div>
      <h2>Estadísticas</h2>
      {/* Tu UI aquí */}
    </div>
  );
}
```

#### Paso 2: Crear el hook de datos (si necesita datos del backend)
```javascript
// hooks/useStatisticsData.js
import { useState, useCallback } from 'react';

export default function useStatisticsData() {
  const [statistics, setStatistics] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStatistics = useCallback(async (agentId) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/statistics/agents/${agentId}`);
      const data = await response.json();
      setStatistics(data);
    } finally {
      setLoading(false);
    }
  }, []);

  return { statistics, loading, loadStatistics };
}
```

#### Paso 3: Integrar en la página principal
```javascript
// pages/index.js
import StatisticsTab from '@/components/home/statistics/StatisticsTab';
import useStatisticsData from '@/hooks/useStatisticsData';

// En el componente
const { statistics, loadStatistics } = useStatisticsData();

// En el render
{activeTab === 'statistics' && (
  <StatisticsTab statistics={statistics} onRefresh={loadStatistics} />
)}
```

### 3. Agregar una Nueva Herramienta para Agentes

**Ejemplo: Agregar herramienta de traducción**

#### Paso 1: Crear el archivo de herramientas
```python
# tools/translation_tools.py
from langchain_core.tools import tool

@tool
def translate_text(text: str, target_language: str) -> str:
    """
    Traducir texto a otro idioma.

    Args:
        text: Texto a traducir
        target_language: Idioma objetivo (es, en, fr, etc.)

    Returns:
        Texto traducido
    """
    # Tu lógica de traducción aquí
    return translated_text

def create_translation_tools():
    """Crear lista de herramientas de traducción."""
    return [translate_text]
```

#### Paso 2: Integrar en agent_service
```python
# services/agent_service.py
from tools.translation_tools import create_translation_tools

# En _create_agent_tools()
translation_tools = create_translation_tools()
base_tools.extend(translation_tools)
```

---

## Dónde Ubicar Nuevo Código

### Backend

| Tipo de Código | Ubicación | Ejemplo |
|----------------|-----------|---------|
| Endpoint HTTP | `routers/` | `routers/new_feature.py` |
| Lógica de negocio | `services/` | `services/new_service.py` |
| Herramienta de agente | `tools/` | `tools/new_tool.py` |
| Modelo de datos | `models/` | `models/new_model.py` |
| Configuración | `config/settings.py` | Variable en settings |
| Utilidad general | `utils/` | `utils/new_helper.py` |

### Frontend

| Tipo de Código | Ubicación | Ejemplo |
|----------------|-----------|---------|
| Componente de UI | `components/` | `components/home/new/NewTab.js` |
| Lógica de datos | `hooks/` | `hooks/useNewData.js` |
| Lógica pura | `utils/` | `utils/newExecutor.js` |
| Constantes | `constants/` | `constants/newConfig.js` |
| Página | `pages/` | `pages/new.js` |
| Modal reutilizable | `components/` | `components/NewModal.js` |

---

## Patrones y Convenciones

### Backend (Python)

#### 1. Servicios
```python
class MyService:
    """Servicio para [descripción]."""

    def __init__(self, dependency1, dependency2):
        """Inyectar todas las dependencias en __init__."""
        self.dependency1 = dependency1
        self.dependency2 = dependency2

    async def do_something(self, param: str) -> Dict:
        """
        Descripción del método.

        Args:
            param: Descripción del parámetro

        Returns:
            Descripción del retorno
        """
        # Tu código aquí
        pass
```

#### 2. Routers
```python
from fastapi import APIRouter, HTTPException
from typing import Dict

router = APIRouter(prefix="/api/resource", tags=["resource"])

@router.get("/{id}")
async def get_resource(id: str) -> Dict:
    """Obtener recurso por ID."""
    try:
        # Tu código aquí
        return {"id": id, "data": "..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

#### 3. Herramientas
```python
from langchain_core.tools import tool

@tool
def my_tool(param: str) -> str:
    """
    Descripción breve de qué hace la herramienta.

    Args:
        param: Descripción del parámetro

    Returns:
        Descripción del resultado
    """
    # Tu código aquí
    return result
```

### Frontend (React)

#### 1. Custom Hooks
```javascript
// hooks/useMyFeature.js
import { useState, useCallback } from 'react';

export default function useMyFeature({ dependency1, dependency2 }) {
  const [state, setState] = useState(initialValue);

  const doSomething = useCallback(async (param) => {
    // Tu lógica aquí
  }, [dependency1, dependency2]);

  return {
    state,
    doSomething
  };
}
```

#### 2. Componentes
```javascript
// components/MyComponent.js
export default function MyComponent({ prop1, prop2, onAction }) {
  // Lógica del componente

  return (
    <div>
      {/* Tu UI aquí */}
    </div>
  );
}
```

#### 3. Funciones Puras (Utils)
```javascript
// utils/myHelper.js

/**
 * Descripción de qué hace la función.
 *
 * @param {Object} param1 - Descripción
 * @param {string} param2 - Descripción
 * @returns {Object} Descripción del resultado
 */
export function myPureFunction(param1, param2) {
  // No usar estado de React
  // No hacer llamadas a APIs
  // Solo transformar datos
  return result;
}
```

---

## Testing

### Backend (Python)

```python
# tests/test_agent_service.py
import pytest
from services.agent_service import PAIAAgentManager

@pytest.mark.asyncio
async def test_create_agent():
    # Mock dependencies
    mock_db = MockDatabaseManager()
    mock_memory = MockMemoryManager()

    # Create service
    service = PAIAAgentManager(
        db_manager=mock_db,
        memory_manager=mock_memory,
        # ... otras dependencias
    )

    # Test
    agent_data = {"name": "Test Agent", "expertise": "Testing"}
    agent = await service.create_agent(agent_data)

    assert agent.name == "Test Agent"
    assert agent.expertise == "Testing"
```

### Frontend (React)

```javascript
// tests/flowExecutor.test.js
import { processEdgeInteraction } from '@/utils/flowExecutor';

describe('flowExecutor', () => {
  test('procesa interacción entre nodos correctamente', async () => {
    const sourceNode = { id: '1', data: { label: 'Test' } };
    const targetNode = { id: '2', data: { label: 'Target' } };

    const result = await processEdgeInteraction(
      sourceNode,
      targetNode,
      mockCallbacks
    );

    expect(result.logs).toHaveLength(1);
    expect(result.decisions).toHaveLength(0);
  });
});
```

---

## Troubleshooting

### Problema: "No encuentro dónde está implementada una funcionalidad"

**Solución**: Usa la siguiente tabla de búsqueda

| Funcionalidad | Archivo |
|---------------|---------|
| Crear agente | `services/agent_service.py` → `create_agent()` |
| Ejecutar flujo | `hooks/useFlowExecution.js` → `runFlow()` |
| Cargar flujos del usuario | `hooks/useFlowsData.js` → `loadFlows()` |
| Enviar mensaje Telegram | `tools/telegram_tools.py` → `send_telegram_message` |
| Conectar agentes | `services/agent_service.py` → `connect_agents()` |
| Animar edge | `hooks/useFlowExecution.js` → `animateEdge()` |

### Problema: "Error: Module not found"

**Backend Python**:
```bash
# Asegúrate de que el módulo existe en la carpeta correcta
ls services/my_service.py

# Verifica que __init__.py existe en el directorio
ls services/__init__.py

# Importa correctamente
from services.my_service import MyService
```

**Frontend React**:
```bash
# Usa alias @ para imports desde src/
import MyComponent from '@/components/MyComponent';

# NO uses rutas relativas largas
# ❌ import MyComponent from '../../../components/MyComponent';
```

### Problema: "Cambié código pero no se refleja"

**Backend Python**:
```bash
# Reinicia el servidor
# Ctrl+C y vuelve a ejecutar
python paia_backend.py
```

**Frontend React**:
```bash
# Reinicia el servidor de desarrollo
# Ctrl+C
npm run dev

# Si persiste, limpia cache
rm -rf .next
npm run dev
```

### Problema: "Error de circular dependency"

**Solución**:
- En Python: Usar imports dentro de funciones
- En React: Revisar estructura de imports y mover tipos a archivo separado

```python
# ❌ Mal
from services.agent_service import AgentService
from services.memory_service import MemoryService

class AgentService:
    def __init__(self, memory: MemoryService):
        pass

# ✅ Bien
class AgentService:
    def __init__(self, memory):
        from services.memory_service import MemoryService
        self.memory: MemoryService = memory
```

---

## Recursos Adicionales

- **Documentación de FastAPI**: https://fastapi.tiangolo.com/
- **Documentación de React**: https://react.dev/
- **LangChain Tools**: https://python.langchain.com/docs/modules/tools/
- **React Flow**: https://reactflow.dev/

---

## Contacto y Soporte

Para preguntas sobre la arquitectura del código:
1. Revisar primero esta guía
2. Buscar en el código ejemplos similares
3. Consultar el resumen de refactorización (`.claude/refactoring-summary.md`)
4. Preguntar al equipo de desarrollo

---

**Última actualización**: 2026-01-12
**Versión**: 1.0
