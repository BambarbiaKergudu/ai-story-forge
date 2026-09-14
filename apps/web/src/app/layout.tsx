import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'AI Story Forge',
  description: 'Преврати идею в визуальную историю за минуту',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
