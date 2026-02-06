
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Lista de códigos de país para WhatsApp
const COUNTRY_CODES = [
  { code: '52', country: 'México', flag: '🇲🇽' },
  { code: '1', country: 'USA/Canadá', flag: '🇺🇸' },
  { code: '34', country: 'España', flag: '🇪🇸' },
  { code: '54', country: 'Argentina', flag: '🇦🇷' },
  { code: '57', country: 'Colombia', flag: '🇨🇴' },
  { code: '51', country: 'Perú', flag: '🇵🇪' },
  { code: '56', country: 'Chile', flag: '🇨🇱' },
  { code: '58', country: 'Venezuela', flag: '🇻🇪' },
  { code: '55', country: 'Brasil', flag: '🇧🇷' },
  { code: '593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '598', country: 'Uruguay', flag: '🇺🇾' },
  { code: '595', country: 'Paraguay', flag: '🇵🇾' },
  { code: '591', country: 'Bolivia', flag: '🇧🇴' },
  { code: '507', country: 'Panamá', flag: '🇵🇦' },
  { code: '506', country: 'Costa Rica', flag: '🇨🇷' },
  { code: '503', country: 'El Salvador', flag: '🇸🇻' },
  { code: '502', country: 'Guatemala', flag: '🇬🇹' },
  { code: '504', country: 'Honduras', flag: '🇭🇳' },
  { code: '505', country: 'Nicaragua', flag: '🇳🇮' },
  { code: '509', country: 'Haití', flag: '🇭🇹' },
  { code: '53', country: 'Cuba', flag: '🇨🇺' },
  { code: '44', country: 'Reino Unido', flag: '🇬🇧' },
  { code: '33', country: 'Francia', flag: '🇫🇷' },
  { code: '49', country: 'Alemania', flag: '🇩🇪' },
  { code: '39', country: 'Italia', flag: '🇮🇹' }
];

export default function CreateAgentModal({ isOpen, onClose, onCreateAgent, onUpdateAgent, editMode = false, agentToEdit = null }) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: 'Analítico',
    expertise: 'general',
    is_public: false,
    customColor: '',
    whatsapp_country_code: '52',  // Código de país por defecto (México)
    whatsapp_local_number: ''     // Solo el número local
  });

  const [whatsappState, setWhatsappState] = useState({
    template_sent: false,
    sending_template: false,
    template_error: ''
  });

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (editMode && agentToEdit) {
      // Parse WhatsApp number if exists - split into country code and local number
      let countryCode = '52';  // Default to Mexico
      let localNumber = '';

      if (agentToEdit.whatsapp_phone_number) {
        const fullNumber = agentToEdit.whatsapp_phone_number;
        // Detect country code and extract local number (check 3-digit codes first)
        if (fullNumber.startsWith('593')) {
          countryCode = '593';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('598')) {
          countryCode = '598';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('595')) {
          countryCode = '595';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('591')) {
          countryCode = '591';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('507')) {
          countryCode = '507';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('506')) {
          countryCode = '506';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('505')) {
          countryCode = '505';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('504')) {
          countryCode = '504';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('503')) {
          countryCode = '503';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('502')) {
          countryCode = '502';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('509')) {
          countryCode = '509';
          localNumber = fullNumber.substring(3);
        } else if (fullNumber.startsWith('52')) {
          countryCode = '52';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('1')) {
          countryCode = '1';
          localNumber = fullNumber.substring(1);
        } else if (fullNumber.startsWith('34')) {
          countryCode = '34';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('54')) {
          countryCode = '54';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('57')) {
          countryCode = '57';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('51')) {
          countryCode = '51';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('56')) {
          countryCode = '56';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('58')) {
          countryCode = '58';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('55')) {
          countryCode = '55';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('53')) {
          countryCode = '53';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('44')) {
          countryCode = '44';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('33')) {
          countryCode = '33';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('49')) {
          countryCode = '49';
          localNumber = fullNumber.substring(2);
        } else if (fullNumber.startsWith('39')) {
          countryCode = '39';
          localNumber = fullNumber.substring(2);
        }
      }

      setFormData({
        name: agentToEdit.name || '',
        description: agentToEdit.description || '',
        personality: agentToEdit.personality || 'Analítico',
        expertise: agentToEdit.expertise || 'general',
        is_public: agentToEdit.is_public || false,
        customColor: agentToEdit.customColor || '',
        whatsapp_country_code: countryCode,
        whatsapp_local_number: localNumber
      });
    } else if (!editMode) {
      // Reset form when not in edit mode
      setFormData({
        name: '',
        description: '',
        personality: 'Analítico',
        expertise: 'general',
        is_public: false,
        customColor: '',
        whatsapp_country_code: '52',
        whatsapp_local_number: ''
      });
    }
  }, [editMode, agentToEdit, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to combine country code + local number
  const getFullWhatsAppNumber = () => {
    const { whatsapp_country_code, whatsapp_local_number } = formData;
    if (!whatsapp_local_number || !whatsapp_local_number.trim()) {
      return '';
    }
    return `${whatsapp_country_code}${whatsapp_local_number.replace(/\D/g, '')}`;
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert(t('createAgent.nameRequired') || 'Agent name is required');
      return;
    }

    // Check if user entered number but didn't send template
    if (formData.whatsapp_local_number.trim() && !whatsappState.template_sent) {
      const confirmCreate = window.confirm(
        'Has ingresado un número de WhatsApp pero no has enviado la plantilla. ' +
        'El agente se creará SIN número de WhatsApp. ¿Deseas continuar?'
      );
      if (!confirmCreate) {
        return; // Cancel creation
      }
    }

    // Combine country code + local number into whatsapp_phone_number
    // ONLY if template was sent successfully
    const submissionData = {
      ...formData,
      whatsapp_phone_number: whatsappState.template_sent ? getFullWhatsAppNumber() : ''
    };
    // Remove temporary fields
    delete submissionData.whatsapp_country_code;
    delete submissionData.whatsapp_local_number;

    if (editMode && onUpdateAgent && agentToEdit) {
      // Update existing agent
      onUpdateAgent(agentToEdit.id, submissionData);
    } else if (onCreateAgent) {
      // Create new agent
      onCreateAgent(submissionData);
    }

    // Reset form
    setFormData({
      name: '',
      description: '',
      personality: 'Analítico',
      expertise: 'general',
      is_public: false,
      customColor: '',
      whatsapp_country_code: '52',
      whatsapp_local_number: ''
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
      whatsapp_country_code: '52',
      whatsapp_local_number: ''
    });
    setWhatsappState({
      template_sent: false,
      sending_template: false,
      template_error: ''
    });
    onClose();
  };

  const handleSendTemplate = async () => {
    const phone = getFullWhatsAppNumber();

    if (!phone) {
      alert(t('createAgent.phoneRequired') || 'Please enter a phone number');
      return;
    }

    if (phone.length < 10) {
      alert(t('createAgent.phoneInvalid') || 'The number must have at least 10 digits');
      return;
    }

    // Verificar si el número ya está en uso
    try {
      const checkResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/check-whatsapp/${encodeURIComponent(phone)}`);
      const checkResult = await checkResponse.json();

      if (!checkResult.available) {
        const errorMsg = `This number is already in use by agent "${checkResult.agent_name}"`;
        setWhatsappState(prev => ({
          ...prev,
          template_error: errorMsg
        }));
        alert(`❌ ${errorMsg}`);
        return;
      }
    } catch (error) {
      console.error('Error checking number availability:', error);
      const errorMsg = 'Error checking number availability';
      setWhatsappState(prev => ({
        ...prev,
        template_error: errorMsg
      }));
      alert(`❌ ${errorMsg}`);
      return;
    }

    setWhatsappState(prev => ({
      ...prev,
      sending_template: true,
      template_error: '',
      message_result: ''
    }));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/send-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phone,
          template_name: 'hello_world',
          language_code: 'en_US'
        })
      });

      const result = await response.json();

      if (result.success) {
        setWhatsappState(prev => ({
          ...prev,
          template_sent: true,
          sending_template: false,
          template_error: ''
        }));
        alert(t('createAgent.templateSent') || '✅ Template sent successfully');
      } else {
        setWhatsappState(prev => ({
          ...prev,
          sending_template: false,
          template_error: result.message || 'Error sending template'
        }));
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setWhatsappState(prev => ({
        ...prev,
        sending_template: false,
        template_error: 'Connection error with server'
      }));
      alert(`❌ Connection error: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            {editMode ? 'Edit Agent' : (t('createAgent.title') || 'Create Agent')}
          </h3>
        </div>
        
        <div className="modal-body" style={{ padding: '4px 0' }}>
          {/* Help Banner */}
          <div style={{
            marginBottom: '24px',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            border: '1px solid rgba(102, 126, 234, 0.3)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>💡</span>
            <div>
              <div style={{
                fontSize: '0.9em',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '4px'
              }}>
                Create Your AI Agent
              </div>
              <div style={{
                fontSize: '0.8em',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
              }}>
                Fill in the details below to create your personalized AI agent. Give it a name, personality, and area of expertise. You can also configure WhatsApp integration for mobile interactions.
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '0.9em',
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              {t('createAgent.agentName')} <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder={t('createAgent.agentNamePlaceholder') || 'e.g., Sales Assistant, Travel Planner'}
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
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              Choose a descriptive name for your agent (required)
            </div>
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
              placeholder={t('createAgent.descriptionPlaceholder') || 'Describe what your agent does and how it can help...'}
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
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              Explain the agent's purpose and capabilities
            </div>
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
              <option value="Analítico" style={{ backgroundColor: "#1E2E57" }}>Analytical</option>
              <option value="Creativo" style={{ backgroundColor: "#1E2E57" }}>Creative</option>
              <option value="Empático" style={{ backgroundColor: "#1E2E57" }}>Empathetic</option>
              <option value="Pragmático" style={{ backgroundColor: "#1E2E57" }}>Pragmatic</option>
              <option value="Entusiasta" style={{ backgroundColor: "#1E2E57" }}>Enthusiastic</option>
              <option value="Metódico" style={{ backgroundColor: "#1E2E57" }}>Methodical</option>
              <option value="Innovador" style={{ backgroundColor: "#1E2E57" }}>Innovative</option>
              <option value="Colaborativo" style={{ backgroundColor: "#1E2E57" }}>Collaborative</option>
              <option value="Estratégico" style={{ backgroundColor: "#1E2E57" }}>Strategic</option>
              <option value="Aventurero" style={{ backgroundColor: "#1E2E57" }}>Adventurous</option>
              <option value="Reflexivo" style={{ backgroundColor: "#1E2E57" }}>Reflective</option>
              <option value="Dinámico" style={{ backgroundColor: "#1E2E57" }}>Dynamic</option>
            </select>
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              Choose the communication style and approach of your agent
            </div>
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
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginTop: '4px'
            }}>
              Select the domain or field where your agent specializes
            </div>
          </div>

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
              {t('createAgent.publicAgentDescription') || 'Public agents can be discovered and used by other PAIA users'}
            </div>
          </div>

          {/* WhatsApp Configuration Section */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(37, 211, 102, 0.05)',
            border: '1px solid rgba(37, 211, 102, 0.2)',
            borderRadius: '8px'
          }}>
            <h4 style={{
              margin: '0 0 8px 0',
              color: 'var(--text-primary)',
              fontSize: '0.95em',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📱 {t('createAgent.whatsappConfig') || 'WhatsApp Configuration (Optional)'}
            </h4>
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginBottom: '12px',
              lineHeight: '1.4'
            }}>
              Connect a WhatsApp number to enable mobile communication with your agent. Enter the number and send a starter template to validate it.
            </div>

            {/* Phone Number Input - Split into Country Code + Local Number */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '0.85em',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                {t('createAgent.whatsappPhone') || 'WhatsApp Number'}
              </label>

              {/* Container for dropdown and input side by side */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* Dropdown para código de país */}
                <select
                  value={formData.whatsapp_country_code}
                  onChange={(e) => handleChange('whatsapp_country_code', e.target.value)}
                  disabled={whatsappState.template_sent}
                  style={{
                    width: '140px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85em',
                    opacity: whatsappState.template_sent ? 0.6 : 1,
                    cursor: whatsappState.template_sent ? 'not-allowed' : 'pointer'
                  }}
                >
                  {COUNTRY_CODES.map(item => (
                    <option key={item.code} value={item.code} style={{ backgroundColor: "#1E2E57" }}>
                      {item.flag} +{item.code}
                    </option>
                  ))}
                </select>

                {/* Input para número local */}
                <input
                  type="tel"
                  value={formData.whatsapp_local_number}
                  onChange={(e) => handleChange('whatsapp_local_number', e.target.value)}
                  placeholder={t('createAgent.whatsappPhonePlaceholder') || 'Ex: 4425498784'}
                  disabled={whatsappState.template_sent}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85em',
                    opacity: whatsappState.template_sent ? 0.6 : 1,
                    cursor: whatsappState.template_sent ? 'not-allowed' : 'default'
                  }}
                />
              </div>
            </div>

            {/* Send Template Button */}
            <button
              onClick={handleSendTemplate}
              disabled={whatsappState.sending_template || !formData.whatsapp_local_number.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: whatsappState.template_sent ? '#10B981' : '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85em',
                fontWeight: '600',
                cursor: whatsappState.sending_template || !formData.whatsapp_local_number.trim() ? 'not-allowed' : 'pointer',
                opacity: whatsappState.sending_template || !formData.whatsapp_local_number.trim() ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {whatsappState.sending_template ? (
                <>
                  <span>⏳</span>
                  <span>{t('createAgent.sending') || 'Sending...'}</span>
                </>
              ) : whatsappState.template_sent ? (
                <>
                  <span>✅</span>
                  <span>{t('createAgent.templateSent') || 'Template Sent'}</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>{t('createAgent.sendTemplate') || 'Send Starter Template'}</span>
                </>
              )}
            </button>

            {/* Success Message - Shown after template is sent */}
            {whatsappState.template_sent && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '1.2em' }}>✅</span>
                <div>
                  <div style={{
                    fontSize: '0.85em',
                    fontWeight: '600',
                    color: '#10B981',
                    marginBottom: '2px'
                  }}>
                    WhatsApp Configurado Correctamente
                  </div>
                  <div style={{
                    fontSize: '0.75em',
                    color: 'var(--text-secondary)'
                  }}>
                    El número {getFullWhatsAppNumber()} ha sido validado. Puedes continuar creando tu agente.
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="modal-footer">
          <button onClick={handleCancel} className="btn btn-secondary">
            {t('createAgent.cancel')}
          </button>
          <button onClick={handleSubmit} className="btn btn-primary">
            {editMode ? 'Update Agent' : (t('createAgent.create') || 'Create Agent')}
          </button>
        </div>
      </div>
    </div>
  );
}
