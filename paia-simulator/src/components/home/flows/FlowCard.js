import React, { useState } from 'react';

const FlowCard = ({
  flow,
  onToggleStatus,
  onDelete,
  onEdit,
  onDuplicate
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleToggleStatus = (e) => {
    e.stopPropagation();
    if (onToggleStatus) {
      onToggleStatus(flow.id, flow.is_active);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(flow.id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(flow.id);
    }
  };

  const handleDuplicate = (e) => {
    e.stopPropagation();
    if (onDuplicate) {
      onDuplicate(flow.id);
    }
  };

  const handleOpen = () => {
    if (onEdit) {
      onEdit(flow.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (error) {
      return 'N/A';
    }
  };

  return (
    <div
      data-tutorial="flow-card"
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.15)' : 'none',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleOpen}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '600',
            margin: 0,
            color: 'var(--text-primary)',
            flex: 1,
            marginRight: '12px',
          }}
        >
          {flow.name || 'Untitled'}
        </h3>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: flow.is_active ? '#10B981' : '#6B7280',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              color: 'var(--text-secondary)',
              fontWeight: '500',
            }}
          >
            {flow.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <p
        style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          margin: '0 0 20px 0',
          lineHeight: '1.5',
          minHeight: '42px',
        }}
      >
        {flow.description || 'No description'}
      </p>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            background: 'rgba(79, 70, 229, 0.1)',
            color: 'var(--primary-color)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          v{flow.version || '1.0'}
        </span>
        {flow.is_public && (
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
        {flow.created_at && (
          <span
            style={{
              background: 'rgba(100, 116, 139, 0.1)',
              color: 'var(--text-secondary)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '500',
            }}
          >
            Created: {formatDate(flow.created_at)}
          </span>
        )}
      </div>

      <div
        data-tutorial="flow-actions"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            flex: 1,
          }}
        >
          <button
            onClick={handleEdit}
            style={{
              background: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            Edit
          </button>
          <button
            onClick={handleToggleStatus}
            style={{
              background: flow.is_active ? '#EF4444' : '#10B981',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {flow.is_active ? 'Deactivate' : 'Activate'}
          </button>
          {onDuplicate && (
            <button
              onClick={handleDuplicate}
              style={{
                background: 'transparent',
                color: 'var(--primary-color)',
                border: '1px solid var(--primary-color)',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-color)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--primary-color)';
              }}
            >
              Duplicate
            </button>
          )}
        </div>

        <button
          onClick={handleDelete}
          style={{
            background: 'transparent',
            color: '#EF4444',
            border: '1px solid #EF4444',
            padding: '8px 12px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            minWidth: '44px',
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

      {flow.updated_at && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          Updated: {formatDate(flow.updated_at)}
        </div>
      )}
    </div>
  );
};

export default FlowCard;
