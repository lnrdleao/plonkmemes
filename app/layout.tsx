import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemeSounds - A Soundboard Definitiva de Memes & Efeitos',
  description: 'A soundboard definitiva de memes, virais e efeitos sonoros. Sons rápidos, sem botões comuns e sem fotos.',
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
