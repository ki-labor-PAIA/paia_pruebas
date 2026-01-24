import React from 'react';
import AgentCard from './AgentCard';

const AgentsTab = ({ agents, loading, onCreateNew, onAgentAction }) => {
  const handleEdit = (agent) => {
    if (onAgentAction) {
      onAgentAction('edit', agent);
    }
  };

  const handleDelete = (agent) => {
    if (!confirm(`Are you sure you want to delete the agent "${agent.name}"?`)) {
      return;
    }

    if (onAgentAction) {
      onAgentAction('delete', agent);
    }
  };

  const handleConfigure = (agent) => {
    if (onAgentAction) {
      onAgentAction('configure', agent);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            fontSize: '18px',
            color: 'var(--text-secondary)',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          Loading agents...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: '700', margin: 0, textAlign: 'center' }}>
          My Created Agents
        </h2>
        <button
          onClick={() => onCreateNew && onCreateNew()}
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
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Create New Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '80px 40px',
              backgroundColor: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              maxWidth: '600px',
              width: '100%',
            }}
          >
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🤖</div>
          <h3
            style={{
              fontSize: '22px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--text-primary)',
            }}
          >
            Create your first agent
          </h3>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: '24px',
              fontSize: '16px',
              lineHeight: '1.5',
            }}
          >
            Design specialized agents with unique personalities and expertise.
            <br />
            Use them in your flows or share them with friends.
          </p>
          <button
            onClick={() => onCreateNew && onCreateNew()}
            style={{
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              padding: '14px 28px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: '600',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Create My First Agent
          </button>
        </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConfigure={handleConfigure}
            />
          ))}
        </div>
      )}

      {agents.length > 0 && (
        <div
          style={{
            marginTop: '32px',
            textAlign: 'center',
            fontSize: '14px',
            color: 'var(--text-secondary)',
          }}
        >
          Total agents: {agents.length}
        </div>
      )}
    </div>
  );
};

export default AgentsTab;
