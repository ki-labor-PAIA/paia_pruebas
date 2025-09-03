import { useState, useEffect, useCallback } from 'react';
import PAIAApi from '@/utils/api';

export default function ConnectUserModal({ 
  isOpen, 
  onClose, 
  currentUserId, 
  onConnect,
  connectionNodeId
}) {
  const [step, setStep] = useState('selectFriend'); // selectFriend, selectConnectionType, selectAgent
  const [friends, setFriends] = useState([]);
  const [publicFlows, setPublicFlows] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = useCallback(() => {
    setStep('selectFriend');
    setFriends([]);
    setPublicFlows([]);
    setSelectedFriend(null);
    setSelectedAgent(null);
    setError('');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
      loadFriends();
    }
  }, [isOpen, resetState]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await PAIAApi.getUserConnections(currentUserId, 'accepted');
      setFriends(response.connections || []);
    } catch (err) {
      setError('Error al cargar la lista de amigos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = (friendConnection) => {
    const friendDetails = friendConnection.requester.id === currentUserId ? friendConnection.recipient : friendConnection.requester;
    setSelectedFriend(friendDetails);
    setStep('selectConnectionType');
  };

  const handleSelectConnectionType = async (type) => {
    if (type === 'user') {
      // Conectar directamente al usuario (lógica simplificada)
      handleConnect('user');
    } else {
      setLoading(true);
      try {
        const response = await PAIAApi.getPublicFlows(selectedFriend.id);
        setPublicFlows(response.flows || []);
        setStep('selectAgent');
      } catch (err) {
        setError('Error al cargar los flujos del amigo.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleConnect = async (connectionType, agentTarget = null) => {
    setLoading(true);
    setError('');
    try {
      const connectionData = {
        flow_owner_id: currentUserId,
        target_user_id: selectedFriend.id,
        connection_node_id: connectionNodeId,
        connection_type: connectionType, // 'user' or 'agent'
        target_agent_id: agentTarget ? agentTarget.id : null,
        metadata: { 
          target_user_name: selectedFriend.name,
          target_agent_name: agentTarget ? agentTarget.label : null
        }
      };
      
      const response = await PAIAApi.createFlowConnection(connectionData);
      
      if (onConnect) {
        onConnect({ 
          mode: 'flow', 
          user: selectedFriend, 
          agent: agentTarget,
          connectionNodeId, 
          flowConnectionId: response.flow_connection_id 
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear la conexión.');
    } finally {
      setLoading(false);
    }
  };

  const renderFriendItem = (friendConnection) => {
    const friend = friendConnection.requester.id === currentUserId ? friendConnection.recipient : friendConnection.requester;
    return (
      <div key={friend.id} onClick={() => handleSelectFriend(friendConnection)} style={{ display: 'flex', alignItems: 'center', padding: '12px', cursor: 'pointer', borderRadius: '8px', border: '2px solid transparent', marginBottom: '8px' }}>
        <img src={friend.image || 'https://www.gravatar.com/avatar/?d=mp'} alt={friend.name} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }}/>
        <div>{friend.name}</div>
      </div>
    );
  };

  const renderAgentItem = (agent) => (
    <div key={agent.id} onClick={() => setSelectedAgent(agent)} style={{ display: 'flex', alignItems: 'center', padding: '12px', cursor: 'pointer', borderRadius: '8px', border: selectedAgent?.id === agent.id ? '2px solid var(--primary-color)' : '2px solid transparent', marginBottom: '8px' }}>
      <div>🤖 {agent.data.label}</div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '16px', padding: '24px', minWidth: '500px', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Conectar Flujo</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && <div>Cargando...</div>}
          {error && <div style={{ color: 'red' }}>{error}</div>}

          {step === 'selectFriend' && (
            <>
              <label>1. Selecciona un amigo:</label>
              {!loading && !friends.length && <div>No tienes amigos para conectar.</div>}
              {friends.map(renderFriendItem)}
            </>
          )}

          {step === 'selectConnectionType' && selectedFriend && (
            <>
              <label>2. Conectar con:</label>
              <button onClick={() => handleSelectConnectionType('user')}>Usuario ({selectedFriend.name})</button>
              <button onClick={() => handleSelectConnectionType('agent')}>Un agente de {selectedFriend.name}</button>
            </>
          )}

          {step === 'selectAgent' && (
            <>
              <label>3. Selecciona un agente o flujo público de {selectedFriend.name}:</label>
              {!loading && !publicFlows.length && <div>Este usuario no tiene flujos públicos.</div>}
              {publicFlows.map(flow => (
                <div key={flow.id}>
                  <h4>{flow.name}</h4>
                  {flow.flow_data.nodes.filter(node => node.type === 'actor' && node.data.actorType === 'ai').map(renderAgentItem)}
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #eee' }}>
          <button onClick={onClose} style={{ marginRight: '10px' }}>Cancelar</button>
          {step === 'selectAgent' && <button onClick={() => handleConnect('agent', selectedAgent)} disabled={!selectedAgent || loading}>{loading ? 'Conectando...' : 'Finalizar Conexión'}</button>}
        </div>
      </div>
    </div>
  );
}