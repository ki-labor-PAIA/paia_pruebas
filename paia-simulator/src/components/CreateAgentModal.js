
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function CreateAgentModal({ isOpen, onClose, onCreateAgent, initialData }) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: 'Analítico',
    expertise: 'general',
    is_capability_node: false,
    customColor: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert(t('createAgent.nameRequired'));
      return;
    }

    onCreateAgent(formData);
    setFormData({
      name: '',
      description: '',
      personality: 'Analítico',
      expertise: 'general',
      is_public: true,
      is_capability_node: false
    });
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      description: '',
      personality: 'Analítico',
      expertise: 'general',
      is_public: true,
      is_capability_node: false
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t('createAgent.title')}</h3>
        </div>
        
        <div className="modal-body" style={{ padding: '4px 0' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '0.9em', 
              fontWeight: '500',
              color: 'var(--text-primary)' 
            }}>
              {t('createAgent.agentName')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t('createAgent.agentNamePlaceholder')}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.9em'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontSize: '0.9em', 
              fontWeight: '500',
              color: 'var(--text-primary)' 
            }}>
              {t('createAgent.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('createAgent.descriptionPlaceholder')}
              rows="3"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.9em',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontSize: '0.9em', 
              fontWeight: '500',
              color: 'var(--text-primary)' 
            }}>
              {t('createAgent.personality')}
            </label>
            <select
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(174, 192, 176, 0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.9em'
              }}
            >
              <option value="Analítico" style={{ backgroundColor: "#1E2E57" }}>Analítico</option>
              <option value="Creativo" style={{ backgroundColor: "#1E2E57" }}>Creativo</option>
              <option value="Empático" style={{ backgroundColor: "#1E2E57" }}>Empático</option>
              <option value="Pragmático" style={{ backgroundColor: "#1E2E57" }}>Pragmático</option>
              <option value="Entusiasta" style={{ backgroundColor: "#1E2E57" }}>Entusiasta</option>
              <option value="Metódico" style={{ backgroundColor: "#1E2E57" }}>Metódico</option>
              <option value="Innovador" style={{ backgroundColor: "#1E2E57" }}>Innovador</option>
              <option value="Colaborativo" style={{ backgroundColor: "#1E2E57" }}>Colaborativo</option>
              <option value="Estratégico" style={{ backgroundColor: "#1E2E57" }}>Estratégico</option>
              <option value="Aventurero" style={{ backgroundColor: "#1E2E57" }}>Aventurero</option>
              <option value="Reflexivo" style={{ backgroundColor: "#1E2E57" }}>Reflexivo</option>
              <option value="Dinámico" style={{ backgroundColor: "#1E2E57" }}>Dinámico</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '6px', 
              fontSize: '0.9em', 
              fontWeight: '500',
              color: 'var(--text-primary)' 
            }}>
              {t('createAgent.expertise')}
            </label>
            <select
              value={formData.expertise}
              onChange={(e) => handleChange('expertise', e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.9em'
              }}
            >

              <option value="general" style={{ backgroundColor: "#1E2E57" }}>{t('createAgent.expertiseAreas.general')}</option>
              <option value="scheduling" style={{ backgroundColor: "#1E2E57" }}>{t('createAgent.expertiseAreas.scheduling')}</option>
              <option value="travel" style={{ backgroundColor: "#1E2E57" }}>{t('createAgent.expertiseAreas.travel')}</option>
              <option value="research" style={{ backgroundColor: "#1E2E57" }}>{t('createAgent.expertiseAreas.research')}</option>
              <option value="creativity" style={{ backgroundColor: "#1E2E57" }}>{t('createAgent.expertiseAreas.creativity')}</option>
              <option value="finance" style={{ backgroundColor: "#1E2E57" }}>{t('createAgent.expertiseAreas.finance')}</option>

            </select>
          </div>

          {formData.expertise === 'notes' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.9em',
                fontWeight: '500',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.is_capability_node}
                  onChange={(e) => handleChange('is_capability_node', e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />
                Nodo de Capacidades
              </label>
              <div style={{
                fontSize: '0.75em',
                color: 'var(--text-secondary)',
                marginTop: '4px',
                marginLeft: '24px'
              }}>
                Este agente actuará como un nodo de capacidades, proveyendo herramientas a otros agentes.
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9em',
              fontWeight: '500',
              color: 'var(--text-primary)',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => handleChange('is_public', e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              {t('createAgent.publicAgent')}
            </label>
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              marginLeft: '24px'
            }}>
              {t('createAgent.publicAgentDescription')}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={handleCancel} className="btn btn-secondary">
            {t('createAgent.cancel')}
          </button>
          <button onClick={handleSubmit} className="btn btn-primary">
            {t('createAgent.create')}
          </button>
        </div>
      </div>
    </div>
  );
}