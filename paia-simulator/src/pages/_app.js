// paia-simulator/src/pages/_app.js
import React from 'react';
import '@/styles/globals.css';
import '@/lib/i18n';
import { useRouter } from 'next/router';
import { SessionProvider, useSession } from 'next-auth/react';
import SpotlightTour from '@/components/tutorial/SpotlightTour';
import tutorialSteps from '@/components/tutorial/steps';

function TutorialWithSession() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // 1) no mostrar si no autenticado
  if (status !== 'authenticated') return null;

  // 2) mostrar solo en rutas relacionadas con la simulación
  //    Opción recomendada: mostrar si la ruta contiene 'simulate' o 'create'
  const pathname = router?.pathname || router?.asPath || '';
  const showOnPrefix = ['simulate', 'create', 'flow'].some(seg => pathname.includes(seg));

  if (!showOnPrefix) return null;

  // 3) si quieres limitar a rutas exactas, usa:
  // const allowed = ['/simulate', '/create'];
  // if (!allowed.includes(pathname)) return null;

  return <SpotlightTour steps={tutorialSteps} />;
}

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
      <TutorialWithSession />
    </SessionProvider>
  );
}