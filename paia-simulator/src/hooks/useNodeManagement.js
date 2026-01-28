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
  createBackendAgent,
  reactFlowInstance
}) => {
  const actorIdRef = useRef(1);

  // Helper function to calculate position based on current viewport
  const getViewportCenterPosition = useCallback((offsetX = 0, offsetY = 0) => {
    if (!reactFlowInstance) {
      // Fallback to simple offset positioning if ReactFlow instance is not available yet
      return {
        x: 100 + offsetX,
        y: 100 + offsetY
      };
    }

    const viewport = reactFlowInstance.getViewport();

    // Calculate the center of the visible viewport in flow coordinates
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Account for sidebars (approximate 280px each when open)
    const effectiveWidth = viewportWidth - 560; // Both sidebars
    const effectiveHeight = viewportHeight - 60; // Header height

    // Convert screen center to flow coordinates
    const centerX = ((effectiveWidth / 2 + 280) - viewport.x) / viewport.zoom;
    const centerY = ((effectiveHeight / 2 + 60) - viewport.y) / viewport.zoom;

    return {
      x: centerX + offsetX,
      y: centerY + offsetY
    };
  }, [reactFlowInstance]);

  const addActor = useCallback(async (type, name = null, x = null, y = null) => {
    const id = `actor-${actorIdRef.current}`;
    const actorName = name || `${type === 'human' ? 'Humano' : 'IA'} ${actorIdRef.current}`;

    const agentColor = type === 'ai' ? getAgentColor(null) : undefined;

    // Use provided coordinates or calculate based on viewport
    let position;
    if (x !== null && y !== null) {
      position = { x, y };
    } else {
      const offset = actorIdRef.current * 30; // Small offset for each new node
      const viewportPos = getViewportCenterPosition(offset, offset);
      position = viewportPos;
    }

    const newNode = {
      id,
      type: 'actor',
      position,
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
  }, [isConnected, createBackendAgent, addLogMessage, setNodes, getViewportCenterPosition]);

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

    // Calculate position based on viewport
    const offset = actorIdRef.current * 30;
    const position = getViewportCenterPosition(offset, offset);

    const newNode = {
      id: backendAgent?.id || id,
      type: 'actor',
      position,
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
  }, [isConnected, addLogMessage, addDecisionMessage, userId, setNodes, getViewportCenterPosition]);

  const addTelegramNode = useCallback((x = null, y = null) => {
    const id = `telegram-${actorIdRef.current}`;

    // Use provided coordinates or calculate based on viewport
    let position;
    if (x !== null && y !== null) {
      position = { x, y };
    } else {
      const offset = actorIdRef.current * 30;
      position = getViewportCenterPosition(offset, offset);
    }

    const newNode = {
      id,
      type: 'telegram',
      position,
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
  }, [addLogMessage, setNodes, getViewportCenterPosition]);

  const handleConnectionNodeClick = useCallback((nodeData, nodeId) => {
    switch (nodeData.connectionType) {
      case 'user':
        setConnectionMode('flow');
        setActiveConnectionNodeId(nodeId);
        setShowConnectUserModal(true);
        addLogMessage('⚡ Opening user search for flow connection...');
        break;
      case 'notification':
        addLogMessage('📢 Configuring notifications system...');
        break;
      default:
        addLogMessage(`🔗 Connection type: ${nodeData.connectionType}`);
    }
  }, [addLogMessage, setConnectionMode, setActiveConnectionNodeId, setShowConnectUserModal]);

  const addConnectionNode = useCallback((connectionType = 'user') => {
    // Calculate position based on viewport with some randomness to avoid overlapping
    const randomOffset = Math.random() * 50;
    const position = getViewportCenterPosition(randomOffset, randomOffset);

    const newNode = {
      id: `connection-${actorIdRef.current}`,
      type: 'connection',
      position,
      data: {
        label: connectionType === 'user' ? 'Flow Connection' : 'Connection',
        connectionType: connectionType,
        status: 'offline',
        isConnected: false,
        unreadNotifications: 0,
        onConnectionClick: handleConnectionNodeClick
      },
    };

    setNodes((nds) => [...nds, newNode]);
    actorIdRef.current++;
    addLogMessage(`🔗 ${connectionType === 'user' ? 'User search' : 'Connection'} node added`);
  }, [addLogMessage, handleConnectionNodeClick, setNodes, getViewportCenterPosition]);

  const openSocialConnectionModal = useCallback(() => {
    setConnectionMode('social');
    setActiveConnectionNodeId(null);
    setShowConnectUserModal(true);
    addLogMessage('👥 Searching users for social connection...');
  }, [addLogMessage, setConnectionMode, setActiveConnectionNodeId, setShowConnectUserModal]);

  const addCalendarNode = useCallback(() => {
    setShowConfigureCalendar(true);
  }, [setShowConfigureCalendar]);

  const createConfiguredCalendar = useCallback((calendarConfig, x = null, y = null) => {
    const id = `calendar-${actorIdRef.current}`;

    // Use provided coordinates or calculate based on viewport
    let position;
    if (x !== null && y !== null) {
      position = { x, y };
    } else {
      const offset = actorIdRef.current * 30;
      position = getViewportCenterPosition(offset, offset);
    }

    const newNode = {
      id,
      type: 'calendar',
      position,
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
    addLogMessage(`📅 ${calendarConfig.name} node added and configured`);
  }, [addLogMessage, setNodes, getViewportCenterPosition]);

  const handleCalendarAuthRequest = useCallback(async (nodeData) => {
    try {
      addLogMessage(`🔐 Requesting authentication for Google Calendar...`);

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
          addLogMessage(`🔗 Opening Google authentication window...`);

          window.open(authUrl, 'google-auth', 'width=500,height=600,scrollbars=yes,resizable=yes');

          addLogMessage(`ℹ️ Complete the authentication in the popup window. The node will update automatically.`);
        } else {
          addLogMessage(`❌ Error getting authentication URL`);
        }
      } else {
        addLogMessage(`❌ Error connecting to authentication service`);
      }
    } catch (error) {
      console.error('Error requesting calendar auth:', error);
      addLogMessage(`❌ Error requesting authentication: ${error.message}`);
    }
  }, [userId, addLogMessage]);

  const handleUserConnection = useCallback((connectionData) => {
    if (connectionData.mode === 'flow') {
      addLogMessage(`⚡ Flow connection established with agent ${connectionData.agent.name}`);
      addDecisionMessage('Sistema', `Flow connected to agent ${connectionData.agent.name}`, true);

      setNodes(currentNodes =>
        currentNodes.map(node =>
          node.id === connectionData.connectionNodeId
            ? {
              ...node,
              data: {
                ...node.data,
                isConnected: true,
                status: 'online',
                label: `Connected to ${connectionData.agent.name}`,
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
      addLogMessage(`✅ Request sent to ${connectionData.user.name} (${connectionData.user.email})`);
      addDecisionMessage('Sistema', `Connection request sent to ${connectionData.user.name}`, true);
    }
  }, [addLogMessage, addDecisionMessage, setNodes]);

  const loadPublicAgents = useCallback(async () => {
    if (!isConnected) return;

    try {
      const validUserId = (userId && userId !== 'anonymous') ? userId : null;
      const agents = await PAIAApi.getPublicAgents(validUserId);
      setPublicAgents(agents);
      addLogMessage(`📡 Loaded ${agents.length} available public agents`);
    } catch (error) {
      console.error('Error loading public agents:', error);
      addLogMessage(`❌ Error loading public agents: ${error.message}`);
    }
  }, [isConnected, userId, addLogMessage, setPublicAgents]);

  const loadMyAgents = useCallback(async () => {
    if (!isConnected) {
      addLogMessage('❌ Backend not connected');
      return;
    }

    if (!userId || userId === 'anonymous') {
      addLogMessage('❌ You must be authenticated to load your agents');
      return;
    }

    try {
      const response = await PAIAApi.getAgents(userId);
      const agents = response.agents || response || [];
      setPublicAgents(agents);
      addLogMessage(`📂 Loaded ${agents.length} of your agents`);
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

    // Calculate position based on viewport
    const offset = actorIdRef.current * 30;
    const position = getViewportCenterPosition(offset, offset);

    const newNode = {
      id: `external-${publicAgent.id}`,
      type: 'actor',
      position,
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
  }, [nodes, addLogMessage, setNodes, getViewportCenterPosition]);

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
