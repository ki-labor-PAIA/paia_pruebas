import Head from "next/head";
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/AuthGuard';

const PAIASimulator = dynamic(() => import('@/components/PAIASimulator'), { 
  ssr: false 
});

export default function Home() {
  return (
    <>
      <Head>
        <title>PAIA Builder UI - Professional</title>
        <meta name="description" content="Professional PAIA Builder Interface" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthGuard>
        <PAIASimulator />
      </AuthGuard>
    </>
  );
}
