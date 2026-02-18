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
        <div className="hero-heading-wrap mt-5">
          <div className="hero-heading-glow" aria-hidden />
          <h1 className="spectra-heading relative z-10 text-5xl leading-none md:text-7xl">
            <span className="text-white">Spectra </span>
            <span className="bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">Voice</span>
          </h1>
        </div>
        <p className="muted mx-auto mt-5 max-w-3xl text-base leading-relaxed md:text-xl">Our AI would like to have a word with you.</p>
        <div className="voice-wave" aria-hidden>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
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

    </main>
  );
}
