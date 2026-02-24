import { NextResponse } from 'next/server';
import { deleteCandidateCascade, getCandidateById, updateCandidateInterviewBrief, updateCandidateStatus, updateInterviewAudioUrl } from '@/lib/db';
import { fetchConversationAudioUrl } from '@/lib/elevenlabs';
import { generateInterviewBrief } from '@/lib/gemini';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const statusSchema = z.object({
  status: z.enum(['pending', 'interviewing', 'completed'])
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    let record = await getCandidateById(params.id);
    if (!record) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    if (record.interview && !record.interview.audio_url) {
      const resolvedAudioUrl = await fetchConversationAudioUrl(record.interview.id);
      if (resolvedAudioUrl) {
        await updateInterviewAudioUrl(record.interview.id, resolvedAudioUrl);
        record = await getCandidateById(params.id);
        if (!record) {
          return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
        }
      }
    }

    const needsBrief =
      !record.interview_brief_focus ||
      !record.interview_brief_concern ||
      !Array.isArray(record.interview_brief_questions) ||
      record.interview_brief_questions.length !== 5;

    if (needsBrief && record.interview?.transcript?.trim()) {
      try {
        const brief = await generateInterviewBrief({
          cvText: record.cv_text || '',
          cvSummary: record.cv_summary || '',
          transcript: record.interview.transcript || '',
          aiFeedback: record.interview.agent_summary || ''
        });
        await updateCandidateInterviewBrief(record.id, brief);
        record = await getCandidateById(params.id);
        if (!record) {
          return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
        }
      } catch {
        // Do not fail the detail page if brief generation is temporarily unavailable.
      }
    }

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const parsed = statusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await getCandidateById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    if (existing.status === 'completed' && parsed.data.status === 'interviewing') {
      return NextResponse.json(
        { error: 'Interview already completed. Restart is not allowed.' },
        { status: 409 }
      );
    }

    await updateCandidateStatus(params.id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const existing = await getCandidateById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    await deleteCandidateCascade(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
