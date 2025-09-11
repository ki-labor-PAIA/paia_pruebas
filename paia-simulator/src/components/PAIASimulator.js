import { useState, useCallback, useRef, useEffect } from 'react';
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
import CreateAgentModal from './CreateAgentModal';
import ChatModal from './ChatModal';
import usePAIABackend from '@/hooks/usePAIABackend';
import { generateMockResponse } from '@/utils/mockResponses';
import PAIAApi from '@/utils/api';

const nodeTypes = {
  actor: ActorNode,
};

const initialNodes = [];
const initialEdges = [];

// Colores para agentes basados en personalidad
const personalityColors = {
  'Analítico': '#4a6bdf',     // Azul
  'Creativo': '#8b5cf6',      // Morado
  'Empático': '#10b981',      // Verde
  'Pragmático': '#f59e0b',    // Naranja
  'Entusiasta': '#ec4899',    // Rosa
  'Metódico': '#06b6d4',      // Cyan
  'Innovador': '#84cc16',     // Lima
  'Colaborativo': '#f97316',  // Orange
  'Estratégico': '#ff6b6b',   // Rojo coral
  'Aventurero': '#4ecdc4',    // Turquesa
  'Reflexivo': '#a8e6cf',     // Verde menta
  'Dinámico': '#ff8b94',      // Rosa salmón
  'default': '#6366f1'        // Indigo por defecto
};

const fallbackColors = [
  '#4a6bdf', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
  '#ff6b6b', '#4ecdc4', '#a8e6cf', '#ff8b94', '#feca57',
  '#48dbfb', '#0abde3', '#006ba6', '#ff9ff3', '#54a0ff'
];

const getAgentColor = (personality, agentIndex) => {
  if (personality && personalityColors[personality]) {
    return personalityColors[personality];
  }
  return fallbackColors[agentIndex % fallbackColors.length];
};

export default function PAIASimulator() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioDesc, setScenarioDesc] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [useBackend, setUseBackend] = useState(false);
  
  // Sistema multi-usuario
  const [userId] = useState(() => {
    // Generar ID único para esta sesión
    return `user_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  });
  const [publicAgents, setPublicAgents] = useState([]);
  
  // Chat states
  const [showCreateAgent, setShowCreateAgent] = useState(false);
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
    checkBackendConnection 
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
        type: 'smoothstep',
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

  const addActor = useCallback((type, name = null, x = null, y = null) => {
    const id = `actor-${actorIdRef.current}`;
    const actorName = name || `${type === 'human' ? 'Humano' : 'IA'} ${actorIdRef.current}`;
    
    const agentColor = type === 'ai' ? getAgentColor(null, actorIdRef.current) : undefined;
    
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
  }, []);

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
    
    const agentColor = getAgentColor(agentConfig.personality, actorIdRef.current);
    
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

    const agentColor = getAgentColor(publicAgent.personality, actorIdRef.current);
    
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
  }, [activeChatAgent, nodes, useBackend, isConnected, addDecisionMessage, addLogMessage, addMessageToNodeHistory]);

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

  // Función de simulación
  const simulateScenario = useCallback(async () => {
    if (nodes.length === 0 || edges.length === 0) {
      addLogMessage('❌ Necesitas tener al menos dos actores conectados para simular');
      return;
    }

    setIsSimulating(true);
    addLogMessage('🚀 Iniciando simulación...');
    
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
          
          // Generar respuesta si el target es IA
          if (targetNode.data.actorType === 'ai') {
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

    setIsSimulating(false);
    addLogMessage('✅ Simulación completada');
  }, [nodes, edges, useBackend, isConnected, simulateWithBackend, addLogMessage, addDecisionMessage, animateEdge, addMessageToNodeHistory]);

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

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex' }}>
      <LeftSidebar
        scenarioName={scenarioName}
        setScenarioName={setScenarioName}
        scenarioDesc={scenarioDesc}
        setScenarioDesc={setScenarioDesc}
        onPresetChange={loadPresetScenario}
        onImport={importScenario}
        onExport={exportScenario}
        onSimulate={simulateScenario}
        onReset={resetSimulation}
        isSimulating={isSimulating}
        onShowGuide={() => setShowGuide(true)}
        useBackend={useBackend}
        setUseBackend={setUseBackend}
        isBackendConnected={isConnected}
        onCheckBackend={checkBackendConnection}
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
    </div>
  );
}