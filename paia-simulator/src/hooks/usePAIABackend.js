import { useState, useEffect, useCallback } from 'react';
import PAIAApi from '@/utils/api';

export default function usePAIABackend() {
  const [backendAgents, setBackendAgents] = useState([]);
  const [backendConnections, setBackendConnections] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const checkBackendConnection = useCallback(async () => {
    try {
      await PAIAApi.getHealthCheck();
      setIsConnected(true);
      return true;
    } catch (error) {
      console.log('Backend not available:', error);
      setIsConnected(false);
      return false;
    }
  }, []);

  const createBackendAgent = useCallback(async (nodeData) => {
    if (!isConnected) return null;
    
    try {
      setLoading(true);
      const agentData = {
        name: nodeData.label,
        description: `${nodeData.actorType === 'ai' ? 'Asistente IA' : 'Actor humano'} - ${nodeData.label}`,
        personality: nodeData.actorType === 'ai' ? 'útil y profesional' : 'humano',
        expertise: nodeData.actorType === 'ai' ? 'general' : 'ninguna'
      };
      
      const agent = await PAIAApi.createAgent(agentData);
      setBackendAgents(prev => [...prev, agent]);
      return agent;
    } catch (error) {
      console.error('Error creating backend agent:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  const createBackendConnection = useCallback(async (sourceId, targetId) => {
    if (!isConnected) return null;
    
    try {
      const connection = await PAIAApi.createConnection({
        agent1: sourceId,
        agent2: targetId,
        type: 'direct'
      });
      setBackendConnections(prev => [...prev, connection]);
      return connection;
    } catch (error) {
      console.error('Error creating backend connection:', error);
      return null;
    }
  }, [isConnected]);

  const simulateWithBackend = useCallback(async (nodes, edges, onLogMessage, onDecisionMessage) => {
    if (!isConnected || edges.length === 0) return false;

    try {
      setLoading(true);
      onLogMessage('🔗 Conectando con backend PAIA...');

      // Create agents in backend
      const agentMap = new Map();
      for (const node of nodes) {
        const agent = await createBackendAgent(node.data);
        if (agent) {
          agentMap.set(node.id, agent);
          onLogMessage(`✅ Agente creado en backend: ${agent.name}`);
        }
      }

      // Create connections in backend
      for (const edge of edges) {
        const sourceAgent = agentMap.get(edge.source);
        const targetAgent = agentMap.get(edge.target);
        
        if (sourceAgent && targetAgent) {
          await createBackendConnection(sourceAgent.id, targetAgent.id);
          onLogMessage(`🔗 Conexión creada: ${sourceAgent.name} → ${targetAgent.name}`);
        }
      }

      // Simulate interactions
      onLogMessage('🚀 Iniciando simulación con backend PAIA...');
      
      for (const edge of edges) {
        const sourceAgent = agentMap.get(edge.source);
        const targetAgent = agentMap.get(edge.target);
        
        if (sourceAgent && targetAgent) {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (sourceNode?.data.actorType === 'human' && targetNode?.data.actorType === 'ai') {
            // Human to AI interaction - usar mensaje personalizado
            const message = sourceNode.data.customMessage || 'Necesito tu ayuda con una tarea.';
            
            try {
              const response = await PAIAApi.sendMessage(targetAgent.id, message);
              onLogMessage(`👤→🤖 ${sourceAgent.name}: "${message}"`);
              onLogMessage(`🤖→👤 ${targetAgent.name}: "${response.response}"`);
              onDecisionMessage(targetAgent.name, response.response, false);
            } catch (error) {
              onLogMessage(`❌ Error en comunicación: ${error.message}`);
            }
            
          } else if (sourceNode?.data.actorType === 'ai' && targetNode?.data.actorType === 'ai') {
            // AI to AI interaction
            const message = `Colaboremos en esta tarea, ${targetAgent.name}.`;
            
            try {
              const response = await PAIAApi.sendMessageBetweenAgents(
                sourceAgent.id, 
                targetAgent.id, 
                message
              );
              onLogMessage(`🤖→🤖 ${sourceAgent.name} → ${targetAgent.name}`);
              onLogMessage(`🤖 Respuesta: ${response.response}`);
              onDecisionMessage(targetAgent.name, response.response, false);
            } catch (error) {
              onLogMessage(`❌ Error en comunicación IA-IA: ${error.message}`);
            }
            
          } else if (sourceNode?.data.actorType === 'ai' && targetNode?.data.actorType === 'human') {
            // AI to Human interaction
            const message = `Notificación para ${targetNode.data.label}: Tarea completada.`;
            onLogMessage(`🤖→👤 ${sourceAgent.name}: "${message}"`);
            onDecisionMessage(sourceAgent.name, `Enviando notificación a ${targetNode.data.label}`, false);
          }
          
          // Add delay between interactions
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      onLogMessage('✅ Simulación con backend completada');
      return true;
      
    } catch (error) {
      console.error('Error in backend simulation:', error);
      onLogMessage(`❌ Error en simulación: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isConnected, createBackendAgent, createBackendConnection]);

  const clearBackendData = useCallback(() => {
    setBackendAgents([]);
    setBackendConnections([]);
  }, []);

  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  return {
    isConnected,
    loading,
    backendAgents,
    backendConnections,
    checkBackendConnection,
    createBackendAgent,
    createBackendConnection,
    simulateWithBackend,
    clearBackendData
  };
}