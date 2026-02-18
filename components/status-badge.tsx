import clsx from 'clsx';
import type { CandidateStatus } from '@/lib/types';

type Props = {
  status: CandidateStatus;
};

const palette: Record<CandidateStatus, string> = {
  pending: 'bg-spectra-warning/20 text-spectra-warning border-spectra-warning/40',
  interviewing: 'bg-[#F14724]/20 text-[#F14724] border-[#F14724]/40',
  completed: 'bg-spectra-success/20 text-spectra-success border-spectra-success/40'
};

export function StatusBadge({ status }: Props) {
  return (
    <span className={clsx('rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide', palette[status])}>
      {status}
    </span>
  );
}
