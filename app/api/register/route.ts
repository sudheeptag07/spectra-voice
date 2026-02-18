import { NextResponse } from 'next/server';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { createCandidate } from '@/lib/db';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const candidateId = uuid();
    await createCandidate({ id: candidateId, ...parsed.data });

    return NextResponse.json({ candidateId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
