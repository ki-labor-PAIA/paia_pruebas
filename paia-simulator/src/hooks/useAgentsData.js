import { useState, useCallback } from 'react';

/**
 * Custom hook for managing agent data and operations
 * @returns {Object} Agent state and CRUD functions
 */
export default function useAgentsData() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /**
   * Load agents for a specific user
   * @param {string} userId - The user ID to load agents for
   */
  const loadAgents = useCallback(async (userId) => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents?user_id=${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to load agents: ${response.statusText}`);
      }

      const data = await response.json();
      setAgents(data.agents || []);
    } catch (err) {
      console.error('Error loading agents:', err);
      setError(err.message);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  /**
   * Create a new agent
   * @param {Object} agentData - The agent data to create
   * @param {string} userId - The user ID who owns the agent
   * @returns {Object} The created agent or null if failed
   */
  const createAgent = useCallback(async (agentData, userId) => {
    if (!agentData || !userId) {
      setError('Agent data and user ID are required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agentData,
          user_id: userId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }

      const newAgent = await response.json();
      setAgents(prev => [...prev, newAgent]);
      return newAgent;
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  /**
   * Update an existing agent
   * @param {string} agentId - The agent ID to update
   * @param {Object} agentData - The updated agent data
   * @returns {Object} The updated agent or null if failed
   */
  const updateAgent = useCallback(async (agentId, agentData) => {
    if (!agentId || !agentData) {
      setError('Agent ID and data are required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent: ${response.statusText}`);
      }

      const updatedAgent = await response.json();
      setAgents(prev => prev.map(agent =>
        agent.id === agentId ? updatedAgent : agent
      ));
      return updatedAgent;
    } catch (err) {
      console.error('Error updating agent:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  /**
   * Delete an agent
   * @param {string} agentId - The agent ID to delete
   * @param {string} userId - The user ID who owns the agent
   * @returns {boolean} True if successful, false otherwise
   */
  const deleteAgent = useCallback(async (agentId, userId) => {
    if (!agentId || !userId) {
      setError('Agent ID and user ID are required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}?user_id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`);
      }

      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      return true;
    } catch (err) {
      console.error('Error deleting agent:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  /**
   * Configure an agent with specific settings
   * @param {string} agentId - The agent ID to configure
   * @param {Object} configData - The configuration data
   * @returns {Object} The configured agent or null if failed
   */
  const configureAgent = useCallback(async (agentId, configData) => {
    if (!agentId || !configData) {
      setError('Agent ID and configuration data are required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/configure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        throw new Error(`Failed to configure agent: ${response.statusText}`);
      }

      const configuredAgent = await response.json();
      setAgents(prev => prev.map(agent =>
        agent.id === agentId ? configuredAgent : agent
      ));
      return configuredAgent;
    } catch (err) {
      console.error('Error configuring agent:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  return {
    agents,
    loading,
    error,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    configureAgent
  };
}
