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
  userId,
  setStats
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
    const startTime = Date.now();
    let processedQueries = 0;

    // Validar flujo
    const validation = validateFlow(nodes, edges);
    if (!validation.isValid) {
      addLogMessage(validation.message);
      setStats(prev => ({ ...prev, status: '❌ Error: Invalid flow' }));
      return;
    }

    // Actualizar stats al iniciar
    const activeAgents = nodes.filter(n => n.data.actorType === 'ai' || n.data.actorType === 'human').length;
    setStats({
      responseTime: 0,
      queriesProcessed: 0,
      status: mode === 'persistent' ? '🔄 Running (Persistent)' : '▶️ Running'
    });

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
        addLogMessage('🚀 Flow running - Telegram active and connected...');
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
          processedQueries++;

          // Actualizar stats durante la ejecución
          const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
          setStats(prev => ({
            ...prev,
            responseTime: elapsedTime,
            queriesProcessed: processedQueries
          }));

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

          processedQueries++;

          // Actualizar stats durante la ejecución
          const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
          setStats(prev => ({
            ...prev,
            responseTime: elapsedTime,
            queriesProcessed: processedQueries
          }));

          await new Promise(resolve => setTimeout(resolve, 2500));
        }
      }
    }

    // Solo detener si no hay nodos de Telegram activos
    if (activeTelegramNodes.size === 0) {
      setIsRunning(false);
      const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setStats(prev => ({
        ...prev,
        responseTime: finalTime,
        status: '✅ Completed'
      }));
      addLogMessage('✅ Flow completed');
    } else {
      // Modo persistente activo
      const finalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setStats(prev => ({
        ...prev,
        responseTime: finalTime,
        status: '🟢 Active (Persistent)'
      }));
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
    userId,
    setStats
  ]);

  /**
   * Detener el flujo en ejecución.
   */
  const stopFlow = useCallback(() => {
    const updatedNodes = deactivateTelegramNodes(nodes);
    setNodes(updatedNodes);
    setActiveTelegramNodes(new Set());
    setIsRunning(false);
    setStats(prev => ({ ...prev, status: '🛑 Stopped' }));
    addLogMessage('🛑 Flow stopped - Telegram disconnected');
  }, [nodes, setNodes, setActiveTelegramNodes, setIsRunning, addLogMessage, setStats]);

  return {
    runFlow,
    stopFlow,
    animateEdge
  };
};

export default useFlowExecution;
