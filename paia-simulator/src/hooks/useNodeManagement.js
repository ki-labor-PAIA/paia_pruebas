import { useCallback, useRef } from 'react';
import PAIAApi from '@/utils/api';
import { getAgentColor } from '@/components/PAIASimulator/constants';

const useNodeManagement = ({
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
}) => {
  const actorIdRef = useRef(1);

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
  }, [isConnected, createBackendAgent, addLogMessage, setNodes]);

  const createConfiguredAgent = useCallback(async (agentConfig) => {
    const id = `agent-${actorIdRef.current}`;

    if (agentConfig.isNotesNode) {
      agentConfig.expertise = 'notes';
      agentConfig.is_capability_node = true;
    }

    let backendAgent = null;
    if (isConnected) {
      try {
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
  }, [isConnected, addLogMessage, addDecisionMessage, userId, setNodes]);

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
  }, [addLogMessage, setNodes]);

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
        break;
      default:
        addLogMessage(`🔗 Conexión tipo: ${nodeData.connectionType}`);
    }
  }, [addLogMessage, setConnectionMode, setActiveConnectionNodeId, setShowConnectUserModal]);

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
  }, [addLogMessage, handleConnectionNodeClick, setNodes]);

  const openSocialConnectionModal = useCallback(() => {
    setConnectionMode('social');
    setActiveConnectionNodeId(null);
    setShowConnectUserModal(true);
    addLogMessage('👥 Buscando usuarios para conexión social...');
  }, [addLogMessage, setConnectionMode, setActiveConnectionNodeId, setShowConnectUserModal]);

  const addCalendarNode = useCallback(() => {
    setShowConfigureCalendar(true);
  }, [setShowConfigureCalendar]);

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
  }, [addLogMessage, setNodes]);

  const handleCalendarAuthRequest = useCallback(async (nodeData) => {
    try {
      addLogMessage(`🔐 Solicitando autenticación para Google Calendar...`);

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

          window.open(authUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');

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

  const handleUserConnection = useCallback((connectionData) => {
    if (connectionData.mode === 'flow') {
      addLogMessage(`⚡ Conexión de flujo establecida con el agente ${connectionData.agent.name}`);
      addDecisionMessage('Sistema', `Flujo conectado al agente ${connectionData.agent.name}`, true);

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
                connectedAgent: connectionData.agent,
                flowConnectionId: connectionData.flowConnectionId,
                targetAgentId: connectionData.agent.id,
                targetAgentName: connectionData.agent.name
              }
            }
            : node
        )
      );
    } else {
      addLogMessage(`✅ Solicitud enviada a ${connectionData.user.name} (${connectionData.user.email})`);
      addDecisionMessage('Sistema', `Solicitud de conexión enviada a ${connectionData.user.name}`, true);
    }
  }, [addLogMessage, addDecisionMessage, setNodes]);

  const loadPublicAgents = useCallback(async () => {
    if (!isConnected) return;

    try {
      const validUserId = (userId && userId !== 'anonymous') ? userId : null;
      const agents = await PAIAApi.getPublicAgents(validUserId);
      setPublicAgents(agents);
      addLogMessage(`📡 Cargados ${agents.length} agentes públicos disponibles`);
    } catch (error) {
      console.error('Error loading public agents:', error);
      addLogMessage(`❌ Error cargando agentes públicos: ${error.message}`);
    }
  }, [isConnected, userId, addLogMessage, setPublicAgents]);

  const loadMyAgents = useCallback(async () => {
    if (!isConnected) {
      addLogMessage('❌ Backend no conectado');
      return;
    }

    if (!userId || userId === 'anonymous') {
      addLogMessage('❌ Debes estar autenticado para cargar tus agentes');
      return;
    }

    try {
      const response = await PAIAApi.getAgents(userId);
      const agents = response.agents || response || [];
      setPublicAgents(agents);
      addLogMessage(`📂 Cargados ${agents.length} de tus agentes`);
    } catch (error) {
      console.error('Error loading my agents:', error);
      addLogMessage(`❌ Error cargando tus agentes: ${error.message}`);
    }
  }, [isConnected, userId, addLogMessage, setPublicAgents]);

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
        emoji: '🌐',
        personality: publicAgent.personality,
        expertise: publicAgent.expertise,
        description: publicAgent.description,
        backendId: publicAgent.id,
        isConfigured: true,
        isExternal: true,
        originalUserId: publicAgent.user_id,
        agentColor: agentColor
      },
      className: 'react-flow__node-ai',
      style: {
        background: agentColor,
        borderColor: agentColor,
        border: '2px dashed',
        opacity: 0.8
      }
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
    addLogMessage(`🌐 Agente externo agregado: ${publicAgent.name} (creado por ${publicAgent.user_id})`);
  }, [nodes, addLogMessage, setNodes]);

  return {
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
  };
};

export default useNodeManagement;
