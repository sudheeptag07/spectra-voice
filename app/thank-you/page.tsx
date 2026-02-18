import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function ThankYouPage() {
  return (
    <main className="mx-auto mt-20 max-w-4xl">
      <section className="glass-panel mx-auto max-w-xl p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
        <h1 className="spectra-heading mt-5 text-4xl text-white">Interview Complete!</h1>
        <p className="muted mx-auto mt-5 max-w-md text-base leading-relaxed">
          Thank you for taking the time to talk to us. Your responses are recorded and our team will review the AI evaluation shortly.
        </p>
        <p className="mt-7 text-base text-slate-500">You will receive an email update within 48 hours regarding the next steps.</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-lg font-semibold text-white transition hover:text-[#F14724]"
        >
          Return Home
          <ArrowRight className="h-5 w-5" />
        </Link>
      </section>
    </main>
  );
}
