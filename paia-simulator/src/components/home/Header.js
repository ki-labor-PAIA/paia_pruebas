import React from 'react';

const Header = ({
  title,
  subtitle,
  showNotifications = false,
  notificationCount = 0,
  onNotificationsClick,
  showTutorialButton = false,
  onTutorialClick,
  showConnectButton = false,
  onConnectClick,
  showCreateAgentButton = false,
  onCreateAgentClick
}) => {
  return (
    <div className="library-header" style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '40px',
      padding: '24px',
      backgroundColor: 'var(--card-bg)',
      borderRadius: '16px',
      border: '1px solid var(--border-color)',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div style={{ flex: '1 1 auto', minWidth: '200px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '800',
          margin: '0 0 8px 0',
          background: 'linear-gradient(135deg, var(--primary-color) 0%, #7C3AED 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '16px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {showNotifications && (
          <button
            data-tutorial="btn-notifications"
            onClick={onNotificationsClick}
            style={{
              position: 'relative',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Notifications
            {notificationCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-6px',
                right: '-6px',
                background: '#EF4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        )}

        {showTutorialButton && (
          <button
            onClick={onTutorialClick}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '10px 16px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}
          >
            Tutorial
          </button>
        )}

        {showConnectButton && (
          <button
            data-tutorial="btn-connect"
            onClick={onConnectClick}
            style={{
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Connect User
          </button>
        )}

        {showCreateAgentButton && (
          <button
            data-tutorial="btn-create-agent"
            onClick={onCreateAgentClick}
            style={{
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            Create Agent
          </button>
        )}
      </div>
    </div>
  );
};

export default Header;
