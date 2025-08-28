import { Handle, Position } from 'reactflow';
import { useState } from 'react';

export default function ConnectionNode({ data, isConnectable }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (data.onConnectionClick) {
      data.onConnectionClick(data);
    }
  };

  const getConnectionTypeIcon = () => {
    switch (data.connectionType) {
      case 'user':
        return '👤';
      case 'agent':
        return '🤖';
      case 'workflow':
        return '⚡';
      case 'notification':
        return '📢';
      default:
        return '🔗';
    }
  };

  const getConnectionTypeColor = () => {
    switch (data.connectionType) {
      case 'user':
        return '#4F46E5'; // Indigo
      case 'agent':
        return '#059669'; // Emerald
      case 'workflow':
        return '#DC2626'; // Red
      case 'notification':
        return '#D97706'; // Amber
      default:
        return '#6B7280'; // Gray
    }
  };

  const getStatusIndicator = () => {
    if (!data.status) return null;
    
    switch (data.status) {
      case 'online':
        return <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          background: '#10B981',
          borderRadius: '50%',
          border: '2px solid white'
        }} />;
      case 'offline':
        return <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          background: '#EF4444',
          borderRadius: '50%',
          border: '2px solid white'
        }} />;
      case 'pending':
        return <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '8px',
          height: '8px',
          background: '#F59E0B',
          borderRadius: '50%',
          border: '2px solid white'
        }} />;
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={handleClick}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      style={{
        padding: '15px',
        background: getConnectionTypeColor(),
        borderRadius: '12px',
        minWidth: '100px',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease',
        transform: isExpanded ? 'scale(1.05)' : 'scale(1)',
        boxShadow: isExpanded ? '0 8px 16px rgba(0,0,0,0.2)' : '0 4px 8px rgba(0,0,0,0.1)',
        border: data.isConnected ? '3px solid #10B981' : '2px solid rgba(255,255,255,0.3)'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      {getStatusIndicator()}
      
      <div style={{ fontSize: '28px', marginBottom: '6px' }}>
        {getConnectionTypeIcon()}
      </div>
      
      <div style={{ 
        fontSize: '12px', 
        textAlign: 'center',
        color: 'white',
        fontWeight: '600',
        maxWidth: '85px',
        wordWrap: 'break-word',
        lineHeight: '1.2'
      }}>
        {data.label}
      </div>

      {/* Mostrar información adicional del usuario/agente */}
      {data.userEmail && (
        <div style={{
          fontSize: '9px',
          color: 'rgba(255,255,255,0.8)',
          marginTop: '3px',
          textAlign: 'center',
          maxWidth: '85px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {data.userEmail}
        </div>
      )}

      {/* Badge de conexión establecida */}
      {data.isConnected && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          width: '20px',
          height: '20px',
          background: '#10B981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
          fontWeight: 'bold',
          border: '2px solid white'
        }}>
          ✓
        </div>
      )}

      {/* Badge de solicitud pendiente */}
      {data.status === 'pending' && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          width: '20px',
          height: '20px',
          background: '#F59E0B',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          color: 'white',
          fontWeight: 'bold',
          border: '2px solid white'
        }}>
          ⏳
        </div>
      )}

      {/* Contador de notificaciones no leídas */}
      {data.unreadNotifications && data.unreadNotifications > 0 && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          minWidth: '18px',
          height: '18px',
          background: '#EF4444',
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          color: 'white',
          fontWeight: 'bold',
          border: '2px solid white',
          padding: '0 4px'
        }}>
          {data.unreadNotifications > 99 ? '99+' : data.unreadNotifications}
        </div>
      )}

      {/* Tooltip expandido */}
      {isExpanded && (data.description || data.expertise || data.userEmail) && (
        <div 
          style={{
            position: 'absolute',
            bottom: '-80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            maxWidth: '200px',
            textAlign: 'center',
            zIndex: 1000,
            lineHeight: '1.3'
          }}
        >
          {data.description && (
            <div style={{ marginBottom: '4px', fontWeight: 'bold' }}>
              {data.description}
            </div>
          )}
          {data.expertise && (
            <div style={{ marginBottom: '4px', color: '#D1D5DB' }}>
              Especialidad: {data.expertise}
            </div>
          )}
          {data.userEmail && (
            <div style={{ color: '#9CA3AF' }}>
              {data.userEmail}
            </div>
          )}
          {data.connectionType === 'workflow' && data.workflowInfo && (
            <div style={{ color: '#D1D5DB', fontSize: '10px', marginTop: '4px' }}>
              {data.workflowInfo.agents} agentes • {data.workflowInfo.connections} conexiones
            </div>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="connection-output"
        isConnectable={isConnectable}
        style={{ 
          background: '#555', 
          bottom: -8, 
          borderRadius: '50%', 
          border: '2px solid white' 
        }}
      />
    </div>
  );
}