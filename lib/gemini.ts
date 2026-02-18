import { GoogleGenerativeAI } from '@google/generative-ai';

type CVAnalysis = {
  summary: string;
  keySkills: string[];
};

type InterviewScore = {
  score: number;
  ownership: string;
  accountability: string;
  collaboration: string;
  customerEmpathy: string;
  adaptabilityAmbiguity: string;
  overallFeedback: string;
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

export async function scoreInterview(input: { cvSummary: string; transcript: string }): Promise<InterviewScore> {
  const prompt = `You are scoring a GTM/Sales interview. Use the CV summary and transcript to generate strict JSON with keys:
score (integer 0-100), ownership, accountability, collaboration, customerEmpathy, adaptabilityAmbiguity, overallFeedback.
Each feedback field should be 2-4 sentences.

CV Summary:
${input.cvSummary.slice(0, 2500)}

Transcript:
${input.transcript.slice(0, 18000)}`;

  const result = await generateWithFallback(prompt);
  const raw = result.response.text();

  const sanitized = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(sanitized) as Partial<InterviewScore>;

  const boundedScore = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));

  return {
    score: boundedScore,
    ownership: parsed.ownership?.trim() || 'No ownership feedback available.',
    accountability: parsed.accountability?.trim() || 'No accountability feedback available.',
    collaboration: parsed.collaboration?.trim() || 'No collaboration feedback available.',
    customerEmpathy: parsed.customerEmpathy?.trim() || 'No customer empathy feedback available.',
    adaptabilityAmbiguity: parsed.adaptabilityAmbiguity?.trim() || 'No adaptability and ambiguity feedback available.',
    overallFeedback: parsed.overallFeedback?.trim() || 'No overall feedback available.'
  };
}
