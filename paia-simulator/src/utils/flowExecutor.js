import PAIAApi from '@/utils/api';
import { generateMockResponse } from '@/utils/mockResponses';

/**
 * Procesar interacción entre nodos a través de un edge.
 *
 * @param {Object} sourceNode - Nodo de origen
 * @param {Object} targetNode - Nodo de destino
 * @param {Object} callbacks - Objeto con callbacks necesarios
 * @returns {Object} Resultado de la interacción con logs y decisiones
 */
export async function processEdgeInteraction(sourceNode, targetNode, callbacks) {
  const {
    addLogMessage,
    addDecisionMessage,
    addMessageToNodeHistory,
    useBackend,
    isConnected,
    userId
  } = callbacks;

  const logs = [];
  const decisions = [];
  const nodeHistoryUpdates = [];

  // Determinar el mensaje basado en el tipo de nodo fuente
  let messageContent = '';
  if (sourceNode.data.actorType === 'human') {
    messageContent = sourceNode.data.customMessage || 'Sin mensaje configurado';
    logs.push(`👤→🤖 ${sourceNode.data.label}: "${messageContent}"`);
  } else {
    messageContent = `Hola ${targetNode.data.label}, colaboremos en esta tarea.`;
    logs.push(`🤖→${targetNode.data.actorType === 'human' ? '👤' : '🤖'} ${sourceNode.data.label}: "${messageContent}"`);
  }

  // Manejar diferentes tipos de nodos destino
  if (targetNode.type === 'connection') {
    const result = await handleConnectionNodeFlow(
      sourceNode,
      targetNode,
      messageContent,
      { addLogMessage, addDecisionMessage, addMessageToNodeHistory, useBackend, isConnected, userId }
    );
    logs.push(...result.logs);
    decisions.push(...result.decisions);
    nodeHistoryUpdates.push(...result.nodeHistoryUpdates);
  } else if (targetNode.data.actorType === 'ai') {
    const response = generateMockResponse(targetNode.data, messageContent);
    logs.push(`🤖→${sourceNode.data.actorType === 'human' ? '👤' : '🤖'} ${targetNode.data.label}: "${response}"`);
    decisions.push({ sender: targetNode.data.label, message: response, isSystem: false });

    nodeHistoryUpdates.push({
      nodeId: targetNode.id,
      message: {
        sender: 'received',
        content: messageContent,
        from: sourceNode.data.label
      }
    });
    nodeHistoryUpdates.push({
      nodeId: targetNode.id,
      message: {
        sender: 'agent',
        content: response
      }
    });
  } else {
    // Si el target es humano
    decisions.push({
      sender: targetNode.data.label,
      message: `Recibió mensaje: "${messageContent.slice(0, 30)}..."`,
      isSystem: false
    });

    nodeHistoryUpdates.push({
      nodeId: targetNode.id,
      message: {
        sender: 'received',
        content: messageContent,
        from: sourceNode.data.label
      }
    });
  }

  return { logs, decisions, nodeHistoryUpdates };
}

/**
 * Manejar flujo a través de un nodo de conexión.
 *
 * @param {Object} sourceNode - Nodo de origen
 * @param {Object} connectionNode - Nodo de conexión
 * @param {string} messageContent - Contenido del mensaje
 * @param {Object} callbacks - Objeto con callbacks necesarios
 * @returns {Object} Resultado con logs, decisiones y actualizaciones de historial
 */
