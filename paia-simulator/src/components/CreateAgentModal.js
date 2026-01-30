
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function CreateAgentModal({ isOpen, onClose, onCreateAgent, onUpdateAgent, editMode = false, agentToEdit = null }) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: 'Analítico',
    expertise: 'general',
    is_public: false,
    customColor: '',
    whatsapp_phone_number: '',
    whatsapp_test_message: ''
  });

  const [whatsappState, setWhatsappState] = useState({
    template_sent: false,
    sending_template: false,
    sending_message: false,
    template_error: '',
    message_result: ''
  });

  // Pre-fill form when in edit mode
  useEffect(() => {
    if (editMode && agentToEdit) {
      setFormData({
        name: agentToEdit.name || '',
        description: agentToEdit.description || '',
        personality: agentToEdit.personality || 'Analítico',
        expertise: agentToEdit.expertise || 'general',
        is_public: agentToEdit.is_public || false,
        customColor: agentToEdit.customColor || '',
        whatsapp_phone_number: agentToEdit.whatsapp_phone_number || '',
        whatsapp_test_message: ''
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
        whatsapp_phone_number: '',
        whatsapp_test_message: ''
      });
    }
  }, [editMode, agentToEdit, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert(t('createAgent.nameRequired') || 'Agent name is required');
      return;
    }

    if (editMode && onUpdateAgent && agentToEdit) {
      // Update existing agent
      onUpdateAgent(agentToEdit.id, formData);
    } else if (onCreateAgent) {
      // Create new agent
      onCreateAgent(formData);
    }

    // Reset form
    setFormData({
      name: '',
      description: '',
      personality: 'Analítico',
      expertise: 'general',
      is_public: false,
      customColor: '',
      whatsapp_phone_number: '',
      whatsapp_test_message: ''
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
      whatsapp_phone_number: '',
      whatsapp_test_message: ''
    });
    setWhatsappState({
      template_sent: false,
      sending_template: false,
      sending_message: false,
      template_error: '',
      message_result: ''
    });
    onClose();
  };

  const handleSendTemplate = async () => {
    const phone = formData.whatsapp_phone_number.trim();

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

  const handleSendTestMessage = async () => {
    const phone = formData.whatsapp_phone_number.trim();
    const message = formData.whatsapp_test_message.trim();

    if (!message) {
      alert(t('createAgent.messageRequired') || 'Please write a message');
      return;
    }

    setWhatsappState(prev => ({
      ...prev,
      sending_message: true,
      message_result: ''
    }));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: phone,
          message: message
        })
      });

      const result = await response.json();

      if (result.success) {
        setWhatsappState(prev => ({
          ...prev,
          sending_message: false,
          message_result: '✅ ' + result.message
        }));
        alert('✅ ' + result.message);
      } else {
        setWhatsappState(prev => ({
          ...prev,
          sending_message: false,
          message_result: '❌ ' + result.message
        }));
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      setWhatsappState(prev => ({
        ...prev,
        sending_message: false,
        message_result: '❌ Connection error'
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

          {/* WhatsApp Configuration Section */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(37, 211, 102, 0.05)',
            border: '1px solid rgba(37, 211, 102, 0.2)',
            borderRadius: '8px'
          }}>
            <h4 style={{
              margin: '0 0 16px 0',
              color: 'var(--text-primary)',
              fontSize: '0.95em',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📱 {t('createAgent.whatsappConfig') || 'WhatsApp Configuration (Optional)'}
            </h4>

            {/* Phone Number Input */}
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
              <input
                type="text"
                value={formData.whatsapp_phone_number}
                onChange={(e) => handleChange('whatsapp_phone_number', e.target.value)}
                placeholder={t('createAgent.whatsappPhonePlaceholder') || 'Ex: 524425498784'}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85em'
                }}
              />
            </div>

            {/* Send Template Button */}
            <button
              onClick={handleSendTemplate}
              disabled={whatsappState.sending_template || !formData.whatsapp_phone_number.trim()}
              style={{
                width: '100%',
                padding: '10px 16px',
                background: whatsappState.template_sent ? '#10B981' : '#25D366',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.85em',
                fontWeight: '600',
                cursor: whatsappState.sending_template || !formData.whatsapp_phone_number.trim() ? 'not-allowed' : 'pointer',
                opacity: whatsappState.sending_template || !formData.whatsapp_phone_number.trim() ? 0.6 : 1,
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

            {/* Test Message Section (Only shown after template is sent) */}
            {whatsappState.template_sent && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(37, 211, 102, 0.2)' }}>
                {/* Warning Message */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.75em',
                  color: '#FCD34D',
                  marginBottom: '12px',
                  lineHeight: '1.5'
                }}>
                  ⚠️ {t('createAgent.whatsappWarning') || 'To send normal messages, the contact must first respond to the template on WhatsApp'}
                </div>

                {/* Test Message Input */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '6px',
                    fontSize: '0.85em',
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    {t('createAgent.testMessage') || 'Test Message'}
                  </label>
                  <textarea
                    value={formData.whatsapp_test_message}
                    onChange={(e) => handleChange('whatsapp_test_message', e.target.value)}
                    placeholder={t('createAgent.testMessagePlaceholder') || 'Hello! I am your personal assistant...'}
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85em',
                      resize: 'vertical',
                      minHeight: '70px'
                    }}
                  />
                </div>

                {/* Send Test Message Button */}
                <button
                  onClick={handleSendTestMessage}
                  disabled={whatsappState.sending_message || !formData.whatsapp_test_message.trim()}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.85em',
                    fontWeight: '600',
                    cursor: whatsappState.sending_message || !formData.whatsapp_test_message.trim() ? 'not-allowed' : 'pointer',
                    opacity: whatsappState.sending_message || !formData.whatsapp_test_message.trim() ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {whatsappState.sending_message ? (
                    <>
                      <span>⏳</span>
                      <span>{t('createAgent.sending') || 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <span>💬</span>
                      <span>{t('createAgent.sendTestMessage') || 'Send Test Message'}</span>
                    </>
                  )}
                </button>
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
