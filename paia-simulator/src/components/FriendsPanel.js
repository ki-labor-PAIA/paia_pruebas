import { useState, useEffect, useCallback } from 'react';
import PAIAApi from '@/utils/api';

export default function FriendsPanel({ userId, isOpen, onClose }) {
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadConnections = useCallback(async () => {
    if (!userId) {
      setError('No se pudo obtener el ID del usuario');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const [acceptedResponse, pendingResponse] = await Promise.all([
        PAIAApi.getUserConnections(userId, 'accepted'),
        PAIAApi.getUserConnections(userId, 'pending')
      ]);

      setFriends(acceptedResponse.connections || []);
      
      const incomingRequests = (pendingResponse.connections || []).filter(req => req.recipient.id === userId);
      setPendingRequests(incomingRequests);

    } catch (err) {
      console.error('Error loading connections:', err);
      setError(`Error cargando conexiones: ${err.message}`);
      setFriends([]);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen && userId) {
      loadConnections();
    }
  }, [isOpen, userId, loadConnections]);

  const handleRespondToRequest = async (connectionId, response) => {
    try {
      await PAIAApi.respondToConnectionRequest(connectionId, response, userId);
      loadConnections(); // Refresh lists after responding
    } catch (err) {
      console.error(`Error responding to request: ${err}`);
      setError(`Error al responder a la solicitud: ${err.message}`);
    }
  };

  if (!isOpen) return null;

  const renderPendingRequest = (request) => (
    <div key={request.connection_id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: '500' }}>{request.requester.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{request.requester.email}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleRespondToRequest(request.connection_id, 'accept')} className="discreet-button" style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Aceptar</button>
          <button onClick={() => handleRespondToRequest(request.connection_id, 'reject')} className="discreet-button" style={{ color: 'var(--danger-color)' }}>Rechazar</button>
        </div>
      </div>
    </div>
  );

  const renderFriend = (connection, index) => {
    const friend = connection.requester.id === userId ? connection.recipient : connection.requester;
    return (
        <div key={connection.connection_id} style={{ padding: '12px 16px', borderBottom: index < friends.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src={friend.image || 'https://www.gravatar.com/avatar/?d=mp'} alt={friend.name} style={{ width: '40px', height: '40px', borderRadius: '50%' }}/>
            <div>
              <div style={{ fontWeight: '500' }}>{friend.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{friend.email}</div>
            </div>
           </div>
        </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: '60px', right: '280px', width: '350px', maxHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', border: '1px solid var(--border-color)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Amigos y Solicitudes</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Cargando...</div>}
        {error && <div style={{ padding: '20px', color: 'var(--danger-color)', textAlign: 'center' }}>{error}</div>}
        
        {!loading && !error && (
          <>
            {pendingRequests.length > 0 && (
              <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '12px', fontWeight:'bold', color: 'var(--text-secondary)', padding: '12px 16px 8px', margin: 0, textTransform: 'uppercase' }}>Solicitudes Pendientes ({pendingRequests.length})</h4>
                {pendingRequests.map(renderPendingRequest)}
              </div>
            )}

            {friends.length > 0 && (
              <div>
                <h4 style={{ fontSize: '12px', fontWeight:'bold', color: 'var(--text-secondary)', padding: '12px 16px 8px', margin: 0, textTransform: 'uppercase' }}>Amigos ({friends.length})</h4>
                {friends.map(renderFriend)}
              </div>
            )}

            {!pendingRequests.length && !friends.length && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '32px' }}>👋</div>
                <div>No tienes amigos ni solicitudes.</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>Usa "Buscar Usuario" para conectar con otros.</div>
              </div>
            )}
          </>
        )}
      </div>
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
          <button onClick={loadConnections} className="discreet-button">🔄 Actualizar</button>
      </div>
    </div>
  );
}