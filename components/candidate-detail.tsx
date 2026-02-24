'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { ScoreBadge } from '@/components/score-badge';
import type { CandidateWithInterview, FeedbackCriterion, InterviewFeedback } from '@/lib/types';

type Props = {
  id: string;
};

function classifyNote(note: string): 'good' | 'neutral' | 'bad' {
  const n = note.toLowerCase();
  const positives = ['strong', 'clear', 'great', 'excellent', 'solid', 'good', 'effective', 'confident'];
  const negatives = ['weak', 'unclear', 'poor', 'missed', 'limited', 'lacking', 'inconsistent', 'negative'];
  if (negatives.some((w) => n.includes(w))) return 'bad';
  if (positives.some((w) => n.includes(w))) return 'good';
  return 'neutral';
}

function fallbackFeedback(record: CandidateWithInterview): InterviewFeedback {
  const score = record.ai_score;
  const status = record.score_status;
  const overall = record.interview?.agent_summary || 'AI feedback pending.';
  const criteriaNames = ['Ownership', 'Accountability', 'Collaboration', 'Customer Empathy', 'Adaptability & Ambiguity'];
  const criteria: FeedbackCriterion[] = criteriaNames.map((name) => ({
    name,
    note: 'No structured criterion note available yet.',
    rating: 'neutral'
  }));

  return {
    overall_score: score,
    score_status: status,
    overall_feedback: overall,
    criteria
  };
}

function parseFeedback(record: CandidateWithInterview): InterviewFeedback {
  const raw = record.interview?.feedback_json;
  if (!raw) return fallbackFeedback(record);
  try {
    const parsed = JSON.parse(raw) as Partial<InterviewFeedback>;
    const criteria = Array.isArray(parsed.criteria)
      ? parsed.criteria.map((row) => ({
          name: String(row.name || ''),
          note: String(row.note || ''),
          rating: row.rating === 'good' || row.rating === 'bad' ? row.rating : classifyNote(String(row.note || ''))
        }))
      : [];

    return {
      overall_score: typeof parsed.overall_score === 'number' ? parsed.overall_score : record.ai_score,
      score_status: parsed.score_status === 'computed' || parsed.score_status === 'error' || parsed.score_status === 'missing' ? parsed.score_status : record.score_status,
      overall_feedback: typeof parsed.overall_feedback === 'string' ? parsed.overall_feedback : record.interview?.agent_summary || 'AI feedback pending.',
      criteria: criteria.length > 0 ? criteria : fallbackFeedback(record).criteria
    };
  } catch {
    return fallbackFeedback(record);
  }
}

function SentimentIcon({ rating }: { rating: 'good' | 'neutral' | 'bad' }) {
  if (rating === 'good') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  if (rating === 'bad') return <XCircle className="h-4 w-4 text-rose-300" />;
  return <MinusCircle className="h-4 w-4 text-slate-300" />;
}

function extractConversationId(interviewId: string | null | undefined): string | null {
  if (!interviewId) return null;
  if (interviewId.startsWith('conv_') || interviewId.startsWith('call_')) return interviewId;
  const convMatch = interviewId.match(/(conv_[a-zA-Z0-9]+)/);
  if (convMatch?.[1]) return convMatch[1];
  const callMatch = interviewId.match(/(call_[a-zA-Z0-9]+)/);
  return callMatch?.[1] ?? null;
}

function elevenLabsAnalysisUrl(): string {
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;
  if (!agentId) return 'https://elevenlabs.io/app/agents';
  return `https://elevenlabs.io/app/agents/agents/${encodeURIComponent(agentId)}?tab=analysis`;
}

