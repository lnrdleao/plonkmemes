import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://plonkmemes.lol'),
  title: 'PlonkMemes - A Soundboard Definitiva de Memes & Efeitos',
  description: 'A soundboard definitiva de memes, virais e efeitos sonoros com reprodução instantânea.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'PlonkMemes - A Soundboard Definitiva de Memes & Efeitos',
    description: 'Mais de 2.300 sons, memes virais e efeitos de streamers com reprodução instantânea.',
    url: 'https://plonkmemes.lol',
    siteName: 'PlonkMemes',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'PlonkMemes Logo',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'PlonkMemes - A Soundboard Definitiva de Memes & Efeitos',
    description: 'Mais de 2.300 sons, memes virais e efeitos de streamers com reprodução instantânea.',
    images: ['/icon-512.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
