export default function StatsPanel({ stats }) {
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
      <h4>📊 Estadísticas</h4>
      <ul className="stats-list">
        <li>
          <span>Tiempo:</span>
          <span>{stats.responseTime}s</span>
        </li>
        <li>
          <span>Consultas:</span>
          <span>{stats.queriesProcessed}</span>
        </li>
        <li>
          <span>Estado:</span>
          <span style={{ color: getStatusColor(stats.status), fontSize: '0.9em' }}>
            {stats.status}
          </span>
        </li>
      </ul>
    </div>
  );
}