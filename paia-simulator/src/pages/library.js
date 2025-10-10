import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import {
  Zap,
  Bot,
  Globe,
  Link2,
  Plus,
  Edit,
  Pause,
  Play,
  Trash2,
  Library,
  Users,
  Bell,
  CheckCircle
} from 'lucide-react';
import UserHeader from '@/components/UserHeader';
import FriendsPanel from '@/components/FriendsPanel';
import NotificationPanel from '@/components/NotificationPanel';
import ConnectUserModal from '@/components/ConnectUserModal';
import CreateAgentModal from '@/components/CreateAgentModal';

export default function Library() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Estados principales
  const [activeTab, setActiveTab] = useState('flows'); // 'flows', 'agents', 'friends', 'active-flows'
  const [myFlows, setMyFlows] = useState([]);
  const [myAgents, setMyAgents] = useState([]);
  const [friendsActiveFlows, setFriendsActiveFlows] = useState([]);
  const [publicAgents, setPublicAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Estados de modales
  const [showConnectUser, setShowConnectUser] = useState(false);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
    }
  }, [session, status, router]);

  // Cargar datos iniciales
  useEffect(() => {
    if (session?.user?.id) {
      loadInitialData();
    }
  }, [session, activeTab]);

  const loadInitialData = async () => {
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
        case 'active-flows':
          await loadFriendsActiveFlows();
          break;
        case 'public-agents':
          await loadPublicAgents();
          break;
      }
    } catch (err) {
      setError(`Error cargando datos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMyFlows = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/user/${session.user.id}`);
    if (response.ok) {
      const data = await response.json();
      setMyFlows(data.flows || []);
    }
  };

  const loadMyAgents = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents?user_id=${session.user.id}`);
    if (response.ok) {
      const data = await response.json();
      setMyAgents(data.agents || []);
    }
  };

  const loadFriendsActiveFlows = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/friends/${session.user.id}/active`);
    if (response.ok) {
      const data = await response.json();
      setFriendsActiveFlows(data.active_flows || []);
    }
  };

  const loadPublicAgents = async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/public?exclude_user_id=${session.user.id}`);
    if (response.ok) {
      const data = await response.json();
      setPublicAgents(data.agents || []);
    }
  };

  const handleDeleteAgent = async (agentId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este agente?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: session.user.id })
      });

      if (response.ok) {
        await loadMyAgents(); // Recargar lista
      } else {
        const error = await response.json();
        alert(`Error eliminando agente: ${error.detail}`);
      }
    } catch (error) {
      alert(`Error eliminando agente: ${error.message}`);
    }
  };

  const handleDeleteFlow = async (flowId) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este flujo?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/${flowId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: session.user.id })
      });

      if (response.ok) {
        await loadMyFlows(); // Recargar lista
      } else {
        const error = await response.json();
        alert(`Error eliminando flujo: ${error.detail}`);
      }
    } catch (error) {
      alert(`Error eliminando flujo: ${error.message}`);
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
        await loadMyFlows(); // Recargar flujos
      }
    } catch (err) {
      setError(`Error actualizando flujo: ${err.message}`);
    }
  };

  const navigateToSimulator = (flowId = null) => {
    const url = flowId ? `/simulator?flow=${flowId}` : '/simulator';
    router.push(url);
  };

  const handleUserConnection = (connectionData) => {
    // Manejar conexión de usuario (social)
    console.log('User connected:', connectionData);
    setShowConnectUser(false);
  };

  const handleAgentCreated = (agentData) => {
    console.log('Agent created:', agentData);
    setShowCreateAgent(false);
    if (activeTab === 'agents') {
      loadMyAgents(); // Recargar agentes si estamos en esa pestaña
    }
  };

  if (status === 'loading') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '18px'
      }}>
        Cargando...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header con funciones movidas */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1000,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Library size={28} /> PAIA Biblioteca
            </h1>
            <button
              onClick={() => navigateToSimulator()}
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
              <Zap size={14} style={{ marginRight: '4px' }} /> Ir al Simulador
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Botones movidos del UserHeader */}
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
            <Bell size={14} style={{ marginRight: '4px' }} /> Notificaciones
          </button>

          <button
            onClick={() => setShowConnectUser(true)}
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
            <Users size={14} style={{ marginRight: '4px' }} /> Conectar Amigos
          </button>

          {/* Info del usuario */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {session.user.image && (
              <img 
                src={session.user.image} 
                alt="Avatar"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {session.user.name || session.user.email}
              </div>
              <div style={{ fontSize: '12px', opacity: 0.8 }}>
                {session.user.email}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div style={{ paddingTop: '80px', padding: '20px' }}>
        {/* Pestañas de navegación */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginBottom: '30px',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '10px'
        }}>
          {[
            { key: 'flows', label: 'Mis Flujos', icon: Zap, count: myFlows.length },
            { key: 'agents', label: 'Mis Agentes', icon: Bot, count: myAgents.length },
            { key: 'active-flows', label: 'Flujos Activos de Amigos', icon: Globe, count: friendsActiveFlows.length },
            { key: 'public-agents', label: 'Agentes Públicos', icon: Link2, count: publicAgents.length }
          ].map(tab => {
            const IconComponent = tab.icon;
            return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: activeTab === tab.key ? 'var(--primary-color)' : 'transparent',
                color: activeTab === tab.key ? 'white' : 'var(--text-primary)',
                border: activeTab === tab.key ? 'none' : '1px solid var(--border-color)',
                padding: '12px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <IconComponent size={16} />
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--primary-color)',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
          })}
        </div>

        {/* Contenido de pestañas */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#EF4444',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '16px', color: 'var(--text-secondary)' }}>
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
                  marginBottom: '20px'
                }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={20} /> Mis Flujos Guardados
                  </h2>
                  <button
                    onClick={() => navigateToSimulator()}
                    style={{
                      background: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <Plus size={16} /> Crear Nuevo Flujo
                  </button>
                </div>

                {myFlows.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ marginBottom: '16px' }}><Zap size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      No tienes flujos guardados
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      Crea tu primer flujo en el simulador y guárdalo para poder compartirlo con amigos.
                    </p>
                    <button
                      onClick={() => navigateToSimulator()}
                      style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <Zap size={16} /> Crear Mi Primer Flujo
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {myFlows.map(flow => (
                      <div
                        key={flow.id}
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '20px',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
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
                          marginBottom: '12px'
                        }}>
                          <h3 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            margin: 0,
                            color: 'var(--text-primary)'
                          }}>
                            {flow.name}
                          </h3>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: flow.is_active ? '#10B981' : '#6B7280'
                            }} />
                            <span style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary)'
                            }}>
                              {flow.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                        </div>

                        <p style={{
                          fontSize: '14px',
                          color: 'var(--text-secondary)',
                          margin: '0 0 16px 0',
                          lineHeight: '1.4'
                        }}>
                          {flow.description || 'Sin descripción'}
                        </p>

                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          marginBottom: '16px'
                        }}>
                          <span style={{
                            background: 'rgba(79, 70, 229, 0.1)',
                            color: 'var(--primary-color)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            v{flow.version}
                          </span>
                          {flow.is_public && (
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

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div style={{
                            display: 'flex',
                            gap: '8px'
                          }}>
                            <button
                              onClick={() => navigateToSimulator(flow.id)}
                              style={{
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              <Edit size={14} /> Editar
                            </button>
                            <button
                              onClick={() => handleFlowStatusToggle(flow.id, flow.is_active)}
                              style={{
                                background: flow.is_active ? '#EF4444' : '#10B981',
                                color: 'white',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500'
                              }}
                            >
                              {flow.is_active ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Activar</>}
                            </button>
                          </div>
                          
                          <button
                            onClick={() => handleDeleteFlow(flow.id)}
                            style={{
                              background: 'transparent',
                              color: '#EF4444',
                              border: '1px solid #EF4444',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        </div>

                        <div style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          marginTop: '12px',
                          paddingTop: '12px',
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
                  marginBottom: '20px'
                }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bot size={20} /> Mis Agentes Creados
                  </h2>
                  <button
                    onClick={() => setShowCreateAgent(true)}
                    style={{
                      background: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <Plus size={16} /> Crear Nuevo Agente
                  </button>
                </div>

                {myAgents.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ marginBottom: '16px' }}><Bot size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      No tienes agentes creados
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                      Crea tu primer agente especializado con personalidad y expertise únicos.
                    </p>
                    <button
                      onClick={() => setShowCreateAgent(true)}
                      style={{
                        background: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      <Bot size={16} /> Crear Mi Primer Agente
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
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Bot size={16} /> {agent.name}
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
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '16px'
                        }}>
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

                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            style={{
                              background: 'transparent',
                              color: '#EF4444',
                              border: '1px solid #EF4444',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
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
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Globe size={20} /> Flujos Activos de Amigos
                </h2>

                {friendsActiveFlows.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ marginBottom: '16px' }}><Globe size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      No hay flujos activos de amigos
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Los flujos activos de tus amigos aparecerán aquí cuando estén ejecutándose.
                    </p>
                  </div>
                ) : (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                  }}>
                    {friendsActiveFlows.map(flow => (
                      <div
                        key={flow.id}
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '20px',
                          borderLeft: '4px solid #10B981'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          {flow.owner.image && (
                            <img 
                              src={flow.owner.image} 
                              alt={flow.owner.name}
                              style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%'
                              }}
                            />
                          )}
                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            {flow.owner.name}
                          </span>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#10B981'
                          }} />
                          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '500' }}>
                            Activo
                          </span>
                        </div>
                        
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>
                          {flow.name}
                        </h3>
                        
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                          {flow.description || 'Sin descripción'}
                        </p>

                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Actualizado: {new Date(flow.updated_at).toLocaleDateString()}
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
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link2 size={20} /> Agentes Públicos de Amigos
                </h2>

                {publicAgents.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: 'var(--card-bg)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ marginBottom: '16px' }}><Link2 size={48} strokeWidth={1.5} /></div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                      No hay agentes públicos disponibles
                    </h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Los agentes públicos de tus amigos aparecerán aquí para que puedas usarlos en tus flujos.
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
                          borderLeft: '4px solid var(--primary-color)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Por {agent.owner_name}
                          </span>
                        </div>
                        
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Globe size={16} /> {agent.name}
                        </h3>
                        
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 8px 0' }}>
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

                        <button
                          style={{
                            background: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            width: '100%'
                          }}
                        >
                          <Plus size={14} /> Usar en Flujo
                        </button>
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
          currentUserId={session.user.id}
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
          userId={session.user.id}
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showFriends && (
        <FriendsPanel 
          userId={session.user.id}
          isOpen={showFriends}
          onClose={() => setShowFriends(false)}
        />
      )}
    </div>
  );
}