import Link from 'next/link';
import { Shield, Zap, Sparkles } from 'lucide-react';
import { RegisterForm } from '@/components/register-form';

const highlights = [
  {
    icon: Shield,
    title: 'Unbiased',
    description: 'Consistent evaluation based on core sales competencies and merit.'
  },
  {
    icon: Zap,
    title: 'Instant',
    description: 'Complete your first round in 10 minutes, anytime, anywhere.'
  },
  {
    icon: Sparkles,
    title: 'Dynamic',
    description: 'AI tailored questions based on your unique career experience.'
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl pb-14 pt-4">
      <section className="text-center">
        <p className="mx-auto inline-flex items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1 text-sm text-sky-300">
          ✧ The future of GTM Hiring
        </p>
        <h1 className="spectra-heading mt-5 text-5xl leading-none md:text-7xl">
          <span className="text-white">Spectra </span>
          <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Voice</span>
        </h1>
        <p className="muted mx-auto mt-5 max-w-3xl text-base leading-relaxed md:text-xl">
          Experience a 10-minute AI-powered screening interview designed for world-class Sales professionals at Skylark Drones.
        </p>
      </section>

      <div className="mt-12 flex justify-center">
        <RegisterForm />
      </div>

      <div className="mt-20 grid gap-8 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="space-y-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-sky-400">
              <item.icon className="h-7 w-7" />
            </div>
            <h3 className="spectra-heading text-2xl text-white md:text-3xl">{item.title}</h3>
            <p className="muted text-base leading-relaxed md:text-lg">{item.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-16 text-center">
        <Link href="/dashboard" className="text-sm text-sky-300 underline underline-offset-4">
          Open Hiring Dashboard
        </Link>
      </div>
    </main>
  );
}
