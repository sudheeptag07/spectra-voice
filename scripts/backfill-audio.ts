import { fetchConversationAudioUrl } from '@/lib/elevenlabs';
import { listInterviewsMissingAudio, updateInterviewAudioUrl } from '@/lib/db';

async function run() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is missing.');
  }

  const rows = await listInterviewsMissingAudio();
  console.log(`Found ${rows.length} interview(s) missing audio_url.`);

  let updated = 0;
  let unresolved = 0;

  for (const row of rows) {
    const audioUrl = await fetchConversationAudioUrl(row.id);
    if (audioUrl) {
      await updateInterviewAudioUrl(row.id, audioUrl);
      updated += 1;
      console.log(`Updated audio URL for interview ${row.id}`);
    } else {
      unresolved += 1;
      console.log(`No audio found for interview ${row.id}`);
    }
  }

  console.log(`Done. Updated: ${updated}, unresolved: ${unresolved}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
