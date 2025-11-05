import { Handle, Position } from 'reactflow';
import { useState } from 'react';

export default function ActorNode({ id, data, isConnectable, onOpenNotes }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.label);

  const handleNodeClick = () => {
    if (data.expertise === 'notes') {
      onOpenNotes(id);
    }
  };

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
        background: 'var(--card-bg)',
        border: '2px solid var(--primary-color)',
        borderRadius: '12px',
        minWidth: '80px',
        minHeight: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Handle
          type="target"
          position={Position.Top}
          isConnectable={isConnectable}
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
            color: 'var(--text-primary)',
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
      onClick={handleNodeClick}
      onDoubleClick={handleDoubleClick}
      style={{
        padding: '15px',
        background: data.agentColor || 'inherit',
        borderRadius: '12px',
        minWidth: '80px',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>
        {data.emoji}
      </div>
      
      <div style={{ 
        fontSize: '12px', 
        textAlign: 'center',
        color: 'white',
        fontWeight: '500',
        maxWidth: '70px',
        wordWrap: 'break-word'
      }}>
        {data.label}
      </div>

      {/* Mostrar información adicional si es un agente PAIA configurado */}
      {(data.personality || data.expertise) && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          width: '16px',
          height: '16px',
          background: 'var(--success-color)',
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

      {/* Mostrar indicador si el humano tiene mensaje personalizado */}
      {data.actorType === 'human' && data.customMessage && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          width: '16px',
          height: '16px',
          background: 'var(--warning-color)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: 'white',
          fontWeight: 'bold'
        }}>
          💬
        </div>
      )}

      {/* Tooltip con información del agente */}
      {(data.personality || data.expertise) && (
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
          className="agent-tooltip"
        >
          {data.personality && `${data.personality}`}
          {data.personality && data.expertise && ' • '}
          {data.expertise && `${data.expertise}`}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="actor-output"
        isConnectable={isConnectable}
        style={{ background: '#555', bottom: -8, borderRadius: '50%', border: '2px solid white' }}
      />
    </div>
  );
}