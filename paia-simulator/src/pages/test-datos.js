import useEmails from '@/hooks/useEmails';
import useEventos from '@/hooks/useEventos';
import useNotas from '@/hooks/useNotas';

export default function TestDatos() {
  const { emails, loading: loadingEmails } = useEmails();
  const { eventos, loading: loadingEventos } = useEventos();
  const { notas, loading: loadingNotas } = useNotas();

  return (
    <div style={{ padding: 20 }}>
      <h1>🧪 Test de Conexiones (Frontend Dev #3)</h1>

      <section>
        <h2>📧 Emails</h2>
        {loadingEmails ? <p>Cargando...</p> : <pre>{JSON.stringify(emails, null, 2)}</pre>}
      </section>

      <section>
        <h2>📅 Eventos</h2>
        {loadingEventos ? <p>Cargando...</p> : <pre>{JSON.stringify(eventos, null, 2)}</pre>}
      </section>

      <section>
        <h2>📝 Notas</h2>
        {loadingNotas ? <p>Cargando...</p> : <pre>{JSON.stringify(notas, null, 2)}</pre>}
      </section>
    </div>
  );
}