import { useState, useCallback } from 'react';

/**
 * Custom hook for managing log messages, decisions, and node message history
 * @returns {Object} Message system state and functions
 */
export default function useMessageSystem() {
  const [logMessages, setLogMessages] = useState([]);
  const [decisions, setDecisions] = useState([
    { id: 1, sender: 'Sistema', message: 'Listo para simular', isSystem: true }
  ]);
  const [nodeMessageHistory, setNodeMessageHistory] = useState({});

  /**
   * Add a log message to the system
   * @param {string} message - The log message to add
   */
  const addLogMessage = useCallback((message) => {
    setLogMessages(prev => [...prev, {
      id: Date.now() + Math.random(),
      message,
      timestamp: new Date().toLocaleTimeString()
    }]);
  }, []);

  /**
   * Add a decision message to the decisions panel
   * @param {string} sender - Who sent the message
   * @param {string} message - The message content
   * @param {boolean} isSystem - Whether this is a system message
   */
  const addDecisionMessage = useCallback((sender, message, isSystem = false) => {
    setDecisions(prev => [
      { id: Date.now() + Math.random(), sender, message, isSystem },
      ...prev.slice(0, 9)
    ]);
  }, []);

  /**
   * Add a message to a specific node's message history
   * @param {string} nodeId - The node ID
   * @param {Object} message - The message object to add
   */
  const addMessageToNodeHistory = useCallback((nodeId, message) => {
    setNodeMessageHistory(prev => ({
      ...prev,
      [nodeId]: [
        ...(prev[nodeId] || []),
        {
          ...message,
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString()
        }
      ]
    }));
  }, []);

  /**
   * Clear all log messages
   */
  const clearLogMessages = useCallback(() => {
    setLogMessages([]);
  }, []);

  /**
   * Clear all decisions
   */
  const clearDecisions = useCallback(() => {
    setDecisions([
      { id: 1, sender: 'Sistema', message: 'Listo para simular', isSystem: true }
    ]);
  }, []);

  /**
   * Clear message history for a specific node
   * @param {string} nodeId - The node ID to clear history for
   */
  const clearNodeHistory = useCallback((nodeId) => {
    setNodeMessageHistory(prev => ({
      ...prev,
      [nodeId]: []
    }));
  }, []);

  /**
   * Clear all message histories
   */
  const clearAllHistories = useCallback(() => {
    setNodeMessageHistory({});
  }, []);

  return {
    // State
    logMessages,
    decisions,
    nodeMessageHistory,

    // Functions
    addLogMessage,
    addDecisionMessage,
    addMessageToNodeHistory,
    clearLogMessages,
    clearDecisions,
    clearNodeHistory,
    clearAllHistories
  };
}
