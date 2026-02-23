import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_AUTH_COOKIE, getDashboardPassword } from '@/lib/dashboard-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function isDashboardAuthed(request: NextRequest): boolean {
  const password = getDashboardPassword();
  if (!password) return true;
  const cookieValue = request.cookies.get(DASHBOARD_AUTH_COOKIE)?.value;
  return cookieValue === password;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isDashboardAuthed(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured.' }, { status: 500 });
  }

  const conversationId = params.id?.trim();
  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation id is required.' }, { status: 400 });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(conversationId)}/audio`,
    {
      method: 'GET',
      headers: { 'xi-api-key': apiKey },
      cache: 'no-store'
    }
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `Unable to fetch audio from ElevenLabs: ${text}` },
      { status: upstream.status }
    );
  }

  const contentType = upstream.headers.get('content-type') || 'audio/mpeg';
  const audioBuffer = await upstream.arrayBuffer();
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, no-store'
    }
  });
}
