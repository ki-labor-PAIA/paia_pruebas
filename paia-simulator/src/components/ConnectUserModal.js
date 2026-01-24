import { useState, useEffect, useCallback } from 'react';
import PAIAApi from '@/utils/api';

// Debounce hook to avoid excessive API calls
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function ConnectUserModal({ 
  isOpen, 
  onClose, 
  currentUserId, 
  onConnect,
  connectionNodeId,
  connectionMode = 'social' // Default to 'social'
}) {
  // --- Generic State ---
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // --- 'flow' Mode State ---
  const [step, setStep] = useState('selectFriend');
  const [friends, setFriends] = useState([]);
  const [publicAgents, setPublicAgents] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedConnectionType, setSelectedConnectionType] = useState(null);

  // --- 'social' Mode State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // --- Styles ---
  const buttonStyle = {
    background: 'var(--primary-color, #6366f1)',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#555',
  };

  const disabledButtonStyle = {
    ...buttonStyle,
    background: '#444',
    color: '#888',
    cursor: 'not-allowed'
  };

  const resetState = useCallback(() => {
    setLoading(false);
    setError('');
    setStep('selectFriend');
    setFriends([]);
    setPublicAgents([]);
    setSelectedFriend(null);
    setSelectedAgent(null);
    setSelectedConnectionType(null);
    setSearchQuery('');
    setSearchResults([]);
    setSearchLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetState();
      if (connectionMode === 'flow') {
        loadFriends();
      }
    }
  }, [isOpen, connectionMode, resetState]);

  useEffect(() => {
    if (debouncedSearchQuery && connectionMode === 'social') {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearchQuery, connectionMode]);

  const handleSearch = async () => {
    if (debouncedSearchQuery.length < 2) return;
    setSearchLoading(true);
    setError('');
    try {
      console.log('Buscando usuarios con query:', debouncedSearchQuery, 'currentUserId:', currentUserId);
      const response = await PAIAApi.searchUsers(debouncedSearchQuery, currentUserId);
      console.log('Respuesta de búsqueda:', response);
      setSearchResults(response.users || []);
    } catch (err) {
      console.error('Error en handleSearch:', err);
      setError(`Error searching users: ${err.message}`);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async (recipient) => {
    setLoading(true);
    setError('');
    try {
      await PAIAApi.createSocialConnection(currentUserId, recipient.id);
      if (onConnect) {
        onConnect({ mode: 'social', user: recipient });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error sending request.');
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    setLoading(true);
    try {
      const response = await PAIAApi.getUserConnections(currentUserId, 'accepted');
      setFriends(response.connections || []);
    } catch (err) {
      setError('Error loading friends list.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = (friendConnection) => {
    const friendDetails = friendConnection.requester.id === currentUserId ? friendConnection.recipient : friendConnection.requester;
    setSelectedFriend(friendDetails);
    setStep('selectConnectionType');
  };

  const handleNextStep = async () => {
    if (step === 'selectConnectionType') {
      if (selectedConnectionType === 'user') {
        handleFlowConnect('user');
      } else if (selectedConnectionType === 'agent') {
        setLoading(true);
        setError('');
        try {
          // 1. Get all agents for the selected friend
          const allAgents = await PAIAApi.getAgents(selectedFriend.id);
          
          // 2. Filter for public agents
          const publicAgents = allAgents.filter(agent => agent.is_public);
          
          setPublicAgents(publicAgents);
          setStep('selectAgent');
        } catch (err) {
          setError("Error loading friend's agents.");
        } finally {
          setLoading(false);
        }
      }
    }
  };

  const handleFlowConnect = async (connectionType, agentTarget = null) => {
    setLoading(true);
    setError('');
    try {
      // We are only handling the 'agent' connection type for now.
      if (connectionType !== 'agent' || !agentTarget) {
        setError("You must select a target agent.");
        setLoading(false);
        return;
      }

      const connectionData = {
        flow_owner_id: currentUserId,
        target_user_id: selectedFriend.id,
        connection_node_id: connectionNodeId,
        connection_type: 'agent', // Hardcode to 'agent'
        target_agent_id: agentTarget.id,
        metadata: { 
          target_user_name: selectedFriend.name,
          target_agent_name: agentTarget.name // Corrected from agentTarget.label
        }
      };
      
      const response = await PAIAApi.createFlowConnection(connectionData);
      
      if (onConnect) {
        onConnect({ 
          mode: 'flow', 
          agent: agentTarget, // Pass the full agent object
          connectionNodeId, 
          flowConnectionId: response.flow_connection_id 
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Error creating flow connection.');
      setLoading(false);
    }
  };

  const renderSocialMode = () => (
    <>
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #555', background: '#333', color: 'white' }}
        />
      </div>
      <div style={{ minHeight: '200px' }}>
        {searchLoading && <div style={{textAlign: 'center', padding: '20px'}}>Searching...</div>}
        {!searchLoading && searchResults.map(user => (
          <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', marginBottom: '8px', background: '#444' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={user.image || 'https://www.gravatar.com/avatar/?d=mp'} alt={user.name} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }}/>
              <div>
                <div style={{ fontWeight: 'bold' }}>{user.name}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>{user.email}</div>
              </div>
            </div>
            <button onClick={() => handleSendRequest(user)} style={loading ? disabledButtonStyle : buttonStyle} disabled={loading}>{loading ? 'Sending...' : 'Send Request'}</button>
          </div>
        ))}
        {!searchLoading && debouncedSearchQuery && !searchResults.length && <div style={{textAlign: 'center', padding: '20px'}}>No users found.</div>}
      </div>
    </>
  );

  const renderFlowMode = () => {
    const selectionBoxStyle = (type) => ({
      padding: '16px',
      border: `2px solid ${selectedConnectionType === type ? 'var(--primary-color)' : '#555'}`,
      borderRadius: '8px',
      marginBottom: '10px',
      cursor: 'pointer',
      background: selectedConnectionType === type ? '#3a3a5a' : '#444'
    });

    return (
      <>
        {loading && !searchLoading && <div style={{textAlign: 'center', padding: '20px'}}>Loading...</div>}

        {step === 'selectFriend' && (
          <>
            <label style={{display: 'block', marginBottom: '10px'}}>1. Select a friend:</label>
            {!loading && !friends.length && <div style={{padding: '20px 0', textAlign: 'center'}}>You don't have friends to connect. Add friends from the left panel.</div>}
            {friends.map(friendConnection => {
              const friend = friendConnection.requester.id === currentUserId ? friendConnection.recipient : friendConnection.requester;
              return (
                <div key={friend.id} onClick={() => handleSelectFriend(friendConnection)} style={{ display: 'flex', alignItems: 'center', padding: '12px', cursor: 'pointer', borderRadius: '8px', marginBottom: '8px', background: '#444' }}>
                  <img src={friend.image || 'https://www.gravatar.com/avatar/?d=mp'} alt={friend.name} style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '12px' }}/>
                  <div>{friend.name}</div>
                </div>
              );
            })}
          </>
        )}

        {step === 'selectConnectionType' && selectedFriend && (
          <>
            <label style={{display: 'block', marginBottom: '10px'}}>2. How do you want to connect with {selectedFriend.name}?</label>
            <div onClick={() => setSelectedConnectionType('user')} style={selectionBoxStyle('user')}>
              <h4 style={{margin: '0 0 5px 0'}}>Connect with User</h4>
              <p style={{margin: 0, fontSize: '14px', color: '#ccc'}}>Create a direct connection with the user. Useful for simple notifications.</p>
            </div>
            <div onClick={() => setSelectedConnectionType('agent')} style={selectionBoxStyle('agent')}>
              <h4 style={{margin: '0 0 5px 0'}}>Connect with Agent</h4>
              <p style={{margin: 0, fontSize: '14px', color: '#ccc'}}>Connect your flow to an intelligent agent from this user for complex tasks.</p>
            </div>
          </>
        )}

        {step === 'selectAgent' && (
          <>
            <label style={{display: 'block', marginBottom: '10px'}}>3. Select a public agent from {selectedFriend.name}:</label>
            {!loading && !publicAgents.length && <div style={{padding: '20px 0', textAlign: 'center'}}>This user has no public agents available.</div>}
            {publicAgents.map(agent => (
              <div 
                key={agent.id} 
                onClick={() => setSelectedAgent(agent)} 
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '12px', 
                  cursor: 'pointer', 
                  borderRadius: '8px', 
                  border: selectedAgent?.id === agent.id ? '2px solid var(--primary-color)' : '2px solid transparent', 
                  marginBottom: '8px', 
                  background: '#444' 
                }}
              >
                <div style={{fontSize: '24px', marginRight: '12px'}}>🤖</div>
                <div>
                  <div style={{fontWeight: 'bold'}}>{agent.name}</div>
                  <div style={{fontSize: '12px', color: '#ccc'}}>Expertise: {agent.expertise}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </>
    );
  }

  if (!isOpen) return null;

  const renderFooter = () => {
    let nextButton = null;
    if (connectionMode === 'flow') {
      if (step === 'selectConnectionType') {
        nextButton = <button onClick={handleNextStep} style={!selectedConnectionType || loading ? disabledButtonStyle : buttonStyle} disabled={!selectedConnectionType || loading}>Next</button>;
      } else if (step === 'selectAgent') {
        nextButton = <button onClick={() => handleFlowConnect('agent', selectedAgent)} style={!selectedAgent || loading ? disabledButtonStyle : buttonStyle} disabled={!selectedAgent || loading}>{loading ? 'Connecting...' : 'Finish Connection'}</button>;
      }
    }

    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '20px', borderTop: '1px solid #555' }}>
        <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
        {nextButton}
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--card-bg)', color: 'white', borderRadius: '16px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
            {connectionMode === 'flow' ? 'Connect Flow' : 'Search Users'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'white' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }}>
          {error && <div style={{ color: '#ff8a8a', marginBottom: '10px', background: '#5c2a2a', padding: '10px', borderRadius: '8px' }}>{error}</div>}
          {connectionMode === 'flow' ? renderFlowMode() : renderSocialMode()}
        </div>

        {renderFooter()}
      </div>
    </div>
  );
}
