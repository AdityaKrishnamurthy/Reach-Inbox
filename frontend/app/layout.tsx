// Root layout for the Next.js App Router. Sets global page metadata, loads
// the global stylesheet, and wraps every route in the shared Providers tree
// (e.g. auth context) so app-wide state is available on all pages.

import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/Providers';

export const metadata: Metadata = {
  title: 'Reach-Inbox',
  description: 'Durable full-stack cold email scheduler and dashboard',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
