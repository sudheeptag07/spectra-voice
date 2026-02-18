import Link from 'next/link';
import { DashboardTable } from '@/components/dashboard-table';

export default function DashboardPage() {
  return (
    <main className="space-y-6">
      <section className="glass-panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Hiring Manager Dashboard</h1>
          <p className="muted mt-1 text-sm">Monitor status, scores, transcripts, and interview artifacts.</p>
        </div>
        <Link href="/" className="rounded-xl border border-white/20 px-4 py-2 text-sm">
          Candidate Landing
        </Link>
      </section>
      <DashboardTable />
    </main>
  );
}
