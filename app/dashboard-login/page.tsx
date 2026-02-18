'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type State = 'idle' | 'loading' | 'error';

export default function DashboardLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState('loading');
    setError(null);

    try {
      const response = await fetch('/api/dashboard-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || 'Login failed.');
      }

      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next') || '/dashboard'
          : '/dashboard';
      router.push(next);
      router.refresh();
    } catch (err) {
      setState('error');
      setError((err as Error).message);
    } finally {
      setState('idle');
    }
  }

  return (
    <main className="mx-auto mt-24 max-w-md">
      <section className="glass-panel p-8">
        <h1 className="spectra-heading text-3xl text-white">Dashboard Access</h1>
        <p className="muted mt-2 text-sm">Enter password to open the hiring manager dashboard.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2 outline-none ring-sky-400/50 focus:ring"
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full rounded-xl bg-sky-300 px-4 py-2 font-semibold text-slate-900 disabled:opacity-60"
          >
            {state === 'loading' ? 'Checking...' : 'Open Dashboard'}
          </button>
        </form>
      </section>
    </main>
  );
}
