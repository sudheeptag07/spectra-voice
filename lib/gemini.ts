import type { FeedbackCriterion, InterviewBrief, InterviewFeedback } from '@/lib/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

type CVAnalysis = {
  summary: string;
  keySkills: string[];
};

function getModel() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  const client = new GoogleGenerativeAI(apiKey);
  return client;
}

async function generateWithFallback(prompt: string) {
  const client = getModel();
  const configured = process.env.GEMINI_MODEL;
  const models = [configured, 'gemini-2.5-flash', 'gemini-flash-latest'].filter(
    (name): name is string => Boolean(name && name.trim())
  );

  let lastError: Error | null = null;

  for (const modelName of models) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      return await model.generateContent(prompt);
    } catch (error) {
      lastError = error as Error;
    }
  }

  throw lastError ?? new Error('Unable to generate content with configured Gemini models.');
}

function parseJsonLoose(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json|```/gi, '').trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const maybe = cleaned.slice(start, end + 1);
      return JSON.parse(maybe) as Record<string, unknown>;
    }
    throw new Error('Unable to parse Gemini JSON output.');
  }
}

export async function analyzeCV(cvText: string): Promise<CVAnalysis> {
  const prompt = `You are an expert recruiter. Analyze this CV text and return strict JSON with keys: summary (exactly 3 sentences), keySkills (array of max 12 concise skills).\n\nCV:\n${cvText.slice(0, 12000)}`;
  const result = await generateWithFallback(prompt);
  const raw = result.response.text();

  const sanitized = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(sanitized) as Partial<CVAnalysis>;

  return {
    summary: parsed.summary?.trim() || 'Summary unavailable.',
    keySkills: Array.isArray(parsed.keySkills) ? parsed.keySkills.map((s) => String(s)) : []
  };
}

export async function scoreInterview(input: { cvSummary: string; transcript: string }): Promise<InterviewFeedback> {
  const prompt = `You are scoring a GTM/Sales interview. Use the CV summary and transcript to generate strict JSON with keys:
overall_score (integer 0-100), score_status ("computed"), overall_feedback (1-3 concise sentences),
criteria (array of exactly 5 objects with keys: name, rating, note).
Allowed criterion names: Ownership, Accountability, Collaboration, Customer Empathy, Adaptability & Ambiguity.
Allowed ratings: good, neutral, bad.
Each note must be one short line.

CV Summary:
${input.cvSummary.slice(0, 2500)}

Transcript:
${input.transcript.slice(0, 18000)}`;

  const result = await generateWithFallback(prompt);
  const raw = result.response.text();
  let parsed = parseJsonLoose(raw) as Partial<InterviewFeedback>;

  // One retry with stricter format if first parse does not include core keys.
  if (typeof parsed !== 'object' || parsed === null || (!('overall_score' in parsed) && !Array.isArray(parsed.criteria))) {
    const retryResult = await generateWithFallback(`${prompt}\n\nReturn JSON only. No markdown, no explanations.`);
    parsed = parseJsonLoose(retryResult.response.text()) as Partial<InterviewFeedback>;
  }
  const boundedScore = Math.max(0, Math.min(100, Math.round(Number(parsed.overall_score ?? 0))));

  const criteria: FeedbackCriterion[] = Array.isArray(parsed.criteria)
    ? parsed.criteria
        .map((row) => ({
          name: String((row as { name?: string }).name ?? '').trim(),
          rating: String((row as { rating?: string | number }).rating ?? '').trim().toLowerCase(),
          note: String((row as { note?: string }).note ?? '').trim()
        }))
        .filter((row) => row.name && row.note)
        .map((row) => ({
          name: row.name,
          rating: (() => {
            if (row.rating === 'good' || row.rating === 'bad' || row.rating === 'neutral') return row.rating as FeedbackCriterion['rating'];
            const numeric = Number(row.rating);
            if (!Number.isNaN(numeric)) {
              if (numeric >= 70) return 'good';
              if (numeric <= 39) return 'bad';
            }
            return 'neutral';
          })(),
          note: row.note
        }))
    : [];

  return {
    overall_score: boundedScore,
    score_status: 'computed',
    overall_feedback: (parsed.overall_feedback as string | undefined)?.trim() || 'Overall fit is under review.',
    criteria
  };
}

export async function generateInterviewBrief(input: {
  cvText: string;
  cvSummary: string;
  transcript: string;
  aiFeedback: string;
}): Promise<InterviewBrief> {
  const contextSeed = input.cvSummary
    .replace(/\s+/g, ' ')
    .split('.')
    .map((part) => part.trim())
    .find((part) => part.length > 12) || 'their resume claims';

  const prompt = `Based on the CV, transcript, and AI evaluation, identify areas where depth is unclear, claims need validation, or performance needs stress-testing. Generate one primary focus area and five highly targeted follow-up questions that probe real experience, ownership, and decision-making.

Return strict JSON with keys:
- focus (string, one line)
- concern (string, 1-2 concise lines)
- questions (array of exactly 5 strings, numbered content not needed)

Rules:
- Questions must be specific to this candidate's background.
- Avoid generic prompts like "tell me about yourself".
- Do not repeat questions already asked in round one.
- Focus on weak signals, vague claims, unproven impact, ownership depth, real outcomes, and edge cases.
- Keep output concise and practical.

CV Summary:
${input.cvSummary.slice(0, 2500)}

CV Text:
${input.cvText.slice(0, 10000)}

Interview Transcript (Round 1):
${input.transcript.slice(0, 20000)}

AI Evaluation:
${input.aiFeedback.slice(0, 3000)}`;

  const result = await generateWithFallback(prompt);
  let parsed = parseJsonLoose(result.response.text()) as Partial<InterviewBrief>;

  if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.questions)) {
    const retry = await generateWithFallback(`${prompt}\n\nReturn JSON only. No markdown, no prose.`);
    parsed = parseJsonLoose(retry.response.text()) as Partial<InterviewBrief>;
  }

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .map((q) => String(q).replace(/^\d+[\).\s-]*/, '').trim())
        .filter((q) => q.length > 0)
        .slice(0, 5)
    : [];

  const normalizedQuestions =
    questions.length === 5
      ? questions
      : [
          `You mentioned ${contextSeed}. Which single deal outcome changed because of your direct action, and what was the measurable delta?`,
          'Pick one major claim from your resume and prove it with exact baseline, target, actual result, and your decision ownership.',
          'Describe a high-stakes deal that failed. What decision did you make, what signal did you miss, and what changed afterward?',
          'Explain how you handled stakeholder conflict between sales, product, and leadership in one real cycle. What trade-off did you choose?',
          'If the same opportunity had half the timeline and fewer resources, what would you cut and what would you protect to still deliver results?'
        ];

  return {
    focus: String(parsed.focus || 'Validate ownership depth and real commercial impact.').trim(),
    concern: String(parsed.concern || 'Several claims require deeper evidence on direct ownership, decision quality, and measurable outcomes.').trim(),
    questions: normalizedQuestions
  };
}
