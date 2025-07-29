import { useEffect, useRef } from 'react';

export default function LogPanel({ messages }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="log-panel" ref={logRef}>
      {messages.map((message, index) => (
        <div key={index} style={{ marginBottom: '4px' }}>
          {message.includes('→') ? (
            <span dangerouslySetInnerHTML={{ 
              __html: message.replace(/(\w+) → (\w+)/, '<b>$1</b> → <b>$2</b>') 
            }} />
          ) : (
            <b>{message}</b>
          )}
        </div>
      ))}
    </div>
  );
}