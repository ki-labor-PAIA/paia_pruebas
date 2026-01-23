import uuid
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import HTTPException
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage

from models.agent import PAIAAgent, AgentConnection, AgentMessage
from config.settings import LLM_MODEL, LLM_TEMPERATURE, TELEGRAM_DEFAULT_CHAT_ID
from tools.telegram_tools import create_telegram_tools
from tools.whatsapp_tools import create_whatsapp_tools
from tools.communication_tools import create_communication_tools
from tools.notes_tools import create_notes_tools
from tools.expertise_tools import get_expertise_tools


class PAIAAgentManager:
    """
    Gestor centralizado para la creación, configuración y gestión de agentes PAIA.

    Responsabilidades:
    - Crear agentes con LLM y herramientas
    - Gestionar conexiones entre agentes
    - Manejar comunicación inter-agente
    - Administrar herramientas por expertise
    """

    def __init__(
        self,
        db_manager,
        memory_manager,
        telegram_service,
        whatsapp_service,
        auth_manager,
        get_mcp_client_func
    ):
        """
        Inicializar el gestor de agentes.

        Args:
            db_manager: Gestor de base de datos
            memory_manager: Gestor de memoria a largo plazo
            telegram_service: Servicio de Telegram
            whatsapp_service: Servicio de WhatsApp
            auth_manager: Gestor de autenticación
            get_mcp_client_func: Función para obtener cliente MCP por usuario
        """
        self.llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=LLM_TEMPERATURE)
        self.db_manager = db_manager
        self.memory_manager = memory_manager
        self.telegram_service = telegram_service
        self.whatsapp_service = whatsapp_service
        self.auth_manager = auth_manager
        self.get_mcp_client_func = get_mcp_client_func

        # Stores compartidos (inyectados desde el main)
        self.agents_store: Dict[str, PAIAAgent] = {}
        self.connections_store: Dict[str, AgentConnection] = {}
        self.message_history: Dict[str, List[AgentMessage]] = {}

    def set_stores(
        self,
        agents_store: Dict[str, PAIAAgent],
        connections_store: Dict[str, AgentConnection],
        message_history: Dict[str, List[AgentMessage]]
    ):
        """
        Inyectar los stores globales compartidos.

        Args:
            agents_store: Store de agentes
            connections_store: Store de conexiones
            message_history: Historial de mensajes
        """
        self.agents_store = agents_store
        self.connections_store = connections_store
        self.message_history = message_history

    async def create_agent(self, agent_data: dict) -> PAIAAgent:
        """
        Crear un nuevo agente PAIA con todas sus herramientas y configuración.

        Args:
            agent_data: Diccionario con los datos del agente
                - name: Nombre del agente
                - description: Descripción
                - personality: Personalidad
                - expertise: Área de expertise
                - user_id: ID del usuario propietario
                - is_public: Si es público o no

        Returns:
            PAIAAgent: Instancia del agente creado
        """
        # Guardar en BD primero
        db_agent = await self.db_manager.create_agent(agent_data)

        # Crear herramientas base del agente
        base_tools = self._create_agent_tools(db_agent.id, agent_data['expertise'])

        # Obtener herramientas MCP si están disponibles
        user_id = agent_data.get('user_id', 'usuario-anonimo')
        all_tools = base_tools

        # Usar cliente MCP específico para el usuario
        user_mcp_client = await self.get_mcp_client_func(user_id)
        if user_mcp_client:
            try:
                mcp_tools = await user_mcp_client.get_tools()
                all_tools = base_tools + mcp_tools
                print(f"Herramientas MCP agregadas para usuario {user_id}: {len(mcp_tools)}")
            except Exception as e:
                print(f"Error obteniendo herramientas MCP para usuario {user_id}: {e}")

        # Crear instancia del agente con TODAS las herramientas
        agent_llm = create_react_agent(
            self.llm,
            all_tools,
            prompt=self._build_agent_prompt(agent_data, user_id)
        )

        agent = PAIAAgent(
           id=db_agent.id,
           name=db_agent.name,
           description=db_agent.description,
           personality=db_agent.personality,
           expertise=db_agent.expertise,
           status=db_agent.status,
           created=db_agent.created_at.isoformat(),
           mcp_endpoint=db_agent.mcp_endpoint or f"http://localhost:{3000 + len(self.agents_store)}/mcp",
           user_id=db_agent.user_id,
           is_public=db_agent.is_public,
           telegram_chat_id=db_agent.telegram_chat_id or TELEGRAM_DEFAULT_CHAT_ID,
           llm_instance=agent_llm,
           tools=all_tools,
           conversation_history=[]
        )

        # Vincular perfil estable para memoria larga
        memory_profile_id = f"user:{db_agent.user_id}|persona:{db_agent.name}"
        self.memory_manager.bind_profile(db_agent.id, memory_profile_id)

        self.agents_store[db_agent.id] = agent
        return agent

    def _build_agent_prompt(self, agent_data: dict, user_id: str) -> str:
        """
        Construir el prompt del agente con instrucciones detalladas.

        Args:
            agent_data: Datos del agente
            user_id: ID del usuario

        Returns:
            str: Prompt completo del agente
        """
        return f"""Eres {agent_data['name']}, un asistente {agent_data['personality']} especializado en {agent_data['expertise']}.

IMPORTANTE: Tu user ID es: {user_id}

HERRAMIENTAS DISPONIBLES:

CALENDARIO:
- Usa las herramientas de Google Calendar directamente: list-calendars, list-events, list-today-events, create-event
- La autenticación del usuario se maneja automáticamente

COMUNICACIÓN INTELIGENTE:
- Para enviar un mensaje a una PERSONA: usa send_notification_to_user(user_name, message, priority)
- Para hacer PREGUNTAS INTELIGENTES a otro agente: usa ask_connected_agent(target_agent_id, question, context)

EJEMPLOS DE USO:
- "Dile a Mari que la espero mañana a las 7" → send_notification_to_user("Mari", "Te espero mañana a las 7", "normal")
- "Pregúntale al agente 'agent-xyz' si su usuario está libre mañana a las 7" → ask_connected_agent("agent-xyz", "¿Estás disponible mañana a las 7pm?", "Para una reunión de trabajo")

COMPORTAMIENTO:
- Sé PROACTIVO: Si mencionan calendario o disponibilidad, usa las herramientas automáticamente
- Para consultas de disponibilidad, siempre usa ask_connected_agent() - el otro agente consultará su calendario
- Para mensajes simples, usa send_notification_to_user()
- Siempre confirma qué acción realizaste

NOTAS PERSONALES:
- Para guardar información importante: usa save_note(title, content, tags)
- Para buscar en tus notas: usa search_notes(query)

IMPORTANTE: Para usar una herramienta, responde con el formato JSON correcto. Mantén el contexto de toda la conversación y responde de manera natural."""

    def _create_agent_tools(self, agent_id: str, expertise: str) -> List:
        """
        Crear herramientas mejoradas para comunicación inter-agente, Telegram, Google Calendar y notas personales.

        Args:
            agent_id: ID del agente al que pertenecen estas herramientas
            expertise: Área de expertise del agente

        Returns:
            Lista de funciones de herramientas para este agente
        """
        # Crear herramientas de Telegram
        telegram_tools_list = create_telegram_tools(
            agent_id=agent_id,
            agents_store=self.agents_store,
            telegram_service=self.telegram_service,
            telegram_default_chat_id=TELEGRAM_DEFAULT_CHAT_ID
        )

        # Crear herramientas de WhatsApp
        whatsapp_tools_list = create_whatsapp_tools(self.whatsapp_service)

        # Crear herramientas de comunicacion
        communication_tools_list = create_communication_tools(
            agent_id=agent_id,
            agents_store=self.agents_store,
            connections_store=self.connections_store,
            message_history=self.message_history,
            telegram_service=self.telegram_service,
            telegram_default_chat_id=TELEGRAM_DEFAULT_CHAT_ID,
            db_manager=self.db_manager,
            auth_manager=self.auth_manager,
            agent_manager=self,
            ensure_agent_loaded_func=self.ensure_agent_loaded,
            AgentMessage=AgentMessage
        )

        # Crear herramientas de notas
        notes_tools_list = create_notes_tools()

        # Herramientas base (comunes a todos los agentes)
        base_tools = []
        base_tools.extend(telegram_tools_list)
        base_tools.extend(whatsapp_tools_list)
        base_tools.extend(communication_tools_list)
        base_tools.extend(notes_tools_list)

        # Agregar herramientas específicas de expertise
        expertise_tools_list = get_expertise_tools(
            expertise=expertise,
            agent_id=agent_id,
            agents_store=self.agents_store,
            telegram_service=self.telegram_service
        )
        base_tools.extend(expertise_tools_list)

        # Las herramientas de Google Calendar vienen del cliente MCP

        return base_tools

    async def _generate_agent_response(
        self,
        from_agent_id: str,
        to_agent_id: str,
        conversation_id: str
    ) -> str:
        """
        Generar respuesta automática del agente objetivo.

        Args:
            from_agent_id: ID del agente que envía
            to_agent_id: ID del agente que responde
            conversation_id: ID de la conversación

        Returns:
            str: Respuesta generada
        """
        try:
            if to_agent_id not in self.agents_store:
                return "Error: Agente no encontrado"

            target_agent = self.agents_store[to_agent_id]
            from_agent = self.agents_store[from_agent_id]

            messages = self.message_history.get(conversation_id, [])
            if not messages:
                return "No hay mensajes para responder"

            last_message = messages[-1]

            prompt = f"""Eres {target_agent.name}, especializado en {target_agent.expertise}.
{from_agent.name} te pregunta: {last_message.content}

Responde de manera útil según tu especialidad."""

            response = await target_agent.llm_instance.ainvoke({
                "messages": [HumanMessage(content=prompt)]
            })

            response_content = response["messages"][-1].content

            response_message = AgentMessage(
                id=str(uuid.uuid4())[:8],
                from_agent=to_agent_id,
                to_agent=from_agent_id,
                content=response_content,
                timestamp=datetime.now().isoformat(),
                conversation_id=conversation_id,
                telegram_sent=False
            )

            self.message_history[conversation_id].append(response_message)

            return f"{target_agent.name} respondió: \"{response_content}\""

        except Exception as e:
            return f"Error generando respuesta: {str(e)}"

    async def connect_agents(
        self,
        agent1_id: str,
        agent2_id: str,
        connection_type: str = "direct"
    ) -> AgentConnection:
        """
        Conectar dos agentes para que puedan comunicarse.

        Args:
            agent1_id: ID del primer agente
            agent2_id: ID del segundo agente
            connection_type: Tipo de conexion (direct, broadcast, etc.)

        Returns:
            AgentConnection: Conexion creada

        Raises:
            HTTPException: Si algun agente no existe
        """
        # Cargar agentes si no estan en memoria (lazy loading)
        agent1 = await self.ensure_agent_loaded(agent1_id)
        agent2 = await self.ensure_agent_loaded(agent2_id)

        if not agent1 or not agent2:
            missing = []
            if not agent1:
                missing.append(agent1_id)
            if not agent2:
                missing.append(agent2_id)
            raise HTTPException(
                status_code=404,
                detail=f"Agentes no encontrados: {', '.join(missing)}"
            )

        # Verificar si ya existe una conexion entre estos agentes
        for conn in self.connections_store.values():
            if (conn.agent1 == agent1_id and conn.agent2 == agent2_id) or \
               (conn.agent1 == agent2_id and conn.agent2 == agent1_id):
                print(f"[Connection] Conexion ya existe entre {agent1.name} y {agent2.name}")
                return conn

        connection = AgentConnection(
            id=str(uuid.uuid4())[:8],
            agent1=agent1_id,
            agent2=agent2_id,
            type=connection_type,
            status='active',
            created=datetime.now().isoformat()
        )

        self.connections_store[connection.id] = connection
        print(f"[Connection] Nueva conexion creada: {agent1.name} <-> {agent2.name}")
        return connection

    def _add_capability_to_agent(self, agent: PAIAAgent, expertise: str):
        """
        Agregar una nueva capacidad/expertise a un agente existente.

        Args:
            agent: Agente al que agregar la capacidad
            expertise: Nueva área de expertise
        """
        if expertise not in agent.expertise.split(', '):
            agent.expertise += f", {expertise}"
            self._recreate_agent(agent)

    def _recreate_agent(self, agent: PAIAAgent):
        """
        Recrear un agente con nuevas herramientas y configuración.

        Args:
            agent: Agente a recrear
        """
        agent_tools = self._create_agent_tools(agent.id, agent.expertise)
        tools_description = "\n".join([f'- {tool.name}: {tool.description}' for tool in agent_tools])

        agent.tools = agent_tools
        agent.llm_instance = create_react_agent(
            self.llm,
            agent.tools,
            state_modifier=f"""Eres {agent.name}, un asistente {agent.personality} especializado en {agent.expertise}.

Estas son tus herramientas disponibles:
{tools_description}

IMPORTANTE: Para usar una herramienta, responde con el formato JSON correcto. Mantén el contexto de toda la conversación y responde de manera natural."""
        )

    async def send_message_to_agent_api(
        self,
        from_agent_id: str,
        to_agent_id: str,
        message: str
    ) -> str:
        """
        API endpoint para envío de mensajes entre agentes.

        Args:
            from_agent_id: ID del agente emisor
            to_agent_id: ID del agente receptor
            message: Contenido del mensaje

        Returns:
            str: Respuesta del agente receptor

        Raises:
            HTTPException: Si los agentes no existen o no están conectados
        """
        if from_agent_id not in self.agents_store or to_agent_id not in self.agents_store:
            raise HTTPException(status_code=404, detail="Agente no encontrado")

        connected = any(
            (conn.agent1 == from_agent_id and conn.agent2 == to_agent_id) or
            (conn.agent1 == to_agent_id and conn.agent2 == from_agent_id)
            for conn in self.connections_store.values()
        )

        if not connected:
            raise HTTPException(status_code=400, detail="Los agentes no están conectados")

        conversation_id = f"{min(from_agent_id, to_agent_id)}_{max(from_agent_id, to_agent_id)}"

        sent_message = AgentMessage(
            id=str(uuid.uuid4())[:8],
            from_agent=from_agent_id,
            to_agent=to_agent_id,
            content=message,
            timestamp=datetime.now().isoformat(),
            conversation_id=conversation_id,
            telegram_sent=False
        )

        if conversation_id not in self.message_history:
            self.message_history[conversation_id] = []
        self.message_history[conversation_id].append(sent_message)

        response = await self._generate_agent_response(from_agent_id, to_agent_id, conversation_id)

        return response

    async def ensure_agent_loaded(self, agent_id: str) -> Optional[PAIAAgent]:
        """
        Asegurar que un agente este cargado en memoria.
        Si no esta en memoria, lo carga desde la BD.

        Args:
            agent_id: ID del agente

        Returns:
            PAIAAgent o None si no existe
        """
        # Si ya esta en memoria, retornarlo
        if agent_id in self.agents_store:
            return self.agents_store[agent_id]

        # Intentar cargar desde la BD
        try:
            db_agent = await self.db_manager.get_agent(agent_id)
            if not db_agent:
                print(f"[AgentManager] Agente {agent_id} no encontrado en BD")
                return None

            print(f"[AgentManager] Cargando agente {db_agent.name} desde BD...")

            # Crear herramientas base del agente
            base_tools = self._create_agent_tools(db_agent.id, db_agent.expertise)

            # Obtener herramientas MCP si estan disponibles
            user_id = db_agent.user_id or 'usuario-anonimo'
            all_tools = base_tools

            user_mcp_client = await self.get_mcp_client_func(user_id)
            if user_mcp_client:
                try:
                    mcp_tools = await user_mcp_client.get_tools()
                    all_tools = base_tools + mcp_tools
                except Exception as e:
                    print(f"[AgentManager] Error obteniendo herramientas MCP: {e}")

            # Construir datos del agente para el prompt
            agent_data = {
                'name': db_agent.name,
                'personality': db_agent.personality,
                'expertise': db_agent.expertise
            }

            # Crear instancia del agente
            agent_llm = create_react_agent(
                self.llm,
                all_tools,
                prompt=self._build_agent_prompt(agent_data, user_id)
            )

            agent = PAIAAgent(
                id=db_agent.id,
                name=db_agent.name,
                description=db_agent.description,
                personality=db_agent.personality,
                expertise=db_agent.expertise,
                status=db_agent.status,
                created=db_agent.created_at.isoformat(),
                mcp_endpoint=db_agent.mcp_endpoint or f"http://localhost:{3000 + len(self.agents_store)}/mcp",
                user_id=db_agent.user_id,
                is_public=db_agent.is_public,
                telegram_chat_id=db_agent.telegram_chat_id or TELEGRAM_DEFAULT_CHAT_ID,
                llm_instance=agent_llm,
                tools=all_tools,
                conversation_history=[]
            )

            # Vincular perfil de memoria
            memory_profile_id = f"user:{db_agent.user_id}|persona:{db_agent.name}"
            self.memory_manager.bind_profile(db_agent.id, memory_profile_id)

            self.agents_store[db_agent.id] = agent
            print(f"[AgentManager] Agente {db_agent.name} cargado exitosamente")
            return agent

        except Exception as e:
            print(f"[AgentManager] Error cargando agente {agent_id}: {e}")
            import traceback
            traceback.print_exc()
            return None

    def get_agent(self, agent_id: str) -> Optional[PAIAAgent]:
        """
        Obtener un agente por su ID.

        Args:
            agent_id: ID del agente

        Returns:
            PAIAAgent o None si no existe
        """
        return self.agents_store.get(agent_id)

    def get_all_agents(self) -> List[PAIAAgent]:
        """
        Obtener todos los agentes en memoria.

        Returns:
            Lista de todos los agentes
        """
        return list(self.agents_store.values())

    def remove_agent(self, agent_id: str) -> bool:
        """
        Eliminar un agente de la memoria.

        Args:
            agent_id: ID del agente a eliminar

        Returns:
            True si se eliminó, False si no existía
        """
        if agent_id in self.agents_store:
            del self.agents_store[agent_id]
            return True
        return False
