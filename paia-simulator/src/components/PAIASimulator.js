import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Controls,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import StatsPanel from './StatsPanel';
import DecisionsPanel from './DecisionsPanel';
import LogPanel from './LogPanel';
import GuideModal from './GuideModal';
import ActorNode from './ActorNode';
import TelegramNode from './TelegramNode';
import CalendarNode from './CalendarNode';
import ConnectionNode from './ConnectionNode';
import CreateAgentModal from './CreateAgentModal';
import ChatModal from './ChatModal';
import UserHeader from './UserHeader';
import ConfigureCalendarModal from './ConfigureCalendarModal';
import ConnectUserModal from './ConnectUserModal';
import SaveFlowModal from './SaveFlowModal';
import FriendsPanel from './FriendsPanel';
import { useSession } from 'next-auth/react';
import usePAIABackend from '@/hooks/usePAIABackend';
import { generateMockResponse } from '@/utils/mockResponses';
import PAIAApi from '@/utils/api';

// Los node types se definirán dentro del componente para pasar props

const initialNodes = [];
const initialEdges = [];

// Colores para agentes basados en personalidad
const personalityColors = {
  'Analítico': '#023e7d',     // Azul
  'Creativo': '#049a8f',      // Morado
  'Empático': '#b9375e',      // Verde
  'Pragmático': '#4a2419',    // Naranja
  'Entusiasta': '#dbb42c',    // Rosa
  'Metódico': '#932f6d',      // Cyan
  'Innovador': '#4c956c',     // Lima
  'Colaborativo': '#f4a259',  // Orange
  'Estratégico': '#564592',   // Rojo coral
  'Aventurero': '#e76f51',    // Turquesa
  'Reflexivo': '#6a994e',     // Verde menta
  'Dinámico': '#c32f27',      // Rosa salmón
  'default': '#6366f1'        // Indigo por defecto
};

const getAgentColor = (personality) => {
  if (!personality) return personalityColors['default'];
  const key = personality.trim();
  return personalityColors[key] || personalityColors['default'];
};

