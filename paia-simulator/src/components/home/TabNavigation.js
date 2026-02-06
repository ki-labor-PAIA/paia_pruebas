import React from 'react';

const TabNavigation = ({ activeTab, tabs, onTabChange }) => {
  return (
    <div
      data-tutorial="tabs"
      style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '32px',
        overflowX: 'auto',
        padding: '4px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.key}
          data-tutorial={`tab-${tab.key}`}
          onClick={() => onTabChange(tab.key)}
          style={{
            background: activeTab === tab.key
              ? 'var(--primary-color)'
              : 'var(--card-bg)',
            color: activeTab === tab.key
              ? 'white'
              : 'var(--text-primary)',
            border: activeTab === tab.key
              ? 'none'
              : '1px solid var(--border-color)',
            padding: '16px 24px',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            minWidth: '120px',
            boxShadow: activeTab === tab.key ? '0 4px 12px rgba(79, 70, 229, 0.3)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--primary-color)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                {tab.count}
              </span>
            )}
          </div>
          <span style={{
            fontSize: '11px',
            opacity: 0.7,
            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)'
          }}>
            {tab.desc}
          </span>
        </button>
      ))}
    </div>
  );
};

export default TabNavigation;
