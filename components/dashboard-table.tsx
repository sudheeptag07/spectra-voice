'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/status-badge';
import { ScoreBadge } from '@/components/score-badge';
import type { Candidate } from '@/lib/types';

type ListResponse = {
  candidates: Candidate[];
};

type StatusFilter = 'all' | 'completed' | 'pending' | 'error';
type ScoreFilter = 'all' | 'high' | 'mid' | 'low';
type DateFilter = 'all' | 'today' | '7d';

function isToday(date: Date) {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function scoreBucket(score: number) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

export function DashboardTable() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch('/api/candidates', { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as ListResponse;
        if (active) setCandidates(data.candidates);
      }
      if (active) setLoading(false);
    }

    void load();
    const interval = window.setInterval(() => void load(), 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const filtered = useMemo(() => {
    return candidates.filter((candidate) => {
      if (statusFilter === 'completed' && candidate.status !== 'completed') return false;
      if (statusFilter === 'pending' && !['pending', 'interviewing'].includes(candidate.status)) return false;
      if (statusFilter === 'error' && candidate.score_status !== 'error') return false;

      if (scoreFilter !== 'all') {
        if (candidate.score_status !== 'computed' || candidate.ai_score === null) return false;
        if (scoreBucket(candidate.ai_score) !== scoreFilter) return false;
      }

      if (dateFilter === 'today') {
        if (!isToday(new Date(candidate.created_at))) return false;
      }
      if (dateFilter === '7d') {
        const ms = Date.now() - new Date(candidate.created_at).getTime();
        if (ms > 7 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [candidates, statusFilter, scoreFilter, dateFilter]);

  const stats = useMemo(() => {
    const total = candidates.length;
    const completedToday = candidates.filter((c) => c.status === 'completed' && isToday(new Date(c.created_at))).length;
    const errors = candidates.filter((c) => c.score_status === 'error').length;
    const computedScores = candidates.filter((c) => c.score_status === 'computed' && c.ai_score !== null).map((c) => c.ai_score as number);
    const avgScore = computedScores.length ? Math.round(computedScores.reduce((a, b) => a + b, 0) / computedScores.length) : null;
    return { total, completedToday, errors, avgScore, errorRate: total ? Math.round((errors / total) * 100) : 0 };
  }, [candidates]);

  const chipBase = 'rounded-full border px-3 py-1 text-xs transition';

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Candidates</p>
          <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Completed Today</p>
          <p className="mt-1 text-2xl font-semibold">{stats.completedToday}</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Error Rate</p>
          <p className="mt-1 text-2xl font-semibold">{stats.errorRate}%</p>
        </div>
        <div className="glass-panel p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Avg AI Score</p>
          <p className="mt-1 text-2xl font-semibold">{stats.avgScore ?? '--'}</p>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Candidate Pipeline</h2>
            <span className="text-sm text-slate-300">{filtered.length} shown</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => setStatusFilter('completed')} className={`${chipBase} ${statusFilter === 'completed' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Completed</button>
            <button onClick={() => setStatusFilter('pending')} className={`${chipBase} ${statusFilter === 'pending' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Pending</button>
            <button onClick={() => setStatusFilter('error')} className={`${chipBase} ${statusFilter === 'error' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Error</button>
            <button onClick={() => setStatusFilter('all')} className={`${chipBase} ${statusFilter === 'all' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>All</button>
            <span className="mx-1 h-6 w-px bg-white/10" />
            <button onClick={() => setScoreFilter('high')} className={`${chipBase} ${scoreFilter === 'high' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>High (≥70)</button>
            <button onClick={() => setScoreFilter('mid')} className={`${chipBase} ${scoreFilter === 'mid' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Mid (40-69)</button>
            <button onClick={() => setScoreFilter('low')} className={`${chipBase} ${scoreFilter === 'low' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Low (&lt;40)</button>
            <button onClick={() => setScoreFilter('all')} className={`${chipBase} ${scoreFilter === 'all' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Any Score</button>
            <span className="mx-1 h-6 w-px bg-white/10" />
            <button onClick={() => setDateFilter('today')} className={`${chipBase} ${dateFilter === 'today' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Today</button>
            <button onClick={() => setDateFilter('7d')} className={`${chipBase} ${dateFilter === '7d' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>7d</button>
            <button onClick={() => setDateFilter('all')} className={`${chipBase} ${dateFilter === 'all' ? 'border-[#F14724]/60 bg-[#F14724]/15 text-[#F14724]' : 'border-white/15 text-slate-300'}`}>Any Date</button>
          </div>
        </div>

        {loading ? (
          <p className="p-4 text-sm text-slate-300">Loading candidates...</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10 bg-black/65 backdrop-blur-sm">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">AI Score</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-white/10 text-sm transition hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-100">{candidate.name}</td>
                    <td className="px-4 py-3 text-slate-300">
                      <span title={candidate.email} className="block max-w-[230px] truncate">
                        {candidate.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={candidate.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ScoreBadge score={candidate.ai_score} scoreStatus={candidate.score_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">{new Date(candidate.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/candidates/${candidate.id}`} className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-[#F14724]/60 hover:text-[#F14724]">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
