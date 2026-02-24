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

function extractTranscriptEntries(raw: unknown): Array<{ role: string; text: string }> {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed ? [{ role: 'conversation', text: trimmed }] : [];
  }

  if (!Array.isArray(raw)) {
    const obj = asRecord(raw);
    const nested = obj.turns ?? obj.messages ?? obj.transcript;
    if (nested) return extractTranscriptEntries(nested);
    return [];
  }

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

function entriesToText(entries: Array<{ role: string; text: string }>): string {
  return entries.map((row) => `${row.role}: ${row.text}`).join('\n');
}

export async function fetchConversationAudioUrl(callId: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !callId) return null;

  const endpoints = [
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(callId)}`,
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(callId)}/details`
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'xi-api-key': apiKey },
        cache: 'no-store'
      });
      if (!response.ok) continue;

      const payload = asRecord(await response.json());
      const conversation = asRecord(payload.conversation);
      const analysis = asRecord(payload.analysis);
      const recording = asRecord(payload.recording);
      const audioUrl = pickFirstString(
        payload.audio_url,
        payload.recording_url,
        payload.audioUrl,
        conversation.audio_url,
        conversation.recording_url,
        analysis.audio_url,
        analysis.recording_url,
        recording.url,
        recording.audio_url
      );
      if (audioUrl) return audioUrl;
    } catch {
      // Best effort only.
    }
  }

  return null;
}

export async function fetchConversationTranscript(callId: string): Promise<string | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey || !callId) return null;

  const endpoints = [
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(callId)}`,
    `https://api.elevenlabs.io/v1/convai/conversations/${encodeURIComponent(callId)}/details`
  ];

  let best = '';

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'xi-api-key': apiKey },
        cache: 'no-store'
      });
      if (!response.ok) continue;

      const payload = asRecord(await response.json());
      const data = asRecord(payload.data);
      const conversation = asRecord(payload.conversation);
      const analysis = asRecord(payload.analysis);

      const candidates = [
        payload.transcript,
        data.transcript,
        conversation.transcript,
        analysis.transcript,
        payload.messages,
        payload.turns
      ];

      for (const raw of candidates) {
        const text = entriesToText(extractTranscriptEntries(raw)).trim();
        if (text.length > best.length) best = text;
      }

      const transcriptText = pickFirstString(
        payload.transcript_text,
        data.transcript_text,
        conversation.transcript_text,
        analysis.transcript_text
      );
      if (transcriptText && transcriptText.length > best.length) best = transcriptText;
    } catch {
      // Best effort only.
    }
  }

  return best.trim() || null;
}