export async function handleConnectionNodeFlow(sourceNode, connectionNode, messageContent, callbacks) {
  const {
    addLogMessage,
    addDecisionMessage,
    addMessageToNodeHistory,
    useBackend,
    isConnected,
    userId
  } = callbacks;

  const logs = [];
  const decisions = [];
  const nodeHistoryUpdates = [];

  if (connectionNode.data.isConnected && connectionNode.data.connectedAgent) {
    const targetAgent = connectionNode.data.connectedAgent;
    logs.push(`🌐→ ${sourceNode.data.label} intenta comunicarse con ${targetAgent.name} a través de un nodo de conexión.`);

    if (useBackend && isConnected && sourceNode.data.backendId) {
      const intelligentPrompt = `Usa la herramienta 'ask_connected_agent' para enviar la siguiente pregunta al agente con ID '${targetAgent.id}': "${messageContent}"`;

      logs.push(`🤖 Prompt para ${sourceNode.data.label}: "${intelligentPrompt}"`);
      decisions.push({
        sender: sourceNode.data.label,
        message: `Preparando para preguntar a ${targetAgent.name}...`,
        isSystem: false
      });

      try {
        const response = await PAIAApi.sendMessage(sourceNode.data.backendId, intelligentPrompt, userId);
        const agentResponse = response.response;

        logs.push(`✅ Respuesta de ${targetAgent.name}: "${agentResponse}"`);
        decisions.push({
          sender: targetAgent.name,
          message: agentResponse,
          isSystem: false
        });

        nodeHistoryUpdates.push({
          nodeId: sourceNode.id,
          message: {
            sender: 'agent',
            content: `Pregunta enviada a ${targetAgent.name}: "${messageContent}"`
          }
        });
        nodeHistoryUpdates.push({
          nodeId: connectionNode.id,
          message: {
            sender: 'received',
            content: `Pregunta de ${sourceNode.data.label}: "${messageContent}"`,
            from: sourceNode.data.label
          }
        });
        nodeHistoryUpdates.push({
          nodeId: connectionNode.id,
          message: {
            sender: 'agent',
            content: agentResponse
          }
        });
      } catch (error) {
        const errorMsg = `❌ Error en la comunicación agente-a-agente: ${error.message}`;
        logs.push(errorMsg);
        decisions.push({ sender: 'Sistema', message: errorMsg, isSystem: true });
      }
    } else {
      logs.push(`⚠️ La comunicación agente-a-agente requiere que el backend esté activo y que el agente de origen (${sourceNode.data.label}) exista en el backend.`);
    }
  } else {
    logs.push(`⚠️ Nodo de conexión '${connectionNode.data.label}' no está configurado o conectado a un agente específico.`);
  }

  return { logs, decisions, nodeHistoryUpdates };
}

/**
 * Activar nodos de Telegram configurados.
 *
 * @param {Array} nodes - Lista de nodos
 * @returns {Object} Nodos actualizados y IDs de Telegram activos
 */
export function activateTelegramNodes(nodes) {
  const telegramNodes = nodes.filter(n => n.type === 'telegram');

  if (telegramNodes.length === 0) {
    return { updatedNodes: nodes, telegramIds: [] };
  }

  const updatedNodes = nodes.map(node => {
    if (node.type === 'telegram' && node.data.isConfigured) {
      return {
        ...node,
        data: { ...node.data, isActive: true }
      };
    }
    return node;
  });

  const telegramIds = telegramNodes
    .filter(n => n.data.isConfigured)
    .map(n => n.id);

  return { updatedNodes, telegramIds };
}

/**
 * Desactivar todos los nodos de Telegram.
 *
 * @param {Array} nodes - Lista de nodos
 * @returns {Array} Nodos actualizados
 */
export function deactivateTelegramNodes(nodes) {
  return nodes.map(node => {
    if (node.type === 'telegram') {
      return {
        ...node,
        data: { ...node.data, isActive: false }
      };
    }
    return node;
  });
}

/**
 * Marcar agentes como persistentes en el backend.
 *
 * @param {Array} nodes - Lista de nodos
 * @param {string} userId - ID del usuario
 * @param {Function} addLogMessage - Función para agregar logs
 */
export async function markAgentsAsPersistent(nodes, userId, addLogMessage) {
  const agentNodes = nodes.filter(n => n.type === 'agent');

  for (const agentNode of agentNodes) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentNode.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          is_persistent: true,
          auto_start: true,
          status: 'active'
        })
      });
      addLogMessage(`🔄 Agente "${agentNode.data.label}" marcado como persistente`);
    } catch (error) {
      console.error('Error marcando agente como persistente:', error);
    }
  }
}

/**
 * Validar si el flujo puede ejecutarse.
 *
 * @param {Array} nodes - Lista de nodos
 * @param {Array} edges - Lista de edges
 * @returns {Object} Resultado de validación con isValid y mensaje
 */
export function validateFlow(nodes, edges) {
  if (nodes.length === 0 || edges.length === 0) {
    return {
      isValid: false,
      message: '❌ Necesitas tener al menos dos actores conectados para ejecutar el flujo'
    };
  }

  return { isValid: true, message: '' };
}

/**
 * Verificar si hay nodos de Telegram activos.
 *
 * @param {Array} nodes - Lista de nodos
 * @returns {boolean} True si hay nodos de Telegram activos
 */
export function hasActiveTelegramNodes(nodes) {
  const telegramNodes = nodes.filter(n => n.type === 'telegram');
  return telegramNodes.some(n => n.data.isActive);
}
