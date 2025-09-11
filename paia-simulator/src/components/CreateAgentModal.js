import { useState, useEffect } from 'react';

export default function CreateAgentModal({ isOpen, onClose, onCreateAgent, initialData }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    personality: 'friendly',
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
      alert('El nombre del agente es requerido');
      return;
    }

    onCreateAgent(formData);
    setFormData({
      name: '',
      description: '',
      personality: 'friendly',
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
      personality: 'friendly',
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
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Crear Nuevo Agente PAIA</h3>
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
              Nombre del Agente *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: María Asistente Personal"
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
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe las capacidades de tu agente..."
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
              Personalidad
            </label>
            <select
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
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
              <option value="friendly">Amigable</option>
              <option value="professional">Profesional</option>
              <option value="creative">Creativo</option>
              <option value="analytical">Analítico</option>
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
              Área de Expertise
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
              <option value="general">Asistente General</option>
              <option value="scheduling">Programación y Calendario</option>
              <option value="travel">Viajes y Reservas</option>
              <option value="research">Investigación</option>
              <option value="notes">Gestión de Notas</option>
              <option value="creativity">Creatividad y Diseño</option>
              <option value="finance">Finanzas</option>
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
              Agente Público
            </label>
            <div style={{
              fontSize: '0.75em',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              marginLeft: '24px'
            }}>
              Otros usuarios podrán conectarse y comunicarse con este agente
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={handleCancel} className="btn btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="btn btn-primary">
            Crear Agente
          </button>
        </div>
      </div>
    </div>
  );
}