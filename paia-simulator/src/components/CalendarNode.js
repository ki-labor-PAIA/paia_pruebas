import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { Calendar, Check } from 'lucide-react';

export default function CalendarNode({ data, isConnectable }) {
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

  const handleClick = () => {
    // El nodo ya está configurado, no hace nada al hacer clic
  };

  if (isEditing) {
    return (
      <div style={{
        padding: '15px',
        background: '#4285f4',
        border: '2px solid #1a73e8',
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
          style={{ visibility: 'hidden' }}
        />
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      style={{
        padding: '15px',
        background: '#4285f4',
        borderRadius: '12px',
        minWidth: '100px',
        minHeight: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        position: 'relative',
        border: '2px solid #1a73e8'
      }}
    >
      {/* Solo handle de entrada - Calendar es punto final */}
      <Handle
        type="target"
        position={Position.Top}
        id="calendar-input"
        isConnectable={isConnectable}
        style={{ background: '#1557b0', top: -8, borderRadius: '50%', border: '2px solid white' }}
      />
      
      <div style={{ marginBottom: '8px', opacity: 0.9 }}>
        <Calendar size={28} strokeWidth={2} color="white" />
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

      {/* Indicador de configurado */}
      <div style={{
        position: 'absolute',
        top: '-6px',
        right: '-6px',
        width: '18px',
        height: '18px',
        background: '#10b981',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        border: '2px solid var(--dark-bg)'
      }}>
        <Check size={12} strokeWidth={3} />
      </div>

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
        className="calendar-tooltip"
      >
        Google Calendar Connected
        {data.userEmail && <br />}
        {data.userEmail && `User: ${data.userEmail}`}
      </div>

    </div>
  );
}