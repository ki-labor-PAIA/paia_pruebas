import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ConfigureCalendarModal({ isOpen, onClose, onConfigureCalendar }) {
  const { data: session } = useSession();
  const [formData, setFormData] = useState({
    name: 'Google Calendar',
    isAuthenticated: false,
    userEmail: ''
  });
  const [authUrl, setAuthUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('config'); // config, auth, success

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      checkAuthStatus();
    }
  }, [isOpen, session]);

  useEffect(() => {
    // Escuchar mensajes de la ventana de OAuth
    const handleMessage = async (event) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        try {
          setIsLoading(true);
          console.log('[ConfigureCalendarModal] Recibido postMessage de éxito desde callback');

          // El callback ya guardó el token, solo actualizamos el estado local
          setFormData(prev => ({
            ...prev,
            isAuthenticated: true,
            userEmail: session?.user?.email || ''
          }));
          setStep('success');

        } catch (err) {
          console.error('[ConfigureCalendarModal] Error procesando éxito:', err);
          setError(err.message);
          setStep('config');
        } finally {
          setIsLoading(false);
        }
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        setError(event.data.data?.error || 'Error durante la autenticación');
        setStep('config');
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [session]);

  const checkAuthStatus = async () => {
    if (!session?.user?.id) return;

    console.log('[ConfigureCalendarModal] Verificando auth para userId:', session.user.id);

    try {
      const response = await fetch('/api/auth/google-calendar/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id
        })
      });

      const result = await response.json();
      
      if (response.ok && result.isAuthenticated) {
        setFormData(prev => ({ 
          ...prev, 
          isAuthenticated: true,
          userEmail: session.user.email
        }));
      }
      
    } catch (error) {
      console.error('Error verificando autenticación:', error);
    }
  };

  const generateAuthUrl = async () => {
    if (!session?.user?.id) return;

    console.log('[ConfigureCalendarModal] Generando auth URL para userId:', session.user.id);

    try {
      setIsLoading(true);
      setError('');

      const response = await fetch('/api/auth/google-calendar/auth-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error generando URL de autenticación');
      }

      setAuthUrl(result.authUrl);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!authUrl) {
      await generateAuthUrl();
      return;
    }

    setStep('auth');
    // Abrir en ventana emergente
    const popup = window.open(
      authUrl, 
      'google-auth', 
      'width=500,height=600,scrollbars=yes,resizable=yes'
    );
    
    // Verificar si la ventana se cerró
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        if (step === 'auth') {
          setStep('config');
        }
      }
    }, 1000);
  };

  const handleSubmit = () => {
    if (!formData.isAuthenticated) {
      setError('Debes autenticarte con Google Calendar primero');
      return;
    }

    onConfigureCalendar({
      ...formData,
      type: 'calendar'
    });
    onClose();
  };

  const handleCancel = () => {
    setFormData({
      name: 'Google Calendar',
      isAuthenticated: false,
      userEmail: ''
    });
    setStep('config');
    setError('');
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
            📅 Configure Google Calendar
          </h3>
        </div>
        
        <div className="modal-body" style={{ padding: '20px 0' }}>
          {step === 'config' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '0.9em', 
                  fontWeight: '500',
                  color: 'var(--text-primary)'
                }}>
                  Node name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Google Calendar"
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

              <div style={{ 
                marginBottom: '20px',
                padding: '16px',
                borderRadius: '8px',
                background: formData.isAuthenticated ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${formData.isAuthenticated ? '#10b981' : '#f59e0b'}`
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '12px'
                }}>
                  <span style={{ 
                    fontSize: '20px', 
                    marginRight: '8px' 
                  }}>
                    {formData.isAuthenticated ? '✅' : '⚠️'}
                  </span>
                  <span style={{ 
                    fontWeight: '500',
                    color: 'var(--text-primary)'
                  }}>
                    {formData.isAuthenticated ? 'Google Calendar Conectado' : 'Autenticación Requerida'}
                  </span>
                </div>
                
                {formData.isAuthenticated ? (
                  <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                    Usuario: {formData.userEmail}
                  </div>
                ) : (
                  <>
                    <div style={{ 
                      fontSize: '0.85em', 
                      color: 'var(--text-secondary)',
                      marginBottom: '12px'
                    }}>
                      Conecta tu cuenta de Google Calendar para que los agentes puedan gestionar eventos.
                    </div>
                    
                    <button
                      onClick={handleAuth}
                      disabled={isLoading}
                      style={{
                        background: isLoading ? '#9ca3af' : '#4285f4',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '0.85em',
                        fontWeight: '500',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isLoading ? (
                        <>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            border: '2px solid #ffffff',
                            borderTop: '2px solid transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }}></div>
                          Connecting...
                        </>
                      ) : (
                        <>
                          🔗 Connect Google Calendar
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '16px',
                  fontSize: '0.85em'
                }}>
                  {error}
                </div>
              )}
            </>
          )}

          {step === 'auth' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
              <h4 style={{ 
                fontSize: '18px', 
                marginBottom: '8px',
                color: 'var(--text-primary)'
              }}>
                Authenticating with Google...
              </h4>
              <p style={{
                color: 'var(--text-secondary)',
                marginBottom: '24px',
                fontSize: '0.9em'
              }}>
                A new window has opened. Authorize access to Google Calendar.
              </p>
              <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border-color)',
                borderTop: '3px solid var(--primary-color)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
          )}

          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h4 style={{ 
                fontSize: '18px', 
                marginBottom: '8px',
                color: '#10b981'
              }}>
                Connected successfully!
              </h4>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '0.9em'
              }}>
                Google Calendar is ready to use.
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            onClick={handleCancel}
            style={{
              padding: '10px 20px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9em'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.isAuthenticated}
            style={{
              padding: '10px 20px',
              background: formData.isAuthenticated ? 'var(--primary-color)' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: formData.isAuthenticated ? 'pointer' : 'not-allowed',
              fontSize: '0.9em',
              fontWeight: '500'
            }}
          >
            Create Node
          </button>
        </div>

        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}