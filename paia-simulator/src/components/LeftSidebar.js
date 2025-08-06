import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

export default function LeftSidebar({
  scenarioName,
  setScenarioName,
  scenarioDesc,
  setScenarioDesc,
  onPresetChange,
  onImport,
  onExport,
  onSimulate,
  onReset,
  isSimulating,
  onShowGuide,
  useBackend,
  setUseBackend,
  isBackendConnected,
  onCheckBackend
}) {
  const fileInputRef = useRef(null);
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handlePresetChange = (e) => {
    const value = e.target.value;
    if (value) {
      onPresetChange(value);
      e.target.value = '';
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
    }
  };

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

      <select onChange={handlePresetChange} className="discreet-button" style={{ marginBottom: 0 }}>
        <option value="">{t('scenarios.choose')}</option>
        <option value="trash">🗑️ {t('scenarios.trash.name')}</option>
        <option value="calendar">📅 {t('scenarios.calendar.name')}</option>
        <option value="party">🎉 {t('scenarios.party.name')}</option>
      </select>

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
        <div className="button-group-title">Gestión de Escenarios</div>
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="application/json" 
          style={{ display: 'none' }}
        />
        <button onClick={handleImport} className="discreet-button">
          <i className="fas fa-file-import"></i> Importar JSON
        </button>
        <button onClick={onExport} className="discreet-button">
          <i className="fas fa-file-export"></i> Exportar JSON
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">Backend PAIA</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <input 
            type="checkbox" 
            id="useBackend"
            checked={useBackend}
            onChange={(e) => setUseBackend(e.target.checked)}
            disabled={!isBackendConnected}
          />
          <label htmlFor="useBackend" style={{ fontSize: '0.9em', color: 'var(--text-primary)' }}>
            Usar backend PAIA
          </label>
        </div>
        <div style={{ 
          fontSize: '0.8em', 
          color: isBackendConnected ? 'var(--success-color)' : 'var(--danger-color)',
          marginBottom: '8px'
        }}>
          {isBackendConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>
        <button 
          onClick={onCheckBackend} 
          className="discreet-button"
          style={{ fontSize: '0.8em', padding: '6px 10px' }}
        >
          <i className="fas fa-sync-alt"></i> Verificar conexión
        </button>
      </div>

      <div className="button-group">
        <div className="button-group-title">💾 Archivo</div>
        <button onClick={onExport} className="discreet-button">
          <i className="fas fa-download"></i> Guardar Sistema
        </button>
        <button onClick={handleImport} className="discreet-button">
          <i className="fas fa-upload"></i> Cargar Sistema
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json"
          style={{ display: 'none' }}
        />
      </div>

      <div className="button-group">
        <div className="button-group-title">🌐 {t('language.english')}</div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => changeLanguage('en')}
            className={`language-button ${i18n.language === 'en' ? 'active' : ''}`}
            style={{
              padding: '6px 10px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: i18n.language === 'en' ? '#007bff' : '#f8f9fa',
              color: i18n.language === 'en' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: i18n.language === 'en' ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
              flex: '1',
              minWidth: '60px'
            }}
          >
            🇺🇸 EN
          </button>
          <button 
            onClick={() => changeLanguage('es')}
            className={`language-button ${i18n.language === 'es' ? 'active' : ''}`}
            style={{
              padding: '6px 10px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: i18n.language === 'es' ? '#007bff' : '#f8f9fa',
              color: i18n.language === 'es' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: i18n.language === 'es' ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
              flex: '1',
              minWidth: '60px'
            }}
          >
            🇪🇸 ES
          </button>
          <button 
            onClick={() => changeLanguage('fr')}
            className={`language-button ${i18n.language === 'fr' ? 'active' : ''}`}
            style={{
              padding: '6px 10px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: i18n.language === 'fr' ? '#007bff' : '#f8f9fa',
              color: i18n.language === 'fr' ? 'white' : '#333',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: i18n.language === 'fr' ? 'bold' : 'normal',
              transition: 'all 0.2s ease',
              flex: '1',
              minWidth: '60px'
            }}
          >
            🇫🇷 FR
          </button>
        </div>
      </div>

      <div className="button-group">
        <div className="button-group-title">▶️ {t('nav.simulate')}</div>
        <button 
          onClick={onSimulate} 
          className="discreet-button simulation-button"
          disabled={isSimulating}
          style={{ fontSize: '0.9em', fontWeight: '600' }}
        >
          <i className={`fas ${isSimulating ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> 
          {isSimulating ? t('status.simulating') : t('nav.simulate')}
        </button>
        <button onClick={onReset} className="discreet-button reset-button">
          <i className="fas fa-redo"></i> {t('nav.reset')}
        </button>
      </div>
    </div>
  );
}