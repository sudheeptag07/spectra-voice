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
