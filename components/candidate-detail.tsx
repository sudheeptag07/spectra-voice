'use client';

import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import type { CandidateWithInterview } from '@/lib/types';

type Props = {
  id: string;
};

export function CandidateDetail({ id }: Props) {
  const [record, setRecord] = useState<CandidateWithInterview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/candidates/${id}`, { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as CandidateWithInterview;
        setRecord(data);
      }
      setLoading(false);
    }

    void load();
  }, [id]);

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-300">Loading candidate...</div>;
  }

  if (!record) {
    return <div className="glass-panel p-6 text-sm text-rose-300">Candidate not found.</div>;
  }

  return (
    <div className="space-y-5">
      <section className="glass-panel p-6">
        <h1 className="text-2xl font-semibold">{record.name}</h1>
        <p className="muted mt-1 text-sm">{record.email}</p>
        <div className="mt-4 flex items-center gap-3">
          <StatusBadge status={record.status} />
          <span className="text-sm text-slate-300">AI Score: {record.ai_score ?? '--'}</span>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-lg font-semibold">CV Summary</h2>
        <p className="muted mt-3 whitespace-pre-wrap text-sm">{record.cv_summary || 'CV summary not available yet.'}</p>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-lg font-semibold">Interview Audio</h2>
        {record.interview?.audio_url ? (
          <audio controls src={record.interview.audio_url} className="mt-3 w-full" />
        ) : (
          <p className="muted mt-3 text-sm">Audio recording not available.</p>
        )}
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-lg font-semibold">Transcript</h2>
        <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-slate-200">
          {record.interview?.transcript || 'Transcript not available yet.'}
        </pre>
      </section>

      <section className="glass-panel p-6">
        <h2 className="text-lg font-semibold">AI Feedback</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-200">{record.interview?.agent_summary || 'AI feedback pending.'}</p>
      </section>
    </div>
  );
}
