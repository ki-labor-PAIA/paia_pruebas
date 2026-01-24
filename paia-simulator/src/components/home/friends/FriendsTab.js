import { useState, useEffect } from 'react';

export default function FriendsTab({
  friends,
  loading,
  onAddFriend,
  onAcceptRequest,
  onRejectRequest
}) {
  const [acceptedFriends, setAcceptedFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    if (friends && Array.isArray(friends)) {
      const accepted = friends.filter(friend => friend.status === 'accepted');
      const pending = friends.filter(friend =>
        friend.status === 'pending_received' || friend.status === 'pending_sent'
      );

      setAcceptedFriends(accepted);
      setPendingRequests(pending);
    }
  }, [friends]);

  const EmptyState = ({ icon, title, description, actionLabel, onAction }) => (
    <div style={{
      textAlign: 'center',
      padding: '80px 40px',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '16px',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>{icon}</div>
      <h3 style={{
        fontSize: '22px',
        fontWeight: '600',
        marginBottom: '12px',
        color: 'var(--text-primary)'
      }}>
        {title}
      </h3>
      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: '24px',
        fontSize: '16px',
        lineHeight: '1.5'
      }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );

  const FriendCard = ({ friend, isPending = false }) => {
    const getConnectionStatusBadge = (status) => {
      if (status === 'accepted') {
        return { text: 'Friend', icon: '✓', color: '#10B981' };
      } else if (status === 'pending_sent') {
        return { text: 'Request Sent', icon: '⏳', color: '#F59E0B' };
      } else if (status === 'pending_received') {
        return { text: 'Request Received', icon: '📩', color: '#3B82F6' };
      }
      return { text: 'Unknown', icon: '?', color: '#6B7280' };
    };

    const statusBadge = getConnectionStatusBadge(friend.status);

    return (
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          borderLeft: `4px solid ${statusBadge.color}`,
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px'
        }}>
          {friend.friend_image && (
            <img
              src={friend.friend_image}
              alt={friend.friend_name}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--border-color)'
              }}
            />
          )}
          {!friend.friend_image && (
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {friend.friend_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 4px 0',
              color: 'var(--text-primary)'
            }}>
              {friend.friend_name}
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              {friend.friend_email}
            </p>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              backgroundColor: `${statusBadge.color}20`,
              color: statusBadge.color,
              padding: '4px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>{statusBadge.icon}</span>
              <span>{statusBadge.text}</span>
            </span>
            {friend.connection_type && (
              <span style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--text-secondary)'
              }}>
                {friend.connection_type === 'friend' ? '👫' :
                 friend.connection_type === 'colleague' ? '💼' :
                 '🤝'}
              </span>
            )}
          </div>

          {isPending && friend.status === 'pending_received' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => onAcceptRequest(friend)}
                style={{
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#059669';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#10B981';
                }}
              >
                Accept
              </button>
              <button
                onClick={() => onRejectRequest(friend)}
                style={{
                  background: 'transparent',
                  color: '#EF4444',
                  border: '1px solid #EF4444',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#EF4444';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#EF4444';
                }}
              >
                Reject
              </button>
            </div>
          )}
        </div>

        {friend.connected_since && !isPending && (
          <div style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '12px'
          }}>
            Connected since {new Date(friend.connected_since).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '60px',
          fontSize: '18px',
          color: 'var(--text-secondary)',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          maxWidth: '600px',
          width: '100%'
        }}>
          Loading friends...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, textAlign: 'center' }}>
          My Friends
        </h2>
        <button
          onClick={onAddFriend}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }}
        >
          + Add Friend
        </button>
      </div>

      {friends.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px'
        }}>
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <EmptyState
              icon="👥"
              title="Connect with friends!"
              description={
                <>
                  Search and connect with other users to share flows and agents.<br/>
                  Collaborate on projects and access shared resources.
                </>
              }
              actionLabel="Search Friends"
              onAction={onAddFriend}
            />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {pendingRequests.length > 0 && (
            <section>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
                  Pending Requests
                </h3>
                <span style={{
                  background: '#F59E0B',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {pendingRequests.length}
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                maxWidth: '1200px',
                margin: '0 auto'
              }}>
                {pendingRequests.map(friend => (
                  <FriendCard
                    key={friend.connection_id}
                    friend={friend}
                    isPending={true}
                  />
                ))}
              </div>
            </section>
          )}

          {acceptedFriends.length > 0 && (
            <section>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid var(--border-color)'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  margin: 0,
                  color: 'var(--text-primary)'
                }}>
                  Accepted Friends
                </h3>
                <span style={{
                  background: '#10B981',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {acceptedFriends.length}
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                maxWidth: '1200px',
                margin: '0 auto'
              }}>
                {acceptedFriends.map(friend => (
                  <FriendCard
                    key={friend.connection_id}
                    friend={friend}
                    isPending={false}
                  />
                ))}
              </div>
            </section>
          )}

          {acceptedFriends.length === 0 && pendingRequests.length > 0 && (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{
                color: 'var(--text-secondary)',
                fontSize: '14px',
                margin: 0
              }}>
                You don't have any accepted friends yet. Accept pending requests or search for new friends.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
