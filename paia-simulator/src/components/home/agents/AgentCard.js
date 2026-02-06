import React from 'react';

const AgentCard = ({ agent, onEdit, onDelete, onConfigure }) => {
  const getPersonalityColor = (personality) => {
    const colors = {
      'amigable': '#10B981',
      'profesional': '#3B82F6',
      'creativo': '#8B5CF6',
      'analitico': '#F59E0B',
      'tecnico': '#6366F1',
      'empatico': '#EC4899',
      'directo': '#EF4444',
      'humoristico': '#F97316',
    };

    const normalizedPersonality = personality?.toLowerCase() || '';
    return colors[normalizedPersonality] || '#6B7280';
  };

  const getOnlineStatus = () => {
    return Math.random() > 0.5;
  };

  const isOnline = getOnlineStatus();
  const personalityColor = getPersonalityColor(agent.personality);

  return (
    <div
      data-tutorial="agent-card"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderLeft: `4px solid ${personalityColor}`,
        borderRadius: '12px',
        padding: '20px',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: '18px',
              fontWeight: '600',
              margin: '0 0 8px 0',
              color: 'var(--text-primary)',
            }}
          >
            {agent.name}
          </h3>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#10B981' : '#6B7280',
              boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.5)' : 'none',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              color: isOnline ? '#10B981' : 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            Personality:
          </span>
          <span
            style={{
              fontSize: '13px',
              color: personalityColor,
              fontWeight: '600',
              textTransform: 'capitalize',
            }}
          >
            {agent.personality}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            Expertise:
          </span>
          <span
            style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          >
            {agent.expertise}
          </span>
        </div>
      </div>

      {agent.description && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: '0 0 16px 0',
            lineHeight: '1.5',
          }}
        >
          {agent.description}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        {agent.is_public && (
          <span
            style={{
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#10B981',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Public
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <button
          data-tutorial="agent-edit"
          onClick={() => onEdit && onEdit(agent)}
          style={{
            flex: 1,
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#5B21B6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--primary-color)';
          }}
        >
          Edit
        </button>

        <button
          data-tutorial="agent-chat"
          onClick={() => onConfigure && onConfigure(agent)}
          style={{
            flex: 1,
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563EB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3B82F6';
          }}
        >
          Configure
        </button>

        <button
          data-tutorial="agent-delete"
          onClick={() => onDelete && onDelete(agent)}
          style={{
            background: 'transparent',
            color: '#EF4444',
            border: '1px solid #EF4444',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#EF4444';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#EF4444';
          }}
        >
          Delete
        </button>
      </div>

      {agent.created_at && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '12px',
            textAlign: 'right',
          }}
        >
          Created: {new Date(agent.created_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
};

export default AgentCard;
