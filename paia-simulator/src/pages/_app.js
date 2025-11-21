// paia-simulator/src/pages/_app.js
import React from 'react';
import '@/styles/globals.css';
import '@/lib/i18n';
import { SessionProvider } from 'next-auth/react';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}