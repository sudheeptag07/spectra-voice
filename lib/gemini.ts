import type { FeedbackCriterion, InterviewFeedback } from '@/lib/types';
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

  const sanitized = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(sanitized) as Partial<InterviewFeedback>;
  const boundedScore = Math.max(0, Math.min(100, Math.round(Number(parsed.overall_score ?? 0))));

  const criteria: FeedbackCriterion[] = Array.isArray(parsed.criteria)
    ? parsed.criteria
        .map((row) => ({
          name: String((row as { name?: string }).name ?? '').trim(),
          rating: String((row as { rating?: string }).rating ?? '').trim().toLowerCase(),
          note: String((row as { note?: string }).note ?? '').trim()
        }))
        .filter((row) => row.name && row.note)
        .map((row) => ({
          name: row.name,
          rating: (row.rating === 'good' || row.rating === 'bad' ? row.rating : 'neutral') as FeedbackCriterion['rating'],
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
