import { NextResponse } from 'next/server';
import { getCandidateById, updateCandidateScore, updateCandidateStatus, upsertInterview } from '@/lib/db';
import { scoreInterview } from '@/lib/gemini';

function transcriptToText(transcript: Array<{ role: string; text: string }> = []) {
  return transcript.map((row) => `${row.role}: ${row.text}`).join('\n');
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    const found = asString(value);
    if (found) return found;
  }
  return null;
}

function pickCandidateId(body: Record<string, unknown>): string | null {
  const dynamicVariables = asRecord(body.dynamic_variables);
  const convoInitiation = asRecord(body.conversation_initiation_client_data);
  const convoDynamicVariables = asRecord(convoInitiation.dynamic_variables);
  const metadata = asRecord(body.metadata);
  const metadataDynamicVariables = asRecord(metadata.dynamic_variables);

  return pickFirstString(
    dynamicVariables.candidate_id,
    dynamicVariables.candidateId,
    convoDynamicVariables.candidate_id,
    convoDynamicVariables.candidateId,
    metadataDynamicVariables.candidate_id,
    metadataDynamicVariables.candidateId,
    body.candidate_id,
    body.candidateId
  );
}

function pickCallId(body: Record<string, unknown>, candidateId: string) {
  return (
    pickFirstString(body.call_id, body.conversation_id, body.id, body.event_id, body.session_id) ||
    `fallback-${candidateId}-${Date.now()}`
  );
}

function extractTranscriptEntries(raw: unknown): Array<{ role: string; text: string }> {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? [{ role: 'conversation', text: trimmed }] : [];
  }

  if (!Array.isArray(raw)) return [];

  const entries: Array<{ role: string; text: string }> = [];
  for (const item of raw) {
    const row = asRecord(item);
    const role = pickFirstString(row.role, row.speaker, row.source, row.type) || 'speaker';
    const text = pickFirstString(
      row.text,
      row.message,
      row.content,
      asRecord(row.user_transcription_event).user_transcript,
      asRecord(row.agent_response_event).agent_response
    );
    if (text) entries.push({ role, text });
  }
  return entries;
}

function pickTranscript(body: Record<string, unknown>): string {
  const candidates = [
    body.transcript,
    asRecord(body.data).transcript,
    asRecord(body.conversation).transcript,
    asRecord(body.analysis).transcript,
    asRecord(body.event).transcript
  ];

  for (const raw of candidates) {
    const entries = extractTranscriptEntries(raw);
    if (entries.length > 0) return transcriptToText(entries);
  }

  const rawText = pickFirstString(body.transcript_text, asRecord(body.analysis).transcript_text);
  return rawText || '';
}

function pickAudioUrl(body: Record<string, unknown>): string | null {
  return pickFirstString(
    body.audio_url,
    asRecord(body.data).audio_url,
    asRecord(body.conversation).audio_url,
    asRecord(body.analysis).audio_url,
    body.recording_url
  );
}

export async function POST(request: Request) {
  try {
    const body = asRecord(await request.json());
    const candidateId = pickCandidateId(body);
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId missing in dynamic variables.' }, { status: 400 });
    }

    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    const callId = pickCallId(body, candidateId);
    const transcript = pickTranscript(body);
    const audioUrl = pickAudioUrl(body);

    let score: number | null = null;
    let agentSummary = 'AI feedback pending.';

    if (transcript.trim().length > 0) {
      try {
        const scored = await scoreInterview({
          cvSummary: candidate.cv_summary || '',
          transcript
        });
        score = scored.score;
        agentSummary = [
          `Overall Score: ${scored.score}/100`,
          `Ownership: ${scored.ownership}`,
          `Accountability: ${scored.accountability}`,
          `Collaboration: ${scored.collaboration}`,
          `Customer Empathy: ${scored.customerEmpathy}`,
          `Adaptability & Ambiguity: ${scored.adaptabilityAmbiguity}`,
          `Overall: ${scored.overallFeedback}`
        ].join('\n\n');
      } catch {
        agentSummary = 'Interview captured, but Gemini scoring failed for this attempt.';
      }
    } else {
      agentSummary = 'Interview captured, but transcript was empty in webhook payload.';
    }

    await upsertInterview({
      id: callId,
      candidateId,
      transcript,
      agentSummary,
      audioUrl
    });

    if (score !== null) {
      await updateCandidateScore(candidateId, score);
    } else {
      await updateCandidateStatus(candidateId, 'completed');
    }

    return NextResponse.json({ ok: true, score, callId });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
