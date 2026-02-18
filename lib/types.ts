export type CandidateStatus = 'pending' | 'interviewing' | 'completed';
export type ScoreStatus = 'computed' | 'missing' | 'error';
export type CriterionRating = 'good' | 'neutral' | 'bad';

export type FeedbackCriterion = {
  name: string;
  rating: CriterionRating;
  note: string;
};

export type InterviewFeedback = {
  overall_score: number | null;
  score_status: ScoreStatus;
  criteria: FeedbackCriterion[];
  overall_feedback?: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  cv_text: string | null;
  cv_summary: string | null;
  status: CandidateStatus;
  ai_score: number | null;
  score_status: ScoreStatus;
  created_at: string;
};

export type Interview = {
  id: string;
  candidate_id: string;
  transcript: string | null;
  agent_summary: string | null;
  feedback_json: string | null;
  audio_url: string | null;
  created_at: string;
};

export type CandidateWithInterview = Candidate & {
  interview: Interview | null;
};
