import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://plonkmemes.vercel.app'),
  title: 'PlonkMemes - A Soundboard Definitiva de Memes & Efeitos',
  description: 'A soundboard definitiva de memes, virais e efeitos sonoros com reprodução instantânea.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'PlonkMemes - Soundboard de Memes & Efeitos',
    description: 'Mais de 2.300 áudios e memes prontos para tocar em lives, Discord e zueiras.',
    images: ['/logo.jpg'],
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
