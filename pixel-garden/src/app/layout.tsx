import type { Metadata } from 'next';
import { Press_Start_2P } from 'next/font/google';
import './globals.css';

const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Pixel Garden',
  description: 'A cozy pixel garden todo app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={pressStart.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
