import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function TelegramPanel({ onClose }) {
  const { data: session } = useSession();
  const [telegramChatId, setTelegramChatId] = useState('');
  const [testMessage, setTestMessage] = useState('Hola desde PAIA! 👋');
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Obtener actualizaciones de Telegram para encontrar Chat IDs
  const getTelegramUpdates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/telegram/updates');
      const data = await response.json();
      
      if (data.success && data.updates) {
        setUpdates(data.updates.slice(-5)); // Últimas 5 actualizaciones
        setStatus('Actualizaciones obtenidas correctamente');
      } else {
        setStatus('No hay actualizaciones disponibles');
      }
    } catch (error) {
      setStatus('Error obteniendo actualizaciones: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enviar mensaje de prueba
  const sendTestMessage = async () => {
    if (!telegramChatId.trim()) {
      setStatus('Por favor ingresa un Chat ID');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          message: testMessage
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setStatus('✅ Mensaje enviado correctamente!');
      } else {
        setStatus('❌ Error: ' + data.message);
      }
    } catch (error) {
      setStatus('❌ Error enviando mensaje: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getTelegramUpdates();
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '30px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '15px'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>📱 Configuración de Telegram</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#4f46e5', marginBottom: '10px' }}>🔍 Encontrar tu Chat ID</h3>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#64748b' }}>
              Para usar Telegram con PAIA:
            </p>
            <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#64748b' }}>
              <li>Busca el bot de PAIA en Telegram</li>
              <li>Envía cualquier mensaje al bot</li>
              <li>Haz clic en Obtener Actualizaciones abajo</li>
              <li>Copia tu Chat ID y úsalo para configurar</li>
            </ol>
          </div>
          
          <button
            onClick={getTelegramUpdates}
            disabled={loading}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Obteniendo...' : '🔄 Obtener Actualizaciones'}
          </button>
        </div>

        {updates.length > 0 && (
          <div style={{ marginBottom: '25px' }}>
            <h4 style={{ color: '#333', marginBottom: '10px' }}>Últimas actualizaciones:</h4>
            <div style={{ 
              background: '#f1f5f9', 
              padding: '15px', 
              borderRadius: '8px',
              maxHeight: '200px',
              overflow: 'auto'
            }}>
              {updates.map((update, index) => (
                <div key={index} style={{ 
                  marginBottom: '10px', 
                  padding: '8px',
                  background: 'white',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <strong>Chat ID: {update.message?.chat?.id}</strong><br/>
                  <span style={{ color: '#666' }}>
                    De: {update.message?.from?.first_name} (@{update.message?.from?.username})<br/>
                    Mensaje: {update.message?.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#4f46e5', marginBottom: '15px' }}>📤 Probar Envío de Mensaje</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Chat ID:
            </label>
            <input
              type="text"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Ejemplo: 123456789"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              Mensaje de prueba:
            </label>
            <textarea
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <button
            onClick={sendTestMessage}
            disabled={loading || !telegramChatId.trim()}
            style={{
              background: '#6366f1',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: (loading || !telegramChatId.trim()) ? 'not-allowed' : 'pointer',
              opacity: (loading || !telegramChatId.trim()) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Enviando...' : '📤 Enviar Mensaje de Prueba'}
          </button>
        </div>

        {status && (
          <div style={{
            background: status.includes('✅') ? '#dcfce7' : status.includes('❌') ? '#fee2e2' : '#e0e7ff',
            color: status.includes('✅') ? '#15803d' : status.includes('❌') ? '#dc2626' : '#3730a3',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {status}
          </div>
        )}

        <div style={{
          background: '#f8fafc',
          padding: '15px',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#64748b'
        }}>
          <strong>💡 Tip:</strong> Una vez que tengas tu Chat ID configurado, 
          los agentes podrán enviarte notificaciones automáticamente por Telegram 
          cuando completen tareas o necesiten tu atención.
        </div>
      </div>
    </div>
  );
}