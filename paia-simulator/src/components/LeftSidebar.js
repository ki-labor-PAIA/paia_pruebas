import { useTranslation } from 'react-i18next';

export default function LeftSidebar({
  scenarioName,
  setScenarioName,
  scenarioDesc,
  setScenarioDesc,
  onRun,
  onStop,
  onReset,
  isRunning,
  onShowGuide,
  onAddConnectionNode,
  onSaveFlow,
  onConnectUser,
  onShowFriends
}) {
  const { t } = useTranslation();

  return (
    <div className="sidebar left">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>⚙️ PAIA Builder</h2>
        <button 
          onClick={onShowGuide} 
          className="discreet-button" 
          style={{ width: 'auto', padding: '6px 8px' }} 
          title="Mostrar guía"
        >
          <i className="fas fa-question"></i>
        </button>
      </div>


      <input 
        type="text" 
        value={scenarioName}
        onChange={(e) => setScenarioName(e.target.value)}
        placeholder={t('form.placeholder.scenarioName')}
      />
      
      <textarea 
        value={scenarioDesc}
        onChange={(e) => setScenarioDesc(e.target.value)}
        placeholder={t('form.placeholder.scenarioDescription')} 
        rows="3"
      />



      <div className="button-group">
        <div className="button-group-title">💾 Archivo</div>
        <button onClick={onSaveFlow} className="discreet-button" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          color: 'white',
          fontWeight: '600',
          border: 'none'
        }}>
          <i className="fas fa-save"></i> Guardar Flujo
        </button>
      </div>


      <div className="button-group">
        <div className="button-group-title">🔗 Conexiones</div>
        <button 
          onClick={onShowFriends} 
          className="discreet-button"
          style={{ 
            fontSize: '0.85em', 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            width: '100%',
            justifyContent: 'center',
            marginBottom: '8px'
          }}
        >
          <i className="fas fa-users"></i> Amigos
        </button>
        <button 
          onClick={onConnectUser} 
          className="discreet-button"
          style={{ 
            fontSize: '0.85em', 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            width: '100%',
            justifyContent: 'center'
          }}
        >
          <i className="fas fa-search"></i> Buscar Usuario
        </button>
        <button 
          onClick={() => onAddConnectionNode && onAddConnectionNode('user')} 
          className="discreet-button"
          style={{ 
            fontSize: '0.85em', 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px'
          }}
        >
          👤 Añadir Nodo Conexión
        </button>
        <button 
          onClick={() => onAddConnectionNode && onAddConnectionNode('notification')} 
          className="discreet-button"
          style={{ 
            fontSize: '0.85em', 
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px'
          }}
        >
          📢 Notificaciones
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">▶️ Ejecutar Flujo</div>
        {!isRunning ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => onRun({ mode: 'once' })}
              className="discreet-button simulation-button"
              style={{ fontSize: '0.9em', fontWeight: '600' }}
            >
              <i className="fas fa-play"></i>
              Run Once
            </button>
            <button
              onClick={() => onRun({ mode: 'persistent' })}
              className="discreet-button simulation-button"
              style={{
                fontSize: '0.9em',
                fontWeight: '600',
                backgroundColor: '#10B981',
                color: 'white'
              }}
            >
              <i className="fas fa-infinity"></i>
              Keep Active
            </button>
          </div>
        ) : (
          <button
            onClick={onStop}
            className="discreet-button simulation-button"
            style={{ fontSize: '0.9em', fontWeight: '600', backgroundColor: '#ef4444', color: 'white' }}
          >
            <i className="fas fa-stop"></i>
            Stop
          </button>
        )}
        <button onClick={onReset} className="discreet-button reset-button">
          <i className="fas fa-redo"></i> {t('nav.reset')}
        </button>
      </div>
    </div>
  );
}