export default function PAIASimulator({ initialFlow }) {
  const { data: session } = useSession();
  const [nodes, setNodes] = useState(() => {
    if (initialFlow && initialFlow.flow_data) {
      try {
        const flowData = JSON.parse(initialFlow.flow_data);
        return flowData.nodes || initialNodes;
      } catch (err) {
        console.error('Error parsing flow data:', err);
        return initialNodes;
      }
    }
    return initialNodes;
  });
  const [edges, setEdges] = useState(() => {
    if (initialFlow && initialFlow.flow_data) {
      try {
        const flowData = JSON.parse(initialFlow.flow_data);
        return flowData.edges || initialEdges;
      } catch (err) {
        console.error('Error parsing flow data:', err);
        return initialEdges;
      }
    }
    return initialEdges;
  });
  const [scenarioName, setScenarioName] = useState(() => initialFlow?.name || '');
  const [scenarioDesc, setScenarioDesc] = useState(() => initialFlow?.description || '');
  const [showGuide, setShowGuide] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [useBackend, setUseBackend] = useState(false);
  const [activeTelegramNodes, setActiveTelegramNodes] = useState(new Set());
  const [showConnectUserModal, setShowConnectUserModal] = useState(false);
  const [showSaveFlow, setShowSaveFlow] = useState(false);
  const [showFriendsPanel, setShowFriendsPanel] = useState(false);
  const [connectionMode, setConnectionMode] = useState('social'); // 'social' o 'flow'
  const [activeConnectionNodeId, setActiveConnectionNodeId] = useState(null);
  
  // Sistema multi-usuario - usar ID de sesión de NextAuth
  const userId = session?.user?.id || 'anonymous';
  const [publicAgents, setPublicAgents] = useState([]);
  
  // Chat states
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showConfigureCalendar, setShowConfigureCalendar] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [activeChatAgent, setActiveChatAgent] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Historial de mensajes por nodo (nodeId -> mensajes[])
  const [nodeMessageHistory, setNodeMessageHistory] = useState({});
  
  const [logMessages, setLogMessages] = useState([]);
  const [stats, setStats] = useState({
    responseTime: 0,
    queriesProcessed: 0,
    status: 'En espera...'
  });
  const [decisions, setDecisions] = useState([
    { id: 1, sender: 'Sistema', message: 'Listo para simular', isSystem: true }
  ]);

  const actorIdRef = useRef(1);
  const simulationRef = useRef(null);

  // Backend integration
  const { 
    isConnected, 
    loading, 
    simulateWithBackend, 
    clearBackendData,
    checkBackendConnection,
    createBackendAgent
  } = usePAIABackend();

  useEffect(() => {
    setTimeout(() => setShowGuide(true), 1000);
  }, []);

  useEffect(() => {
    const connectionStatus = isConnected ? 
      '🟢 Backend PAIA conectado' : 
      '🔴 Backend PAIA desconectado';
    
    setDecisions(prev => [
      { id: Date.now(), sender: 'Sistema', message: connectionStatus, isSystem: true },
      ...prev.slice(0, 9)
    ]);
  }, [isConnected]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const addLogMessage = useCallback((message) => {
    setLogMessages(prev => [...prev, message]);
  }, []);

  const addDecisionMessage = useCallback((sender, message, isSystem = false) => {
    setDecisions(prev => [
      { id: Date.now(), sender, message, isSystem },
      ...prev.slice(0, 9)
    ]);
  }, []);

  // Función para agregar mensaje al historial de un nodo específico
  const addMessageToNodeHistory = useCallback((nodeId, message) => {
    setNodeMessageHistory(prev => ({
      ...prev,
      [nodeId]: [
        ...(prev[nodeId] || []),
        {
          ...message,
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    }));
  }, []);

  const onConnect = useCallback(
    async (params) => {
      const edge = {
        ...params,
        type: 'straight',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(edge, eds));

      // Si el backend está conectado, crear la conexión también en el backend
      if (isConnected && useBackend) {
        try {
          const sourceNode = nodes.find(n => n.id === params.source);
          const targetNode = nodes.find(n => n.id === params.target);
          
          // Solo conectar si ambos nodos tienen backendId (fueron creados en el backend)
          if (sourceNode?.data?.backendId && targetNode?.data?.backendId) {
            await PAIAApi.createConnection({
              agent1: sourceNode.data.backendId,
              agent2: targetNode.data.backendId,
              type: 'direct'
            });
            
            addLogMessage(`🔗 Conexión creada en backend: ${sourceNode.data.label} → ${targetNode.data.label}`);
            addDecisionMessage('Sistema', `Conexión backend establecida entre ${sourceNode.data.label} y ${targetNode.data.label}`, true);
          }
        } catch (error) {
          console.error('Error creating backend connection:', error);
          addLogMessage(`❌ Error creando conexión en backend: ${error.message}`);
        }
      }
    },
    [isConnected, useBackend, nodes, addLogMessage, addDecisionMessage]
  );

  const addActor = useCallback(async (type, name = null, x = null, y = null) => {
    const id = `actor-${actorIdRef.current}`;
    const actorName = name || `${type === 'human' ? 'Humano' : 'IA'} ${actorIdRef.current}`;
    
    const agentColor = type === 'ai' ? getAgentColor(null) : undefined;
    
    const newNode = {
      id,
      type: 'actor',
      position: { 
        x: x ?? (100 + actorIdRef.current * 60), 
        y: y ?? (100 + actorIdRef.current * 30) 
      },
      data: { 
        label: actorName,
        actorType: type,
        emoji: type === 'human' ? '👤' : '🤖',
        agentColor: agentColor,
        // Mensaje personalizado para nodos humanos
        customMessage: type === 'human' ? 'Hola, necesito tu ayuda con una tarea.' : undefined
      },
      className: `react-flow__node-${type}`,
      style: type === 'ai' ? {
        background: agentColor,
        borderColor: agentColor
      } : undefined
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;

    // Si es un agente IA y el backend está disponible, crear el agente en el backend
    if (type === 'ai' && isConnected) {
      try {
        const agentData = {
          id: id,
          name: actorName,
          personality: "Eres un asistente útil y eficiente.",
          expertise: "General",
          use_mcp: true,
          is_public: false
        };
        
        await createBackendAgent(agentData);
        addLogMessage(`🤖 Agente ${actorName} creado en el backend`);
      } catch (error) {
        console.error('Error creating backend agent:', error);
        addLogMessage(`⚠️ Agente ${actorName} creado solo en frontend`);
      }
    }
  }, [isConnected, createBackendAgent, addLogMessage]);

  const createConfiguredAgent = useCallback(async (agentConfig) => {
    const id = `agent-${actorIdRef.current}`;
    
    if (agentConfig.isNotesNode) {
      agentConfig.expertise = 'notes';
      agentConfig.is_capability_node = true;
    }

    // Crear en el backend si está disponible
    let backendAgent = null;
    if (isConnected) {
      try {
        // Incluir userId en la configuración del agente
        const agentDataWithUser = {
          ...agentConfig,
          user_id: userId,
          is_public: agentConfig.is_public !== undefined ? agentConfig.is_public : true
        };
        
        backendAgent = await PAIAApi.createAgent(agentDataWithUser);
        addLogMessage(`✅ Agente PAIA creado en backend: ${agentConfig.name}`);
        addDecisionMessage('Sistema', `Agente ${agentConfig.name} configurado con ${agentConfig.personality} y expertise en ${agentConfig.expertise}`, true);
      } catch (error) {
        console.error('Error creating backend agent:', error);
        addLogMessage(`⚠️ Error al crear agente en backend, usando configuración local`);
      }
    }
    
    const agentColor = getAgentColor(agentConfig.personality);
    
    const newNode = {
      id: backendAgent?.id || id,
      type: 'actor',
      position: { 
        x: 100 + actorIdRef.current * 60, 
        y: 100 + actorIdRef.current * 30 
      },
      data: { 
        label: agentConfig.name,
        actorType: 'ai',
        emoji: agentConfig.isNotesNode ? '📒' : '🤖',
        personality: agentConfig.personality,
        expertise: agentConfig.expertise,
        description: agentConfig.description,
        backendId: backendAgent?.id,
        isConfigured: true,
        agentColor: agentColor,
        isCapabilityNode: agentConfig.is_capability_node
      },
      className: agentConfig.isNotesNode ? 'react-flow__node-capability' : 'react-flow__node-ai',
      style: {
        background: agentColor,
        borderColor: agentColor
      }
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
  }, [isConnected, addLogMessage, addDecisionMessage, userId]);

  // Función para agregar nodo de Telegram
  const addTelegramNode = useCallback((x = null, y = null) => {
    const id = `telegram-${actorIdRef.current}`;
    
    const newNode = {
      id,
      type: 'telegram',
      position: { 
        x: x ?? (100 + actorIdRef.current * 60), 
        y: y ?? (100 + actorIdRef.current * 30) 
      },
      data: { 
        label: 'Telegram',
        nodeType: 'telegram',
        isConfigured: false,
        isActive: false,
        botToken: null,
        chatId: null
      },
      className: 'react-flow__node-telegram'
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
    addLogMessage(`📱 Nodo Telegram agregado`);
  }, [addLogMessage]);

  // Función para manejar click en ConnectionNode
  const handleConnectionNodeClick = useCallback((nodeData, nodeId) => {
    switch (nodeData.connectionType) {
      case 'user':
        setConnectionMode('flow');
        setActiveConnectionNodeId(nodeId);
        setShowConnectUserModal(true);
        addLogMessage('⚡ Abriendo búsqueda de usuarios para conexión de flujo...');
        break;
      case 'notification':
        addLogMessage('📢 Configurando sistema de notificaciones...');
        // TODO: Implementar panel de notificaciones
        break;
      default:
        addLogMessage(`🔗 Conexión tipo: ${nodeData.connectionType}`);
    }
  }, [addLogMessage]);

  // Función para agregar nodo de Conexión
  const addConnectionNode = useCallback((connectionType = 'user') => {
    const newNode = {
      id: `connection-${actorIdRef.current}`,
      type: 'connection',
      position: { x: 300 + Math.random() * 200, y: 300 + Math.random() * 200 },
      data: {
        label: connectionType === 'user' ? 'Conexión de Flujo' : 'Conexión',
        connectionType: connectionType,
        status: 'offline',
        isConnected: false,
        unreadNotifications: 0,
        onConnectionClick: handleConnectionNodeClick
      },
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
    addLogMessage(`🔗 Nodo de ${connectionType === 'user' ? 'búsqueda de usuarios' : 'conexión'} agregado`);
  }, [addLogMessage, handleConnectionNodeClick]);

  // Función para abrir modal de conexión social (desde LeftSidebar)
  const openSocialConnectionModal = useCallback(() => {
    setConnectionMode('social');
    setActiveConnectionNodeId(null);
    setShowConnectUserModal(true);
    addLogMessage('👥 Buscando usuarios para conexión social...');
  }, [addLogMessage]);

  // Función para guardar flujo
  const saveFlow = useCallback(async (flowData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
          name: flowData.name,
          description: flowData.description,
          is_public: flowData.is_public,
          tags: flowData.tags,
          flow_data: {
            nodes: nodes,
            edges: edges,
            scenario: {
              name: scenarioName,
              description: scenarioDesc
            }
          },
          metadata: {
            node_count: nodes.length,
            edge_count: edges.length,
            created_from: 'simulator'
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error guardando el flujo');
      }

      const result = await response.json();
      addLogMessage(`💾 Flujo '${flowData.name}' guardado exitosamente`);
      addDecisionMessage('Sistema', `Flujo guardado con ID: ${result.flow_id}`, true);
      
      return result;
    } catch (error) {
      addLogMessage(`❌ Error guardando flujo: ${error.message}`);
      throw error;
    }
  }, [userId, nodes, edges, scenarioName, scenarioDesc, addLogMessage, addDecisionMessage]);

  // Función para mostrar configuración de Calendar
  const addCalendarNode = useCallback(() => {
    setShowConfigureCalendar(true);
  }, []);

  // Función para crear nodo Calendar configurado
  const createConfiguredCalendar = useCallback((calendarConfig, x = null, y = null) => {
    const id = `calendar-${actorIdRef.current}`;
    
    const newNode = {
      id,
      type: 'calendar',
      position: { 
        x: x ?? (100 + actorIdRef.current * 60), 
        y: y ?? (100 + actorIdRef.current * 30) 
      },
      data: { 
        label: calendarConfig.name || 'Google Calendar',
        nodeType: 'calendar',
        isAuthenticated: calendarConfig.isAuthenticated,
        userEmail: calendarConfig.userEmail,
        type: 'calendar'
      },
      className: 'react-flow__node-calendar'
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
    addLogMessage(`📅 Nodo ${calendarConfig.name} agregado y configurado`);
  }, [addLogMessage]);

  // Función para manejar solicitud de autenticación del calendario
  const handleCalendarAuthRequest = useCallback(async (nodeData) => {
    try {
      addLogMessage(`🔐 Solicitando autenticación para Google Calendar...`);
      
      // Llamar al MCP para obtener URL de autenticación
      const response = await fetch('/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: 'get-auth-url',
          args: { userId: userId }
        })
      });

      if (response.ok) {
        const result = await response.json();
        const authUrlMatch = result.content?.[0]?.text?.match(/URL de autenticación: (.+)/);
        
        if (authUrlMatch) {
          const authUrl = authUrlMatch[1];
          addLogMessage(`🔗 Abriendo ventana de autenticación de Google...`);
          
          // Abrir ventana de autenticación
          window.open(authUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');
          
          // TODO: Implementar listener para cuando se complete la autenticación
          // Por ahora, mostrar mensaje informativo
          addLogMessage(`ℹ️ Complete la autenticación en la ventana emergente. El nodo se actualizará automáticamente.`);
        } else {
          addLogMessage(`❌ Error obteniendo URL de autenticación`);
        }
      } else {
        addLogMessage(`❌ Error conectando con el servicio de autenticación`);
      }
    } catch (error) {
      console.error('Error requesting calendar auth:', error);
      addLogMessage(`❌ Error solicitando autenticación: ${error.message}`);
    }
  }, [userId, addLogMessage]);

  // Función para manejar cuando se establece una conexión con usuario
  const handleUserConnection = useCallback((connectionData) => {
    if (connectionData.mode === 'flow') {
      // Conexión de flujo creada con un agente específico
      addLogMessage(`⚡ Conexión de flujo establecida con el agente ${connectionData.agent.name}`);
      addDecisionMessage('Sistema', `Flujo conectado al agente ${connectionData.agent.name}`, true);
      
      // Actualizar el ConnectionNode correspondiente
      setNodes(currentNodes => 
        currentNodes.map(node => 
          node.id === connectionData.connectionNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  isConnected: true,
                  status: 'online',
                  label: `Conectado a ${connectionData.agent.name}`,
                  connectedAgent: connectionData.agent, // Guardamos el agente completo
                  flowConnectionId: connectionData.flowConnectionId
                }
              }
            : node
        )
      );
    } else {
      // Conexión social (comportamiento original)
      addLogMessage(`✅ Solicitud enviada a ${connectionData.user.name} (${connectionData.user.email})`);
      addDecisionMessage('Sistema', `Solicitud de conexión enviada a ${connectionData.user.name}`, true);
    }
  }, [addLogMessage, addDecisionMessage]);

  // Función para cargar agentes públicos de otros usuarios
  const loadPublicAgents = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const agents = await PAIAApi.getPublicAgents(userId);
      setPublicAgents(agents);
      addLogMessage(`📡 Cargados ${agents.length} agentes públicos disponibles`);
    } catch (error) {
      console.error('Error loading public agents:', error);
      addLogMessage(`❌ Error cargando agentes públicos: ${error.message}`);
    }
  }, [isConnected, userId, addLogMessage]);

  // Función para agregar un agente público externo al canvas
  const addPublicAgentToCanvas = useCallback((publicAgent) => {
    const existingNode = nodes.find(n => n.data.backendId === publicAgent.id);
    if (existingNode) {
      addLogMessage(`⚠️ El agente ${publicAgent.name} ya está en el canvas`);
      return;
    }

    const agentColor = getAgentColor(publicAgent.personality);
    
    const newNode = {
      id: `external-${publicAgent.id}`,
      type: 'actor',
      position: { 
        x: 100 + actorIdRef.current * 60, 
        y: 100 + actorIdRef.current * 30 
      },
      data: { 
        label: publicAgent.name,
        actorType: 'ai',
        emoji: '🌐', // Emoji diferente para agentes externos
        personality: publicAgent.personality,
        expertise: publicAgent.expertise,
        description: publicAgent.description,
        backendId: publicAgent.id,
        isConfigured: true,
        isExternal: true, // Marcar como agente externo
        originalUserId: publicAgent.user_id,
        agentColor: agentColor
      },
      className: 'react-flow__node-ai',
      style: {
        background: agentColor,
        borderColor: agentColor,
        border: '2px dashed', // Estilo diferente para agentes externos
        opacity: 0.8
      }
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
    addLogMessage(`🌐 Agente externo agregado: ${publicAgent.name} (creado por ${publicAgent.user_id})`);
  }, [nodes, addLogMessage]);

  const startChat = useCallback((agentId) => {
    const agent = nodes.find(n => n.id === agentId);
    if (!agent) return;

    setActiveChatAgent(agentId);
    setShowChat(true);
    
    // Cargar historial de mensajes del nodo
    const nodeHistory = nodeMessageHistory[agentId] || [];
    
    if (agent.data.actorType === 'human') {
      // Para humanos: mostrar configuración + historial de mensajes recibidos
      const systemMessage = {
        sender: 'system',
        content: `Configurando ${agent.data.label}. Escribe el mensaje que este humano enviará durante la simulación. Mensaje actual: "${agent.data.customMessage || 'Sin mensaje configurado'}"`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages([systemMessage, ...nodeHistory]);
    } else {
      // Para IAs: mostrar historial normal
      setChatMessages(nodeHistory);
    }
  }, [nodes, nodeMessageHistory]);

  // Función para actualizar mensaje personalizado de nodos humanos
  const updateHumanMessage = useCallback((nodeId, newMessage) => {
    setNodes(currentNodes => 
      currentNodes.map(node => 
        node.id === nodeId && node.data.actorType === 'human'
          ? {
              ...node,
              data: {
                ...node.data,
                customMessage: newMessage
              }
            }
          : node
      )
    );
    addLogMessage(`📝 Mensaje actualizado para ${nodes.find(n => n.id === nodeId)?.data.label}: "${newMessage}"`);
  }, [nodes, addLogMessage]);

  const sendChatMessage = useCallback(async (message) => {
    if (!activeChatAgent) return;

    const agent = nodes.find(n => n.id === activeChatAgent);
    if (!agent) return;

    // Si es un actor humano, configurar su mensaje personalizado
    if (agent.data.actorType === 'human') {
      // Actualizar el mensaje personalizado del nodo
      updateHumanMessage(activeChatAgent, message);
      
      const humanMessage = {
        sender: 'human',
        content: `Mensaje configurado: "${message}"`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      const confirmMessage = {
        sender: 'system',
        content: `✅ Mensaje configurado para ${agent.data.label}. Durante la simulación, este humano dirá: "${message}"`,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatMessages(prev => [...prev, humanMessage, confirmMessage]);
      
      // Agregar al historial del nodo
      addMessageToNodeHistory(activeChatAgent, humanMessage);
      addMessageToNodeHistory(activeChatAgent, confirmMessage);
      
      addDecisionMessage(agent.data.label, `Mensaje configurado: "${message.slice(0, 30)}..."`, false);
      return;
    }

    // Para agentes IA, funcionalidad original
    const userMessage = {
      sender: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Simular delay de respuesta
    setTimeout(async () => {
      let agentResponse = '';

      // Intentar respuesta del backend si está disponible
      if (useBackend && isConnected && agent.data.backendId) {
        try {
          const response = await PAIAApi.sendMessage(agent.data.backendId, message);
          agentResponse = response.response;
          addDecisionMessage(agent.data.label, `Procesé la consulta: "${message.slice(0, 30)}..."`, false);
        } catch (error) {
          console.error('Error sending message to backend:', error);
          agentResponse = generateMockResponse(agent.data, message);
        }
      } else {
        // Respuesta mock
        agentResponse = generateMockResponse(agent.data, message);
      }

      const aiMessage = {
        sender: 'agent',
        content: agentResponse,
        timestamp: new Date().toLocaleTimeString()
      };

      setChatMessages(prev => [...prev, aiMessage]);
      
      // Agregar mensajes al historial del nodo
      addMessageToNodeHistory(activeChatAgent, userMessage);
      addMessageToNodeHistory(activeChatAgent, aiMessage);
      
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
  }, [activeChatAgent, nodes, useBackend, isConnected, addDecisionMessage, addMessageToNodeHistory, updateHumanMessage]);

  const closeChat = useCallback(() => {
    setShowChat(false);
    setActiveChatAgent(null);
    setChatMessages([]);
    setIsTyping(false);
  }, []);

  const loadPresetScenario = useCallback((scenarioType) => {
    const scenarios = {
      trash: {
        name: "Basura",
        description: "La esposa le pide a la IA del esposo que le recuerde sacar la basura al terminar su junta.",
        actors: [
          { id: "h1", name: "Esposa", type: "human", position: { x: 100, y: 100 } },
          { id: "h2", name: "Juan", type: "human", position: { x: 400, y: 100 } },
          { id: "ai1", name: "PAIA de Juan", type: "ai", position: { x: 250, y: 200 } }
        ],
        interactions: [
          { source: "h1", target: "ai1" },
          { source: "ai1", target: "h2" }
        ]
      },
      calendar: {
        name: "Calendario",
        description: "El asistente agenda una reunión y manda un recordatorio al usuario.",
        actors: [
          { id: "h1", name: "Usuario", type: "human", position: { x: 100, y: 120 } },
          { id: "ai1", name: "PAIA del Usuario", type: "ai", position: { x: 300, y: 120 } }
        ],
        interactions: [
          { source: "ai1", target: "h1" }
        ]
      },
      party: {
        name: "Cancelar fiesta",
        description: "Una persona con COVID-19 usa su PAIA para cancelar una fiesta programada.",
        actors: [
          { id: "h1", name: "Anfitrión", type: "human", position: { x: 100, y: 120 } },
          { id: "ai1", name: "PAIA del Anfitrión", type: "ai", position: { x: 300, y: 120 } },
          { id: "h2", name: "Invitado", type: "human", position: { x: 500, y: 120 } }
        ],
        interactions: [
          { source: "h1", target: "ai1" },
          { source: "ai1", target: "h2" }
        ]
      }
    };

    const scenario = scenarios[scenarioType];
    if (!scenario) return;

    setScenarioName(scenario.name);
    setScenarioDesc(scenario.description);
    setNodes([]);
    setEdges([]);
    actorIdRef.current = 1;

    scenario.actors.forEach(actor => {
      const newNode = {
        id: actor.id,
        type: 'actor',
        position: actor.position,
        data: { 
          label: actor.name,
          actorType: actor.type,
          emoji: actor.type === 'human' ? '👤' : '🤖'
        },
        className: `react-flow__node-${actor.type}`,
      };
      setNodes((nds) => [...nds, newNode]);
    });

    scenario.interactions.forEach(interaction => {
      const edge = {
        id: `${interaction.source}-${interaction.target}`,
        source: interaction.source,
        target: interaction.target,
        type: 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => [...eds, edge]);
    });
  }, []);

  const exportScenario = useCallback(() => {
    const scenario = {
      name: scenarioName,
      description: scenarioDesc,
      actors: nodes.map(node => ({
        id: node.id,
        name: node.data.label,
        type: node.data.actorType,
        position: node.position
      })),
      interactions: edges.map(edge => ({
        source: edge.source,
        target: edge.target
      }))
    };

    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scenario.name || 'paia_scenario'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [scenarioName, scenarioDesc, nodes, edges]);

  const importScenario = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const content = JSON.parse(e.target.result);
        setNodes([]);
        setEdges([]);
        actorIdRef.current = 1;
        
        setScenarioName(content.name || '');
        setScenarioDesc(content.description || '');
        
        content.actors.forEach(actor => {
          const newNode = {
            id: actor.id,
            type: 'actor',
            position: actor.position,
            data: { 
              label: actor.name,
              actorType: actor.type,
              emoji: actor.type === 'human' ? '👤' : '🤖'
            },
            className: `react-flow__node-${actor.type}`,
          };
          setNodes((nds) => [...nds, newNode]);
        });
        
        content.interactions.forEach(interaction => {
          const edge = {
            id: `${interaction.source}-${interaction.target}`,
            source: interaction.source,
            target: interaction.target,
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          };
          setEdges((eds) => [...eds, edge]);
        });
      } catch (error) {
        alert('Error al importar el archivo: ' + error.message);
      }
    };
    reader.readAsText(file);
  }, []);

  // Función para animar un edge específico
  const animateEdge = useCallback((edgeId, duration = 2000) => {
    setEdges(eds => eds.map(edge => 
      edge.id === edgeId 
        ? { ...edge, animated: true, style: { stroke: 'var(--primary-color)', strokeWidth: 3 } }
        : edge
    ));
    
    setTimeout(() => {
      setEdges(eds => eds.map(edge => 
        edge.id === edgeId 
          ? { ...edge, animated: false, style: undefined }
          : edge
      ));
    }, duration);
  }, []);

  // Función para ejecutar el flujo
  const runFlow = useCallback(async () => {
    if (nodes.length === 0 || edges.length === 0) {
      addLogMessage('❌ Necesitas tener al menos dos actores conectados para ejecutar el flujo');
      return;
    }

    // Verificar si hay nodos de Telegram y activarlos
    const telegramNodes = nodes.filter(n => n.type === 'telegram');
    const hasActiveTelegram = telegramNodes.some(n => n.data.isActive);

    if (telegramNodes.length > 0 && !hasActiveTelegram) {
      // Activar todos los nodos de Telegram configurados
      const updatedNodes = nodes.map(node => {
        if (node.type === 'telegram' && node.data.isConfigured) {
          return {
            ...node,
            data: { ...node.data, isActive: true }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
      
      // Agregar nodos de Telegram activos al estado
      const telegramIds = telegramNodes.filter(n => n.data.isConfigured).map(n => n.id);
      setActiveTelegramNodes(new Set(telegramIds));
      
      setIsRunning(true);
      addLogMessage('🚀 Flujo ejecutándose - Telegram activo y conectado...');
      return; // No ejecutar simulación tradicional si hay Telegram
    }

    // Flujo tradicional (sin Telegram)
    setIsRunning(true);
    addLogMessage('🚀 Ejecutando flujo...');
    
    if (useBackend && isConnected) {
      // Usar simulación con backend
      const success = await simulateWithBackend(nodes, edges, addLogMessage, addDecisionMessage);
      if (success) {
        // Animar edges durante la simulación
        for (const edge of edges) {
          animateEdge(edge.id, 3000);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } else {
      // Simulación local con animaciones
      for (const edge of edges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          animateEdge(edge.id, 2000);
          
          // Determinar el mensaje basado en el tipo de nodo fuente
          let messageContent = '';
          if (sourceNode.data.actorType === 'human') {
            // Usar mensaje personalizado del humano
            messageContent = sourceNode.data.customMessage || 'Sin mensaje configurado';
            addLogMessage(`👤→🤖 ${sourceNode.data.label}: "${messageContent}"`);
          } else {
            // Mensaje de IA a humano o IA
            messageContent = `Hola ${targetNode.data.label}, colaboremos en esta tarea.`;
            addLogMessage(`🤖→${targetNode.data.actorType === 'human' ? '👤' : '🤖'} ${sourceNode.data.label}: "${messageContent}"`);
          }
          
          // Manejar diferentes tipos de nodos destino
          if (targetNode.type === 'connection') {
            // ConnectionNode - enrutar a agente externo
            if (targetNode.data.isConnected && targetNode.data.connectedAgent) {
              const targetAgent = targetNode.data.connectedAgent;
              addLogMessage(`🌐→ ${sourceNode.data.label} intenta comunicarse con ${targetAgent.name} a través de un nodo de conexión.`);
              
              if (useBackend && isConnected && sourceNode.data.backendId) {
                // Construir el prompt para que el agente de origen use la herramienta
                const intelligentPrompt = `Usa la herramienta 'ask_connected_agent' para enviar la siguiente pregunta al agente con ID '${targetAgent.id}': "${messageContent}"`;
                
                addLogMessage(`🤖 Prompt para ${sourceNode.data.label}: "${intelligentPrompt}"`);
                addDecisionMessage(sourceNode.data.label, `Preparando para preguntar a ${targetAgent.name}...`, false);

                try {
                  // Enviar el prompt al agente de origen para que ejecute la herramienta
                  const response = await PAIAApi.sendMessage(sourceNode.data.backendId, intelligentPrompt);
                  
                  // La respuesta del backend será la respuesta del agente consultado
                  const agentResponse = response.response;
                  
                  addLogMessage(`✅ Respuesta de ${targetAgent.name}: "${agentResponse}"`);
                  addDecisionMessage(targetAgent.name, agentResponse, false);

                  // Agregar al historial de ambos nodos
                  addMessageToNodeHistory(sourceNode.id, {
                    sender: 'agent',
                    content: `Pregunta enviada a ${targetAgent.name}: "${messageContent}"`
                  });
                   addMessageToNodeHistory(targetNode.id, {
                    sender: 'received',
                    content: `Pregunta de ${sourceNode.data.label}: "${messageContent}"`,
                    from: sourceNode.data.label
                  });
                  addMessageToNodeHistory(targetNode.id, {
                    sender: 'agent',
                    content: agentResponse
                  });

                } catch (error) {
                  const errorMsg = `❌ Error en la comunicación agente-a-agente: ${error.message}`;
                  addLogMessage(errorMsg);
                  addDecisionMessage('Sistema', errorMsg, true);
                }
              } else {
                 addLogMessage(`⚠️ La comunicación agente-a-agente requiere que el backend esté activo y que el agente de origen (${sourceNode.data.label}) exista en el backend.`);
              }
            } else {
              addLogMessage(`⚠️ Nodo de conexión '${targetNode.data.label}' no está configurado o conectado a un agente específico.`);
            }
          } else if (targetNode.data.actorType === 'ai') {
            // Generar respuesta si el target es IA
            const response = generateMockResponse(targetNode.data, messageContent);
            addLogMessage(`🤖→${sourceNode.data.actorType === 'human' ? '👤' : '🤖'} ${targetNode.data.label}: "${response}"`);
            addDecisionMessage(targetNode.data.label, response, false);
            
            // Agregar mensajes al historial del nodo IA
            addMessageToNodeHistory(targetNode.id, {
              sender: 'received',
              content: messageContent,
              from: sourceNode.data.label
            });
            addMessageToNodeHistory(targetNode.id, {
              sender: 'agent',
              content: response
            });
          } else {
            // Si el target es humano, agregar mensaje recibido a su historial
            addDecisionMessage(targetNode.data.label, `Recibió mensaje: "${messageContent.slice(0, 30)}..."`, false);
            
            addMessageToNodeHistory(targetNode.id, {
              sender: 'received',
              content: messageContent,
              from: sourceNode.data.label
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    }

    // Solo detener si no hay nodos de Telegram activos
    if (activeTelegramNodes.size === 0) {
      setIsRunning(false);
      addLogMessage('✅ Flujo completado');
    }
  }, [nodes, edges, useBackend, isConnected, simulateWithBackend, addLogMessage, addDecisionMessage, animateEdge, addMessageToNodeHistory, activeTelegramNodes]);

  // Función para detener el flujo
  const stopFlow = useCallback(() => {
    // Desactivar todos los nodos de Telegram
    const updatedNodes = nodes.map(node => {
      if (node.type === 'telegram') {
        return {
          ...node,
          data: { ...node.data, isActive: false }
        };
      }
      return node;
    });
    setNodes(updatedNodes);
    
    // Limpiar nodos de Telegram activos
    setActiveTelegramNodes(new Set());
    setIsRunning(false);
    addLogMessage('🛑 Flujo detenido - Telegram desconectado');
  }, [nodes, addLogMessage]);

  // Función para reiniciar
  const resetSimulation = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setLogMessages([]);
    setDecisions([{ id: 1, sender: 'Sistema', message: 'Simulación reiniciada', isSystem: true }]);
    actorIdRef.current = 1;
    setScenarioName('');
    setScenarioDesc('');
    addLogMessage('🔄 Sistema reiniciado');
  }, [addLogMessage]);

  // Definir nodeTypes con props
  const nodeTypes = useMemo(() => ({
    actor: ActorNode,
    telegram: TelegramNode,
    calendar: (props) => <CalendarNode {...props} onRequestAuth={handleCalendarAuthRequest} />,
    connection: (props) => <ConnectionNode {...props} onConnectionClick={handleConnectionNodeClick} />,
  }), [handleCalendarAuthRequest, handleConnectionNodeClick]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <UserHeader />
      <div style={{ width: '100%', height: '100%', display: 'flex', paddingTop: '60px' }}>
      <LeftSidebar
        scenarioName={scenarioName}
        setScenarioName={setScenarioName}
        scenarioDesc={scenarioDesc}
        setScenarioDesc={setScenarioDesc}
        onPresetChange={loadPresetScenario}
        onImport={importScenario}
        onExport={exportScenario}
        onRun={runFlow}
        onStop={stopFlow}
        onReset={resetSimulation}
        isRunning={isRunning}
        onShowGuide={() => setShowGuide(true)}
        useBackend={useBackend}
        setUseBackend={setUseBackend}
        isBackendConnected={isConnected}
        onCheckBackend={checkBackendConnection}
        onAddConnectionNode={addConnectionNode}
        onConnectUser={openSocialConnectionModal}
        onSaveFlow={() => setShowSaveFlow(true)}
        onShowFriends={() => setShowFriendsPanel(true)}
      />
      
      <div style={{ flex: 1, margin: '0 280px', position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Controls />
        </ReactFlow>
      </div>

      <RightSidebar
        onAddActor={addActor}
        onAddTelegram={addTelegramNode}
        onAddCalendar={addCalendarNode}
        onConnect={() => {}} // Connect functionality handled by ReactFlow
        onCreateAgent={() => setShowCreateAgent(true)}
        onChatWithAgent={startChat}
        nodes={nodes}
        publicAgents={publicAgents}
        onLoadPublicAgents={loadPublicAgents}
        onAddPublicAgent={addPublicAgentToCanvas}
        isBackendConnected={isConnected}
      />

      <StatsPanel stats={stats} />
      
      <LogPanel messages={logMessages} />

      {showGuide && (
        <GuideModal onClose={() => setShowGuide(false)} />
      )}

      {showCreateAgent && (
        <CreateAgentModal
          isOpen={showCreateAgent}
          onClose={() => setShowCreateAgent(false)}
          onCreateAgent={createConfiguredAgent}
        />
      )}

      {showConfigureCalendar && (
        <ConfigureCalendarModal
          isOpen={showConfigureCalendar}
          onClose={() => setShowConfigureCalendar(false)}
          onConfigureCalendar={createConfiguredCalendar}
        />
      )}

      {showChat && (
        <ChatModal
          isOpen={showChat}
          onClose={closeChat}
          activeAgent={activeChatAgent}
          nodes={nodes}
          onSendMessage={sendChatMessage}
          chatMessages={chatMessages}
          isTyping={isTyping}
        />
      )}

      {showConnectUserModal && (
        <ConnectUserModal
          isOpen={showConnectUserModal}
          onClose={() => {
            setShowConnectUserModal(false);
            setConnectionMode('social');
            setActiveConnectionNodeId(null);
          }}
          currentUserId={userId}
          onConnect={handleUserConnection}
          connectionMode={connectionMode}
          connectionNodeId={activeConnectionNodeId}
        />
      )}

      {showSaveFlow && (
        <SaveFlowModal
          isOpen={showSaveFlow}
          onClose={() => setShowSaveFlow(false)}
          onSave={saveFlow}
        />
      )}

      {showFriendsPanel && (
        <FriendsPanel 
          isOpen={showFriendsPanel} 
          onClose={() => setShowFriendsPanel(false)} 
          userId={userId} 
        />
      )}
      </div>
    </div>
  );
}