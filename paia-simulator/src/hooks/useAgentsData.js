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
   * @param {string} userId - The user ID who owns the agent
   * @returns {boolean} True if successful, false otherwise
   */
  const updateAgent = useCallback(async (agentId, agentData, userId) => {
    if (!agentId || !agentData || !userId) {
      setError('Agent ID, data, and user ID are required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...agentData,
          user_id: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to update agent: ${response.statusText}`);
      }

      // Reload agents after update to get fresh data
      await loadAgents(userId);
      return true;
    } catch (err) {
      console.error('Error updating agent:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL, loadAgents]);

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
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
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
   * Configure an agent with specific settings (communication and behavior)
   * @param {string} agentId - The agent ID to configure
   * @param {Object} configData - The configuration data
   * @param {string} userId - The user ID who owns the agent
   * @returns {boolean} True if successful, false otherwise
   */
  const configureAgent = useCallback(async (agentId, configData, userId) => {
    if (!agentId || !configData || !userId) {
      setError('Agent ID, configuration data, and user ID are required');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...configData,
          user_id: userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to configure agent: ${response.statusText}`);
      }

      // Reload agents after configuration to get fresh data
      await loadAgents(userId);
      return true;
    } catch (err) {
      console.error('Error configuring agent:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [API_URL, loadAgents]);

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
