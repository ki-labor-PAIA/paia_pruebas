import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from "next/head";
import AuthGuard from '@/components/AuthGuard';
import NotificationPanel from '@/components/NotificationPanel';
import ConnectUserModal from '@/components/ConnectUserModal';
import CreateAgentModal from '@/components/CreateAgentModal';
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

  // Mostrar siempre el botón del tutorial
  const showTutorialBtn = true;

  // Estados principales
  const [activeTab, setActiveTab] = useState('flows');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data hooks
  const {
    flows: myFlows,
    loadFlows,
    toggleFlowStatus,
    deleteFlow
  } = useFlowsData();

  const {
    agents: myAgents,
    loadAgents,
    createAgent
  } = useAgentsData();

  const {
    friends,
    loadFriends
  } = useFriendsData();

  const {
    activeFlows: friendsActiveFlows,
    publicAgents,
    loadActiveFlows,
    loadPublicAgents
  } = usePublicData();

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

  const handleFlowStatusToggle = async (flowId, currentStatus) => {
    try {
      const success = await toggleFlowStatus(flowId, currentStatus);
      if (!success) {
        setError('Error actualizando flujo');
      }
    } catch (err) {
      setError(`Error actualizando flujo: ${err.message}`);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este flujo?')) return;

    try {
      const success = await deleteFlow(flowId, session.user.id);
      if (!success) {
        setError('Error eliminando flujo');
      }
    } catch (err) {
      setError(`Error eliminando flujo: ${err.message}`);
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

  const handleAgentCreated = async (agentData) => {
    try {
      const result = await createAgent(agentData, session.user.id);
      if (result) {
        console.log('Agent created successfully:', result);
        setShowCreateAgent(false);
      } else {
        setError('Error creando agente');
      }
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(`Error creando agente: ${err.message}`);
    }
  };

  return (
    <>
      <Head>
        <title>PAIA - Biblioteca de Agentes</title>
        <meta name="description" content="Gestiona tus agentes, flujos y conexiones PAIA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AuthGuard>
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
          <Header
            session={session}
            showTutorialBtn={showTutorialBtn}
            onCreateFlow={() => navigateToCreate()}
            onToggleNotifications={() => setShowNotifications(!showNotifications)}
            onShowTutorial={() => setShowTutorial(true)}
          />

          <div style={{ paddingTop: '90px', padding: '30px' }}>
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabs={[
                { key: 'flows', label: 'Mis Flujos', desc: 'Workflows', count: myFlows.length },
                { key: 'agents', label: 'Mis Agentes', desc: 'Asistentes IA', count: myAgents.length },
                { key: 'friends', label: 'Amigos', desc: 'Conexiones', count: friends.length },
                { key: 'active-flows', label: 'Flujos Activos', desc: 'De amigos', count: friendsActiveFlows.length },
                { key: 'public-agents', label: 'Agentes Publicos', desc: 'Comunidad', count: publicAgents.length }
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
                Cargando...
              </div>
            ) : (
              <div>
                {activeTab === 'flows' && (
                  <FlowsTab
                    flows={myFlows}
                    onCreateFlow={() => navigateToCreate()}
                    onEditFlow={(flowId) => navigateToCreate(flowId)}
                    onToggleStatus={handleFlowStatusToggle}
                    onDeleteFlow={handleDeleteFlow}
                  />
                )}

                {activeTab === 'agents' && (
                  <AgentsTab
                    agents={myAgents}
                    onCreateAgent={() => setShowCreateAgent(true)}
                  />
                )}

                {activeTab === 'friends' && (
                  <FriendsTab
                    friends={friends}
                    onConnectFriend={() => setShowConnectUser(true)}
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
              onClose={() => setShowCreateAgent(false)}
              onCreateAgent={handleAgentCreated}
            />
          )}

          {showNotifications && (
            <NotificationPanel
              userId={session?.user?.id}
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          )}

          {showTutorial && (
            <TutorialModal
              steps={[
                {
                  title: 'Bienvenido a PAIA',
                  description: 'PAIA es tu plataforma para crear y gestionar agentes de IA personalizados. Aquí puedes diseñar flujos de trabajo, conectar con amigos y compartir agentes.',
                  image: null
                },
                {
                  title: 'Mis Flujos',
                  description: 'En esta sección puedes ver, crear y gestionar tus flujos de trabajo. Los flujos te permiten conectar múltiples agentes y servicios para automatizar tareas complejas.',
                  image: null
                },
                {
                  title: 'Mis Agentes',
                  description: 'Crea agentes personalizados con diferentes personalidades y áreas de expertise. Puedes hacerlos públicos para compartirlos con la comunidad.',
                  image: null
                },
                {
                  title: 'Conecta con Amigos',
                  description: 'Agrega amigos para compartir flujos y agentes. Colabora en proyectos y accede a los recursos compartidos por tu red.',
                  image: null
                },
                {
                  title: '¡Comienza a Crear!',
                  description: 'Ahora estás listo para crear tu primer flujo o agente. Haz clic en "Crear Flujo" o navega a la pestaña de Agentes para comenzar.',
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
