import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Spectra Voice - AI Recruiter',
  description: 'Automated AI screening for GTM and Sales hiring.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="mx-auto min-h-screen w-full max-w-7xl px-4 py-8 md:px-8">{children}</div>
      </body>
    </html>
  );
}
