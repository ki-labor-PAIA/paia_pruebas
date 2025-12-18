
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
      is_capability_node: false,
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
      alert(t('createAgent.phoneRequired') || 'Por favor ingresa un número de teléfono');
      return;
    }

    if (phone.length < 10) {
      alert(t('createAgent.phoneInvalid') || 'El número debe tener al menos 10 dígitos');
      return;
    }

    // Verificar si el número ya está en uso
    try {
      const checkResponse = await fetch(`http://localhost:8000/api/agents/check-whatsapp/${encodeURIComponent(phone)}`);
      const checkResult = await checkResponse.json();

      if (!checkResult.available) {
        const errorMsg = `Este número ya está en uso por el agente "${checkResult.agent_name}"`;
        setWhatsappState(prev => ({
          ...prev,
          template_error: errorMsg
        }));
        alert(`❌ ${errorMsg}`);
        return;
      }
    } catch (error) {
      console.error('Error verificando disponibilidad del número:', error);
      const errorMsg = 'Error al verificar disponibilidad del número';
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
      const response = await fetch('http://localhost:8000/api/whatsapp/send-template', {
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
        alert(t('createAgent.templateSent') || '✅ Plantilla enviada correctamente');
      } else {
        setWhatsappState(prev => ({
          ...prev,
          sending_template: false,
          template_error: result.message || 'Error al enviar plantilla'
        }));
        alert(`❌ Error: ${result.message}`);
      }
    } catch (error) {
      setWhatsappState(prev => ({
        ...prev,
        sending_template: false,
        template_error: 'Error de conexión con el servidor'
      }));
      alert(`❌ Error de conexión: ${error.message}`);
    }
  };

  const handleSendTestMessage = async () => {
    const phone = formData.whatsapp_phone_number.trim();
    const message = formData.whatsapp_test_message.trim();

    if (!message) {
      alert(t('createAgent.messageRequired') || 'Por favor escribe un mensaje');
      return;
    }

    setWhatsappState(prev => ({
      ...prev,
      sending_message: true,
      message_result: ''
    }));

    try {
      const response = await fetch('http://localhost:8000/api/whatsapp/send', {
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
        message_result: '❌ Error de conexión'
      }));
      alert(`❌ Error de conexión: ${error.message}`);
    }
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
              📱 {t('createAgent.whatsappConfig') || 'Configuración de WhatsApp (Opcional)'}
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
                {t('createAgent.whatsappPhone') || 'Número de WhatsApp'}
              </label>
              <input
                type="text"
                value={formData.whatsapp_phone_number}
                onChange={(e) => handleChange('whatsapp_phone_number', e.target.value)}
                placeholder={t('createAgent.whatsappPhonePlaceholder') || 'Ej: 524425498784'}
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
                  <span>{t('createAgent.sending') || 'Enviando...'}</span>
                </>
              ) : whatsappState.template_sent ? (
                <>
                  <span>✅</span>
                  <span>{t('createAgent.templateSent') || 'Plantilla Enviada'}</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>{t('createAgent.sendTemplate') || 'Enviar Plantilla de Inicio'}</span>
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
                  ⚠️ {t('createAgent.whatsappWarning') || 'Para enviar mensajes normales, el contacto debe responder primero a la plantilla en WhatsApp'}
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
                    {t('createAgent.testMessage') || 'Mensaje de Prueba'}
                  </label>
                  <textarea
                    value={formData.whatsapp_test_message}
                    onChange={(e) => handleChange('whatsapp_test_message', e.target.value)}
                    placeholder={t('createAgent.testMessagePlaceholder') || 'Hola! Soy tu asistente personal...'}
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
                      <span>{t('createAgent.sending') || 'Enviando...'}</span>
                    </>
                  ) : (
                    <>
                      <span>💬</span>
                      <span>{t('createAgent.sendTestMessage') || 'Enviar Mensaje de Prueba'}</span>
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
            {t('createAgent.create')}
          </button>
        </div>
      </div>
    </div>
  );
}