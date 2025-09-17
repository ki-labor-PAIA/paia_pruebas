import Head from "next/head";
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import AuthGuard from '@/components/AuthGuard';

const PAIASimulator = dynamic(() => import('@/components/PAIASimulator'), { 
  ssr: false 
});

export default function Create() {
  const router = useRouter();
  const { data: session } = useSession();
  const [flowData, setFlowData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cargar flujo existente si se proporciona ID en query
  useEffect(() => {
    const loadFlow = async () => {
      const { flow } = router.query;
      if (flow && session?.user?.id) {
        setLoading(true);
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/flows/user/${session.user.id}`);
          if (response.ok) {
            const data = await response.json();
            const targetFlow = data.flows?.find(f => f.id.toString() === flow.toString());
            if (targetFlow) {
              setFlowData(targetFlow);
            } else {
              setError('Flujo no encontrado');
            }
          } else {
            setError('Error cargando flujo');
          }
        } catch (err) {
          console.error('Error loading flow:', err);
          setError('Error cargando flujo');
        } finally {
          setLoading(false);
        }
      }
    };

    loadFlow();
  }, [router.query, session?.user?.id]);

  if (loading) {
    return (
      <>
        <Head>
          <title>PAIA Simulador - Cargando Flujo</title>
          <meta name="description" content="Cargando flujo de agentes PAIA" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <AuthGuard>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            fontSize: '18px',
            color: 'var(--text-secondary)'
          }}>
            🔄 Cargando flujo...
          </div>
        </AuthGuard>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Head>
          <title>PAIA Simulador - Error</title>
          <meta name="description" content="Error cargando flujo de agentes PAIA" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <AuthGuard>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            minHeight: '100vh',
            gap: '20px'
          }}>
            <div style={{ fontSize: '48px' }}>❌</div>
            <div style={{ fontSize: '18px', color: 'var(--text-primary)' }}>
              {error}
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Volver a Biblioteca
            </button>
          </div>
        </AuthGuard>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{`PAIA Simulador - ${flowData?.name || 'Crear Flujo'}`}</title>
        <meta name="description" content="Crear y simular flujos de agentes PAIA" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthGuard>
        <PAIASimulator initialFlow={flowData} />
      </AuthGuard>
    </>
  );
}