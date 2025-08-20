import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from langchain_mcp_adapters.client import MultiServerMCPClient, load_mcp_tools
from langgraph.prebuilt import create_react_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage
import uvicorn
import os

# Configuración
os.environ["GOOGLE_API_KEY"] = "AIzaSyDD4sluD_ep4p5iovOrspRUoS227PnP30c"

app = FastAPI(title="PAIA Platform Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos de datos
@dataclass
class PAIAAgent:
    id: str
    name: str
    description: str
    personality: str
    expertise: str
    status: str
    created: str
    mcp_endpoint: str
    user_id: Optional[str] = None  # ID del usuario que creó el agente
    is_public: bool = True  # Si otros usuarios pueden conectarse
    llm_instance: Optional[object] = None
    tools: List = None
    conversation_history: List = None

@dataclass
class AgentConnection:
    id: str
    agent1: str
    agent2: str
    type: str
    status: str
    created: str

@dataclass
class AgentMessage:
    id: str
    from_agent: str
    to_agent: str
    content: str
    timestamp: str
    conversation_id: Optional[str] = None

# Storage en memoria
agents_store: Dict[str, PAIAAgent] = {}
connections_store: Dict[str, AgentConnection] = {}
active_websockets: Dict[str, WebSocket] = {}
message_history: Dict[str, List[AgentMessage]] = {}  # conversation_id -> messages

class PAIAAgentManager:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0.7)
    
    async def create_agent(self, agent_data: dict) -> PAIAAgent:
        agent_id = str(uuid.uuid4())[:8]
        
        # Crear herramientas específicas del agente
        agent_tools = self._create_agent_tools(agent_id, agent_data['expertise'])
        
        # Crear instancia del agente con LangGraph
        agent_llm = create_react_agent(
            self.llm,
            agent_tools,
            state_modifier=f"""Eres {agent_data['name']}, un asistente {agent_data['personality']} especializado en {agent_data['expertise']}.

IMPORTANTE: Tienes acceso a herramientas para comunicarte con otros agentes. Cuando el usuario te pida enviar un mensaje a otro agente:
1. USA get_connected_agents() para ver con quién puedes hablar
2. USA send_message_to_agent() para enviar el mensaje y obtener respuesta automáticamente
3. Comparte INMEDIATAMENTE la respuesta con el usuario

Mantén el contexto de toda la conversación y responde de manera natural."""
        )
        
        agent = PAIAAgent(
            id=agent_id,
            name=agent_data['name'],
            description=agent_data['description'],
            personality=agent_data['personality'],
            expertise=agent_data['expertise'],
            status='online',
            created=datetime.now().isoformat(),
            mcp_endpoint=f"http://localhost:{3000 + len(agents_store)}/mcp",
            user_id=agent_data.get('user_id', 'anonymous'),  # ID del usuario que lo creó
            is_public=agent_data.get('is_public', True),  # Por defecto es público
            llm_instance=agent_llm,
            tools=agent_tools,
            conversation_history=[]
        )
        
        agents_store[agent_id] = agent
        return agent
    
    def _create_agent_tools(self, agent_id: str, expertise: str) -> List:
        """Crear herramientas mejoradas para comunicación entre agentes"""
        
        @tool
        def get_connected_agents() -> str:
            """Ver agentes conectados"""
            try:
                connected = []
                for conn in connections_store.values():
                    if conn.agent1 == agent_id and conn.agent2 in agents_store:
                        other_agent = agents_store[conn.agent2]
                        connected.append(f"{other_agent.name} (ID: {other_agent.id})")
                    elif conn.agent2 == agent_id and conn.agent1 in agents_store:
                        other_agent = agents_store[conn.agent1]
                        connected.append(f"{other_agent.name} (ID: {other_agent.id})")
                
                return f"Conectado con: {', '.join(connected)}" if connected else "Sin conexiones"
            except Exception as e:
                return f"Error obteniendo conexiones: {str(e)}"
        
        @tool
        async def send_message_to_agent(target_agent_id: str, message: str) -> str:
            """Enviar mensaje y obtener respuesta automáticamente"""
            try:
                sender_id = agent_id
                
                # Verificar conexión
                is_connected = any(
                    (conn.agent1 == sender_id and conn.agent2 == target_agent_id) or
                    (conn.agent1 == target_agent_id and conn.agent2 == sender_id)
                    for conn in connections_store.values()
                )
                
                if not is_connected:
                    return f"Error: No estás conectado con el agente {target_agent_id}"
                
                if target_agent_id not in agents_store:
                    return f"Error: Agente {target_agent_id} no encontrado"
                
                # Crear ID de conversación único
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"
                
                # Guardar mensaje enviado
                sent_message = AgentMessage(
                    id=str(uuid.uuid4())[:8],
                    from_agent=sender_id,
                    to_agent=target_agent_id,
                    content=message,
                    timestamp=datetime.now().isoformat(),
                    conversation_id=conversation_id
                )
                
                if conversation_id not in message_history:
                    message_history[conversation_id] = []
                message_history[conversation_id].append(sent_message)
                
                # ✅ CAMBIO: Usar await con la función async
                response = await agent_manager._generate_agent_response(sender_id, target_agent_id, conversation_id)
                target_agent_name = agents_store[target_agent_id].name
                
                return f"✓ Mensaje enviado a {target_agent_name}.\n🤖 {response}"
                
            except Exception as e:
                return f"Error enviando mensaje: {str(e)}"

        @tool
        async def get_agent_response(target_agent_id: str) -> str:
            """Obtener la respuesta más reciente de un agente específico"""
            try:
                sender_id = agent_id
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"
                
                if conversation_id not in message_history:
                    return "No hay conversación iniciada con ese agente."
                
                # Buscar la última respuesta del agente objetivo
                messages = message_history[conversation_id]
                for message in reversed(messages):
                    if message.from_agent == target_agent_id:
                        agent_name = agents_store[target_agent_id].name
                        return f"{agent_name} respondió: \"{message.content}\""
                
                # ✅ CAMBIO: Usar await
                return await agent_manager._generate_agent_response(sender_id, target_agent_id, conversation_id)
                
            except Exception as e:
                return f"Error obteniendo respuesta: {str(e)}"
        
        @tool
        def get_conversation_history(target_agent_id: str) -> str:
            """Obtener el historial completo de conversación con un agente"""
            try:
                sender_id = agent_id
                conversation_id = f"{min(sender_id, target_agent_id)}_{max(sender_id, target_agent_id)}"
                
                if conversation_id not in message_history:
                    return "No hay historial de conversación con ese agente."
                
                history = []
                for msg in message_history[conversation_id]:
                    sender_name = agents_store[msg.from_agent].name
                    history.append(f"{sender_name}: {msg.content}")
                
                return "Historial de conversación:\n" + "\n".join(history)
                
            except Exception as e:
                return f"Error obteniendo historial: {str(e)}"
        
        base_tools = [get_connected_agents, send_message_to_agent, get_agent_response, get_conversation_history]
        
        # Herramientas específicas por expertise
        if expertise == "scheduling":
            @tool
            def schedule_meeting(title: str, date: str, participants: List[str]) -> str:
                return f"Reunión '{title}' programada para {date} con {', '.join(participants)}"
            base_tools.append(schedule_meeting)
            
        elif expertise == "travel":
            @tool
            def book_flight(from_city: str, to_city: str, date: str) -> str:
                return f"Vuelo reservado de {from_city} a {to_city} para {date}"
            
            @tool
            def book_hotel(city: str, checkin: str, checkout: str) -> str:
                return f"Hotel reservado en {city} del {checkin} al {checkout}"
            
            base_tools.extend([book_flight, book_hotel])
            
        elif expertise == "research":
            @tool
            def web_search(query: str) -> str:
                return f"Resultados de búsqueda para: {query}"
            base_tools.append(web_search)
        
        return base_tools
    
    async def _generate_agent_response(self, from_agent_id: str, to_agent_id: str, conversation_id: str) -> str:
        """Generar respuesta automática del agente objetivo"""
        try:
            if to_agent_id not in agents_store:
                return "Error: Agente no encontrado"
            
            target_agent = agents_store[to_agent_id]
            from_agent = agents_store[from_agent_id]
            
            # Obtener el último mensaje enviado
            messages = message_history.get(conversation_id, [])
            if not messages:
                return "No hay mensajes para responder"
            
            last_message = messages[-1]
            
            # Crear prompt simple
            prompt = f"""Eres {target_agent.name}, especializado en {target_agent.expertise}.
    {from_agent.name} te pregunta: {last_message.content}

    Responde de manera útil según tu especialidad."""
            
            # ✅ CAMBIO CLAVE: await target_agent.llm_instance.ainvoke()
            response = await target_agent.llm_instance.ainvoke({
                "messages": [HumanMessage(content=prompt)]
            })
            
            response_content = response["messages"][-1].content
            
            # Guardar la respuesta
            response_message = AgentMessage(
                id=str(uuid.uuid4())[:8],
                from_agent=to_agent_id,
                to_agent=from_agent_id,
                content=response_content,
                timestamp=datetime.now().isoformat(),
                conversation_id=conversation_id
            )
            
            message_history[conversation_id].append(response_message)
            
            return f"{target_agent.name} respondió: \"{response_content}\""
            
        except Exception as e:
            return f"Error generando respuesta: {str(e)}"
    
    async def connect_agents(self, agent1_id: str, agent2_id: str, connection_type: str = "direct") -> AgentConnection:
        if agent1_id not in agents_store or agent2_id not in agents_store:
            raise HTTPException(status_code=404, detail="Uno o ambos agentes no encontrados")
        
        connection = AgentConnection(
            id=str(uuid.uuid4())[:8],
            agent1=agent1_id,
            agent2=agent2_id,
            type=connection_type,
            status='active',
            created=datetime.now().isoformat()
        )
        
        connections_store[connection.id] = connection
        return connection
    
    async def send_message_to_agent_api(self, from_agent_id: str, to_agent_id: str, message: str) -> str:
        """API endpoint para envío de mensajes entre agentes"""
        if from_agent_id not in agents_store or to_agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        # Verificar conexión
        connected = any(
            (conn.agent1 == from_agent_id and conn.agent2 == to_agent_id) or
            (conn.agent1 == to_agent_id and conn.agent2 == from_agent_id)
            for conn in connections_store.values()
        )
        
        if not connected:
            raise HTTPException(status_code=400, detail="Los agentes no están conectados")
        
        conversation_id = f"{min(from_agent_id, to_agent_id)}_{max(from_agent_id, to_agent_id)}"
        
        # Enviar mensaje
        sent_message = AgentMessage(
            id=str(uuid.uuid4())[:8],
            from_agent=from_agent_id,
            to_agent=to_agent_id,
            content=message,
            timestamp=datetime.now().isoformat(),
            conversation_id=conversation_id
        )
        
        if conversation_id not in message_history:
            message_history[conversation_id] = []
        message_history[conversation_id].append(sent_message)
        
        # ✅ CAMBIO: Usar await
        response = await self._generate_agent_response(from_agent_id, to_agent_id, conversation_id)
        
        return response

