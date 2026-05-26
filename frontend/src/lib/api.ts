const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const raw = await res.text();
    let message = raw || `Request failed: ${res.status}`;
    try {
      const json = JSON.parse(raw) as { detail?: string | { msg: string }[] };
      if (typeof json.detail === "string") message = json.detail;
      else if (Array.isArray(json.detail)) {
        message = json.detail.map((d) => d.msg).join("; ");
      }
    } catch {
      /* use raw */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  analyzeJob: (body: {
    description: string;
    company?: string;
    title?: string;
    source_url?: string;
  }) =>
    request<import("@shared/types").JobAnalyzeResponse>("/api/jobs/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  uploadResume: async (file: File, title: string) => {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    return request<import("@shared/types").ResumeUploadResponse>("/api/resumes/upload", {
      method: "POST",
      body: form,
    });
  },

  createResumeText: (content: string, title: string) => {
    const form = new FormData();
    form.append("content", content);
    form.append("title", title);
    return request<import("@shared/types").ResumeUploadResponse>("/api/resumes/text", {
      method: "POST",
      body: form,
    });
  },

  tailorResume: (resumeId: string, jobId: string) =>
    request<import("@shared/types").ResumeTailorResponse>("/api/resumes/tailor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
    }),

  generateCoverLetter: (body: {
    resume_id: string;
    job_id: string;
    length?: string;
    hiring_manager?: string;
  }) =>
    request<import("@shared/types").CoverLetterResponse>("/api/cover-letters/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  scoreMatch: (jobId: string, resumeId: string) =>
    request<import("@shared/types").MatchScoreResponse>(
      `/api/jobs/${jobId}/match/${resumeId}`,
      { method: "POST" }
    ),

  listApplications: () =>
    request<import("@shared/types").ApplicationSummary[]>("/api/applications"),

  createApplication: (jobId: string, resumeId: string) =>
    request<{ id: string }>("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId, resume_id: resumeId }),
    }),
};
