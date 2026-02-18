import { createClient } from '@libsql/client';
import type { Candidate, CandidateWithInterview, CandidateStatus, Interview, InterviewFeedback, ScoreStatus } from '@/lib/types';

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
      score_status TEXT NOT NULL DEFAULT 'missing',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      candidate_id TEXT NOT NULL,
      transcript TEXT,
      agent_summary TEXT,
      feedback_json TEXT,
      audio_url TEXT,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    )`
  ], 'write');

  await ensureColumns();
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
        feedback_json TEXT,
        audio_url TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (candidate_id) REFERENCES candidates(id)
      )`,
      `INSERT INTO interviews_new (id, candidate_id, transcript, agent_summary, feedback_json, audio_url, created_at)
       SELECT i.id, i.candidate_id, i.transcript, i.agent_summary, i.feedback_json, i.audio_url, i.created_at
       FROM interviews i
       JOIN candidates c ON c.id = i.candidate_id`,
      `DROP TABLE interviews`,
      `ALTER TABLE interviews_new RENAME TO interviews`
    ],
    'write'
  );
}

async function ensureColumns() {
  const candidateColumns = await db.execute('PRAGMA table_info(candidates)');
  const hasScoreStatus = candidateColumns.rows.some((row) => String((row as Record<string, unknown>).name) === 'score_status');
  if (!hasScoreStatus) {
    await db.execute(`ALTER TABLE candidates ADD COLUMN score_status TEXT NOT NULL DEFAULT 'missing'`);
  }

  const interviewColumns = await db.execute('PRAGMA table_info(interviews)');
  const hasFeedbackJson = interviewColumns.rows.some((row) => String((row as Record<string, unknown>).name) === 'feedback_json');
  if (!hasFeedbackJson) {
    await db.execute(`ALTER TABLE interviews ADD COLUMN feedback_json TEXT`);
  }

  // Backfill legacy rows so previously computed scores remain visible.
  await db.execute(
    `UPDATE candidates
     SET score_status = 'computed'
     WHERE ai_score IS NOT NULL
       AND (score_status IS NULL OR score_status = 'missing')`
  );
}

function mapCandidate(row: Record<string, unknown>): Candidate {
  const rawStatus = (row.score_status as string | null) ?? null;
  const hasScore = row.ai_score !== null && row.ai_score !== undefined;
  const derivedScoreStatus: ScoreStatus =
    rawStatus === 'error'
      ? 'error'
      : hasScore
        ? 'computed'
        : rawStatus === 'missing' || rawStatus === 'computed'
          ? rawStatus
          : 'missing';

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    cv_text: (row.cv_text as string | null) ?? null,
    cv_summary: (row.cv_summary as string | null) ?? null,
    status: String(row.status) as CandidateStatus,
    ai_score: row.ai_score === null ? null : Number(row.ai_score),
    score_status: derivedScoreStatus,
    created_at: String(row.created_at)
  };
}

function mapInterview(row: Record<string, unknown>): Interview {
  return {
    id: String(row.id),
    candidate_id: String(row.candidate_id),
    transcript: (row.transcript as string | null) ?? null,
    agent_summary: (row.agent_summary as string | null) ?? null,
    feedback_json: (row.feedback_json as string | null) ?? null,
    audio_url: (row.audio_url as string | null) ?? null,
    created_at: String(row.created_at)
  };
}

export async function createCandidate(input: { id: string; name: string; email: string }) {
  await ensureSchema();
  await db.execute({
    sql: 'INSERT INTO candidates (id, name, email, status, score_status) VALUES (?, ?, ?, ?, ?)',
    args: [input.id, input.name, input.email, 'pending', 'missing']
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
    sql: 'UPDATE candidates SET ai_score = ?, score_status = ?, status = ? WHERE id = ?',
    args: [score, 'computed', 'completed', candidateId]
  });
}

export async function updateCandidateScoreStatus(candidateId: string, scoreStatus: ScoreStatus) {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE candidates SET ai_score = NULL, score_status = ?, status = ? WHERE id = ?',
    args: [scoreStatus, 'completed', candidateId]
  });
}

export async function upsertInterview(input: {
  id: string;
  candidateId: string;
  transcript: string;
  agentSummary: string;
  feedbackJson: InterviewFeedback | null;
  audioUrl: string | null;
}) {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO interviews (id, candidate_id, transcript, agent_summary, feedback_json, audio_url)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
      transcript = excluded.transcript,
      agent_summary = excluded.agent_summary,
      feedback_json = excluded.feedback_json,
      audio_url = excluded.audio_url`,
    args: [input.id, input.candidateId, input.transcript, input.agentSummary, input.feedbackJson ? JSON.stringify(input.feedbackJson) : null, input.audioUrl]
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

export async function deleteCandidateCascade(id: string): Promise<void> {
  await ensureSchema();
  await db.batch(
    [
      {
        sql: 'DELETE FROM interviews WHERE candidate_id = ?',
        args: [id]
      },
      {
        sql: 'DELETE FROM candidates WHERE id = ?',
        args: [id]
      }
    ],
    'write'
  );
}
