const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "copilot_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, init?: RequestInit, auth = false): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
    ...(auth ? authHeaders() : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
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
  getApiUrl: () => API_URL,

  health: () => request<{ status: string }>("/health"),

  getMe: () => request<import("@shared/types").User>("/api/auth/me", undefined, true),

  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }, true),

  googleLoginUrl: () => `${API_URL}/api/auth/google/login`,

  importJobFromUrl: (url: string) =>
    request<import("@shared/types").JobImportFromUrlResponse>("/api/jobs/import-from-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }),

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
    return request<import("@shared/types").ResumeUploadResponse>(
      "/api/resumes/upload",
      { method: "POST", body: form },
      true
    );
  },

  tailorResume: (resumeId: string, jobId: string) =>
    request<import("@shared/types").ResumeTailorResponse>(
      "/api/resumes/tailor",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_id: resumeId, job_id: jobId }),
      },
      true
    ),

  generateCoverLetter: (body: {
    resume_id: string;
    job_id: string;
    length?: string;
    hiring_manager?: string;
  }) =>
    request<import("@shared/types").CoverLetterResponse>(
      "/api/cover-letters/generate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      true
    ),

  scoreMatch: (jobId: string, resumeId: string) =>
    request<import("@shared/types").MatchScoreResponse>(
      `/api/jobs/${jobId}/match/${resumeId}`,
      { method: "POST" }
    ),

  listApplications: () =>
    request<import("@shared/types").ApplicationSummary[]>("/api/applications", undefined, true),

  createApplication: (jobId: string, resumeId: string) =>
    request<{ id: string }>(
      "/api/applications",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, resume_id: resumeId }),
      },
      true
    ),

  updateApplicationStatus: (applicationId: string, status: string) =>
    request<{ id: string; status: string }>(
      `/api/applications/${applicationId}/status?status=${encodeURIComponent(status)}`,
      { method: "PATCH" },
      true
    ),
};
