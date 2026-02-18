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
        <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-8">
          <header className="mb-6 flex items-center justify-between">
            <SkylarkBrand />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
