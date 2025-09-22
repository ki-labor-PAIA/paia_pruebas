import { useState } from 'react';

export default function SaveFlowModal({ isOpen, onClose, onSave, currentFlow }) {
  const [name, setName] = useState(currentFlow?.name || '');
  const [description, setDescription] = useState(currentFlow?.description || '');
  const [isPublic, setIsPublic] = useState(currentFlow?.is_public || false);
  const [tags, setTags] = useState(currentFlow?.tags?.join(', ') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('El nombre del flujo es requerido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const flowData = {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      };

      await onSave(flowData);
      onClose();
    } catch (err) {
      setError(err.message || 'Error guardando el flujo');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--card-bg)',
        borderRadius: '16px',
        padding: '24px',
        minWidth: '500px',
        maxWidth: '600px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0
          }}>
            💾 Guardar Flujo
          </h2>
          
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div style={{ marginBottom: '20px' }}>
          {/* Nombre */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Nombre del flujo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Mi flujo de atención al cliente"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Descripción (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué hace este flujo y cómo funciona..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease',
                resize: 'vertical',
                minHeight: '80px'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Tags (opcional)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="atención, cliente, automatización, ventas"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              fontStyle: 'italic'
            }}>
              Separa los tags con comas
            </p>
          </div>

          {/* Visibilidad */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)'
            }}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer'
                }}
              />
              Hacer público para amigos
            </label>
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
              marginLeft: '24px',
              fontStyle: 'italic'
            }}>
              Si está marcado, tus amigos podrán ver y conectarse a este flujo cuando esté activo
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#EF4444',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1
            }}
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={!name.trim() || loading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: name.trim() && !loading ? 'var(--primary-color)' : 'var(--border-color)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: name.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: name.trim() && !loading ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {loading ? (
              <>
                ⏳ Guardando...
              </>
            ) : (
              <>
                💾 Guardar Flujo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}