# PAIA 

Un sistema de agentes PAIA (Personal AI Assistant) desarrollado con Next.js y React, con backend en Python.

## Estructura del Proyecto

```
paia/
├── paia-simulator/          # Aplicación Next.js (interfaz)
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── pages/          # Páginas Next.js
│   │   ├── hooks/          # Custom hooks
│   │   ├── styles/         # Estilos CSS
│   │   └── utils/          # Utilidades y APIs
│   └── package.json
├── paia_backend.py         # Backend principal (usar este)
├── backend_paia_mcp.py     # Backend escalable alternativo
├── requirements.txt        # Dependencias Python
└── index.html              # Página HTML estática
```

## Requisitos Previos

- **Python** (versión 3.8 o superior)
- **Node.js** (versión 18 o superior)
- **npm** o **yarn**
- **API Key de Google Gemini**
- **Git**

## Instalación y Ejecución

### 1. Clonar el repositorio

```bash
git clone https://github.com/dragon88888888888/paia_pruebas.git
cd paia
```

### 2. Configurar el Backend (IMPORTANTE: Hacer esto PRIMERO)

#### Instalar dependencias de Python:
```bash
pip install -r requirements.txt
```

#### Configurar API Key de Gemini:
1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Crea una API key
3. Abre el archivo `paia_backend.py`
4. En la línea 18, reemplaza la API key existente con la tuya:
```python
os.environ["GOOGLE_API_KEY"] = "TU_API_KEY_AQUÍ"
```

#### Configurar PostgreSQL en Docker

##### Instalar docker desktop
Windows: https://docs.docker.com/desktop/setup/install/windows-install
##### Abrir docker desktop y ejecutar el sigueinte comando:

```
docker run --name paia-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=root -e POSTGRES_DB=paia -p 5432:5432 -d postgres:15
```

##### Verificar que PostgreSQL esté funcionando

```
# Verificar que el contenedor esté ejecutándose
docker ps

# Verificar logs del contenedor
docker logs paia-postgres
```

#### Comandos útiles para gestionar Docker

```
# Detener el contenedor
docker stop paia-postgres

# Iniciar el contenedor existente
docker start paia-postgres

# Eliminar el contenedor (si necesitas empezar de nuevo)
docker rm -f paia-postgres

# Conectarse a PostgreSQL desde línea de comandos
docker exec -it paia-postgres psql -U postgres -d paia
```

### ⚠️ Asegúrate de que al compartir tus cambios con el equipo, no compartas la api key

#### Ejecutar el backend:
```bash
python paia_backend.py
```
El backend estará corriendo en: http://localhost:8000

### 3. Configurar la Interfaz
#### En otra terminal, instalar dependencias de Node.js:
```bash
cd paia-simulator
npm install
```

#### Ejecutar la interfaz:
```bash
npm run dev
```
La interfaz estará disponible en: http://localhost:3000

### 4. Comandos disponibles

```bash
# Para el backend Python
python paia_backend.py

# Para la interfaz (en paia-simulator/)
npm run dev        # Ejecutar en desarrollo

```

## Tutorial de Desarrollo en Equipo 

### ¿Qué es Git y por qué lo usamos?

**Git** es una herramienta que nos ayuda a:
- Guardar versiones de nuestro código
- Trabajar en equipo sin pisarnos el trabajo
- Mantener un historial de todos los cambios

**¿Qué es una rama (branch)?** Es como una copia del proyecto donde puedes hacer cambios sin afectar el código principal.

**¿Qué es un Pull Request (PR)?** Es una solicitud para que tus cambios se incluyan en el proyecto principal. Otros compañeros pueden revisar tu código antes de que se integre.

### 🚀 **CUANDO INICIES** - Configuración inicial (solo la primera vez)

```bash
# 1. Clonar el repositorio (descargar el proyecto)
git clone https://github.com/dragon88888888888/paia_pruebas.git
cd paia

# 2. Configurar el backend (IMPORTANTE: hacer esto primero)
pip install -r requirements.txt

# 3. Configurar tu API key de Gemini en paia_backend.py
# 4. Ejecutar el backend
python paia_backend.py

# 5. En otra terminal, configurar la interfaz
cd paia-simulator
npm install
npm run dev
```

### 🔄 **CADA VEZ QUE VAYAS A TRABAJAR** - Flujo diario

#### Paso 1: Preparar tu espacio de trabajo
```bash
# Ir a la rama principal
git checkout main

# Descargar los últimos cambios del equipo
git pull origin main
```

