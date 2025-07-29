export default function RightSidebar({ 
  onAddActor, 
  onConnect, 
  onCreateAgent, 
  onChatWithAgent, 
  nodes,
  publicAgents,
  onLoadPublicAgents,
  onAddPublicAgent,
  isBackendConnected 
}) {
  return (
    <div className="sidebar right">
      <div className="button-group">
        <div className="button-group-title">Agregar Actores</div>
        <button onClick={() => onAddActor('human')} className="discreet-button">
          <i className="fas fa-user"></i> Humano Simple
        </button>
        <button onClick={() => onAddActor('ai')} className="discreet-button">
          <i className="fas fa-robot"></i> IA Simple
        </button>
        <button onClick={onCreateAgent} className="discreet-button" style={{ background: 'var(--primary-color) !important', color: 'white !important' }}>
          <i className="fas fa-cog"></i> Crear Agente PAIA
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">Conexiones</div>
        <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Arrastra desde un nodo a otro para conectarlos
        </div>
      </div>

      {isBackendConnected && (
        <div className="button-group">
          <div className="button-group-title">Agentes Públicos</div>
          <button 
            onClick={onLoadPublicAgents}
            className="discreet-button"
            style={{ marginBottom: '10px' }}
          >
            🌐 Cargar Agentes Disponibles
          </button>
          
          {publicAgents.length > 0 && (
            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
              {publicAgents.map(agent => (
                <div 
                  key={agent.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',  
                    marginBottom: '6px',
                    padding: '6px 8px',
                    background: 'rgba(108, 92, 231, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(108, 92, 231, 0.3)'
                  }}
                >
                  <div style={{ fontSize: '0.75em', flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{agent.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                      {agent.expertise} • {agent.user_id}
                    </div>
                  </div>
                  <button
                    onClick={() => onAddPublicAgent(agent)}
                    style={{
                      padding: '2px 6px',
                      fontSize: '0.7em',
                      background: 'var(--primary-color)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {publicAgents.length === 0 && (
            <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Carga agentes para conectar con otros usuarios
            </div>
          )}
        </div>
      )}

      <div className="button-group">
        <div className="button-group-title">💬 Chat con Agentes</div>
        {nodes.length > 0 ? (
          <div style={{ maxHeight: '200px', overflow: 'auto' }}>
            {nodes.map(node => (
              <button
                key={node.id}
                onClick={() => onChatWithAgent(node.id)}
                className="discreet-button"
                style={{ 
                  marginBottom: '6px',
                  padding: '8px 10px !important',
                  fontSize: '0.8em',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...(node.data.isExternal && {
                    border: '1px dashed #6c5ce7',
                    background: 'rgba(108, 92, 231, 0.05)'
                  }),
                  ...(node.data.actorType === 'human' && {
                    border: '1px solid #f59e0b',
                    background: 'rgba(245, 158, 11, 0.1)'
                  })
                }}
              >
                <span>
                  {node.data.emoji} {node.data.label}
                </span>
                <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>
                  {node.data.isExternal && '(externo)'}
                  {node.data.actorType === 'human' && '(tú)'}
                  {node.data.actorType === 'ai' && !node.data.isExternal && '(IA)'}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ 
            fontSize: '0.8em', 
            color: 'var(--text-secondary)', 
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '16px 8px',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '6px',
            border: '1px dashed var(--border-color)'
          }}>
            <div style={{ marginBottom: '8px', fontSize: '1.5em' }}>💬</div>
            <div>Agrega actores para comenzar a chatear</div>
            <div style={{ fontSize: '0.7em', marginTop: '4px' }}>
              Usa los botones de arriba para crear agentes
            </div>
          </div>
        )}
      </div>
    </div>
  );
}