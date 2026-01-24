import { useState, useEffect } from 'react';

export default function NotificationPanel({ userId, isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', 'read'
  const [error, setError] = useState('');

  // Cargar notificaciones al abrir el panel
  useEffect(() => {
    if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId, filter]);

  const loadNotifications = async () => {
    if (!userId) {
      setError('Could not get user ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const unreadOnly = filter === 'unread';
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${userId}?unread_only=${unreadOnly}&limit=50`;
      console.log('Fetching notifications from:', url);
      
      const response = await fetch(url);
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Notifications data:', data);
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(`Error loading notifications: ${err.message}`);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/${notificationId}/read`, {
        method: 'POST'
      });

      if (response.ok) {
        // Actualizar localmente
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true }
              : notif
          )
        );
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    
    // Marcar todas como leídas en paralelo
    await Promise.all(
      unreadNotifications.map(notif => markAsRead(notif.id))
    );
  };

  const createTestNotification = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/notifications/test/${userId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Recargar notificaciones
        await loadNotifications();
      }
    } catch (err) {
      console.error('Error creating test notification:', err);
    }
  };

  // Manejar respuesta a solicitud de conexión
  const handleConnectionResponse = async (notificationId, response, connectionId) => {
    try {
      const apiResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/connect/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connection_id: connectionId,
          response: response // 'accept' o 'reject'
        })
      });

      if (apiResponse.ok) {
        // Marcar notificación como leída y actualizar
        await markAsRead(notificationId);
        
        // Actualizar la notificación localmente para mostrar la respuesta
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { 
                  ...notif, 
                  is_read: true,
                  metadata: {
                    ...notif.metadata,
                    response_given: response,
                    responded_at: new Date().toISOString()
                  }
                }
              : notif
          )
        );

        console.log(`Conexión ${response === 'accept' ? 'aceptada' : 'rechazada'} correctamente`);
      } else {
        const errorData = await apiResponse.json();
        console.error('Error responding to connection:', errorData);
        alert(`Error ${response === 'accept' ? 'accepting' : 'rejecting'} the connection`);
      }
    } catch (err) {
      console.error('Error handling connection response:', err);
      alert('Connection error. Try again.');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message': return '💬';
      case 'info': return 'ℹ️';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return '📢';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#EF4444';
      case 'high': return '#F97316';
      case 'normal': return '#3B82F6';
      case 'low': return '#6B7280';
      default: return '#3B82F6';
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${Math.max(1, diffMinutes)} min ago`;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '20px',
      width: '400px',
      maxHeight: '600px',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '16px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      border: '1px solid var(--border-color)',
      zIndex: 1000,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: '4px'
          }}>
            📢 Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '8px',
                fontSize: '12px',
                background: '#EF4444',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 'bold'
              }}>
                {unreadCount}
              </span>
            )}
          </h3>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '8px'
          }}>
            {['all', 'unread', 'read'].map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                style={{
                  background: filter === filterType ? 'var(--primary-color)' : 'transparent',
                  color: filter === filterType ? 'white' : 'var(--text-secondary)',
                  border: filter === filterType ? 'none' : '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {filterType === 'all' ? 'All' : filterType === 'unread' ? 'Unread' : 'Read'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary-color)',
                fontSize: '12px',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px',
                fontWeight: '500'
              }}
              title="Mark all as read"
            >
              ✓ Todas
            </button>
          )}
          
          <button
            onClick={createTestNotification}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              fontWeight: '500'
            }}
            title="Create test notification"
          >
            🧪 Test
          </button>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: loading || error || notifications.length === 0 ? '20px' : '0'
      }}>
        {loading && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            🔄 Loading notifications...
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            borderRadius: '8px',
            padding: '12px',
            color: '#EF4444',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            {filter === 'unread' ? '🎉 No pending notifications' : '📭 No notifications'}
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <div>
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < notifications.length - 1 ? '1px solid var(--border-color)' : 'none',
                  backgroundColor: notification.is_read ? 'transparent' : 'rgba(79, 70, 229, 0.05)',
                  cursor: notification.is_read ? 'default' : 'pointer',
                  transition: 'background-color 0.2s ease',
                  borderLeft: `4px solid ${getPriorityColor(notification.priority)}`
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>
                      {getNotificationIcon(notification.type)}
                    </span>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: notification.is_read ? '500' : '600',
                      color: 'var(--text-primary)',
                      margin: 0,
                      opacity: notification.is_read ? 0.8 : 1
                    }}>
                      {notification.title}
                    </h4>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap'
                    }}>
                      {getTimeAgo(notification.created_at)}
                    </span>
                    {!notification.is_read && (
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--primary-color)'
                      }} />
                    )}
                  </div>
                </div>

                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: '1.4',
                  opacity: notification.is_read ? 0.7 : 1
                }}>
                  {notification.content}
                </p>

                {/* Botones para solicitudes de conexión */}
                {notification.title === 'Nueva solicitud de conexión' && 
                 !notification.metadata?.response_given && 
                 !notification.is_read && (
                  <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectionResponse(
                          notification.id, 
                          'accept', 
                          notification.metadata?.connection_id
                        );
                      }}
                      style={{
                        background: '#10B981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#10B981'}
                    >
                      ✅ Accept
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConnectionResponse(
                          notification.id, 
                          'reject', 
                          notification.metadata?.connection_id
                        );
                      }}
                      style={{
                        background: '#EF4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#DC2626'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = '#EF4444'}
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}

                {/* Mostrar respuesta ya dada */}
                {notification.title === 'Nueva solicitud de conexión' && 
                 notification.metadata?.response_given && (
                  <div style={{
                    marginTop: '8px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: notification.metadata.response_given === 'accept' 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : 'rgba(239, 68, 68, 0.1)',
                    color: notification.metadata.response_given === 'accept' 
                      ? '#10B981' 
                      : '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {notification.metadata.response_given === 'accept' ? '✅ Accepted' : '❌ Rejected'}
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>
                      • {getTimeAgo(notification.metadata.responded_at)}
                    </span>
                  </div>
                )}

                {notification.priority === 'urgent' && (
                  <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#EF4444',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🚨 URGENTE
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && notifications.length > 0 && (
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0, 0, 0, 0.02)',
          textAlign: 'center'
        }}>
          <button
            onClick={loadNotifications}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}
    </div>
  );
}