export function CandidateDetail({ id }: Props) {
  const [record, setRecord] = useState<CandidateWithInterview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const response = await fetch(`/api/candidates/${id}`, { cache: 'no-store' });
      if (response.ok) {
        const data = (await response.json()) as CandidateWithInterview;
        if (active) setRecord(data);
      }
      if (active) setLoading(false);
    }

    void load();
    const interval = window.setInterval(() => void load(), 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [id]);

  if (loading) return <div className="glass-panel p-6 text-sm text-slate-300">Loading candidate...</div>;
  if (!record) return <div className="glass-panel p-6 text-sm text-rose-300">Candidate not found.</div>;

  const feedback = parseFeedback(record);
  const conversationId = extractConversationId(record.interview?.id);
  const nextRoundQuestions = Array.isArray(record.next_round_questions) ? record.next_round_questions.slice(0, 7) : [];
  const audioSource = record.interview
    ? record.interview.audio_url || `/api/interviews/${record.interview.id}/audio`
    : null;
  const counts = feedback.criteria.reduce(
    (acc, row) => {
      acc[row.rating] += 1;
      return acc;
    },
    { good: 0, neutral: 0, bad: 0 }
  );
  const progress = feedback.score_status === 'computed' && typeof feedback.overall_score === 'number' ? feedback.overall_score : 0;

  return (
    <div className="space-y-5">
      <section className="glass-panel flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-semibold">{record.name}</h1>
          <p className="muted mt-1 text-sm">{record.email}</p>
          <div className="mt-3">
            <StatusBadge status={record.status} />
          </div>
        </div>
        <div className="min-w-[180px] text-right">
          <p className="text-xs uppercase tracking-wide text-slate-400">AI Score</p>
          <div className="mt-2">
            <ScoreBadge score={record.ai_score} scoreStatus={record.score_status} size="lg" />
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#F14724]/80" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold">Transcript</h2>
          <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-slate-200">
            {record.interview?.transcript || 'Transcript not available yet.'}
          </pre>
        </section>

        <div className="space-y-5">
          <section className="glass-panel p-6">
            <h2 className="text-lg font-semibold">AI Feedback</h2>
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
              Good: {counts.good} &nbsp; Neutral: {counts.neutral} &nbsp; Bad: {counts.bad}
            </p>
            <div className="mt-4 space-y-2">
              {feedback.criteria.map((row) => (
                <div key={row.name} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                  <p className="w-40 shrink-0 text-sm font-medium text-slate-200">{row.name}</p>
                  <p className="flex-1 truncate text-sm text-slate-300" title={row.note}>
                    {row.note}
                  </p>
                  <SentimentIcon rating={row.rating} />
                </div>
              ))}
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm text-slate-300">{feedback.overall_feedback || 'AI feedback pending.'}</p>
          </section>

          <section className="glass-panel bg-white/[0.035] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Next Round - Tailored Questions (GTM Sales Enablement)</h2>
              {nextRoundQuestions.length > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      nextRoundQuestions
                        .map((row, i) => `${i + 1}. ${row.question}`)
                        .join('\n')
                    )
                  }
                  className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-[#F14724]/60 hover:text-[#F14724]"
                >
                  Copy Questions
                </button>
              ) : null}
            </div>

            {nextRoundQuestions.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {nextRoundQuestions.map((row, index) => (
                  <li key={`${index}-${row.question}`} className="rounded-xl border border-white/10 bg-black/15 px-3 py-3">
                    <p className="overflow-hidden text-sm font-semibold text-slate-100 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                      {index + 1}. {row.question}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">{row.why_skylark}</p>
                    <p className="mt-1 truncate text-xs text-slate-400">{row.expected_outcome}</p>
                    <span className="mt-2 inline-flex rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[11px] text-slate-300">
                      {row.evidence}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-sm text-slate-300">Insufficient evidence to generate tailored GTM enablement questions.</p>
            )}
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold">ElevenLabs Conversation</h2>
          {conversationId ? (
            <div className="mt-3 space-y-3">
              <p className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-slate-200">
                {conversationId}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={elevenLabsAnalysisUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-[#F14724]/60 hover:text-[#F14724]"
                >
                  Open ElevenLabs Analysis
                </a>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(conversationId)}
                  className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-[#F14724]/60 hover:text-[#F14724]"
                >
                  Copy Conversation ID
                </button>
              </div>
              <p className="text-xs text-slate-400">
                In ElevenLabs Analysis, filter/search by this conversation ID.
              </p>
            </div>
          ) : (
            <p className="muted mt-3 text-sm">Conversation ID not available for this interview.</p>
          )}
        </section>

        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold">CV Summary</h2>
          <div className="mt-2">
            <a
              href={`/api/candidates/${id}/cv`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-[#F14724]/60 hover:text-[#F14724]"
            >
              View Original CV PDF
            </a>
          </div>
          <p className="muted mt-3 whitespace-pre-wrap text-sm">{record.cv_summary || 'CV summary not available yet.'}</p>
        </section>
        <section className="glass-panel p-6">
          <h2 className="text-lg font-semibold">Interview Audio</h2>
          {audioSource ? (
            <audio controls src={audioSource} className="mt-3 w-full" />
          ) : (
            <p className="muted mt-3 text-sm">Audio recording not available.</p>
          )}
        </section>
      </div>
    </div>
  );
}
