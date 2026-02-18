'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Upload } from 'lucide-react';

type SubmissionState = 'idle' | 'registering' | 'uploading' | 'ready' | 'error';

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cv, setCv] = useState<File | null>(null);
  const [state, setState] = useState<SubmissionState>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!cv) {
      setError('Please upload your CV PDF.');
      return;
    }

    try {
      setState('registering');
      const register = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });

      if (!register.ok) throw new Error('Registration failed.');
      const { candidateId } = (await register.json()) as { candidateId: string };

      setState('uploading');
      const form = new FormData();
      form.set('candidateId', candidateId);
      form.set('cv', cv);

      const upload = await fetch('/api/upload-cv', {
        method: 'POST',
        body: form
      });

      if (!upload.ok) {
        const payload = (await upload.json()) as { error?: string };
        throw new Error(payload.error || 'CV processing failed.');
      }

      setState('ready');
      router.push(`/interview/${candidateId}`);
    } catch (err) {
      setState('error');
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass-panel w-full max-w-xl space-y-5 p-7 md:p-8">
      <h2 className="spectra-heading text-3xl text-white md:text-4xl">Join the Pipeline</h2>

      <div className="space-y-2">
        <label className="text-sm text-slate-300">Full Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John Doe"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base outline-none ring-sky-400/50 placeholder:text-slate-500 focus:ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-slate-300">Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. john@example.com"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-base outline-none ring-sky-400/50 placeholder:text-slate-500 focus:ring"
        />
      </div>

      <div className="space-y-3">
        <label className="text-sm text-slate-300">Upload CV (PDF)</label>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-9 text-center transition hover:border-[#F14724]/50 hover:bg-white/[0.04]">
          <input
            type="file"
            accept="application/pdf"
            required
            onChange={(e) => setCv(e.target.files?.[0] || null)}
            className="hidden"
          />
          <Upload className="h-10 w-10 text-slate-500" />
          <p className="mt-5 text-lg text-slate-300 md:text-xl">
            {cv ? cv.name : 'Drag and drop or click to upload PDF'}
          </p>
        </label>
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={state === 'registering' || state === 'uploading'}
        className="mx-auto flex items-center gap-2 rounded-2xl px-3 py-3 text-lg font-semibold text-white transition hover:text-[#F14724] disabled:cursor-not-allowed disabled:opacity-70 md:text-xl"
      >
        {state === 'registering' ? 'Creating profile...' : state === 'uploading' ? 'Analyzing CV...' : 'Start Interview'}
        <ArrowRight className="h-5 w-5" />
      </button>
    </form>
  );
}
