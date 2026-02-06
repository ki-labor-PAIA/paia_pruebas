import { useTranslation } from 'react-i18next';
import { HelpCircle, Save, Users, Search, UserPlus, Bell, Play, Infinity, Square, RotateCcw } from 'lucide-react';

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
  onShowFriends,
  isOpen = true
}) {
  const { t } = useTranslation();

  return (
    <div className={`sidebar left ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`} style={{
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>⚙️ PAIA Builder</h2>
        <button
          onClick={onShowGuide}
          className="discreet-button"
          style={{ width: 'auto', padding: '6px 8px' }}
          title="Show guide"
        >
          <HelpCircle size={16} />
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
        <div className="button-group-title">💾 File</div>
        <button data-tour="save-flow" data-tutorial="btn-save-flow" onClick={onSaveFlow} className="discreet-button" style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: '600',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <Save size={16} /> Save Flow
        </button>
      </div>


      <div className="button-group">
        <div className="button-group-title">🔗 Connections</div>
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
          <Users size={16} /> Friends
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
          <Search size={16} /> Search User
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
          <UserPlus size={16} /> Add Connection Node
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
          <Bell size={16} /> Notifications
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">▶️ Run Flow</div>
        {!isRunning ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              data-tour="start-simulation"
              data-tutorial="btn-run-flow"
              onClick={() => onRun({ mode: 'once' })}
              className="discreet-button simulation-button"
              style={{ fontSize: '0.9em', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Play size={16} />
              Run Once
            </button>
            <button
              onClick={() => onRun({ mode: 'persistent' })}
              className="discreet-button simulation-button"
              style={{
                fontSize: '0.9em',
                fontWeight: '600',
                backgroundColor: '#10B981',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Infinity size={16} />
              Keep Active
            </button>
          </div>
        ) : (
          <button
            data-tutorial="btn-stop-flow"
            onClick={onStop}
            className="discreet-button simulation-button"
            style={{ fontSize: '0.9em', fontWeight: '600', backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Square size={16} />
            Stop
          </button>
        )}
        <button data-tutorial="btn-clear-flow" onClick={onReset} className="discreet-button reset-button" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <RotateCcw size={16} /> {t('nav.reset')}
        </button>
      </div>
    </div>
  );
}