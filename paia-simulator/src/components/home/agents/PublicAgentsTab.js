export default function PublicAgentsTab({ publicAgents, loading, onUseAgent }) {
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
        Cargando...
      </div>
    );
  }

  if (!publicAgents || publicAgents.length === 0) {
    return (
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
            Agentes Públicos Disponibles
          </h2>
        </div>

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
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>
          Agentes Públicos Disponibles
        </h2>
      </div>

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
            {/* Agent Header with Creator Info */}
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
                  {agent.name}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                  por {agent.creator_name}
                </p>
              </div>
            </div>

            {/* Agent Details */}
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

            {/* Action and Stats */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => onUseAgent && onUseAgent(agent)}
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
                Usar en Flujo
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
                  {agent.usage_count || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
