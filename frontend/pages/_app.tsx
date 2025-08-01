import '../styles/globals.css'

import type { AppProps } from "next/app";
import { Providers } from '../components/Providers';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Navbar from '@/components/Navbar';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Providers>
        <Navbar />
        <Component {...pageProps} />
        <Toaster />
      </Providers>
    </ThemeProvider>
  );
}
