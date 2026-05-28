"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { GoogleSignInButton } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCopilotStore } from "@/store/copilot";
import type { JobProfile } from "@shared/types";

const STEPS = ["Job", "Tailor", "Cover Letter", "Match"] as const;
const ACCEPTED_RESUME_TYPES = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function JobProfileCard({ profile }: { profile: JobProfile }) {
  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-300">
          {profile.role}
        </span>
        <span className="rounded-full bg-zinc-700 px-3 py-1">{profile.seniority}</span>
        {profile.industry && (
          <span className="rounded-full bg-zinc-700 px-3 py-1">{profile.industry}</span>
        )}
      </div>
      <div>
        <p className="text-zinc-500 mb-1">Required skills</p>
        <div className="flex flex-wrap gap-1">
          {profile.required_skills.map((s) => (
            <span key={s} className="rounded bg-zinc-800 px-2 py-0.5 text-xs">
              {s}
            </span>
          ))}
        </div>
      </div>
      {profile.ats_keywords.length > 0 && (
        <div>
          <p className="text-zinc-500 mb-1">ATS keywords</p>
          <div className="flex flex-wrap gap-1">
            {profile.ats_keywords.map((k) => (
              <span key={k} className="rounded bg-amber-500/10 text-amber-200 px-2 py-0.5 text-xs">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function parseErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Something went wrong";
  try {
    const parsed = JSON.parse(err.message) as { detail?: string };
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    /* plain text */
  }
  return err.message;
}

export function CopilotWorkflow() {
  const [step, setStep] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeTitle, setResumeTitle] = useState("My Resume");
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    resume,
    job,
    tailorResult,
    coverLetter,
    matchScore,
    setResume,
    setJob,
    setTailorResult,
    setCoverLetter,
    setMatchScore,
  } = useCopilotStore();

  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  const importFromUrl = useMutation({
    mutationFn: () => api.importJobFromUrl(jobUrl.trim()),
    onSuccess: (data) => {
      setCompany(data.company);
      setJobTitle(data.title);
      setJobDesc(data.description);
      setSourceUrl(data.source_url);
      setJobUrl(data.source_url);
      setError(null);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const analyzeJob = useMutation({
    mutationFn: () =>
      api.analyzeJob({
        description: jobDesc,
        company,
        title: jobTitle,
        source_url: sourceUrl ?? undefined,
      }),
    onSuccess: (data) => {
      setJob(data);
      setError(null);
      setStep(1);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const uploadAndTailor = useMutation({
    mutationFn: async () => {
      if (!resumeFile) throw new Error("请选择简历文件");
      if (!job) throw new Error("请先完成职位分析");
      const uploaded = await api.uploadResume(resumeFile, resumeTitle);
      setResume(uploaded);
      return api.tailorResume(uploaded.resume_id, job.job_id);
    },
    onSuccess: (data) => {
      setTailorResult(data);
      setError(null);
      setStep(2);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const cover = useMutation({
    mutationFn: () => {
      if (!resume || !job) throw new Error("请先上传简历并完成优化");
      return api.generateCoverLetter({
        resume_id: resume.resume_id,
        job_id: job.job_id,
        length: "medium",
      });
    },
    onSuccess: (data) => {
      setCoverLetter(data);
      setError(null);
      setStep(3);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const match = useMutation({
    mutationFn: async () => {
      if (!resume || !job) throw new Error("请先上传简历");
      const score = await api.scoreMatch(job.job_id, resume.resume_id);
      await api.createApplication(job.job_id, resume.resume_id);
      return score;
    },
    onSuccess: (data) => {
      setMatchScore(data);
      setError(null);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const loading =
    importFromUrl.isPending ||
    analyzeJob.isPending ||
    uploadAndTailor.isPending ||
    cover.isPending ||
    match.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "doc", "docx"].includes(ext)) {
      setError("仅支持 PDF、DOC、DOCX 格式");
      return;
    }
    setResumeFile(file);
    setError(null);
    if (resumeTitle === "My Resume") {
      setResumeTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-8 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              step === i
                ? "bg-violet-600 text-white"
                : "bg-zinc-800/80 text-zinc-400 hover:text-white"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {step === 0 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Analyze job description</h2>
          <p className="text-sm text-zinc-400">
            粘贴职位链接可自动填充公司、职位与描述（支持 LinkedIn、Indeed、公司招聘页等），或手动填写后分析。
          </p>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-300">从链接导入</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
                placeholder="https://www.linkedin.com/jobs/view/…"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
              <button
                type="button"
                disabled={loading || jobUrl.trim().length < 10}
                onClick={() => importFromUrl.mutate()}
                className="shrink-0 rounded-lg border border-violet-500/50 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {importFromUrl.isPending ? "正在解析…" : "解析链接"}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              部分站点需登录或会拦截自动抓取；若失败请直接粘贴职位描述。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Job title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <textarea
            className="w-full min-h-[200px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Paste the full job description..."
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
          <button
            type="button"
            disabled={loading || jobDesc.length < 50}
            onClick={() => analyzeJob.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {analyzeJob.isPending ? "Analyzing…" : "Analyze with AI"}
          </button>
          {job && (
            <div className="mt-4 rounded-xl border border-zinc-800 p-4">
              <JobProfileCard profile={job.profile} />
            </div>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">上传简历并优化</h2>
          <p className="text-sm text-zinc-400">
            上传 PDF 或 Word 简历（.pdf / .doc / .docx），系统将自动解析内容并针对当前职位进行 ATS 优化。
          </p>

          {!authLoading && !isAuthenticated && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm text-amber-200">请先登录 Google 账号，以便保存简历和申请记录。</p>
              <GoogleSignInButton label="Sign in with Google" />
            </div>
          )}

          {!job && (
            <p className="text-sm text-amber-400">请先在「Job」步骤完成职位分析。</p>
          )}

          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="简历标题"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
          />

          <div
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition ${
              resumeFile
                ? "border-violet-500/50 bg-violet-500/5"
                : "border-zinc-700 hover:border-zinc-500"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_RESUME_TYPES}
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handleFileChange}
            />
            {resumeFile ? (
              <div className="space-y-1">
                <p className="font-medium text-violet-300">{resumeFile.name}</p>
                <p className="text-xs text-zinc-500">
                  {(resumeFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-zinc-400 underline hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  重新选择文件
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-300">点击或拖拽上传简历</p>
                <p className="text-xs text-zinc-500">支持 PDF、DOC、DOCX，最大 10 MB</p>
              </div>
            )}
          </div>

          {resume && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 space-y-2">
              <p className="text-xs font-medium text-emerald-400">已解析简历内容预览</p>
              <p className="text-xs text-zinc-400 whitespace-pre-wrap max-h-32 overflow-auto">
                {resume.content_preview}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={loading || !resumeFile || !job || !isAuthenticated}
            onClick={() => uploadAndTailor.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {uploadAndTailor.isPending ? "解析并优化中…" : "上传并生成优化简历"}
          </button>

          {tailorResult && (
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">ATS 预估分数</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {tailorResult.ats_score_estimate}
                </span>
              </div>
              <p className="text-sm text-zinc-300">{tailorResult.explanation}</p>
              {tailorResult.warnings.length > 0 && (
                <ul className="text-xs text-amber-300 space-y-1">
                  {tailorResult.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}
              {tailorResult.changes.map((c, i) => (
                <div key={i} className="rounded-xl border border-zinc-800 p-4 text-sm space-y-2">
                  <p className="font-medium text-violet-300">{c.section}</p>
                  <p className="text-zinc-500 line-through">{c.original}</p>
                  <p className="text-zinc-200">{c.revised}</p>
                  <p className="text-xs text-zinc-500">{c.rationale}</p>
                </div>
              ))}
              <pre className="max-h-64 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs font-mono whitespace-pre-wrap">
                {tailorResult.tailored_content}
              </pre>
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Cover letter</h2>
          <button
            type="button"
            disabled={loading || !resume || !job}
            onClick={() => cover.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {cover.isPending ? "Generating…" : "Generate cover letter"}
          </button>
          {coverLetter && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {coverLetter.key_alignments.map((a) => (
                  <span key={a} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                    {a}
                  </span>
                ))}
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-sm leading-relaxed">
                {coverLetter.content}
              </pre>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Match score</h2>
          <button
            type="button"
            disabled={loading || !resume || !job}
            onClick={() => match.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {match.isPending ? "Scoring…" : "Score & save application"}
          </button>
          {matchScore && (
            <div className="space-y-4">
              <p className="text-4xl font-bold text-emerald-400">{matchScore.overall_score}</p>
              <p className="text-sm text-zinc-400">{matchScore.summary}</p>
              <ScoreBar label="Technical" value={matchScore.technical_match} />
              <ScoreBar label="Domain" value={matchScore.domain_match} />
              <ScoreBar label="ATS" value={matchScore.ats_score} />
              <ScoreBar label="Experience" value={matchScore.experience_match} />
              <ScoreBar label="Resume quality" value={matchScore.resume_quality} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
