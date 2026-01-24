import { useState, useEffect } from 'react';

export default function ConfigureAgentModal({ isOpen, onClose, onConfigure, agent }) {
  const [formData, setFormData] = useState({
    telegram_chat_id: '',
    whatsapp_phone_number: '',
    is_persistent: false,
    auto_start: false,
    status: 'active'
  });

  // Pre-fill form with agent data
  useEffect(() => {
    if (agent) {
      setFormData({
        telegram_chat_id: agent.telegram_chat_id || '',
        whatsapp_phone_number: agent.whatsapp_phone_number || '',
        is_persistent: agent.is_persistent || false,
        auto_start: agent.auto_start || false,
        status: agent.status || 'active'
      });
    }
  }, [agent, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (onConfigure && agent) {
      onConfigure(agent.id, formData);
    }
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    if (agent) {
      setFormData({
        telegram_chat_id: agent.telegram_chat_id || '',
        whatsapp_phone_number: agent.whatsapp_phone_number || '',
        is_persistent: agent.is_persistent || false,
        auto_start: agent.auto_start || false,
        status: agent.status || 'active'
      });
    }
    onClose();
  };

  if (!isOpen || !agent) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            Configure Agent: {agent.name}
          </h3>
        </div>

        <div className="modal-body" style={{ padding: '20px 0' }}>
          {/* Communication Settings */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '15px',
              color: 'var(--text-primary)',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              📱 Communication Settings
            </h4>

            {/* Telegram */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9em',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Telegram Chat ID
              </label>
              <input
                type="text"
                value={formData.telegram_chat_id}
                onChange={(e) => handleChange('telegram_chat_id', e.target.value)}
                placeholder="e.g., 123456789"
                className="input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9em',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
              <small style={{
                display: 'block',
                marginTop: '4px',
                color: 'var(--text-secondary)',
                fontSize: '0.85em'
              }}>
                Chat ID for Telegram notifications
              </small>
            </div>

            {/* WhatsApp */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9em',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                value={formData.whatsapp_phone_number}
                onChange={(e) => handleChange('whatsapp_phone_number', e.target.value)}
                placeholder="e.g., 521234567890"
                className="input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9em',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              />
              <small style={{
                display: 'block',
                marginTop: '4px',
                color: 'var(--text-secondary)',
                fontSize: '0.85em'
              }}>
                Phone number with country code (e.g., 521234567890 for Mexico)
              </small>
            </div>
          </div>

          {/* Behavior Settings */}
          <div style={{ marginBottom: '30px' }}>
            <h4 style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '15px',
              color: 'var(--text-primary)',
              borderBottom: '2px solid var(--border-color)',
              paddingBottom: '8px'
            }}>
              ⚙️ Behavior Settings
            </h4>

            {/* Status */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '0.9em',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="input"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.9em',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* Persistent */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                <input
                  type="checkbox"
                  checked={formData.is_persistent}
                  onChange={(e) => handleChange('is_persistent', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Persistent Agent
              </label>
              <small style={{
                display: 'block',
                marginTop: '4px',
                marginLeft: '30px',
                color: 'var(--text-secondary)',
                fontSize: '0.85em'
              }}>
                Agent persists between system restarts
              </small>
            </div>

            {/* Auto Start */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '0.9em',
                fontWeight: '500',
                color: 'var(--text-primary)'
              }}>
                <input
                  type="checkbox"
                  checked={formData.auto_start}
                  onChange={(e) => handleChange('auto_start', e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Auto Start
              </label>
              <small style={{
                display: 'block',
                marginTop: '4px',
                marginLeft: '30px',
                color: 'var(--text-secondary)',
                fontSize: '0.85em'
              }}>
                Automatically start agent on system boot
              </small>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={handleCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSubmit} className="btn btn-primary">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
