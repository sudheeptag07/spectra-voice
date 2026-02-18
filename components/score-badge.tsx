'use client';

import clsx from 'clsx';
import type { ScoreStatus } from '@/lib/types';

type Props = {
  score: number | null;
  scoreStatus: ScoreStatus;
  size?: 'sm' | 'lg';
};

function scoreTone(score: number) {
  if (score <= 39) return 'low';
  if (score <= 69) return 'mid';
  if (score <= 84) return 'high';
  return 'top';
}

const toneClass = {
  low: 'border-rose-400/40 bg-rose-400/12 text-rose-200',
  mid: 'border-amber-300/40 bg-amber-300/12 text-amber-100',
  high: 'border-emerald-300/45 bg-emerald-300/12 text-emerald-100',
  top: 'border-cyan-200/45 bg-cyan-200/12 text-cyan-100'
} as const;

export function ScoreBadge({ score, scoreStatus, size = 'sm' }: Props) {
  const isComputed = scoreStatus === 'computed' && typeof score === 'number';
  const base = size === 'lg' ? 'px-4 py-2 text-xl' : 'px-3 py-1 text-sm';

  if (!isComputed) {
    return (
      <span title="Score not computed" className={clsx('inline-flex items-center rounded-full border border-white/15 bg-white/5 font-semibold text-slate-300', base)}>
        --
      </span>
    );
  }

  const tone = scoreTone(score);
  return <span className={clsx('inline-flex items-center rounded-full border font-bold tabular-nums', toneClass[tone], base)}>{score}</span>;
}
