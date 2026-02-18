import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCandidateById, updateCandidateScore, upsertInterview } from '@/lib/db';
import { scoreInterview } from '@/lib/gemini';

const transcriptEntry = z.object({
  role: z.string(),
  text: z.string()
});

const schema = z.object({
  call_id: z.string(),
  dynamic_variables: z.object({
    candidate_id: z.string().uuid().optional(),
    candidateId: z.string().uuid().optional()
  }),
  transcript: z.array(transcriptEntry).optional(),
  audio_url: z.string().url().optional()
});

function transcriptToText(transcript: Array<{ role: string; text: string }> = []) {
  return transcript.map((row) => `${row.role}: ${row.text}`).join('\n');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const candidateId = parsed.data.dynamic_variables.candidate_id || parsed.data.dynamic_variables.candidateId;
    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId missing in dynamic variables.' }, { status: 400 });
    }

    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    const transcript = transcriptToText(parsed.data.transcript || []);
    const scored = await scoreInterview({
      cvSummary: candidate.cv_summary || '',
      transcript
    });

    const agentSummary = [
      `Overall Score: ${scored.score}/100`,
      `Ownership: ${scored.ownership}`,
      `Accountability: ${scored.accountability}`,
      `Collaboration: ${scored.collaboration}`,
      `Customer Empathy: ${scored.customerEmpathy}`,
      `Adaptability & Ambiguity: ${scored.adaptabilityAmbiguity}`,
      `Overall: ${scored.overallFeedback}`
    ].join('\n\n');

    await upsertInterview({
      id: parsed.data.call_id,
      candidateId,
      transcript,
      agentSummary,
      audioUrl: parsed.data.audio_url || null
    });

    await updateCandidateScore(candidateId, scored.score);

    return NextResponse.json({ ok: true, score: scored.score });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
