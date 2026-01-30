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

  const handleDeleteFlow = async (flowId) => {
    if (!confirm('Are you sure you want to delete this flow?')) return;

    try {
      const success = await deleteFlow(flowId, session.user.id);
      if (!success) {
        setError('Error deleting flow');
      }
    } catch (err) {
      setError(`Error deleting flow: ${err.message}`);
    }
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
    switch (action) {
      case 'edit':
        setEditingAgent(agent);
        setShowCreateAgent(true);
        break;

      case 'delete':
        try {
          const success = await deleteAgent(agent.id, session.user.id);
          if (!success) {
            setError('Error deleting agent');
          }
        } catch (err) {
          setError(`Error deleting agent: ${err.message}`);
        }
        break;

      case 'configure':
        setConfiguringAgent(agent);
        setShowConfigureAgent(true);
        break;

      default:
        console.log('Unknown action:', action);
    }
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
              showNotifications={false}
              showTutorialButton={false}
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
                    flows={myFlows}
                    loading={loading}
                    onCreateNew={() => navigateToCreate()}
                    onFlowAction={(action, flowId, extra) => {
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
                    agents={myAgents}
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
        </div>
      </AuthGuard>
    </>
  );
}
