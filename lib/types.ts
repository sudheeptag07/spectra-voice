export type CandidateStatus = 'pending' | 'interviewing' | 'completed';

export type Candidate = {
  id: string;
  name: string;
  email: string;
  cv_text: string | null;
  cv_summary: string | null;
  status: CandidateStatus;
  ai_score: number | null;
  created_at: string;
};

export type Interview = {
  id: string;
  candidate_id: string;
  transcript: string | null;
  agent_summary: string | null;
  audio_url: string | null;
  created_at: string;
};

export type CandidateWithInterview = Candidate & {
  interview: Interview | null;
};