# Instancia del gestor
agent_manager = PAIAAgentManager()

# =============== ENDPOINTS API ===============

@app.post("/api/agents")
async def create_agent(agent_data: dict):
    try:
        agent = await agent_manager.create_agent(agent_data)
        agent_dict = asdict(agent)
        agent_dict.pop('llm_instance', None)
        agent_dict.pop('tools', None)
        return agent_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents")
async def get_agents(user_id: str = None):
    agents_list = []
    for agent in agents_store.values():
        agent_dict = asdict(agent)
        agent_dict.pop('llm_instance', None)
        agent_dict.pop('tools', None)
        
        # Si se especifica user_id, filtrar solo agentes de ese usuario
        if user_id and agent.user_id != user_id:
            continue
            
        agents_list.append(agent_dict)
    return agents_list

@app.get("/api/agents/public")
async def get_public_agents(exclude_user_id: str = None):
    """Obtener todos los agentes públicos, opcionalmente excluyendo los de un usuario específico"""
    agents_list = []
    for agent in agents_store.values():
        if agent.is_public and (not exclude_user_id or agent.user_id != exclude_user_id):
            agent_dict = asdict(agent)
            agent_dict.pop('llm_instance', None)
            agent_dict.pop('tools', None)
            agents_list.append(agent_dict)
    return agents_list

