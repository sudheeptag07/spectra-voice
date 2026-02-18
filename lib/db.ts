import { createClient } from '@libsql/client';
import type { Candidate, CandidateWithInterview, CandidateStatus, Interview } from '@/lib/types';

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

export const db = createClient({ url, authToken });

let initialized = false;

export async function ensureSchema() {
  if (initialized) return;

  await db.batch([
    `CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      cv_text TEXT,
      cv_summary TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      ai_score INTEGER,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      transcript TEXT,
      agent_summary TEXT,
      audio_url TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    )`
  ], 'write');

  await repairInterviewForeignKey();

  initialized = true;
}

async function repairInterviewForeignKey() {
  const fk = await db.execute('PRAGMA foreign_key_list(interviews)');
  const fkRow = fk.rows[0] as Record<string, unknown> | undefined;
  const referencedTable = fkRow ? String(fkRow.table) : 'candidates';

  if (referencedTable === 'candidates') {
    return;
  }

  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS interviews_new (
        id TEXT PRIMARY KEY,
        candidate_id TEXT NOT NULL,
        transcript TEXT,
        agent_summary TEXT,
        audio_url TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      )`,
      `INSERT INTO interviews_new (id, candidate_id, transcript, agent_summary, audio_url, created_at)
       SELECT i.id, i.candidate_id, i.transcript, i.agent_summary, i.audio_url, i.created_at
       FROM interviews i
       JOIN candidates c ON c.id = i.candidate_id`,
      `DROP TABLE interviews`,
      `ALTER TABLE interviews_new RENAME TO interviews`
    ],
    'write'
  );
}

function mapCandidate(row: Record<string, unknown>): Candidate {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    cv_text: (row.cv_text as string | null) ?? null,
    cv_summary: (row.cv_summary as string | null) ?? null,
    status: String(row.status) as CandidateStatus,
    ai_score: row.ai_score === null ? null : Number(row.ai_score),
    created_at: String(row.created_at)
  };
}

function mapInterview(row: Record<string, unknown>): Interview {
  return {
    id: String(row.id),
    candidate_id: String(row.candidate_id),
    transcript: (row.transcript as string | null) ?? null,
    agent_summary: (row.agent_summary as string | null) ?? null,
    audio_url: (row.audio_url as string | null) ?? null,
    created_at: String(row.created_at)
  };
}

export async function createCandidate(input: { id: string; name: string; email: string }) {
  await ensureSchema();
  await db.execute({
    sql: 'INSERT INTO candidates (id, name, email, status) VALUES (?, ?, ?, ?)',
    args: [input.id, input.name, input.email, 'pending']
  });
}

export async function updateCandidateCV(candidateId: string, cvText: string, cvSummary: string) {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE candidates SET cv_text = ?, cv_summary = ? WHERE id = ?',
    args: [cvText, cvSummary, candidateId]
  });
}

export async function updateCandidateStatus(candidateId: string, status: CandidateStatus) {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE candidates SET status = ? WHERE id = ?',
    args: [status, candidateId]
  });
}

export async function updateCandidateScore(candidateId: string, score: number) {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE candidates SET ai_score = ?, status = ? WHERE id = ?',
    args: [score, 'completed', candidateId]
  });
}

export async function upsertInterview(input: {
  id: string;
  candidateId: string;
  transcript: string;
  agentSummary: string;
  audioUrl: string | null;
}) {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO interviews (id, candidate_id, transcript, agent_summary, audio_url)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
      transcript = excluded.transcript,
      agent_summary = excluded.agent_summary,
      audio_url = excluded.audio_url`,
    args: [input.id, input.candidateId, input.transcript, input.agentSummary, input.audioUrl]
  });
}

export async function getCandidateById(id: string): Promise<CandidateWithInterview | null> {
  await ensureSchema();
  const candidateResult = await db.execute({
    sql: 'SELECT * FROM candidates WHERE id = ? LIMIT 1',
    args: [id]
  });

  const candidateRow = candidateResult.rows[0] as Record<string, unknown> | undefined;
  if (!candidateRow) return null;

  const interviewResult = await db.execute({
    sql: 'SELECT * FROM interviews WHERE candidate_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [id]
  });

  const interviewRow = interviewResult.rows[0] as Record<string, unknown> | undefined;

  return {
    ...mapCandidate(candidateRow),
    interview: interviewRow ? mapInterview(interviewRow) : null
  };
}

export async function listCandidates(): Promise<Candidate[]> {
  await ensureSchema();
  const result = await db.execute('SELECT * FROM candidates ORDER BY created_at DESC');
  return result.rows.map((row) => mapCandidate(row as Record<string, unknown>));
}
