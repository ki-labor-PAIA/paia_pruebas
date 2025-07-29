export default function DecisionsPanel({ decisions }) {
  return (
    <div className="decisions-panel">
      <h4>🤖 Decisiones</h4>
      <div className="decision-list">
        {decisions.map((decision) => (
          <div 
            key={decision.id} 
            className={`ai-message ${decision.isSystem ? 'system' : ''}`}
          >
            <div className="sender">
              {decision.isSystem ? 'Sistema' : `PAIA de ${decision.sender}`}
            </div>
            <div className="content">
              {decision.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}