import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MemeSounds - Soundboard de Memes & Bordões Brasileiros',
  description: 'A soundboard definitiva de memes e bordões em português. Sons rápidos, sem botões comuns e sem fotos.',
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
