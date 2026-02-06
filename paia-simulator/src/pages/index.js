import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from "next/head";
import AuthGuard from '@/components/AuthGuard';
import UserHeader from '@/components/UserHeader';
import NotificationPanel from '@/components/NotificationPanel';
import ConnectUserModal from '@/components/ConnectUserModal';
import CreateAgentModal from '@/components/CreateAgentModal';
import ConfigureAgentModal from '@/components/ConfigureAgentModal';
import TutorialModal from '@/components/tutorial/TutorialModal';
import TutorialManager from '@/components/tutorial/TutorialManager';
import ContextualHelp from '@/components/tutorial/ContextualHelp';
import useModals from '@/hooks/useModals';
import useFlowsData from '@/hooks/useFlowsData';
import useAgentsData from '@/hooks/useAgentsData';
import useFriendsData from '@/hooks/useFriendsData';
import usePublicData from '@/hooks/usePublicData';
import Header from '@/components/home/Header';
import TabNavigation from '@/components/home/TabNavigation';
import FlowsTab from '@/components/home/flows/FlowsTab';
import AgentsTab from '@/components/home/agents/AgentsTab';
import FriendsTab from '@/components/home/friends/FriendsTab';
import ActiveFlowsTab from '@/components/home/flows/ActiveFlowsTab';
import PublicAgentsTab from '@/components/home/agents/PublicAgentsTab';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // on server render router.asPath/patname pueden ser undefined; usa window como fallback en cliente
  const asPathSafe =
    typeof window !== 'undefined'
      ? (router?.asPath || router?.pathname || window.location.pathname || '')
      : (router?.asPath || router?.pathname || '');

  // Estados principales
  const [activeTab, setActiveTab] = useState('flows');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [flowToDelete, setFlowToDelete] = useState(null);
  const [showDeleteAgentConfirm, setShowDeleteAgentConfirm] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState(null);

  // 🎓 Tutorial: Flows y Agents temporales para el tutorial
  const [tutorialFlows, setTutorialFlows] = useState([]);
  const [tutorialAgents, setTutorialAgents] = useState([]);

  // Data hooks
  const {
    flows: myFlows,
    loadFlows,
    toggleFlowStatus,
    deleteFlow,
    createFlow
  } = useFlowsData();

  const {
    agents: myAgents,
    loadAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    configureAgent
  } = useAgentsData();

  const {
    friends,
    loadFriends,
    acceptFriendRequest,
    rejectFriendRequest
  } = useFriendsData();

  const {
    activeFlows: friendsActiveFlows,
    publicAgents,
    loadActiveFlows,
    loadPublicAgents
  } = usePublicData();

  // Agent edit and configure state
  const [editingAgent, setEditingAgent] = useState(null);
  const [configuringAgent, setConfiguringAgent] = useState(null);
  const [showConfigureAgent, setShowConfigureAgent] = useState(false);

  // Modals hook
  const {
    showConnectUser,
    showCreateAgent,
    showNotifications,
    showTutorial,
    setShowConnectUser,
    setShowCreateAgent,
    setShowNotifications,
    setShowTutorial
  } = useModals();

  const loadInitialData = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError('');

    try {
      switch (activeTab) {
        case 'flows':
          await loadFlows(session.user.id);
          break;
        case 'agents':
          await loadAgents(session.user.id);
          break;
        case 'friends':
          await loadFriends(session.user.id);
          break;
        case 'active-flows':
          await loadActiveFlows(session.user.id);
          break;
        case 'public-agents':
          await loadPublicAgents(session.user.id);
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, [session, activeTab, loadFlows, loadAgents, loadFriends, loadActiveFlows, loadPublicAgents]);

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.user?.id) {
      loadInitialData();
    }
  }, [session, loadInitialData]);

  // Habilitar scroll y estilos para esta página
  useEffect(() => {
    document.body.classList.add('library-page');
    return () => {
      document.body.classList.remove('library-page');
    };
  }, []);

  // 🎓 Tutorial: Escuchar eventos de acciones del tutorial
  useEffect(() => {
    const handleTutorialAction = (event) => {
      const { action } = event.detail;
      console.log(`🎬 Library received tutorial action: ${action}`);

      if (action === 'createSampleFlows') {
        // Crear flows de ejemplo para el tutorial
        const sampleFlows = [
          {
            id: 'tutorial-flow-1',
            name: '🎓 Example: Customer Support Bot',
            description: 'An AI assistant that helps customers with common questions',
            status: 'active',
            nodes: [],
            edges: [],
            isTutorialFlow: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'tutorial-flow-2',
            name: '🎓 Example: Meeting Scheduler',
            description: 'Automated meeting scheduling with calendar integration',
            status: 'inactive',
            nodes: [],
            edges: [],
            isTutorialFlow: true,
            createdAt: new Date().toISOString()
          }
        ];

        setTutorialFlows(sampleFlows);
        console.log('✅ Tutorial flows created successfully');
      }

      if (action === 'createSampleAgents') {
        // Crear agentes de ejemplo para el tutorial
        const sampleAgents = [
          {
            id: 'tutorial-agent-1',
            name: '🎓 Example: Sales Assistant',
            personality: 'friendly',
            expertise: 'Sales and customer engagement',
            description: 'A friendly AI that helps with sales inquiries and product recommendations',
            isTutorialAgent: true,
            createdAt: new Date().toISOString()
          },
          {
            id: 'tutorial-agent-2',
            name: '🎓 Example: Technical Support',
            personality: 'analytical',
            expertise: 'Technical troubleshooting',
            description: 'An analytical AI specialized in solving technical problems',
            isTutorialAgent: true,
            createdAt: new Date().toISOString()
          }
        ];

        setTutorialAgents(sampleAgents);
        console.log('✅ Tutorial agents created successfully');
      }

      // 🎓 Tutorial: Cambiar de pestaña automáticamente
      if (action === 'switchToAgentsTab') {
        setActiveTab('agents');
        console.log('✅ Switched to Agents tab');
      }

      if (action === 'switchToPublicAgentsTab') {
        setActiveTab('public-agents');
        console.log('✅ Switched to Public Agents tab');
      }

      if (action === 'switchToFriendsTab') {
        setActiveTab('friends');
        console.log('✅ Switched to Friends tab');
      }

      if (action === 'cleanupTutorialFlows' || action === 'cleanupTutorialNodes') {
        // Eliminar flows y agents de tutorial
        setTutorialFlows([]);
        setTutorialAgents([]);
        console.log('✅ Tutorial flows and agents cleaned up');
      }
    };

    window.addEventListener('tutorialAction', handleTutorialAction);

    return () => {
      window.removeEventListener('tutorialAction', handleTutorialAction);
    };
  }, []);

  const handleFlowStatusToggle = async (flowId, currentStatus) => {
    try {
      const success = await toggleFlowStatus(flowId, currentStatus);
      if (!success) {
        setError('Error updating flow');
      }
    } catch (err) {
      setError(`Error updating flow: ${err.message}`);
    }
  };

  const handleDeleteFlow = (flowId) => {
    setFlowToDelete(flowId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteFlow = async () => {
    if (!flowToDelete) return;

    try {
      const success = await deleteFlow(flowToDelete, session.user.id);
      if (!success) {
        setError('Error deleting flow');
      }
    } catch (err) {
      setError(`Error deleting flow: ${err.message}`);
    } finally {
      setShowDeleteConfirm(false);
      setFlowToDelete(null);
    }
  };

  const cancelDeleteFlow = () => {
    setShowDeleteConfirm(false);
    setFlowToDelete(null);
  };

  const handleDuplicateFlow = async (flowId) => {
    try {
      // Encontrar el flujo a duplicar
      const flowToDuplicate = myFlows.find(f => f.id === flowId);
      if (!flowToDuplicate) {
        setError('Flow not found');
        return;
      }

      // Preparar los datos del flujo duplicado en el formato que espera el backend
      const duplicatedFlowData = {
        user_id: session.user.id,
        name: `${flowToDuplicate.name} (Copy)`,
        flow_data: flowToDuplicate.flow_data || {}, // El contenido del flujo (nodes, edges, etc.)
        description: flowToDuplicate.description || '',
        is_public: false, // Los flujos duplicados son privados por defecto
        metadata: flowToDuplicate.metadata || {}
      };

      const result = await createFlow(duplicatedFlowData);
      if (result) {
        console.log('Flow duplicated successfully');
      } else {
        setError('Error duplicating flow');
      }
    } catch (err) {
      console.error('Error duplicating flow:', err);
      setError(`Error duplicating flow: ${err.message}`);
    }
  };

  const navigateToCreate = (flowId = null) => {
    const url = flowId ? `/create?flow=${flowId}` : '/create';
    router.push(url);
  };

  const handleUserConnection = (connectionData) => {
    console.log('User connected:', connectionData);
    setShowConnectUser(false);
    if (activeTab === 'friends') {
      loadFriends(session.user.id);
    }
  };

  const handleAcceptFriendRequest = async (friend) => {
    try {
      const success = await acceptFriendRequest(friend.connection_id);
      if (success) {
        console.log('Friend request accepted');
        // Reload friends to get updated status
        await loadFriends(session.user.id);
      } else {
        setError('Error accepting friend request');
      }
    } catch (err) {
      console.error('Error accepting friend request:', err);
      setError(`Error accepting friend request: ${err.message}`);
    }
  };

  const handleRejectFriendRequest = async (friend) => {
    try {
      const success = await rejectFriendRequest(friend.connection_id);
      if (success) {
        console.log('Friend request rejected');
        // Reload friends to get updated list
        await loadFriends(session.user.id);
      } else {
        setError('Error rejecting friend request');
      }
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      setError(`Error rejecting friend request: ${err.message}`);
    }
  };

  const handleAgentCreated = async (agentData) => {
    try {
      const result = await createAgent(agentData, session.user.id);
      if (result) {
        console.log('Agent created successfully:', result);
        setShowCreateAgent(false);
      } else {
        setError('Error creating agent');
      }
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(`Error creating agent: ${err.message}`);
    }
  };

  const handleAgentAction = async (action, agent) => {
    // 🎓 Tutorial: Prevenir acciones en agentes de tutorial
    if (agent.isTutorialAgent) {
      alert('🎓 This is a tutorial example agent. You can remove it at the end of the tutorial or create your own agents!');
      return;
    }

    switch (action) {
      case 'edit':
        setEditingAgent(agent);
        setShowCreateAgent(true);
        break;

      case 'delete':
        setAgentToDelete(agent);
        setShowDeleteAgentConfirm(true);
        break;

      case 'configure':
        setConfiguringAgent(agent);
        setShowConfigureAgent(true);
        break;

      default:
        console.log('Unknown action:', action);
    }
  };

  const confirmDeleteAgent = async () => {
    if (!agentToDelete) return;

    try {
      const success = await deleteAgent(agentToDelete.id, session.user.id);
      if (!success) {
        setError('Error deleting agent');
      }
    } catch (err) {
      setError(`Error deleting agent: ${err.message}`);
    } finally {
      setShowDeleteAgentConfirm(false);
      setAgentToDelete(null);
    }
  };

  const cancelDeleteAgent = () => {
    setShowDeleteAgentConfirm(false);
    setAgentToDelete(null);
  };

  const handleUpdateAgent = async (agentId, agentData) => {
    try {
      const success = await updateAgent(agentId, agentData, session.user.id);
      if (success) {
        console.log('Agent updated successfully');
        setShowCreateAgent(false);
        setEditingAgent(null);
      } else {
        setError('Error updating agent');
      }
    } catch (err) {
      console.error('Error updating agent:', err);
      setError(`Error updating agent: ${err.message}`);
    }
  };

  const handleCloseAgentModal = () => {
    setShowCreateAgent(false);
    setEditingAgent(null);
  };

  const handleConfigureAgent = async (agentId, configData) => {
    try {
      const success = await configureAgent(agentId, configData, session.user.id);
      if (success) {
        console.log('Agent configured successfully');
        setShowConfigureAgent(false);
        setConfiguringAgent(null);
      } else {
        setError('Error configuring agent');
      }
    } catch (err) {
      console.error('Error configuring agent:', err);
      setError(`Error configuring agent: ${err.message}`);
    }
  };

  const handleCloseConfigureModal = () => {
    setShowConfigureAgent(false);
    setConfiguringAgent(null);
  };

  return (
    <>
      <Head>
        <title>PAIA - Agent Library</title>
        <meta name="description" content="Manage your agents, flows and PAIA connections" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthGuard>
        <UserHeader />

        <div style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          paddingTop: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '1400px',
            padding: '30px 40px 20px 40px'
          }}>
            <Header
              title={`Welcome, ${session?.user?.name || session?.user?.email || 'User'}`}
              subtitle=""
              showNotifications={true}
              onNotificationsClick={() => setShowNotifications(true)}
              showTutorialButton={false}
              showConnectButton={true}
              onConnectClick={() => setShowConnectUser(true)}
              showCreateAgentButton={true}
              onCreateAgentClick={() => setShowCreateAgent(true)}
            />
          </div>

          <div style={{
            width: '100%',
            maxWidth: '1400px',
            padding: '0 40px 30px 40px'
          }}>
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                { key: 'flows', label: 'My Flows', desc: 'Workflows', count: myFlows.length },
                { key: 'agents', label: 'My Agents', desc: 'AI Assistants', count: myAgents.length },
                { key: 'friends', label: 'Friends', desc: 'Connections', count: friends.length },
                { key: 'active-flows', label: 'Active Flows', desc: 'From friends', count: friendsActiveFlows.length },
                { key: 'public-agents', label: 'Public Agents', desc: 'Community', count: publicAgents.length }
              ]}
            />

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #EF4444',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                color: '#EF4444',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                fontSize: '18px',
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}>
                Loading...
              </div>
            ) : (
              <div>
                {activeTab === 'flows' && (
                  <FlowsTab
                    flows={[...tutorialFlows, ...myFlows]}
                    loading={loading}
                    onCreateNew={() => navigateToCreate()}
                    onFlowAction={(action, flowId, extra) => {
                      // 🎓 Tutorial: Prevenir acciones en flows de tutorial
                      const allFlows = [...tutorialFlows, ...myFlows];
                      const targetFlow = allFlows.find(f => f.id === flowId);

                      if (targetFlow?.isTutorialFlow && action !== 'toggleStatus') {
                        alert('🎓 This is a tutorial example flow. You can remove it at the end of the tutorial or create your own flows!');
                        return;
                      }

                      switch (action) {
                        case 'edit':
                          navigateToCreate(flowId);
                          break;
                        case 'toggleStatus':
                          handleFlowStatusToggle(flowId, extra);
                          break;
                        case 'delete':
                          handleDeleteFlow(flowId);
                          break;
                        case 'duplicate':
                          handleDuplicateFlow(flowId);
                          break;
                        default:
                          console.warn('Unknown action:', action);
                      }
                    }}
                  />
                )}

                {activeTab === 'agents' && (
                  <AgentsTab
                    agents={[...tutorialAgents, ...myAgents]}
                    loading={loading}
                    onCreateNew={() => setShowCreateAgent(true)}
                    onAgentAction={handleAgentAction}
                  />
                )}

                {activeTab === 'friends' && (
                  <FriendsTab
                    friends={friends}
                    loading={loading}
                    onAddFriend={() => setShowConnectUser(true)}
                    onAcceptRequest={handleAcceptFriendRequest}
                    onRejectRequest={handleRejectFriendRequest}
                  />
                )}

                {activeTab === 'active-flows' && (
                  <ActiveFlowsTab
                    flows={friendsActiveFlows}
                  />
                )}

                {activeTab === 'public-agents' && (
                  <PublicAgentsTab
                    agents={publicAgents}
                  />
                )}
              </div>
            )}
          </div>

          {/* Modales */}
          {showConnectUser && (
            <ConnectUserModal
              isOpen={showConnectUser}
              onClose={() => setShowConnectUser(false)}
              currentUserId={session?.user?.id}
              onConnect={handleUserConnection}
              connectionMode="social"
            />
          )}

          {showCreateAgent && (
            <CreateAgentModal
              isOpen={showCreateAgent}
              onClose={handleCloseAgentModal}
              onCreateAgent={handleAgentCreated}
              onUpdateAgent={handleUpdateAgent}
              editMode={!!editingAgent}
              agentToEdit={editingAgent}
            />
          )}

          {showNotifications && (
            <NotificationPanel
              userId={session?.user?.id}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          )}

          {showConfigureAgent && (
            <ConfigureAgentModal
              isOpen={showConfigureAgent}
              onClose={handleCloseConfigureModal}
              onConfigure={handleConfigureAgent}
              agent={configuringAgent}
            />
          )}

          {showDeleteConfirm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color)'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: 'var(--text-primary)'
                }}>
                  Delete Flow
                </h2>
                <p style={{
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  lineHeight: '1.5'
                }}>
                  Are you sure you want to delete this flow? This action cannot be undone and will remove all associated data.
                </p>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={cancelDeleteFlow}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteFlow}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#EF4444',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {showDeleteAgentConfirm && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '450px',
                width: '90%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color)'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  color: 'var(--text-primary)'
                }}>
                  Delete Agent
                </h2>
                <p style={{
                  fontSize: '16px',
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                  lineHeight: '1.5'
                }}>
                  Are you sure you want to delete {agentToDelete?.name}? This action cannot be undone and will also delete all associated connections, messages, and settings.
                </p>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end'
                }}>
                  <button
                    onClick={cancelDeleteAgent}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteAgent}
                    style={{
                      padding: '10px 24px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#EF4444',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {showTutorial && (
            <TutorialModal
              steps={[
                {
                  title: 'Welcome to PAIA',
                  description: 'PAIA is your platform to create and manage custom AI agents. Here you can design workflows, connect with friends and share agents.',
                  image: null
                },
                {
                  title: 'My Flows',
                  description: 'In this section you can view, create and manage your workflows. Flows allow you to connect multiple agents and services to automate complex tasks.',
                  image: null
                },
                {
                  title: 'My Agents',
                  description: 'Create custom agents with different personalities and areas of expertise. You can make them public to share with the community.',
                  image: null
                },
                {
                  title: 'Connect with Friends',
                  description: 'Add friends to share flows and agents. Collaborate on projects and access resources shared by your network.',
                  image: null
                },
                {
                  title: 'Start Creating!',
                  description: 'Now you are ready to create your first flow or agent. Click "Create Flow" or navigate to the Agents tab to get started.',
                  image: null
                }
              ]}
              forceOpen={true}
              onClose={() => setShowTutorial(false)}
            />
          )}

          {/* Tutorial Manager */}
          <TutorialManager />

          {/* Contextual Help - shows tooltips for skipped tutorial elements */}
          <ContextualHelp />
        </div>
      </AuthGuard>
    </>
  );
}
