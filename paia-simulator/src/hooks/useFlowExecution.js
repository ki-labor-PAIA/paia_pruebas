import { useCallback } from 'react';
import {
  processEdgeInteraction,
  activateTelegramNodes,
  deactivateTelegramNodes,
  markAgentsAsPersistent,
  validateFlow,
  hasActiveTelegramNodes
} from '@/utils/flowExecutor';

/**
 * Hook para gestionar la ejecución de flujos en el simulador PAIA.
 *
 * @param {Object} params - Parámetros del hook
 * @returns {Object} Funciones y estado para ejecutar flujos
 */
const useFlowExecution = ({
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
}) => {
  /**
   * Animar un edge durante la ejecución del flujo.
   */
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
  }, [setEdges]);

  /**
   * Ejecutar el flujo completo.
   */
  const runFlow = useCallback(async (options = {}) => {
    const { mode = 'once' } = options;

    // Validar flujo
    const validation = validateFlow(nodes, edges);
    if (!validation.isValid) {
      addLogMessage(validation.message);
      return;
    }

    if (mode === 'persistent') {
      addLogMessage('🔄 Activando flujo en modo persistente (siempre activo)...');
    } else {
      addLogMessage('▶️ Ejecutando flujo una vez...');
    }

    // Verificar si hay nodos de Telegram y activarlos
    const hasActive = hasActiveTelegramNodes(nodes);

    if (!hasActive) {
      const { updatedNodes, telegramIds } = activateTelegramNodes(nodes);

      if (telegramIds.length > 0) {
        setNodes(updatedNodes);
        setActiveTelegramNodes(new Set(telegramIds));
        setIsRunning(true);
        addLogMessage('🚀 Flujo ejecutándose - Telegram activo y conectado...');
        return;
      }
    }

    // Marcar agentes como persistentes si es necesario
    if (mode === 'persistent') {
      await markAgentsAsPersistent(nodes, userId, addLogMessage);
    }

    // Flujo tradicional
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

          // Procesar interacción
          const result = await processEdgeInteraction(
            sourceNode,
            targetNode,
            {
              addLogMessage,
              addDecisionMessage,
              addMessageToNodeHistory,
              useBackend,
              isConnected,
              userId
            }
          );

          // Aplicar logs
          result.logs.forEach(log => addLogMessage(log));

          // Aplicar decisiones
          result.decisions.forEach(decision => {
            addDecisionMessage(decision.sender, decision.message, decision.isSystem);
          });

          // Aplicar actualizaciones de historial
          result.nodeHistoryUpdates.forEach(update => {
            addMessageToNodeHistory(update.nodeId, update.message);
          });

          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    }

    // Solo detener si no hay nodos de Telegram activos
    if (activeTelegramNodes.size === 0) {
      setIsRunning(false);
      addLogMessage('✅ Flujo completado');
    }
  }, [
    nodes,
    edges,
    setNodes,
    setIsRunning,
    setActiveTelegramNodes,
    activeTelegramNodes,
    useBackend,
    isConnected,
    simulateWithBackend,
    addLogMessage,
    addDecisionMessage,
    addMessageToNodeHistory,
    animateEdge,
    userId
  ]);

  /**
   * Detener el flujo en ejecución.
   */
  const stopFlow = useCallback(() => {
    const updatedNodes = deactivateTelegramNodes(nodes);
    setNodes(updatedNodes);
    setActiveTelegramNodes(new Set());
    setIsRunning(false);
    addLogMessage('🛑 Flujo detenido - Telegram desconectado');
  }, [nodes, setNodes, setActiveTelegramNodes, setIsRunning, addLogMessage]);

  return {
    runFlow,
    stopFlow,
    animateEdge
  };
};

export default useFlowExecution;
