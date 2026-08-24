import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Avero Sikkerhet',
    template: '%s · Avero Sikkerhet',
  },
  description: 'Internt arbeidsverktøy for ansatte og ledelse i Avero Sikkerhet AS.',
  applicationName: 'Avero Sikkerhet',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#05090f',
};

export default function RotLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
