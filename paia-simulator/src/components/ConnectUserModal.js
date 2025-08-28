import { useState, useEffect } from 'react';

export default function ConnectUserModal({ isOpen, onClose, currentUserId, onConnect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [connectionType, setConnectionType] = useState('friend');
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  // Limpiar estado cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUser(null);
      setConnectionType('friend');
      setError('');
    }
  }, [isOpen]);

  // Buscar usuarios con debounce
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(async () => {
        await searchUsers();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchUsers = async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    setSearchLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search?q=${encodeURIComponent(searchTerm)}&exclude_user_id=${currentUserId}`);
      
      if (!response.ok) {
        throw new Error('Error buscando usuarios');
      }

      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Error buscando usuarios. Intenta de nuevo.');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requester_id: currentUserId,
          recipient_id: selectedUser.id,
          connection_type: connectionType
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error enviando solicitud');
      }

      const data = await response.json();
      
      // Llamar callback con la conexión creada
      if (onConnect) {
        onConnect({
          user: selectedUser,
          connectionType,
          connectionId: data.connection_id,
          status: data.status
        });
      }

      onClose();
    } catch (err) {
      console.error('Error creating connection:', err);
      setError(err.message || 'Error enviando solicitud de conexión');
    } finally {
      setLoading(false);
    }
  };

  const getConnectionTypeDescription = (type) => {
    switch (type) {
      case 'friend':
        return 'Pueden ver flujos públicos y enviar notificaciones';
      case 'colleague':
        return 'Colaboración profesional básica';
      case 'collaborator':
        return 'Acceso completo para colaboración en proyectos';
      default:
        return '';
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
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)'
      }}>
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
            🔗 Conectar con Usuario
          </h2>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
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

        {/* Barra de búsqueda */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            Buscar usuario por nombre o email:
          </label>
          
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Escribe al menos 2 caracteres..."
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
            
            {searchLoading && (
              <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}>
                🔍
              </div>
            )}
          </div>
        </div>

        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '12px'
            }}>
              Resultados:
            </h3>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: selectedUser?.id === user.id ? '2px solid var(--primary-color)' : '2px solid transparent',
                    backgroundColor: selectedUser?.id === user.id ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                    marginBottom: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: user.image ? 'transparent' : 'var(--primary-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    backgroundImage: user.image ? `url(${user.image})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}>
                    {!user.image && (
                      <span style={{ color: 'white', fontSize: '16px', fontWeight: 'bold' }}>
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      marginBottom: '2px'
                    }}>
                      {user.name}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)'
                    }}>
                      {user.email}
                    </div>
                  </div>
                  
                  {selectedUser?.id === user.id && (
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '12px'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tipo de conexión */}
        {selectedUser && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--text-primary)',
              marginBottom: '8px'
            }}>
              Tipo de conexión:
            </label>
            
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '14px',
                backgroundColor: 'var(--input-bg)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            >
              <option value="friend">👫 Amigo</option>
              <option value="colleague">💼 Colega</option>
              <option value="collaborator">🤝 Colaborador</option>
            </select>
            
            <p style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              fontStyle: 'italic'
            }}>
              {getConnectionTypeDescription(connectionType)}
            </p>
          </div>
        )}

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

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: '2px solid var(--border-color)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConnect}
            disabled={!selectedUser || loading}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selectedUser && !loading ? 'var(--primary-color)' : 'var(--border-color)',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: selectedUser && !loading ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              opacity: selectedUser && !loading ? 1 : 0.6
            }}
          >
            {loading ? '⏳ Conectando...' : '🔗 Enviar Solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}