import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { ArrowLeft } from 'lucide-react';
import Head from 'next/head';

export default function AgentChatPage() {
  const router = useRouter();
  const { agentId } = router.query;
  const { data: session } = useSession();

  const [agent, setAgent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Apply chat-page class to body for full-width layout
  useEffect(() => {
    document.body.classList.add('chat-page');
    return () => {
      document.body.classList.remove('chat-page');
    };
  }, []);

  // Cargar mensajes del localStorage cuando se monta el componente
  useEffect(() => {
    if (!agentId) return;

    const storageKey = `chat_messages_${agentId}`;
    const savedMessages = localStorage.getItem(storageKey);

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error loading messages from localStorage:', error);
      }
    }
  }, [agentId]);

  // Guardar mensajes en localStorage cada vez que cambien
  useEffect(() => {
    if (!agentId || messages.length === 0) return;

    const storageKey = `chat_messages_${agentId}`;
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, agentId]);

  // Cargar información del agente
  useEffect(() => {
    if (!agentId || !session?.user?.id) return;

    const loadAgent = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/agents/${agentId}`);
        if (response.ok) {
          const data = await response.json();
          setAgent(data);
        }
      } catch (error) {
        console.error('Error loading agent:', error);
      } finally {
        setLoading(false);
        // Hacer scroll después de que el agente se haya cargado y el DOM esté listo
        setTimeout(() => {
          if (messages.length > 0) {
            scrollToBottom();
          }
        }, 200);
      }
    };

    loadAgent();
  }, [agentId, session, API_URL]);

  const handleSendMessage = async () => {
    if (!message.trim() || !agent || isTyping) return;

    const userMessage = {
      sender: 'user',
      content: message.trim(),
      timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Resetear altura del textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
    }

    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/api/agents/${agentId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          user_id: session?.user?.id
        })
      });

      if (response.ok) {
        const data = await response.json();
        const agentMessage = {
          sender: 'agent',
          content: data.response || 'Lo siento, no pude procesar tu mensaje.',
          timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, agentMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        sender: 'system',
        content: 'Error al enviar el mensaje. Por favor intenta de nuevo.',
        timestamp: new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e) => {
    setMessage(e.target.value);

    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-primary)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ marginBottom: '16px' }}></div>
          <p>Cargando chat...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text-primary)'
      }}>
        <p>Agente no encontrado</p>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            background: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Chat con {agent.name} - PAIA</title>
      </Head>

      <div style={{
        height: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <header style={{
          background: 'var(--card-bg)',
          borderBottom: '1px solid var(--border-color)',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'var(--primary-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {agent.emoji || '🤖'}
              </div>
              <div>
                <h1 style={{
                  margin: 0,
                  color: 'var(--text-primary)',
                  fontSize: '1.3em',
                  fontWeight: '600'
                }}>
                  {agent.name}
                </h1>
                <p style={{
                  margin: 0,
                  color: 'var(--text-secondary)',
                  fontSize: '0.9em'
                }}>
                  {agent.expertise || 'AI Assistant'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <main ref={messagesContainerRef} style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '60px 20px'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                {agent.emoji || '🤖'}
              </div>
              <h2 style={{
                color: 'var(--text-primary)',
                marginBottom: '8px',
                fontSize: '1.5em'
              }}>
                Hola! Soy {agent.name}
              </h2>
              <p>¿En qué puedo ayudarte hoy?</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {messages.map((msg, index) => (
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
                    padding: '12px 16px',
                    borderRadius: '16px',
                    background: msg.sender === 'user' ? 'var(--primary-color)' :
                              msg.sender === 'system' ? 'rgba(245, 158, 11, 0.1)' :
                              'var(--card-bg)',
                    color: msg.sender === 'user' ? 'white' : 'var(--text-primary)',
                    border: msg.sender === 'user' ? 'none' :
                           msg.sender === 'system' ? '1px solid rgba(245, 158, 11, 0.3)' :
                           '1px solid var(--border-color)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {msg.sender === 'agent' && (
                    <div style={{
                      fontSize: '0.8em',
                      color: 'var(--text-secondary)',
                      marginBottom: '6px',
                      fontWeight: '500'
                    }}>
                      {agent.emoji} {agent.name}
                    </div>
                  )}
                  <div style={{ fontSize: '0.95em', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                  <div style={{
                    fontSize: '0.7em',
                    opacity: 0.7,
                    marginTop: '6px',
                    textAlign: msg.sender === 'user' ? 'right' : 'left'
                  }}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '16px',
                  padding: '12px 16px',
                  maxWidth: '70%'
                }}>
                  <div style={{
                    fontSize: '0.8em',
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    fontWeight: '500'
                  }}>
                    {agent.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: 'var(--text-secondary)',
                      borderRadius: '50%',
                      animation: 'bounce 1.4s infinite'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: 'var(--text-secondary)',
                      borderRadius: '50%',
                      animation: 'bounce 1.4s infinite 0.2s'
                    }}></div>
                    <div style={{
                      width: '8px',
                      height: '8px',
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
        </main>

        {/* Input Area */}
        <footer style={{
          background: 'var(--card-bg)',
          borderTop: '1px solid var(--border-color)',
          padding: '20px 24px',
          position: 'sticky',
          bottom: 0,
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-end',
            width: '100%'
          }}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              rows="1"
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: 'rgba(255,255,255,0.05)',
                color: 'var(--text-primary)',
                fontSize: '0.95em',
                resize: 'none',
                maxHeight: '120px',
                minHeight: '48px',
                height: '48px',
                fontFamily: 'inherit',
                overflow: 'auto'
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || isTyping}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: message.trim() && !isTyping ? 'var(--primary-color)' : 'var(--border-color)',
                color: message.trim() && !isTyping ? 'white' : 'var(--text-secondary)',
                cursor: message.trim() && !isTyping ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                minWidth: '80px',
                fontWeight: '600',
                fontSize: '0.95em'
              }}
            >
              {isTyping ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-10px);
          }
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid var(--border-color);
          border-top-color: var(--primary-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
