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
          <header className="relative z-30 mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-black/35 px-3 py-2">
            <SkylarkBrand />
          </header>
          <div className="relative z-10 screen-reveal">{children}</div>
        </div>
      </body>
    </html>
  );
}