#### Paso 2: Crear tu rama de trabajo
```bash
# Crear una nueva rama para tu tarea
git checkout -b feature/mi-nueva-funcionalidad
```

**💡 Convenciones para nombres de ramas:**
- `feature/login-usuario` - Para nuevas funcionalidades
- `fix/error-conexion` - Para arreglar errores
- `docs/actualizar-readme` - Para documentación

#### Paso 3: Hacer tus cambios
1. **Edita los archivos** que necesitas modificar
2. **Prueba que funciona** ejecutando:
   ```bash
   # Backend (en una terminal)
   python paia_backend.py
   
   # Frontend (en otra terminal)
   cd paia-simulator
   npm run dev
   ```

### 💾 **CUANDO TERMINES UN CAMBIO** - Guardar tu trabajo

#### Paso 4: Verificar qué archivos cambiaste
```bash
# Ver qué archivos modificaste
git status
```

#### Paso 5: Agregar tus cambios
```bash
# Agregar TODOS los archivos modificados
git add .

# O agregar archivos específicos
git add src/components/MiComponente.js
```

#### Paso 6: Hacer commit (guardar la versión)
```bash
# Guardar con un mensaje descriptivo
git commit -m "feat: agregar botón de login"
```

**💡 Convenciones para mensajes:**
- `feat: agregar nueva funcionalidad`
- `fix: corregir error en login`
- `docs: actualizar documentación`

### 📤 **CUANDO QUIERAS COMPARTIR TU TRABAJO** - Subir cambios

#### Paso 7: Subir tu rama
```bash
# Primera vez que subes esta rama
git push -u origin feature/mi-nueva-funcionalidad

# Veces siguientes (si haces más cambios)
git push
```

#### Paso 8: Crear Pull Request (PR)
1. **Ve a GitHub** en tu navegador  
2. **Verás un mensaje** "Compare & pull request" - haz clic
3. **Completa la información:**
   - **Título:** "Agregar funcionalidad de login"
   - **Descripción:** Explica qué hiciste y por qué

**💡 ¿Qué es un Pull Request?**
Es como pedirle permiso al equipo para incluir tus cambios. Otros pueden revisar tu código y sugerir mejoras antes de que se integre al proyecto principal.

### ✅ **DESPUÉS DE QUE APRUEBEN TU PR** - Limpiar

#### Paso 9: Volver a la rama principal
```bash
# Volver a main
git checkout main

# Descargar los cambios (incluye tu PR ya integrado)
git pull origin main

# Eliminar tu rama local (ya no la necesitas)
git branch -d feature/mi-nueva-funcionalidad
```

### 🔄 **FLUJO COMPLETO RESUMIDO:**

1. **Al iniciar:** `git checkout main` → `git pull origin main`
2. **Nueva rama:** `git checkout -b feature/mi-tarea`
3. **Hacer cambios** y probar
4. **Guardar:** `git add .` → `git commit -m "mensaje"`
5. **Subir:** `git push -u origin feature/mi-tarea`
6. **Crear PR** en GitHub
7. **Después del merge:** volver a paso 1

### ❗ **COMANDOS DE EMERGENCIA**

```bash
# Si te equivocaste y quieres deshacer cambios no guardados
git checkout -- nombre-archivo.js

# Si quieres ver qué cambios hiciste
git diff

# Si necesitas cambiar de rama rápido
git stash  # Guarda cambios temporalmente
git checkout otra-rama
git stash pop  # Recupera los cambios
```

## Flujo de Trabajo Recomendado

1. **Siempre trabajar en ramas**: Nunca hacer commits directamente en `main`
2. **Mantener las ramas actualizadas**: Hacer `git pull origin main` regularmente
3. **Commits pequeños y frecuentes**: Es mejor hacer varios commits pequeños que uno grande
4. **Probar antes de hacer PR**: Asegúrate de que el código funciona y pasa el linter
5. **Revisar PRs de otros**: La revisión de código es importante para mantener la calidad

## Tecnologías Utilizadas

- **Next.js 15** - Framework React
- **React 19** - Biblioteca de UI
- **ReactFlow** - Para diagramas y flujos
- **ESLint** - Linter de código

## Contribuir

1. Fork del proyecto
2. Crear rama para tu feature
3. Commit de tus cambios
4. Push a la rama
5. Crear Pull Request

---

**Nota**: Este proyecto es privado y está destinado para el equipo de desarrollo. Asegúrate de seguir las mejores prácticas de Git y mantener el código limpio y bien documentado.