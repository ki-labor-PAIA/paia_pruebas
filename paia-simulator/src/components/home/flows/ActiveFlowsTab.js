export default function ActiveFlowsTab({ friendsActiveFlows = [], loading = false, onConnectToFlow }) {
  if (loading) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px',
        fontSize: '18px',
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        Cargando flujos activos...
      </div>
    );
  }

  if (friendsActiveFlows.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 40px',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '20px',
          filter: 'grayscale(0.3) opacity(0.8)'
        }}>
          🌐
        </div>
        <h3 style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '12px',
          color: 'var(--text-primary)'
        }}>
          No hay flujos activos
        </h3>
        <p style={{
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          fontSize: '16px',
          lineHeight: '1.5',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          Cuando tus amigos activen sus flujos, aparecerán aquí.
          <br/>
          Podrás conectarte y colaborar en tiempo real.
        </p>
      </div>
    );
  }

  const getTimeActive = (activatedAt, updatedAt) => {
    const timestamp = new Date(activatedAt || updatedAt);
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} día${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `${diffMins} min${diffMins > 1 ? 's' : ''}`;
    } else {
      return 'Ahora mismo';
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          margin: 0,
          color: 'var(--text-primary)'
        }}>
          Flujos Activos de Amigos
        </h2>
        <div style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <span>{friendsActiveFlows.length} flujo{friendsActiveFlows.length !== 1 ? 's' : ''} en vivo</span>
        </div>
      </div>

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
              borderLeft: '4px solid #10B981',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Header del flujo con nombre y estado en vivo */}
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
                color: 'var(--text-primary)',
                lineHeight: '1.3',
                flex: 1,
                paddingRight: '12px'
              }}>
                {flow.name}
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flexShrink: 0
              }}>
                <span style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
                <span style={{
                  fontSize: '12px',
                  color: '#10B981',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}>
                  En vivo
                </span>
              </div>
            </div>

            {/* Información del dueño */}
            <div style={{
              marginBottom: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {flow.owner_image ? (
                  <img
                    src={flow.owner_image}
                    alt={flow.owner_name}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      border: '2px solid rgba(16, 185, 129, 0.2)',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {flow.owner_name ? flow.owner_name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {flow.owner_name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    Propietario
                  </div>
                </div>
              </div>
            </div>

            {/* Descripción del flujo */}
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: '0 0 20px 0',
              lineHeight: '1.5',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minHeight: '63px'
            }}>
              {flow.description || 'Sin descripción disponible'}
            </p>

            {/* Badges de versión y visibilidad */}
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
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                v{flow.version || '1.0'}
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

            {/* Footer con botón de conexión y tiempo activo */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  if (onConnectToFlow) {
                    onConnectToFlow(flow);
                  }
                }}
                style={{
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#059669';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#10B981';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <span style={{ fontSize: '14px' }}>🔌</span>
                Conectar
              </button>

              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'right',
                lineHeight: '1.4',
                flex: 1,
                minWidth: 0
              }}>
                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                  Activo hace:
                </div>
                <div style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {getTimeActive(flow.activated_at, flow.updated_at)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
