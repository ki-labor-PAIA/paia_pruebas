import { useEffect, useRef } from 'react';

export default function LogPanel({ messages, leftSidebarOpen = true, rightSidebarOpen = true }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) return null;

  return (
    <div className="log-panel" ref={logRef} style={{
      left: leftSidebarOpen ? '300px' : '20px',
      right: rightSidebarOpen ? '300px' : '20px'
    }}>
      {messages.map((item, index) => {
        const text = typeof item === 'string' ? item : item.message;
        return (
          <div key={item.id || index} style={{ marginBottom: '4px' }}>
            {text && text.includes('→') ? (
              <span dangerouslySetInnerHTML={{
                __html: text.replace(/(\w+) → (\w+)/, '<b>$1</b> → <b>$2</b>')
              }} />
            ) : (
              <b>{text}</b>
            )}
          </div>
        );
      })}
    </div>
  );
}