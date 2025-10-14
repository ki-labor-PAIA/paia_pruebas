import "@/styles/globals.css";
import "@/lib/i18n";
import { SessionProvider } from 'next-auth/react'
import Translator from '@/components/Translator'

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Translator>
        <Component {...pageProps} />
      </Translator>
    </SessionProvider>
  );
}
