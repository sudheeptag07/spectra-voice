import { NextResponse } from 'next/server';
import { getCandidateById, updateCandidateStatus } from '@/lib/db';
import { z } from 'zod';

const statusSchema = z.object({
  status: z.enum(['pending', 'interviewing', 'completed'])
});

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const record = await getCandidateById(params.id);
    if (!record) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
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
