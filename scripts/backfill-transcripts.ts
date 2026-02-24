import { fetchConversationTranscript } from '@/lib/elevenlabs';
import { listAllInterviews, updateInterviewTranscriptIfLonger } from '@/lib/db';

function extractConversationId(interviewId: string): string | null {
  if (!interviewId) return null;
  if (interviewId.startsWith('conv_') || interviewId.startsWith('call_')) return interviewId;

  const convMatch = interviewId.match(/(conv_[a-zA-Z0-9]+)/);
  if (convMatch?.[1]) return convMatch[1];
  const callMatch = interviewId.match(/(call_[a-zA-Z0-9]+)/);
  if (callMatch?.[1]) return callMatch[1];

  return null;
}

async function run() {
  if (!process.env.ELEVENLABS_API_KEY) {
    throw new Error('ELEVENLABS_API_KEY is missing.');
  }

  const rows = await listAllInterviews();
  console.log(`Found ${rows.length} interview(s).`);

  let scanned = 0;
  let skipped = 0;
  let updated = 0;
  let unresolved = 0;

  for (const row of rows) {
    scanned += 1;
    const conversationId = extractConversationId(row.id);
    if (!conversationId) {
      skipped += 1;
      continue;
    }

    const transcript = await fetchConversationTranscript(conversationId);
    if (!transcript) {
      unresolved += 1;
      continue;
    }

    const didUpdate = await updateInterviewTranscriptIfLonger(row.id, transcript);
    if (didUpdate) {
      updated += 1;
      console.log(`Updated transcript for ${row.id} (from ${conversationId})`);
    }
  }

  console.log(
    `Done. scanned=${scanned} updated=${updated} unresolved=${unresolved} skipped=${skipped}`
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
