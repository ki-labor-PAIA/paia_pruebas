import { useTranslation } from 'react-i18next';

export default function StatsPanel({ stats }) {
  const { t } = useTranslation();
  const getStatusColor = (status) => {
    if (status.includes('error') || status.includes('Error')) {
      return 'var(--danger-color)';
    } else if (status.includes('completada') || status.includes('éxito')) {
      return 'var(--success-color)';
    } else if (status.includes('procesando')) {
      return 'var(--warning-color)';
    } else {
      return 'var(--text-primary)';
    }
  };

  return (
    <div className="stats-panel">
      <h4>{t('stats.title')}</h4>
      <ul className="stats-list">
        <li>
          <span>{t('stats.time')}</span>
          <span>{stats.responseTime}s</span>
        </li>
        <li>
          <span>{t('stats.queries')}</span>
          <span>{stats.queriesProcessed}</span>
        </li>
        <li>
          <span>{t('stats.status')}</span>
          <span style={{ color: getStatusColor(stats.status), fontSize: '0.9em' }}>
            {stats.status}
          </span>
        </li>
      </ul>
    </div>
  );
}