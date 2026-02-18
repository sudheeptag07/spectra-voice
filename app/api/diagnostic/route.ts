import { NextResponse } from 'next/server';
import { db, ensureSchema } from '@/lib/db';

export async function GET() {
  const checks: Record<string, string | boolean> = {
    database: false,
    geminiApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    elevenlabsApiKey: Boolean(process.env.ELEVENLABS_API_KEY),
    elevenlabsAgentId: Boolean(process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID),
    schema: false
  };

  try {
    await db.execute('SELECT 1');
    checks.database = true;

    await ensureSchema();
    checks.schema = true;

    const ok = Object.values(checks).every((value) => value === true);
    return NextResponse.json({ ok, checks });
  } catch (error) {
    return NextResponse.json({ ok: false, checks, error: (error as Error).message }, { status: 500 });
  }
}
