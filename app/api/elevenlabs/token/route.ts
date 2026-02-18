import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY is not configured.' }, { status: 500 });
    }

    if (!agentId) {
      return NextResponse.json({ error: 'ElevenLabs agent id is not configured.' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        },
        cache: 'no-store'
      }
    );

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Failed to fetch conversation token from ElevenLabs: ${text}` },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as { token?: string };
    if (!payload.token) {
      return NextResponse.json({ error: 'ElevenLabs did not return a token.' }, { status: 502 });
    }

    return NextResponse.json({ token: payload.token });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
