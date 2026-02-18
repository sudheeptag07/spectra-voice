'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import type { Candidate } from '@/lib/types';

type ListResponse = {
  candidates: Candidate[];
};

function scoreColor(score: number | null) {
  if (score === null) return 'text-slate-300';
  if (score >= 80) return 'text-emerald-300';
  if (score >= 60) return 'text-yellow-300';
  return 'text-rose-300';
}

export function DashboardTable() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/candidates', { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as ListResponse;
        setCandidates(data.candidates);
      }
      setLoading(false);
    }

    void load();
  }, []);

  const rows = useMemo(() => {
    return candidates.map((candidate) => (
      <tr key={candidate.id} className="border-b border-white/10 text-sm">
        <td className="px-4 py-3 text-slate-100">{candidate.name}</td>
        <td className="px-4 py-3 text-slate-300">{candidate.email}</td>
        <td className="px-4 py-3">
          <StatusBadge status={candidate.status} />
        </td>
        <td className={`px-4 py-3 font-semibold ${scoreColor(candidate.ai_score)}`}>
          {candidate.ai_score ?? '--'}
        </td>
        <td className="px-4 py-3 text-slate-300">{new Date(candidate.created_at).toLocaleString()}</td>
        <td className="px-4 py-3">
          <Link href={`/dashboard/candidates/${candidate.id}`} className="text-cyan-300 underline underline-offset-4">
            View
          </Link>
        </td>
      </tr>
    ));
  }, [candidates]);

  return (
    <div className="glass-panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="text-lg font-semibold">Candidate Pipeline</h2>
        <span className="text-sm text-slate-300">{candidates.length} total</span>
      </div>
      {loading ? (
        <p className="p-4 text-sm text-slate-300">Loading candidates...</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full min-w-[780px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">AI Score</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Detail</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
