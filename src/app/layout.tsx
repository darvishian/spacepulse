import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/lib/providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SpacePulse - Real-time Space Activity Monitor',
  description:
    'Monitor satellites, launches, space weather, and investment activity in real-time',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-space-darker text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
