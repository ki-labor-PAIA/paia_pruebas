# PAIA Simulator - Next.js

Una aplicación web moderna para simular interacciones entre agentes PAIA (Personal AI Assistant), migrada desde HTML puro a Next.js con React Flow.

## Características

- 🎨 **Tema oscuro** profesional
- 🔗 **React Flow** para visualización de flujos
- 🤖 **Simulación de agentes** IA y humanos
- 📊 **Estadísticas en tiempo real**
- 💾 **Importar/Exportar** escenarios JSON
- 🔌 **Integración con backend** PAIA
- 📱 **Responsive design**

## Tecnologías

- **Next.js 15** - Framework React
- **React Flow 11** - Visualización de diagramas
- **JavaScript** (sin TypeScript)
- **CSS personalizado** (sin Tailwind)
- **Font Awesome** - Iconos
- **Google Fonts** - Tipografía Inter

## Instalación

1. **Clonar o ubicarse en el directorio:**
   ```bash
   cd paia-simulator
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en navegador:**
   ```
   http://localhost:3000
   ```

## Uso

### Básico (Sin Backend)

1. **Agregar actores:** Usa los botones del panel derecho para agregar humanos o asistentes IA
2. **Conectar actores:** Arrastra desde un nodo a otro para crear conexiones
3. **Configurar escenario:** Ingresa nombre y descripción en el panel izquierdo
4. **Simular:** Haz clic en "Simular" para ver las interacciones animadas

### Con Backend PAIA

1. **Ejecutar backend:** Asegúrate que `paia_backend.py` esté corriendo en `http://localhost:8000`
2. **Verificar conexión:** En el panel izquierdo, verifica que muestre "🟢 Conectado"
3. **Habilitar backend:** Marca la casilla "Usar backend PAIA"
4. **Simular:** Las interacciones ahora usarán IA real del backend

## Estructura del Proyecto

```
paia-simulator/
├── src/
│   ├── components/          # Componentes React
│   │   ├── PAIASimulator.js    # Componente principal
│   │   ├── LeftSidebar.js      # Panel de configuración
│   │   ├── RightSidebar.js     # Panel de herramientas
│   │   ├── ActorNode.js        # Nodo de actor personalizado
│   │   ├── StatsPanel.js       # Panel de estadísticas
│   │   ├── DecisionsPanel.js   # Panel de decisiones IA
│   │   ├── LogPanel.js         # Panel de logs
│   │   └── GuideModal.js       # Modal de guía
│   ├── hooks/
│   │   └── usePAIABackend.js   # Hook para backend
│   ├── utils/
│   │   └── api.js              # Cliente API
│   ├── styles/
│   │   └── globals.css         # Estilos globales
│   └── pages/
│       ├── _app.js             # Configuración de la app
│       └── index.js            # Página principal
├── package.json
├── next.config.js
└── README.md
```

## Funcionalidades

### 🎯 Escenarios Predefinidos
- **Basura:** Escenario de recordatorio doméstico
- **Calendario:** Gestión de reuniones
- **Cancelar fiesta:** Notificaciones grupales

### 🔧 Personalización
- **Editar actores:** Doble clic en un nodo para cambiar nombre
- **Arrastrar y soltar:** Reposiciona nodos libremente
- **Conexiones visuales:** Líneas animadas durante simulación

### 📈 Monitoreo
- **Tiempo de respuesta:** Seguimiento en tiempo real
- **Consultas procesadas:** Contador de interacciones
- **Estado del sistema:** Indicadores visuales
- **Logs detallados:** Historial de actividades

### 💾 Persistencia
- **Exportar JSON:** Guarda escenarios completos
- **Importar JSON:** Carga escenarios previos
- **Compatibilidad:** Mantiene formato del HTML original

## Integración con Backend

El simulador puede conectarse con `paia_backend.py` para:

1. **Crear agentes reales** en el backend
2. **Establecer conexiones** entre agentes
3. **Ejecutar simulaciones** con IA real
4. **Obtener respuestas** genuinas de GPT/Gemini

### APIs Utilizadas

- `POST /api/agents` - Crear agente
- `POST /api/connections` - Conectar agentes
- `POST /api/agents/{id}/message` - Enviar mensaje
- `GET /api/health` - Estado del backend

## Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Construcción
npm run build

# Producción
npm start

# Linting
npm run lint
```

## Personalización

### Temas
Los colores se definen en `src/styles/globals.css` usando variables CSS:

```css
:root {
  --primary-color: #4a6bdf;
  --dark-bg: #0f172a;
  --sidebar-bg: #1e293b;
  /* ... más variables */
}
```

### Componentes
Cada componente es modular y puede modificarse independientemente:

- **ActorNode.js** - Personalizar apariencia de nodos
- **StatsPanel.js** - Modificar métricas mostradas  
- **DecisionsPanel.js** - Cambiar formato de decisiones

## Próximas Mejoras

- [ ] Modo colaborativo en tiempo real
- [ ] Más tipos de nodos (API, Database, etc.)
- [ ] Plantillas de escenarios avanzados
- [ ] Exportación a diferentes formatos
- [ ] Análisis de rendimiento de agentes

## Soporte

Para problemas o sugerencias:

1. Verificar que todas las dependencias estén instaladas
2. Comprobar que el puerto 3000 esté disponible
3. Revisar la consola del navegador para errores
4. Confirmar que el backend esté corriendo (si se usa)

---

**Migrado de:** `PAIA_Simulador_v2.html` a Next.js  
**Tecnologías:** React, Next.js, React Flow, CSS personalizado  
**Tema:** Oscuro profesional mantenido
