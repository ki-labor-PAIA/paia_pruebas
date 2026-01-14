import React from 'react';

const EmptyState = ({ icon, title, description, action }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '80px 40px',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>{icon}</div>
      <h3
        style={{
          fontSize: '22px',
          fontWeight: '600',
          marginBottom: '12px',
          color: 'var(--text-primary)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          color: 'var(--text-secondary)',
          marginBottom: '24px',
          fontSize: '16px',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
