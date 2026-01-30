import { useState, useCallback } from 'react';

const useFlowsData = () => {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const loadFlows = useCallback(async (userId) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    const requestUrl = `${API_URL}/api/flows/user/${userId}`;
    console.log(`[DEBUG] Loading flows from: ${requestUrl} (userId: '${userId}')`);

    try {
      const response = await fetch(requestUrl);

      if (!response.ok) {
        throw new Error(`Failed to load flows: ${response.statusText}`);
      }

      const data = await response.json();
      setFlows(data.flows || []);
    } catch (err) {
      console.error('Error loading flows:', err);
      setError(err.message);
      setFlows([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const toggleFlowStatus = useCallback(async (flowId, currentStatus) => {
    if (!flowId) {
      setError('Flow ID is required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const newStatus = !currentStatus;
      const response = await fetch(`${API_URL}/api/flows/${flowId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update flow status: ${response.statusText}`);
      }

      const updatedFlow = await response.json();

      setFlows(prevFlows =>
        prevFlows.map(flow =>
          flow.id === flowId ? { ...flow, is_active: newStatus } : flow
        )
      );

      return true;
    } catch (err) {
      console.error('Error toggling flow status:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const deleteFlow = useCallback(async (flowId, userId) => {
    if (!flowId) {
      setError('Flow ID is required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/flows/${flowId}`, {
        method: 'DELETE',
       headers: {
          'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete flow: ${response.statusText}`);
      }

      setFlows(prevFlows => prevFlows.filter(flow => flow.id !== flowId));

      if (userId) {
        await loadFlows(userId);
      }

      return true;
    } catch (err) {
      console.error('Error deleting flow:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL, loadFlows]);

  const createFlow = useCallback(async (flowData) => {
    if (!flowData) {
      setError('Flow data is required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/flows/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create flow: ${response.statusText}`);
      }

      const result = await response.json();

      // Recargar flujos para obtener el flujo recién creado con todos sus campos
      if (flowData.user_id) {
        await loadFlows(flowData.user_id);
      }

      return result;
    } catch (err) {
      console.error('Error creating flow:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL, loadFlows]);

  const updateFlow = useCallback(async (flowId, flowData) => {
    if (!flowId || !flowData) {
      setError('Flow ID and flow data are required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/flows/${flowId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(flowData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update flow: ${response.statusText}`);
      }

      const updatedFlow = await response.json();

      setFlows(prevFlows =>
        prevFlows.map(flow =>
          flow.id === flowId ? updatedFlow : flow
        )
      );

      return updatedFlow;
    } catch (err) {
      console.error('Error updating flow:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  return {
    flows,
    loading,
    error,
    loadFlows,
    toggleFlowStatus,
    deleteFlow,
    createFlow,
    updateFlow,
  };
};

export default useFlowsData;
