import type { Metadata } from 'next';
import './globals.css';
import { SkylarkBrand } from '@/components/skylark-brand';

export const metadata: Metadata = {
  title: 'Spectra Voice - AI Recruiter',
  description: 'Automated AI screening for GTM and Sales hiring.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="cinematic-mesh" aria-hidden />
        <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8">
          <header className="app-header relative z-30 mb-5 flex items-center">
            <SkylarkBrand compact />
          </header>
          <div className="header-divider relative z-20 mb-5" aria-hidden />
          <div className="relative z-10 screen-reveal">{children}</div>
        </div>
      </body>
    </html>
  );
}
