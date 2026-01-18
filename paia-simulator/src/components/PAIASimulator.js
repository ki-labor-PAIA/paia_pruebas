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
import RightSidebar from './RightSidebarV2';
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
import AgentConversationModal from './AgentConversationModal';
import { useSession } from 'next-auth/react';
import usePAIABackend from '@/hooks/usePAIABackend';
import useFlowSave from '@/hooks/useFlowSave';
import { generateMockResponse } from '@/utils/mockResponses';
import PAIAApi from '@/utils/api';
import { t } from 'i18next';
import {
  getAgentColorFromId,
  generateMeetingConversation,
  simulateConversation,
  detectAgentCommunicationRequest
} from '@/utils/agentConversationDemo';
import {
  initialNodes,
  initialEdges,
  personalityColors,
  getAgentColor
} from './PAIASimulator/constants';
import useMessageSystem from '@/hooks/useMessageSystem';
import useNodeManagement from '@/hooks/useNodeManagement';
import useFlowExecution from '@/hooks/useFlowExecution';

// Los node types se definirán dentro del componente para pasar props

export default function PAIASimulator({ initialFlow }) {
  const { data: session } = useSession();

  // Message system hook
  const {
    logMessages,
    decisions,
    nodeMessageHistory,
    addLogMessage,
    addDecisionMessage,
    addMessageToNodeHistory
  } = useMessageSystem();
  const [nodes, setNodes] = useState(() => {
    if (initialFlow && initialFlow.flow_data) {
      try {
        const flowData = typeof initialFlow.flow_data === 'string'
          ? JSON.parse(initialFlow.flow_data)
          : initialFlow.flow_data;
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
        const flowData = typeof initialFlow.flow_data === 'string'
          ? JSON.parse(initialFlow.flow_data)
          : initialFlow.flow_data;
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
  const [useBackend, setUseBackend] = useState(true); // Cambiado a false para modo offline
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

  const [stats, setStats] = useState({
    responseTime: 0,
    queriesProcessed: 0,
    status: 'En espera...'
  });

  // Estados para conversación entre agentes
  const [showAgentConversation, setShowAgentConversation] = useState(false);
  const [agentConversationMessages, setAgentConversationMessages] = useState([]);
  const [conversationSourceAgent, setConversationSourceAgent] = useState(null);
  const [conversationTargetAgent, setConversationTargetAgent] = useState(null);
  const [isConversationActive, setIsConversationActive] = useState(false);

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

  // Node management hook
  const {
    addActor,
    createConfiguredAgent,
    addTelegramNode,
    addConnectionNode,
    addCalendarNode,
    createConfiguredCalendar,
    handleCalendarAuthRequest,
    handleUserConnection,
    handleConnectionNodeClick,
    loadPublicAgents,
    loadMyAgents,
    addPublicAgentToCanvas,
    openSocialConnectionModal,
    actorIdRef
  } = useNodeManagement({
    nodes,
    setNodes,
    isConnected,
    userId,
    addLogMessage,
    addDecisionMessage,
    setPublicAgents,
    setConnectionMode,
    setActiveConnectionNodeId,
    setShowConnectUserModal,
    setShowConfigureCalendar,
    createBackendAgent
  });

  // Comentado para no mostrar la guía automáticamente
  // useEffect(() => {
  //   setTimeout(() => setShowGuide(true), 1000);
  // }, []);

  // Comentado temporalmente para trabajar sin backend
  // useEffect(() => {
  //   const connectionStatus = isConnected ?
  //     '🟢 Backend PAIA conectado' :
  //     '🔴 Backend PAIA desconectado';
  //
  //   setDecisions(prev => [
  //     { id: Date.now(), sender: 'Sistema', message: connectionStatus, isSystem: true },
  //     ...prev.slice(0, 9)
  //   ]);
  // }, [isConnected]);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Hook para guardar flujos
  const { saveFlow, currentFlowId, lastSaved, autoSaveEnabled, setAutoSaveEnabled, isSaving } = useFlowSave({
    userId,
    nodes,
    edges,
    scenarioName,
    scenarioDesc,
    addLogMessage,
    addDecisionMessage,
    initialFlowId: initialFlow?.id || null
  });

  // Hook para ejecución de flujos
  const { runFlow, stopFlow, animateEdge } = useFlowExecution({
    nodes,
    edges,
    setNodes,
    setEdges,
    setIsRunning,
    setActiveTelegramNodes,
    activeTelegramNodes,
    addLogMessage,
    addDecisionMessage,
    addMessageToNodeHistory,
    useBackend,
    isConnected,
    simulateWithBackend,
    userId
  });

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

  // Función para iniciar conversación entre agentes
  const startAgentConversation = useCallback(async (sourceAgentNode, targetAgentNode, userRequest) => {
    // Cerrar el chat actual
    setShowChat(false);

    // Configurar agentes
    const sourceAgent = {
      id: sourceAgentNode.id,
      name: sourceAgentNode.data.label,
      color: getAgentColorFromId(sourceAgentNode.id)
    };

    const targetAgent = {
      id: targetAgentNode.id,
      name: targetAgentNode.data.label,
      color: getAgentColorFromId(targetAgentNode.id)
    };

    setConversationSourceAgent(sourceAgent);
    setConversationTargetAgent(targetAgent);
    setAgentConversationMessages([]);
    setShowAgentConversation(true);
    setIsConversationActive(true);

    // Generar conversación de demostración
    const demoMessages = generateMeetingConversation(sourceAgent.id, targetAgent.id);

    // Simular envío progresivo de mensajes
    await simulateConversation(
      demoMessages,
      (message) => {
        setAgentConversationMessages(prev => [...prev, message]);
      },
      2500 // 2.5 segundos entre mensajes
    );

    setIsConversationActive(false);

    // Log del evento
    addLogMessage(`🤝 Conversación completada entre ${sourceAgent.name} y ${targetAgent.name}`);
    addDecisionMessage('Sistema', `Los agentes han coordinado exitosamente`, true);
  }, [addLogMessage, addDecisionMessage, setShowChat]);

  const sendChatMessage = useCallback(async (message) => {
    console.log(' sendChatMessage llamado con:', message);
    if (!activeChatAgent) return;

    // DETECTAR SOLICITUD DE COMUNICACIÓN ENTRE AGENTES

    if (detectAgentCommunicationRequest(message)) {
      console.log('🔍 Detectada solicitud de comunicación entre agentes');

      // Buscar nodos de agente y conexión
      const agentNodes = nodes.filter(n => n.type === 'actor');
      const connectionNodes = nodes.filter(n => n.type === 'connection' && n.data.isConnected);

      console.log('📊 Agentes encontrados:', agentNodes.length);
      console.log('🔗 Nodos de conexión:', connectionNodes.length);

      if (agentNodes.length > 0 && connectionNodes.length > 0) {
        // Encontrar el agente activo en el chat
        const sourceAgent = agentNodes.find(a => a.id === activeChatAgent);

        if (!sourceAgent) {
          console.log('❌ No se encontró el agente fuente');
        } else {
          console.log('✅ Agente fuente:', sourceAgent.data.label);

          // Buscar nodo de conexión conectado a este agente mediante edges
          let connectedNode = null;
          for (const connectionNode of connectionNodes) {
            // Verificar si hay un edge entre el agente y el nodo de conexión
            const hasEdge = edges.some(edge =>
              (edge.source === sourceAgent.id && edge.target === connectionNode.id) ||
              (edge.target === sourceAgent.id && edge.source === connectionNode.id)
            );

            if (hasEdge) {
              connectedNode = connectionNode;
              console.log('✅ Nodo de conexión encontrado:', connectedNode.id);
              break;
            }
          }

          if (connectedNode && connectedNode.data.targetAgentId) {
            console.log('🎯 Target Agent ID:', connectedNode.data.targetAgentId);
            console.log('🎯 Target Agent Name:', connectedNode.data.targetAgentName);

            // Buscar el agente objetivo o crear uno temporal
            let targetAgent = agentNodes.find(a => a.id === connectedNode.data.targetAgentId);

            // Si no encontramos el agente en los nodos (es remoto), creamos uno temporal
            if (!targetAgent && connectedNode.data.targetAgentName) {
              targetAgent = {
                id: connectedNode.data.targetAgentId,
                data: { label: connectedNode.data.targetAgentName }
              };
              console.log('📝 Creado agente temporal:', targetAgent.data.label);
            }

            if (targetAgent) {
              console.log('🚀 Iniciando conversación entre agentes');
              // Iniciar conversación entre agentes
              startAgentConversation(sourceAgent, targetAgent, message);
              return; // Salir de la función sin procesar el mensaje normalmente
            } else {
              console.log('❌ No se pudo crear/encontrar el agente objetivo');
            }
          } else {
            console.log('❌ No se encontró nodo de conexión válido o no tiene targetAgentId');
          }
        }
      }
    }

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
          const response = await PAIAApi.sendMessage(agent.data.backendId, message, userId);
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
  }, [activeChatAgent, nodes, edges, useBackend, isConnected, addDecisionMessage, addMessageToNodeHistory, updateHumanMessage, startAgentConversation]);

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
    reader.onload = function (e) {
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
          onConnect={() => { }} // Connect functionality handled by ReactFlow
          onCreateAgent={() => setShowCreateAgent(true)}
          onChatWithAgent={startChat}
          nodes={nodes}
          publicAgents={publicAgents}
          onLoadPublicAgents={loadPublicAgents}
          onLoadMyAgents={loadMyAgents}
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
        {/* Modal de Conversación entre Agentes */}
        <AgentConversationModal
          isOpen={showAgentConversation}
          onClose={() => {
            setShowAgentConversation(false);
            setIsConversationActive(false);
          }}
          sourceAgent={conversationSourceAgent}
          targetAgent={conversationTargetAgent}
          messages={agentConversationMessages}
          isActive={isConversationActive}
        />
      </div>
    </div>
  );
}

