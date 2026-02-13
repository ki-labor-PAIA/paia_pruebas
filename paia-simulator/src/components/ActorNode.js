import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { User, Bot, Check, MessageSquare } from 'lucide-react';

export default function ActorNode({ data, isConnectable }) {
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
          style={{
            background: '#EC4899',
            width: '10px',
            height: '10px',
            border: '2px solid white'
          }}
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
          style={{
            background: '#10B981',
            width: '10px',
            height: '10px',
            border: '2px solid white'
          }}
        />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      style={{
        padding: '16px',
        background: data.agentColor || 'inherit',
        borderRadius: '8px',
        minWidth: '90px',
        minHeight: '90px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        data-tutorial="node-handle"
        style={{
          background: '#EC4899',
          width: '10px',
          height: '10px',
          border: '2px solid white',
          boxShadow: '0 0 0 2px rgba(236, 72, 153, 0.3)'
        }}
      />

      <div style={{ marginBottom: '8px', opacity: 0.9 }}>
        {data.actorType === 'human' ? (
          <User size={28} strokeWidth={2} />
        ) : (
          <Bot size={28} strokeWidth={2} />
        )}
      </div>

      <div style={{
        fontSize: '11px',
        textAlign: 'center',
        color: 'white',
        fontWeight: '500',
        maxWidth: '80px',
        wordWrap: 'break-word',
        letterSpacing: '-0.01em'
      }}>
        {data.label}
      </div>

      {/* Mostrar información adicional si es un agente PAIA configurado */}
      {(data.personality || data.expertise) && (
        <div style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '18px',
          height: '18px',
          background: 'var(--success-color)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          border: '2px solid var(--dark-bg)'
        }}>
          <Check size={12} strokeWidth={3} />
        </div>
      )}

      {/* Mostrar indicador si el humano tiene mensaje personalizado */}
      {data.actorType === 'human' && data.customMessage && (
        <div style={{
          position: 'absolute',
          top: '-6px',
          left: '-6px',
          width: '18px',
          height: '18px',
          background: 'var(--warning-color)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          border: '2px solid var(--dark-bg)'
        }}>
          <MessageSquare size={10} strokeWidth={2.5} />
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
        style={{
          background: '#10B981',
          bottom: -8,
          borderRadius: '50%',
          border: '2px solid white',
          width: '10px',
          height: '10px',
          boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)'
        }}
      />
    </div>
  );
}