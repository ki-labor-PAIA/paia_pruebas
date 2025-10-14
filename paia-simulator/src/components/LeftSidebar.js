import { useTranslation } from 'react-i18next';
import {
  Settings,
  HelpCircle,
  Save,
  Link2,
  Users,
  Search,
  UserPlus,
  Bell,
  Play,
  Infinity,
  Square,
  RotateCcw
} from 'lucide-react';

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
        <h2><Settings size={20} /> PAIA Builder</h2>
        <button
          onClick={onShowGuide}
          className="discreet-button"
          style={{ width: 'auto', padding: '8px 10px' }}
          title={t('leftSidebar.showGuide')}
        >
          <HelpCircle size={18} />
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
        <div className="button-group-title">{t('leftSidebar.file')}</div>
        <button onClick={onSaveFlow} className="discreet-button" style={{
          background: 'linear-gradient(135deg, #3e6ae1 0%, #2851c7 100%)',
          color: 'white',
          fontWeight: '600',
          border: 'none'
        }}>
          <Save size={16} /> {t('nav.saveFlow')}
        </button>
      </div>


      <div className="button-group">
        <div className="button-group-title">{t('leftSidebar.connections')}</div>
        <button
          onClick={onShowFriends}
          className="discreet-button"
        >
          <Users size={16} /> {t('leftSidebar.friends')}
        </button>
        <button
          onClick={onConnectUser}
          className="discreet-button"
        >
          <Search size={16} /> {t('leftSidebar.searchUser')}
        </button>
        <button
          onClick={() => onAddConnectionNode && onAddConnectionNode('user')}
          className="discreet-button"
        >
          <UserPlus size={16} /> {t('leftSidebar.addConnectionNode')}
        </button>
        <button
          onClick={() => onAddConnectionNode && onAddConnectionNode('notification')}
          className="discreet-button"
        >
          <Bell size={16} /> {t('leftSidebar.notifications')}
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">{t('leftSidebar.runFlow')}</div>
        {!isRunning ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => onRun({ mode: 'once' })}
              className="discreet-button simulation-button"
            >
              <Play size={16} />
              {t('leftSidebar.runOnce')}
            </button>
            <button
              onClick={() => onRun({ mode: 'persistent' })}
              className="discreet-button simulation-button"
              style={{
                backgroundColor: '#00d26a',
                color: 'white',
                border: 'none'
              }}
            >
              <Infinity size={16} />
              {t('leftSidebar.keepActive')}
            </button>
          </div>
        ) : (
          <button
            onClick={onStop}
            className="discreet-button simulation-button"
            style={{ backgroundColor: '#ff453a', color: 'white', border: 'none' }}
          >
            <Square size={16} />
            {t('nav.stop')}
          </button>
        )}
        <button onClick={onReset} className="discreet-button reset-button">
          <RotateCcw size={16} /> {t('nav.reset')}
        </button>
      </div>
    </div>
  );
}