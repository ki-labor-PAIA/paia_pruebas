import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal states
 * @returns {Object} Modal states and toggle functions
 */
export default function useModals() {
  const [showConnectUser, setShowConnectUser] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  /**
   * Toggle a specific modal
   * @param {string} modalName - Name of the modal to toggle
   */
  const toggleModal = useCallback((modalName) => {
    const setters = {
      connectUser: setShowConnectUser,
      createAgent: setShowCreateAgent,
      notifications: setShowNotifications,
      tutorial: setShowTutorial
    };

    const setter = setters[modalName];
    if (setter) {
      setter(prev => !prev);
    }
  }, []);

  /**
   * Open a specific modal
   * @param {string} modalName - Name of the modal to open
   */
  const openModal = useCallback((modalName) => {
    const setters = {
      connectUser: setShowConnectUser,
      createAgent: setShowCreateAgent,
      notifications: setShowNotifications,
      tutorial: setShowTutorial
    };

    const setter = setters[modalName];
    if (setter) {
      setter(true);
    }
  }, []);

  /**
   * Close a specific modal
   * @param {string} modalName - Name of the modal to close
   */
  const closeModal = useCallback((modalName) => {
    const setters = {
      connectUser: setShowConnectUser,
      createAgent: setShowCreateAgent,
      notifications: setShowNotifications,
      tutorial: setShowTutorial
    };

    const setter = setters[modalName];
    if (setter) {
      setter(false);
    }
  }, []);

  /**
   * Close all modals
   */
  const closeAllModals = useCallback(() => {
    setShowConnectUser(false);
    setShowCreateAgent(false);
    setShowNotifications(false);
    setShowTutorial(false);
  }, []);

  return {
    // States
    showConnectUser,
    showCreateAgent,
    showNotifications,
    showTutorial,

    // Setters (for direct control)
    setShowConnectUser,
    setShowCreateAgent,
    setShowNotifications,
    setShowTutorial,

    // Functions
    toggleModal,
    openModal,
    closeModal,
    closeAllModals
  };
}
