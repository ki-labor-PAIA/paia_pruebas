import { useState, useCallback } from 'react';

const usePublicData = () => {
  const [activeFlows, setActiveFlows] = useState([]);
  const [publicAgents, setPublicAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const loadActiveFlows = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/flows/friends/${userId}/active`);
      if (!response.ok) {
        throw new Error(`Error al cargar flujos activos: ${response.statusText}`);
      }
      const data = await response.json();
      setActiveFlows(data.active_flows || []);
      return data.active_flows || [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const loadPublicAgents = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/agents/public?exclude_user_id=${userId}`);
      if (!response.ok) {
        throw new Error(`Error al cargar agentes públicos: ${response.statusText}`);
      }
      const data = await response.json();
      setPublicAgents(data.agents || []);
      return data.agents || [];
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const connectToFlow = useCallback(async (flowId, userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/flows/${flowId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!response.ok) {
        throw new Error(`Error al conectarse al flujo: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const usePublicAgent = useCallback(async (agentId, userId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/use`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });
      if (!response.ok) {
        throw new Error(`Error al usar agente público: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  return {
    activeFlows,
    publicAgents,
    loading,
    error,
    loadActiveFlows,
    loadPublicAgents,
    connectToFlow,
    usePublicAgent,
  };
};

export default usePublicData;
