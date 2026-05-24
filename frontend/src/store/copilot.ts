import { create } from "zustand";
import type {
  CoverLetterResponse,
  JobAnalyzeResponse,
  MatchScoreResponse,
  ResumeTailorResponse,
  ResumeUploadResponse,
} from "@shared/types";

interface CopilotState {
  resume: ResumeUploadResponse | null;
  job: JobAnalyzeResponse | null;
  tailorResult: ResumeTailorResponse | null;
  coverLetter: CoverLetterResponse | null;
  matchScore: MatchScoreResponse | null;
  setResume: (r: ResumeUploadResponse | null) => void;
  setJob: (j: JobAnalyzeResponse | null) => void;
  setTailorResult: (t: ResumeTailorResponse | null) => void;
  setCoverLetter: (c: CoverLetterResponse | null) => void;
  setMatchScore: (m: MatchScoreResponse | null) => void;
  reset: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  resume: null,
  job: null,
  tailorResult: null,
  coverLetter: null,
  matchScore: null,
  setResume: (resume) => set({ resume }),
  setJob: (job) => set({ job }),
  setTailorResult: (tailorResult) => set({ tailorResult }),
  setCoverLetter: (coverLetter) => set({ coverLetter }),
  setMatchScore: (matchScore) => set({ matchScore }),
  reset: () =>
    set({
      resume: null,
      job: null,
      tailorResult: null,
      coverLetter: null,
      matchScore: null,
    }),
}));
