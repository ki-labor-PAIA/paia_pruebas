import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Head from "next/head";
import AuthGuard from '@/components/AuthGuard';
import NotificationPanel from '@/components/NotificationPanel';
import ConnectUserModal from '@/components/ConnectUserModal';
import CreateAgentModal from '@/components/CreateAgentModal';
import TutorialModal from '@/components/tutorial/TutorialModal';

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
  const [myFlows, setMyFlows] = useState([]);
  const [myAgents, setMyAgents] = useState([]);
  const [friendsActiveFlows, setFriendsActiveFlows] = useState([]);
  const [publicAgents, setPublicAgents] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados de modales
  const [showConnectUser, setShowConnectUser] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.user?.id) {
      loadInitialData();
    }
  }, [session, activeTab]);

  const loadInitialData = async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError('');

    try {
      switch (activeTab) {
        case 'flows':
          await loadMyFlows();
          break;
        case 'agents':
          await loadMyAgents();
          break;
        case 'friends':
          await loadFriends();
          break;
        case 'active-flows':
          await loadFriendsActiveFlows();
          break;
        case 'public-agents':
          await loadPublicAgents();
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      // Comentado para no mostrar error cuando el backend no está disponible
      // setError(`Error cargando datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMyFlows = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/user/${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setMyFlows(data.flows || []);
      } else {
        console.warn('Backend no disponible, usando datos vacíos');
        setMyFlows([]);
      }
    } catch (error) {
      console.warn('Backend no disponible, usando datos vacíos:', error);
      setMyFlows([]);
    }
  };

  const loadMyAgents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents?user_id=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setMyAgents(data.agents || []);
      } else {
        console.warn('Backend no disponible, usando datos vacíos');
        setMyAgents([]);
      }
    } catch (error) {
      console.warn('Backend no disponible, usando datos vacíos:', error);
      setMyAgents([]);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${session.user.id}/connections`);
      if (response.ok) {
        const data = await response.json();
        setFriends(data.connections || []);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      throw error;
    }
  };

  const loadFriendsActiveFlows = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/friends/${session.user.id}/active`);
      if (response.ok) {
        const data = await response.json();
        setFriendsActiveFlows(data.active_flows || []);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading friends active flows:', error);
      throw error;
    }
  };

  const loadPublicAgents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/public?exclude_user_id=${session.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setPublicAgents(data.agents || []);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error loading public agents:', error);
      throw error;
    }
  };

  const handleFlowStatusToggle = async (flowId, currentStatus) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/${flowId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        await loadMyFlows();
      }
    } catch (err) {
      setError(`Error actualizando flujo: ${err.message}`);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este flujo?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/${flowId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: session.user.id })
      });

      if (response.ok) {
        await loadMyFlows();
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
      loadFriends();
    }
  };

  const handleAgentCreated = async (agentData) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: session.user.id,
          name: agentData.name,
          description: agentData.description,
          personality: agentData.personality,
          expertise: agentData.expertise,
          is_public: agentData.is_public
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Agent created successfully:', result);
        setShowCreateAgent(false);
        if (activeTab === 'agents') {
          loadMyAgents();
        }
      } else {
        const errorData = await response.json();
        setError(`Error creando agente: ${errorData.detail || 'Error desconocido'}`);
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
          {/* Header Principal */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '70px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 30px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>📚 PAIA</h1>
                <span style={{ fontSize: '16px', opacity: 0.9 }}>Biblioteca de Agentes</span>
              </div>
              <button
              data-tour="create-flow"
                onClick={() => navigateToCreate()}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                
                🎮 Crear Flujo
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
              >
                
                📢 Notificaciones
              </button>

                { showTutorialBtn && (
  <button
    data-tour="show-tutorial"
    onClick={() => setShowTutorial(true)}
    style={{
      background: 'rgba(255,255,255,0.2)',
      border: '1px solid rgba(255,255,255,0.3)',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background 0.2s'
    }}
    onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
    onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
  >
                🎓 Mostrar Tutorial
              </button>
                )}

              {/* Info del usuario */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {session?.user?.image && (
                  <img 
                    src={session.user.image} 
                    alt="Avatar"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)'
                    }}
                  />
                )}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>
                    {session?.user?.name || session?.user?.email}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>
                    {session?.user?.email}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contenido principal */}
          <div style={{ paddingTop: '90px', padding: '30px' }}>
            {/* Pestañas de navegación */}
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              marginBottom: '40px',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '15px'
            }}>
              {[
                { key: 'flows', label: '⚡ Mis Flujos', count: myFlows.length, desc: 'Flujos guardados' },
                { key: 'agents', label: '🤖 Mis Agentes', count: myAgents.length, desc: 'Agentes creados' },
                { key: 'friends', label: '👥 Amigos', count: friends.length, desc: 'Conexiones sociales' },
                { key: 'active-flows', label: '🌐 Flujos Activos', count: friendsActiveFlows.length, desc: 'De amigos' },
                { key: 'public-agents', label: '🔗 Agentes Públicos', count: publicAgents.length, desc: 'Disponibles' }
              ].map(tab => (
                <button
                  key={tab.key}
                   data-tour={tab.key === 'agents' ? 'agents-tab' : undefined}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    background: activeTab === tab.key ? 'var(--primary-color)' : 'var(--card-bg)',
                    color: activeTab === tab.key ? 'white' : 'var(--text-primary)',
                    border: activeTab === tab.key ? 'none' : '1px solid var(--border-color)',
                    padding: '15px 25px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    minWidth: '120px',
                    boxShadow: activeTab === tab.key ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span style={{
                        background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--primary-color)',
                        color: activeTab === tab.key ? 'white' : 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        {tab.count}
                      </span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    opacity: 0.7,
                    color: activeTab === tab.key ? 'white' : 'var(--text-secondary)'
                  }}>
                    {tab.desc}
                  </span>
                </button>
              ))}
            </div>

            {/* Contenido de pestañas */}
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
                ❌ {error}
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
                🔄 Cargando...
              </div>
            ) : (
              <div>
                {/* Pestaña: Mis Flujos */}
                {activeTab === 'flows' && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      <h2 data-tour="flows-section" style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        ⚡ Mis Flujos Guardados
                      </h2>
                      <button
                        onClick={() => navigateToCreate()}
                        style={{
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        ➕ Crear Nuevo Flujo
                      </button>
                    </div>

                    {myFlows.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '80px 40px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡</div>
                        <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                          ¡Crea tu primer flujo!
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}>
                          Diseña flujos de agentes inteligentes y guárdalos para compartir con amigos.<br/>
                          Conecta humanos, IAs y servicios externos de forma visual.
                        </p>
                        <button
                          onClick={() => navigateToCreate()}
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '14px 28px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}
                        >
                          🎮 Crear Mi Primer Flujo
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                      }}>
                        {myFlows.map(flow => (
                          <div
                            key={flow.id}
                            style={{
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '16px',
                              padding: '24px',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)';
                              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '16px'
                            }}>
                              <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: 0,
                                color: 'var(--text-primary)'
                              }}>
                                {flow.name}
                              </h3>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  backgroundColor: flow.is_active ? '#10B981' : '#6B7280'
                                }} />
                                <span style={{
                                  fontSize: '12px',
                                  color: 'var(--text-secondary)',
                                  fontWeight: '500'
                                }}>
                                  {flow.is_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </div>

                            <p style={{
                              fontSize: '14px',
                              color: 'var(--text-secondary)',
                              margin: '0 0 20px 0',
                              lineHeight: '1.5'
                            }}>
                              {flow.description || 'Sin descripción'}
                            </p>

                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              marginBottom: '20px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{
                                background: 'rgba(79, 70, 229, 0.1)',
                                color: 'var(--primary-color)',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                v{flow.version}
                              </span>
                              {flow.is_public && (
                                <span style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10B981',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}>
                                  Público
                                </span>
                              )}
                            </div>

                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                display: 'flex',
                                gap: '10px'
                              }}>
                                <button
                                  onClick={() => navigateToCreate(flow.id)}
                                  style={{
                                    background: 'var(--primary-color)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                >
                                  📝 Editar
                                </button>
                                <button
                                  onClick={() => handleFlowStatusToggle(flow.id, flow.is_active)}
                                  style={{
                                    background: flow.is_active ? '#EF4444' : '#10B981',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                >
                                  {flow.is_active ? '⏸️ Pausar' : '▶️ Activar'}
                                </button>
                              </div>
                              
                              <button
                                onClick={() => handleDeleteFlow(flow.id)}
                                style={{
                                  background: 'transparent',
                                  color: '#EF4444',
                                  border: '1px solid #EF4444',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                🗑️
                              </button>
                            </div>

                            <div style={{
                              fontSize: '11px',
                              color: 'var(--text-secondary)',
                              marginTop: '16px',
                              paddingTop: '16px',
                              borderTop: '1px solid var(--border-color)'
                            }}>
                              Actualizado: {new Date(flow.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pestaña: Mis Agentes */}
                {activeTab === 'agents' && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        🤖 Mis Agentes Creados
                      </h2>
                      <button
                        onClick={() => setShowCreateAgent(true)}
                        style={{
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        ➕ Crear Nuevo Agente
                      </button>
                    </div>

                    {myAgents.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '80px 40px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🤖</div>
                        <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                          ¡Crea tu primer agente!
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}>
                          Diseña agentes especializados con personalidades y expertise únicos.<br/>
                          Úsalos en tus flujos o compártelos con amigos.
                        </p>
                        <button
                          onClick={() => setShowCreateAgent(true)}
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '14px 28px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}
                        >
                          🎭 Crear Mi Primer Agente
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px'
                      }}>
                        {myAgents.map(agent => (
                          <div
                            key={agent.id}
                            style={{
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              padding: '20px'
                            }}
                          >
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>
                              🤖 {agent.name}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                              <strong>Personalidad:</strong> {agent.personality}
                            </p>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                              <strong>Expertise:</strong> {agent.expertise}
                            </p>
                            {agent.description && (
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
                                {agent.description}
                              </p>
                            )}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {agent.is_public && (
                                <span style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10B981',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  Público
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pestaña: Amigos */}
                {activeTab === 'friends' && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        👥 Mis Amigos
                      </h2>
                      <button
                        data-tour="connect-friend"
                        onClick={() => setShowConnectUser(true)}
                        style={{
                          background: 'var(--primary-color)',
                          color: 'white',
                          border: 'none',
                          padding: '12px 24px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        ➕ Conectar Amigo
                      </button>
                    </div>

                    {friends.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '80px 40px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>👥</div>
                        <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                          ¡Conecta con amigos!
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}>
                          Busca y conecta con otros usuarios para compartir flujos y agentes.<br/>
                          Colabora en proyectos y accede a recursos compartidos.
                        </p>
                        <button
                          onClick={() => setShowConnectUser(true)}
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '14px 28px',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: '600'
                          }}
                        >
                          🔍 Buscar Amigos
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px'
                      }}>
                        {friends.map(friend => (
                          <div
                            key={friend.connection_id}
                            style={{
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              padding: '20px',
                              borderLeft: '4px solid var(--primary-color)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                              {friend.friend_image && (
                                <img 
                                  src={friend.friend_image} 
                                  alt={friend.friend_name}
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%'
                                  }}
                                />
                              )}
                              <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                                  {friend.friend_name}
                                </h3>
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                                  {friend.friend_email}
                                </p>
                              </div>
                            </div>
                            
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '8px'
                            }}>
                              <span style={{ fontSize: '12px', fontWeight: '500' }}>
                                {friend.connection_type === 'friend' ? '👫 Amigo' : 
                                 friend.connection_type === 'colleague' ? '💼 Colega' : 
                                 '🤝 Colaborador'}
                              </span>
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Conectado {friend.connected_since ? new Date(friend.connected_since).toLocaleDateString() : 'recientemente'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pestaña: Flujos Activos de Amigos */}
                {activeTab === 'active-flows' && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        🌐 Flujos Activos de Amigos
                      </h2>
                    </div>

                    {friendsActiveFlows.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '80px 40px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌐</div>
                        <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                          No hay flujos activos
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}>
                          Cuando tus amigos activen sus flujos, aparecerán aquí.<br/>
                          Podrás conectarte y colaborar en tiempo real.
                        </p>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                      }}>
                        {friendsActiveFlows.map(flow => (
                          <div
                            key={`${flow.user_id}-${flow.id}`}
                            style={{
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '16px',
                              padding: '24px',
                              borderLeft: '4px solid #10B981'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '16px'
                            }}>
                              <h3 style={{
                                fontSize: '18px',
                                fontWeight: '600',
                                margin: 0,
                                color: 'var(--text-primary)'
                              }}>
                                {flow.name}
                              </h3>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  backgroundColor: '#10B981'
                                }} />
                                <span style={{
                                  fontSize: '12px',
                                  color: '#10B981',
                                  fontWeight: '600'
                                }}>
                                  En vivo
                                </span>
                              </div>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {flow.owner_image && (
                                  <img 
                                    src={flow.owner_image} 
                                    alt={flow.owner_name}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      borderRadius: '50%'
                                    }}
                                  />
                                )}
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                                  {flow.owner_name}
                                </span>
                              </div>
                            </div>

                            <p style={{
                              fontSize: '14px',
                              color: 'var(--text-secondary)',
                              margin: '0 0 20px 0',
                              lineHeight: '1.5'
                            }}>
                              {flow.description || 'Sin descripción'}
                            </p>

                            <div style={{
                              display: 'flex',
                              gap: '8px',
                              marginBottom: '20px',
                              flexWrap: 'wrap'
                            }}>
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: '#10B981',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                v{flow.version}
                              </span>
                              {flow.is_public && (
                                <span style={{
                                  background: 'rgba(79, 70, 229, 0.1)',
                                  color: 'var(--primary-color)',
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}>
                                  Público
                                </span>
                              )}
                            </div>

                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <button
                                onClick={() => {
                                  // TODO: Implementar conexión al flujo activo
                                  alert('Función de conexión a flujos activos en desarrollo');
                                }}
                                style={{
                                  background: '#10B981',
                                  color: 'white',
                                  border: 'none',
                                  padding: '10px 20px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                🔌 Conectar
                              </button>

                              <div style={{
                                fontSize: '11px',
                                color: 'var(--text-secondary)'
                              }}>
                                Activo desde: {new Date(flow.activated_at || flow.updated_at).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pestaña: Agentes Públicos */}
                {activeTab === 'public-agents' && (
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      marginBottom: '24px'
                    }}>
                      <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
                        🔗 Agentes Públicos Disponibles
                      </h2>
                    </div>

                    {publicAgents.length === 0 ? (
                      <div style={{
                        textAlign: 'center',
                        padding: '80px 40px',
                        backgroundColor: 'var(--card-bg)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔗</div>
                        <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
                          No hay agentes públicos disponibles
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '16px', lineHeight: '1.5' }}>
                          Los agentes públicos creados por otros usuarios aparecerán aquí.<br/>
                          Podrás usarlos en tus propios flujos.
                        </p>
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px'
                      }}>
                        {publicAgents.map(agent => (
                          <div
                            key={agent.id}
                            style={{
                              backgroundColor: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '12px',
                              padding: '20px',
                              borderLeft: '4px solid var(--primary-color)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                              {agent.creator_image && (
                                <img 
                                  src={agent.creator_image} 
                                  alt={agent.creator_name}
                                  style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%'
                                  }}
                                />
                              )}
                              <div>
                                <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 4px 0' }}>
                                  🤖 {agent.name}
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                                  por {agent.creator_name}
                                </p>
                              </div>
                            </div>

                            <div style={{ marginBottom: '12px' }}>
                              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                                <strong>Personalidad:</strong> {agent.personality}
                              </p>
                              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
                                <strong>Expertise:</strong> {agent.expertise}
                              </p>
                              {agent.description && (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 12px 0', fontStyle: 'italic' }}>
                                  "{agent.description}"
                                </p>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <button
                                onClick={() => {
                                  // TODO: Implementar funcionalidad de usar agente público
                                  alert('Función para usar agentes públicos en desarrollo');
                                }}
                                style={{
                                  background: 'var(--primary-color)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                📥 Usar en Flujo
                              </button>

                              <div style={{
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center'
                              }}>
                                <span style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10B981',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}>
                                  Público
                                </span>
                                <span style={{
                                  fontSize: '11px',
                                  color: 'var(--text-secondary)'
                                }}>
                                  ⭐ {agent.usage_count || 0}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
