import { useState, useEffect, useRef } from 'react';

export default function ChatModal({ 
  isOpen, 
  onClose, 
  activeAgent, 
  nodes, 
  onSendMessage,
  chatMessages = [],
  isTyping = false 
}) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isTyping]);

  const handleSend = () => {
    if (!message.trim() || !activeAgent) return;
    
    onSendMessage(message.trim());
    setMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen || !activeAgent) return null;

  const agent = nodes.find(n => n.id === activeAgent);
  if (!agent) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', height: '70vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header del Chat */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: agent.data.actorType === 'ai' ? 'var(--primary-color)' : 'var(--warning-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              {agent.data.emoji}
            </div>
            <div>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.1em' }}>
                Chat con {agent.data.label}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.8em' }}>
                {agent.data.actorType === 'ai' ? 'Asistente IA' : 'Usuario Humano'}
                {agent.data.expertise && ` • ${agent.data.expertise}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseOut={(e) => e.target.style.background = 'none'}
          >
            <i className="fas fa-times" style={{ fontSize: '16px' }}></i>
          </button>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {chatMessages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '40px 20px'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                {agent.data.emoji}
              </div>
              <p>¡Hola! Soy {agent.data.label}. ¿En qué puedo ayudarte?</p>
            </div>
          )}

          {chatMessages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.sender === 'user' ? 'flex-end' : 
                               msg.sender === 'system' ? 'center' : 'flex-start'
              }}
            >
              <div
                style={{
                  maxWidth: msg.sender === 'system' ? '90%' : '70%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: msg.sender === 'user' ? 'var(--primary-color)' : 
                            msg.sender === 'system' ? 'rgba(245, 158, 11, 0.1)' :
                            msg.sender === 'human' ? 'rgba(245, 158, 11, 0.2)' :
                            msg.sender === 'received' ? 'rgba(74, 107, 223, 0.1)' :
                            'var(--card-bg)',
                  color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                  border: msg.sender === 'user' ? 'none' : 
                         msg.sender === 'system' ? '1px solid rgba(245, 158, 11, 0.3)' :
                         msg.sender === 'human' ? '1px solid var(--warning-color)' :
                         msg.sender === 'received' ? '1px solid var(--primary-color)' :
                         '1px solid var(--border-color)',
                  textAlign: msg.sender === 'system' ? 'center' : 'left'
                }}
              >
                {msg.sender === 'system' && (
                  <div style={{
                    fontSize: '0.8em',
                    color: 'var(--warning-color)',
                    marginBottom: '4px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    <i className="fas fa-info-circle"></i>
                    Sistema
                  </div>
                )}
                {msg.sender === 'human' && (
                  <div style={{
                    fontSize: '0.8em',
                    color: 'var(--warning-color)',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    👤 {agent.data.label}
                  </div>
                )}
                {msg.sender === 'agent' && (
                  <div style={{
                    fontSize: '0.8em',
                    color: 'var(--text-secondary)',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    {agent.data.emoji} {agent.data.label}
                  </div>
                )}
                {msg.sender === 'received' && (
                  <div style={{
                    fontSize: '0.8em',
                    color: 'var(--primary-color)',
                    marginBottom: '4px',
                    fontWeight: '500'
                  }}>
                    📨 Mensaje de {msg.from}
                  </div>
                )}
                <div style={{ fontSize: '0.9em', lineHeight: '1.4' }}>
                  {msg.content}
                </div>
                <div style={{
                  fontSize: '0.7em',
                  opacity: 0.7,
                  marginTop: '4px',
                  textAlign: msg.sender === 'user' ? 'right' : 'left'
                }}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Indicador de escritura */}
          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 14px',
                maxWidth: '70%'
              }}>
                <div style={{
                  fontSize: '0.8em',
                  color: 'var(--text-secondary)',
                  marginBottom: '4px',
                  fontWeight: '500'
                }}>
                  {agent.data.label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div className="typing-dot" style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: 'var(--text-secondary)', 
                    borderRadius: '50%',
                    animation: 'bounce 1.4s infinite'
                  }}></div>
                  <div className="typing-dot" style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: 'var(--text-secondary)', 
                    borderRadius: '50%',
                    animation: 'bounce 1.4s infinite 0.2s'
                  }}></div>
                  <div className="typing-dot" style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: 'var(--text-secondary)', 
                    borderRadius: '50%',
                    animation: 'bounce 1.4s infinite 0.4s'
                  }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input de mensaje */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={agent.data.actorType === 'human' 
                ? `Escribe como ${agent.data.label}...` 
                : "Escribe tu mensaje..."}
              rows="1"
              style={{
                flex: 1,
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.9em',
                resize: 'none',
                maxHeight: '100px',
                minHeight: '40px'
              }}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || isTyping}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: 'none',
                background: message.trim() && !isTyping ? 'var(--primary-color)' : 'var(--border-color)',
                color: message.trim() && !isTyping ? 'white' : 'var(--text-secondary)',
                cursor: message.trim() && !isTyping ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                minWidth: '60px'
              }}
            >
              <i className={`fas ${isTyping ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}