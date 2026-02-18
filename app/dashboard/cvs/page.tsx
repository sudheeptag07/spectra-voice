import Link from 'next/link';
import { db, ensureSchema } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CVRow = {
  id: string;
  name: string;
  email: string;
  cv_text: string;
  cv_summary: string | null;
  created_at: string;
};

export default async function DashboardCVPage() {
  await ensureSchema();
  const result = await db.execute(
    'SELECT id, name, email, cv_text, cv_summary, created_at FROM candidates WHERE cv_text IS NOT NULL ORDER BY created_at DESC'
  );
  const rows = result.rows as unknown as CVRow[];

  return (
    <main className="space-y-6">
      <section className="glass-panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Candidate CV Library</h1>
          <p className="muted mt-1 text-sm">All uploaded CVs with quick preview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="rounded-xl border border-white/20 px-4 py-2 text-sm transition hover:border-[#F14724]/60 hover:text-[#F14724]">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        {rows.length === 0 ? (
          <div className="glass-panel p-6 text-sm text-slate-300">No CVs stored yet.</div>
        ) : (
          rows.map((row) => (
            <article key={row.id} className="glass-panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{row.name}</h2>
                  <p className="text-sm text-slate-300">{row.email}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>{new Date(row.created_at).toLocaleString()}</p>
                  <p className="mt-1">{row.cv_text.length.toLocaleString()} chars</p>
                </div>
              </div>

              {row.cv_summary ? <p className="mt-3 text-sm text-slate-300">{row.cv_summary}</p> : null}

              <details className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
                <summary className="cursor-pointer text-sm font-medium text-[#F14724]">Preview CV</summary>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-200">{row.cv_text}</pre>
              </details>

              <div className="mt-3">
                <Link
                  href={`/dashboard/candidates/${row.id}`}
                  className="inline-flex rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-[#F14724]/60 hover:text-[#F14724]"
                >
                  Open Candidate Detail
                </Link>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
