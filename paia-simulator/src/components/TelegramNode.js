import { Handle, Position } from 'reactflow';
import { useState } from 'react';

export default function TelegramNode({ data, isConnectable }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.label);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    data.label = editName;
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(data.label);
    setIsEditing(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div style={{
        padding: '15px',
        background: '#0088cc',
        border: '2px solid #006699',
        borderRadius: '12px',
        minWidth: '100px',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
          style={{ visibility: 'hidden' }}
        />
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyPress}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            textAlign: 'center',
            fontSize: '12px',
            width: '100%',
            outline: 'none'
          }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          isConnectable={isConnectable}
        />
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      style={{
        padding: '15px',
        background: '#0088cc',
        borderRadius: '12px',
        minWidth: '100px',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        border: '2px solid #006699'
      }}
    >
      {/* Solo handle de salida - Telegram es punto de entrada */}
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#004d73' }}
      />
      
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>
        📱
      </div>
      
      <div style={{ 
        fontSize: '12px', 
        textAlign: 'center',
        color: 'white',
        fontWeight: '500',
        maxWidth: '80px',
        wordWrap: 'break-word'
      }}>
        {data.label}
      </div>

      {/* Indicador de configuración */}
      {data.isConfigured && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '16px',
          height: '16px',
          background: '#10b981',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: 'white',
          fontWeight: 'bold'
        }}>
          ✓
        </div>
      )}

      {/* Indicador de estado activo */}
      {data.isActive && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          width: '16px',
          height: '16px',
          background: '#22c55e',
          borderRadius: '50%',
          animation: 'pulse 2s infinite',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: 'white',
          fontWeight: 'bold'
        }}>
          🔴
        </div>
      )}

      {/* Tooltip con información */}
      <div 
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '6px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease',
          zIndex: 1000
        }}
        className="telegram-tooltip"
      >
        {data.isActive ? 'Telegram Activo' : 'Telegram Disponible'}
        {data.botToken && <br />}
        {data.botToken && `Bot: ${data.botToken.substring(0, 10)}...`}
      </div>
    </div>
  );
}