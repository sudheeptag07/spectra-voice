import Link from 'next/link';
import { CandidateDetail } from '@/components/candidate-detail';

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Candidate Detail</h1>
        <Link href="/dashboard" className="rounded-xl border border-white/20 px-4 py-2 text-sm">
          Back to Dashboard
        </Link>
      </div>
      <CandidateDetail id={params.id} />
    </main>
  );
}