@app.post("/api/connections")
async def create_connection(connection_data: dict):
    try:
        connection = await agent_manager.connect_agents(
            connection_data['agent1'],
            connection_data['agent2'],
            connection_data.get('type', 'direct')
        )
        return asdict(connection)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/connections")
async def get_connections():
    return [asdict(conn) for conn in connections_store.values()]

@app.post("/api/agents/{agent_id}/message")
async def send_message_to_agent(agent_id: str, message_data: dict):
    try:
        if agent_id not in agents_store:
            raise HTTPException(status_code=404, detail="Agente no encontrado")
        
        agent = agents_store[agent_id]
        
        # Agregar mensaje a historial del agente
        if agent.conversation_history is None:
            agent.conversation_history = []
        
        agent.conversation_history.append({
            "role": "user",
            "content": message_data['message'],
            "timestamp": datetime.now().isoformat()
        })
        
        # Crear contexto de conversación completo
        conversation_context = []
        for msg in agent.conversation_history[-10:]:  # Últimos 10 mensajes
            if msg["role"] == "user":
                conversation_context.append(HumanMessage(content=msg["content"]))
            else:
                conversation_context.append(AIMessage(content=msg["content"]))
        
        # Si no hay contexto previo, agregar mensaje inicial
        if not conversation_context:
            conversation_context.append(HumanMessage(content=message_data['message']))
        else:
            # Agregar el mensaje actual si no está ya
            if conversation_context[-1].content != message_data['message']:
                conversation_context.append(HumanMessage(content=message_data['message']))
        
        response = await agent.llm_instance.ainvoke({
            "messages": conversation_context
        })
        
        response_content = response["messages"][-1].content
        
        # Agregar respuesta al historial
        agent.conversation_history.append({
            "role": "assistant", 
            "content": response_content,
            "timestamp": datetime.now().isoformat()
        })
        
        return {
            "agent_id": agent_id,
            "agent_name": agent.name,
            "response": response_content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/agents/{from_agent_id}/send-to/{to_agent_id}")
async def send_message_between_agents_endpoint(from_agent_id: str, to_agent_id: str, message_data: dict):
    try:
        response = await agent_manager.send_message_to_agent_api(
            from_agent_id, 
            to_agent_id, 
            message_data['message']
        )
        
        return {
            "from_agent": agents_store[from_agent_id].name,
            "to_agent": agents_store[to_agent_id].name,
            "response": response
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/agents/{agent_id}/connected")
async def get_agent_connections(agent_id: str):
    """Obtener agentes conectados a un agente específico"""
    if agent_id not in agents_store:
        raise HTTPException(status_code=404, detail="Agente no encontrado")
    
    connected = []
    for conn in connections_store.values():
        if conn.agent1 == agent_id and conn.agent2 in agents_store:
            other_agent = agents_store[conn.agent2]
            connected.append({
                "id": other_agent.id,
                "name": other_agent.name,
                "expertise": other_agent.expertise,
                "personality": other_agent.personality
            })
        elif conn.agent2 == agent_id and conn.agent1 in agents_store:
            other_agent = agents_store[conn.agent1]
            connected.append({
                "id": other_agent.id,
                "name": other_agent.name,
                "expertise": other_agent.expertise,
                "personality": other_agent.personality
            })
    
    return connected

@app.get("/api/conversations/{agent1_id}/{agent2_id}")
async def get_conversation_history(agent1_id: str, agent2_id: str):
    """Obtener historial de conversación entre dos agentes"""
    conversation_id = f"{min(agent1_id, agent2_id)}_{max(agent1_id, agent2_id)}"
    
    if conversation_id not in message_history:
        return {"messages": []}
    
    messages = []
    for msg in message_history[conversation_id]:
        messages.append({
            "id": msg.id,
            "from_agent_id": msg.from_agent,
            "from_agent_name": agents_store[msg.from_agent].name,
            "to_agent_id": msg.to_agent,
            "to_agent_name": agents_store[msg.to_agent].name,
            "content": msg.content,
            "timestamp": msg.timestamp
        })
    
    return {"messages": messages}

@app.websocket("/ws/{agent_id}")
async def websocket_endpoint(websocket: WebSocket, agent_id: str):
    await websocket.accept()
    active_websockets[agent_id] = websocket
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data['type'] == 'chat':
                if agent_id in agents_store:
                    agent = agents_store[agent_id]
                    
                    # Mantener contexto de conversación
                    if agent.conversation_history is None:
                        agent.conversation_history = []
                    
                    agent.conversation_history.append({
                        "role": "user",
                        "content": message_data['message'],
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    context = []
                    for msg in agent.conversation_history[-10:]:
                        if msg["role"] == "user":
                            context.append(HumanMessage(content=msg["content"]))
                        else:
                            context.append(AIMessage(content=msg["content"]))
                    
                    response = await agent.llm_instance.ainvoke({"messages": context})
                    response_content = response["messages"][-1].content
                    
                    agent.conversation_history.append({
                        "role": "assistant",
                        "content": response_content,
                        "timestamp": datetime.now().isoformat()
                    })
                    
                    await websocket.send_text(json.dumps({
                        "type": "response",
                        "agent_id": agent_id,
                        "agent_name": agent.name,
                        "message": response_content,
                        "timestamp": datetime.now().isoformat()
                    }))
            
            elif message_data['type'] == 'agent_to_agent':
                target_agent_id = message_data['target_agent_id']
                if target_agent_id in agents_store:
                    response = await agent_manager.send_message_to_agent_api(
                        agent_id, 
                        target_agent_id, 
                        message_data['message']
                    )
                    
                    message_payload = {
                        "type": "agent_message",
                        "from_agent": agents_store[agent_id].name,
                        "to_agent": agents_store[target_agent_id].name,
                        "message": message_data['message'],
                        "response": response,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    await websocket.send_text(json.dumps(message_payload))
                    
                    if target_agent_id in active_websockets:
                        await active_websockets[target_agent_id].send_text(
                            json.dumps(message_payload)
                        )
                        
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        if agent_id in active_websockets:
            del active_websockets[agent_id]

@app.post("/api/architectures/create")
async def create_architecture(architecture_data: dict):
    arch_type = architecture_data['type']
    agent_ids = architecture_data['agent_ids']
    
    connections_created = []
    
    try:
        if arch_type == 'chain':
            for i in range(len(agent_ids) - 1):
                connection = await agent_manager.connect_agents(
                    agent_ids[i], 
                    agent_ids[i + 1], 
                    'sequential'
                )
                connections_created.append(asdict(connection))
                
        elif arch_type == 'hub':
            hub_agent = agent_ids[0]
            for i in range(1, len(agent_ids)):
                connection = await agent_manager.connect_agents(
                    hub_agent, 
                    agent_ids[i], 
                    'bidirectional'
                )
                connections_created.append(asdict(connection))
                
        elif arch_type == 'mesh':
            for i in range(len(agent_ids)):
                for j in range(i + 1, len(agent_ids)):
                    connection = await agent_manager.connect_agents(
                        agent_ids[i], 
                        agent_ids[j], 
                        'mesh'
                    )
                    connections_created.append(asdict(connection))
        
        return {
            "architecture_type": arch_type,
            "connections_created": len(connections_created),
            "connections": connections_created
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "agents_count": len(agents_store),
        "connections_count": len(connections_store),
        "active_websockets": len(active_websockets),
        "conversations_count": len(message_history),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    print("Iniciando PAIA Platform Backend Async...")
    print("Funcionalidades:")
    print("   - Comunicacion async entre agentes")
    print("   - Contexto de conversacion persistente")
    print("   - Reconocimiento automatico de conexiones")
    print("   - Respuestas inmediatas sin errores de loop")
    print("")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"
    )