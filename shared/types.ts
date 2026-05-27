export interface JobProfile {
  role: string;
  seniority: string;
  required_skills: string[];
  preferred_skills: string[];
  industry: string;
  ats_keywords: string[];
  hidden_requirements?: string[];
  domain_requirements?: string[];
}

export interface JobAnalyzeResponse {
  job_id: string;
  profile: JobProfile;
  company: string;
  title: string;
}

export interface ResumeUploadResponse {
  resume_id: string;
  title: string;
  content_preview: string;
}

export interface ResumeChange {
  section: string;
  original: string;
  revised: string;
  rationale: string;
}

export interface ResumeTailorResponse {
  tailored_content: string;
  changes: ResumeChange[];
  ats_score_estimate: number;
  explanation: string;
  warnings: string[];
}

export interface MatchScoreResponse {
  overall_score: number;
  technical_match: number;
  domain_match: number;
  ats_score: number;
  experience_match: number;
  resume_quality: number;
  confidence: number;
  summary: string;
}

export interface CoverLetterResponse {
  content: string;
  length: string;
  key_alignments: string[];
}

export interface ApplicationSummary {
  id: string;
  job_id: string;
  resume_id: string | null;
  company: string;
  job_title: string;
  status: string;
  score: number | null;
  created_at: string | null;
  applied_at: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}
