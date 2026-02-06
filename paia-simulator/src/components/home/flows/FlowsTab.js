import React from 'react';
import FlowCard from './FlowCard';
import EmptyState from '../EmptyState';

const FlowsTab = ({
  flows = [],
  loading = false,
  onCreateNew,
  onFlowAction
}) => {
  const handleToggleStatus = (flowId, currentStatus) => {
    if (onFlowAction) {
      onFlowAction('toggleStatus', flowId, currentStatus);
    }
  };

  const handleDelete = (flowId) => {
    if (onFlowAction) {
      onFlowAction('delete', flowId);
    }
  };

  const handleEdit = (flowId) => {
    if (onFlowAction) {
      onFlowAction('edit', flowId);
    }
  };

  const handleDuplicate = (flowId) => {
    if (onFlowAction) {
      onFlowAction('duplicate', flowId);
    }
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid var(--border-color)',
              borderTopColor: 'var(--primary-color)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Loading flows...
          </p>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
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
        <h2
          data-tour="flows-section"
          style={{
            fontSize: '24px',
            fontWeight: '700',
            margin: 0,
            color: 'var(--text-primary)',
            textAlign: 'center',
          }}
        >
          My Saved Flows
        </h2>
        <button
          data-tutorial="btn-create-flow"
          onClick={handleCreateNew}
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
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          Create New Flow
        </button>
      </div>

      {flows.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="Create your first flow"
          description={
            <>
              Design intelligent agent flows and save them to share with friends.
              <br />
              Connect humans, AIs and external services visually.
            </>
          }
          action={{
            label: 'Create My First Flow',
            onClick: handleCreateNew,
          }}
        />
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
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      {flows.length > 0 && (
        <div
          style={{
            marginTop: '32px',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            {flows.length} {flows.length === 1 ? 'saved flow' : 'saved flows'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FlowsTab;
