import { useState, useEffect, useRef } from 'react';

export default function AgentConversationModal({
    isOpen,
    onClose,
    sourceAgent,
    targetAgent,
    messages = [],
    isActive = false
}) {
    const [animatingMessages, setAnimatingMessages] = useState([]);
    const messagesEndRef = useRef(null);

    // Auto-scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Generar ID único para animaciones
    const generateAnimationId = () => `anim-${Date.now()}-${Math.random()}`;

    // Agregar animación cuando llega un nuevo mensaje
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const animId = generateAnimationId();

            setAnimatingMessages(prev => [...prev, {
                id: animId,
                direction: lastMessage.from === sourceAgent?.id ? 'right' : 'left',
                color: lastMessage.from === sourceAgent?.id ? sourceAgent.color : targetAgent.color
            }]);

            // Remover animación después de completarse
            setTimeout(() => {
                setAnimatingMessages(prev => prev.filter(a => a.id !== animId));
            }, 2000);
        }
    }, [messages.length]);

    if (!isOpen) return null;

    const getAgentColor = (agentId) => {
        if (agentId === sourceAgent?.id) return sourceAgent.color || '#6366f1';
        return targetAgent.color || '#059669';
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: '#1a1a2e',
                borderRadius: '16px',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '20px',
                            fontWeight: '600',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <span style={{ fontSize: '24px' }}>💬</span>
                            Agent Conversation
                            {isActive && (
                                <span style={{
                                    fontSize: '10px',
                                    background: '#10B981',
                                    color: 'white',
                                    padding: '4px 8px',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    animation: 'pulse 2s infinite'
                                }}>
                                    LIVE
                                </span>
                            )}
                        </h2>
                        <p style={{
                            margin: '4px 0 0 0',
                            fontSize: '13px',
                            color: '#9CA3AF'
                        }}>
                            {sourceAgent?.name} ↔️ {targetAgent?.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: '#9CA3AF',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'white'}
                        onMouseLeave={(e) => e.target.style.color = '#9CA3AF'}
                    >
                        ✕
                    </button>
                </div>

                {/* Animación de transferencia de datos */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative',
                        height: '80px'
                    }}>
                        {/* Agente Izquierdo (Source) */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            zIndex: 2
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: sourceAgent?.color || '#6366f1',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                boxShadow: `0 4px 12px ${sourceAgent?.color || '#6366f1'}40`,
                                border: '3px solid white'
                            }}>
                                <i className="fas fa-robot"></i>                                        
                            </div>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'white',
                                textAlign: 'center',
                                maxWidth: '100px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {sourceAgent?.name}
                            </div>
                        </div>

                        {/* Línea de conexión con animaciones */}
                        <div style={{
                            flex: 1,
                            height: '3px',
                            background: 'transparent',
                            borderTop: '3px dashed rgba(255,255,255,0.3)',
                            margin: '0 20px',
                            position: 'relative',
                            overflow: 'visible'
                        }}>
                            {/* Animaciones de paquetes tipo Pac-Man */}
                            {animatingMessages.map((anim) => (
                                <div
                                    key={anim.id}
                                    style={{
                                        position: 'absolute',
                                        top: '-8px',
                                        left: anim.direction === 'right' ? '0%' : '100%',
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: anim.color,
                                        boxShadow: `0 0 12px ${anim.color}`,
                                        animation: `movePacket${anim.direction === 'right' ? 'Right' : 'Left'} 2s ease-in-out`,
                                        zIndex: 3
                                    }}
                                >
                                    <div style={{
                                        width: '100%',
                                        height: '100%',
                                        borderRadius: '50%',
                                        background: `radial-gradient(circle at 30% 30%, ${anim.color}ff, ${anim.color}aa)`,
                                        animation: 'pacman 0.5s infinite'
                                    }} />
                                </div>
                            ))}

                            {/* Indicador de actividad */}
                            {isActive && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: '#10B981',
                                    boxShadow: '0 0 8px #10B981',
                                    animation: 'pulse 1.5s infinite'
                                }} />
                            )}
                        </div>

                        {/* Agente Derecho (Target) */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            zIndex: 2
                        }}>
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: targetAgent?.color || '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '32px',
                                boxShadow: `0 4px 12px ${targetAgent?.color || '#059669'}40`,
                                border: '3px solid white'
                            }}>
                                <i className="fas fa-robot"></i>
                            </div>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                color: 'white',
                                textAlign: 'center',
                                maxWidth: '100px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {targetAgent?.name}
                            </div>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <div style={{
                        marginTop: '16px',
                        display: 'flex',
                        gap: '16px',
                        justifyContent: 'center',
                        fontSize: '12px',
                        color: '#9CA3AF'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>📨</span>
                            <span>{messages.length} messages exchanged</span>
                        </div>
                        {isActive && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>⚡</span>
                                <span>Active communication</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Área de mensajes */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px 24px',
                    background: '#16213e'
                }}>
                    {messages.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#6B7280'
                        }}>
                            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💭</div>
                            <div style={{ fontSize: '14px' }}>Waiting for agents to start communicating...</div>
                        </div>
                    ) : (
                        messages.map((msg, index) => {
                            const isFromSource = msg.from === sourceAgent?.id;
                            const agentColor = getAgentColor(msg.from);

                            return (
                                <div
                                    key={index}
                                    style={{
                                        marginBottom: '16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isFromSource ? 'flex-start' : 'flex-end',
                                        animation: 'fadeInUp 0.3s ease-out'
                                    }}
                                >
                                    {/* Nombre del agente */}
                                    <div style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: agentColor,
                                        marginBottom: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <i className="fas fa-robot" style={{ fontSize: '12px' }}></i>
                                        {isFromSource ? sourceAgent?.name : targetAgent?.name}
                                    </div>

                                    {/* Burbuja de mensaje */}
                                    <div style={{
                                        background: isFromSource
                                            ? `linear-gradient(135deg, ${agentColor}30, ${agentColor}20)`
                                            : `linear-gradient(135deg, ${agentColor}30, ${agentColor}20)`,
                                        border: `1px solid ${agentColor}40`,
                                        borderRadius: '12px',
                                        padding: '12px 16px',
                                        maxWidth: '70%',
                                        color: 'white',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        boxShadow: `0 2px 8px ${agentColor}20`
                                    }}>
                                        {msg.content}
                                    </div>

                                    {/* Timestamp */}
                                    <div style={{
                                        fontSize: '10px',
                                        color: '#6B7280',
                                        marginTop: '4px'
                                    }}>
                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#1a1a2e'
                }}>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        Agents are negotiating automatically
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#6366f1',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#4F46E5'}
                        onMouseLeave={(e) => e.target.style.background = '#6366f1'}
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Estilos CSS para animaciones */}
            <style jsx>{`
        @keyframes movePacketRight {
          0% {
            left: 0%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 100%;
            opacity: 0;
          }
        }

        @keyframes movePacketLeft {
          0% {
            left: 100%;
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            left: 0%;
            opacity: 0;
          }
        }

        @keyframes pacman {
          0%, 100% {
            clip-path: polygon(100% 50%, 0 0, 0 100%);
          }
          50% {
            clip-path: polygon(100% 50%, 0 20%, 0 80%);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
}
