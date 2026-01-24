import { useTranslation } from 'react-i18next';

export default function DecisionsPanel({ decisions }) {
  const { t } = useTranslation();
  return (
    <div className="decisions-panel">
      <h4>{t('decisions.title')}</h4>
      <div className="decision-list">
        {decisions.map((decision) => (
          <div 
            key={decision.id} 
            className={`ai-message ${decision.isSystem ? 'system' : ''}`}
          >
            <div className="sender">
              {decision.isSystem ? t('decisions.system') : t('decisions.paiaOf', { name: decision.sender })}
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