import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DASHBOARD_AUTH_COOKIE, getDashboardPassword } from '@/lib/dashboard-auth';

const schema = z.object({
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const configured = getDashboardPassword();
    if (!configured) {
      return NextResponse.json({ error: 'DASHBOARD_PASSWORD is not configured.' }, { status: 500 });
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.password !== configured) {
      return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: DASHBOARD_AUTH_COOKIE,
      value: configured,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: DASHBOARD_AUTH_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
  return response;
}
