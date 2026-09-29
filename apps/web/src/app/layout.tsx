import type { Metadata, Viewport } from 'next';

import { AccountNav } from './account-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Story Forge',
  description: 'Преврати идею в визуальную историю за минуту',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">
        <AccountNav />
        {children}
      </body>
    </html>
  );
}
