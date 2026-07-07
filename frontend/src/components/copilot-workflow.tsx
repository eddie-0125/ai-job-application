"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { JobProfileCard } from "@/components/job-profile-card";
import { GoogleSignInButton } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { useCopilotStore } from "@/store/copilot";

const STEP_KEYS = ["job", "resume", "tailor", "coverLetter", "match"] as const;
const ACCEPTED_RESUME_TYPES =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function CopilotWorkflow() {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeTitle, setResumeTitle] = useState(() => t("copilot.defaultResumeTitle"));
  const [resumeTitleCustomized, setResumeTitleCustomized] = useState(false);
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedApplication, setSavedApplication] = useState(false);
  const [generatedTailoredContent, setGeneratedTailoredContent] = useState("");
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

  const hasJobInfo =
    company.trim().length > 0 ||
    jobTitle.trim().length > 0 ||
    jobDesc.trim().length > 0;

  const buildJobPayload = () => ({
    company,
    title: jobTitle,
    description: jobDesc,
    source_url: sourceUrl ?? (jobUrl.trim() || undefined),
  });

  const ensureJob = async () => {
    if (job) return job;
    if (!hasJobInfo) throw new Error(t("copilot.errors.provideJobInfo"));
    const data = await api.createJob(buildJobPayload());
    setJob(data);
    return data;
  };

  const hasAnalyzedProfile = (profile: import("@shared/types").JobProfile) =>
    Boolean(
      profile.role ||
        profile.seniority ||
        profile.required_skills.length > 0 ||
        profile.ats_keywords.length > 0
    );

  const parseErrorMessage = (err: unknown): string => {
    if (!(err instanceof Error)) return t("common.somethingWrong");
    try {
      const parsed = JSON.parse(err.message) as { detail?: string };
      if (typeof parsed.detail === "string") return parsed.detail;
    } catch {
      /* plain text */
    }
    return err.message;
  };

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

  const saveJob = useMutation({
    mutationFn: () => {
      if (!hasJobInfo) throw new Error(t("copilot.errors.provideJobInfo"));
      return api.createJob(buildJobPayload());
    },
    onSuccess: (data) => {
      setJob(data);
      setError(null);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const uploadOnly = useMutation({
    mutationFn: async () => {
      if (!resumeFile) throw new Error(t("copilot.errors.selectResume"));
      await ensureJob();
      return api.uploadResume(resumeFile, resumeTitle);
    },
    onSuccess: (data) => {
      setResume(data);
      setError(null);
      setStep(2);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const tailorOnly = useMutation({
    mutationFn: async () => {
      if (!resume) throw new Error(t("copilot.errors.uploadResumeOnly"));
      const currentJob = await ensureJob();
      return api.tailorResume(resume.resume_id, currentJob.job_id);
    },
    onSuccess: (data) => {
      setGeneratedTailoredContent(data.tailored_content);
      setTailorResult(data);
      setError(null);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const cover = useMutation({
    mutationFn: async () => {
      if (!resume) throw new Error(t("copilot.errors.uploadResumeFirst"));
      const currentJob = await ensureJob();
      return api.generateCoverLetter({
        resume_id: resume.resume_id,
        job_id: currentJob.job_id,
        length: "medium",
      });
    },
    onSuccess: (data) => {
      setCoverLetter(data);
      setError(null);
      setStep(4);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const match = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) throw new Error(t("copilot.errors.signInToSave"));
      const currentJob = await ensureJob();

      let score: import("@shared/types").MatchScoreResponse | null = null;
      if (resume && hasAnalyzedProfile(currentJob.profile)) {
        try {
          score = await api.scoreMatch(currentJob.job_id, resume.resume_id);
        } catch {
          /* scoring is optional; still save the application */
        }
      }

      await api.createApplication(currentJob.job_id, resume?.resume_id);
      return score;
    },
    onSuccess: (data) => {
      setMatchScore(data);
      setSavedApplication(true);
      setError(null);
    },
    onError: (e: Error) => setError(parseErrorMessage(e)),
  });

  const loading =
    importFromUrl.isPending ||
    analyzeJob.isPending ||
    saveJob.isPending ||
    uploadOnly.isPending ||
    tailorOnly.isPending ||
    cover.isPending ||
    match.isPending;

  const isTailoredContentEdited =
    tailorResult != null &&
    generatedTailoredContent.length > 0 &&
    tailorResult.tailored_content !== generatedTailoredContent;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["pdf", "doc", "docx"].includes(ext)) {
      setError(t("copilot.errors.invalidFileType"));
      return;
    }
    setResumeFile(file);
    setError(null);
    if (!resumeTitleCustomized) {
      setResumeTitle(file.name.replace(/\.[^.]+$/, ""));
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-8 flex flex-wrap gap-2">
        {STEP_KEYS.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => setStep(i)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              step === i
                ? "bg-violet-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            {i + 1}. {t(`copilot.steps.${key}`)}
          </button>
        ))}
      </nav>

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {step === 0 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("copilot.job.title")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("copilot.job.subtitle")}</p>
          <p className="text-xs text-zinc-500">{t("copilot.job.optionalHint")}</p>
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/50 p-4 space-y-3">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t("copilot.job.importTitle")}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
                placeholder="https://www.linkedin.com/jobs/view/…"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
              />
              <button
                type="button"
                disabled={loading || jobUrl.trim().length < 10}
                onClick={() => importFromUrl.mutate()}
                className="shrink-0 rounded-lg border border-violet-500/50 bg-violet-500/10 px-4 py-2 text-sm font-medium text-violet-800 dark:text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                {importFromUrl.isPending ? t("copilot.job.importing") : t("copilot.job.importButton")}
              </button>
            </div>
            <p className="text-xs text-zinc-500">{t("copilot.job.importHint")}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
              placeholder={t("copilot.job.company")}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <input
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
              placeholder={t("copilot.job.jobTitle")}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />
          </div>
          <textarea
            className="w-full min-h-[200px] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
            placeholder={t("copilot.job.descriptionPlaceholder")}
            value={jobDesc}
            onChange={(e) => setJobDesc(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || jobDesc.length < 50}
              onClick={() => analyzeJob.mutate()}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {analyzeJob.isPending ? t("copilot.job.analyzing") : t("copilot.job.analyze")}
            </button>
            <button
              type="button"
              disabled={loading || !hasJobInfo}
              onClick={() => saveJob.mutate()}
              className="rounded-lg border border-violet-500/50 bg-violet-500/10 px-5 py-2.5 text-sm font-medium text-violet-800 hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-200"
            >
              {saveJob.isPending ? t("copilot.job.saving") : t("copilot.job.save")}
            </button>
            <button
              type="button"
              disabled={!hasJobInfo && !job}
              onClick={() => setStep(4)}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("copilot.job.skipToSave")}
            </button>
          </div>
          {job && (
            <div className="mt-4 space-y-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {t("copilot.job.saved")}
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {job.company} · {job.title}
              </p>
              {hasAnalyzedProfile(job.profile) && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
                  <JobProfileCard profile={job.profile} />
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("copilot.resume.title")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("copilot.resume.subtitle")}</p>

          {!authLoading && !isAuthenticated && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">{t("copilot.resume.signInPrompt")}</p>
              <GoogleSignInButton />
            </div>
          )}

          {!job && !hasJobInfo && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{t("copilot.resume.completeJobFirst")}</p>
          )}

          <input
            className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm"
            placeholder={t("copilot.resume.resumeTitle")}
            value={resumeTitle}
            onChange={(e) => {
              setResumeTitleCustomized(true);
              setResumeTitle(e.target.value);
            }}
          />

          <div
            className={`relative rounded-xl border-2 border-dashed p-8 text-center transition ${
              resumeFile
                ? "border-violet-500/50 bg-violet-500/5"
                : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500"
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
                <p className="font-medium text-violet-700 dark:text-violet-300">{resumeFile.name}</p>
                <p className="text-xs text-zinc-500">
                  {(resumeFile.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 underline hover:text-zinc-900 dark:hover:text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  {t("copilot.resume.reselect")}
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-zinc-700 dark:text-zinc-300">{t("copilot.resume.uploadPrompt")}</p>
                <p className="text-xs text-zinc-500">{t("copilot.resume.uploadHint")}</p>
              </div>
            )}
          </div>

          {resume && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/50 p-4 space-y-2">
              <p className="text-xs font-medium text-emerald-400">{t("copilot.resume.preview")}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap max-h-32 overflow-auto">
                {resume.content_preview}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !resumeFile || (!job && !hasJobInfo) || !isAuthenticated}
              onClick={() => uploadOnly.mutate()}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {uploadOnly.isPending ? t("copilot.resume.uploading") : t("copilot.resume.upload")}
            </button>
            <button
              type="button"
              disabled={!hasJobInfo && !job}
              onClick={() => setStep(4)}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("copilot.resume.skipToSave")}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("copilot.tailor.title")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("copilot.tailor.subtitle")}</p>
          <p className="text-xs text-zinc-500">{t("copilot.tailor.optionalHint")}</p>

          {!resume && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{t("copilot.tailor.uploadResumeFirst")}</p>
          )}

          {!job && !hasJobInfo && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{t("copilot.tailor.completeJobFirst")}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !resume || (!job && !hasJobInfo) || !isAuthenticated}
              onClick={() => tailorOnly.mutate()}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {tailorOnly.isPending ? t("copilot.tailor.tailoring") : t("copilot.tailor.generate")}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("copilot.tailor.skipToSave")}
            </button>
          </div>

          {tailorResult && (
            <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{t("copilot.tailor.atsScore")}</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {tailorResult.ats_score_estimate}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{tailorResult.explanation}</p>
              {tailorResult.warnings.length > 0 && (
                <ul className="text-xs text-amber-700 space-y-1 dark:text-amber-300">
                  {tailorResult.warnings.map((w) => (
                    <li key={w}>• {w}</li>
                  ))}
                </ul>
              )}
              {tailorResult.changes.map((c, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 text-sm space-y-2">
                  <p className="font-medium text-violet-700 dark:text-violet-300">{c.section}</p>
                  <p className="text-zinc-500 line-through">{c.original}</p>
                  <p className="text-zinc-800 dark:text-zinc-200">{c.revised}</p>
                  <p className="text-xs text-zinc-500">{c.rationale}</p>
                </div>
              ))}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="tailored-resume-editor"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    {t("copilot.tailor.editLabel")}
                  </label>
                  {isTailoredContentEdited && (
                    <button
                      type="button"
                      onClick={() =>
                        setTailorResult({
                          ...tailorResult,
                          tailored_content: generatedTailoredContent,
                        })
                      }
                      className="text-xs text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
                    >
                      {t("copilot.tailor.resetToGenerated")}
                    </button>
                  )}
                </div>
                <p className="text-xs text-zinc-500">{t("copilot.tailor.editHint")}</p>
                <textarea
                  id="tailored-resume-editor"
                  value={tailorResult.tailored_content}
                  onChange={(e) =>
                    setTailorResult({
                      ...tailorResult,
                      tailored_content: e.target.value,
                    })
                  }
                  className="w-full min-h-[320px] rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed font-mono dark:border-zinc-700 dark:bg-zinc-950"
                />
              </div>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("copilot.coverLetter.title")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("copilot.coverLetter.subtitle")}</p>
          {!resume && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{t("copilot.coverLetter.uploadResumeFirst")}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loading || !resume || (!job && !hasJobInfo)}
              onClick={() => cover.mutate()}
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {cover.isPending ? t("copilot.coverLetter.generating") : t("copilot.coverLetter.generate")}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {t("copilot.coverLetter.skipToSave")}
            </button>
          </div>
          {coverLetter && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {coverLetter.key_alignments.map((a) => (
                  <span key={a} className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-300">
                    {a}
                  </span>
                ))}
              </div>
              <pre className="whitespace-pre-wrap rounded-xl bg-white dark:bg-zinc-950 p-4 text-sm leading-relaxed">
                {coverLetter.content}
              </pre>
            </div>
          )}
        </section>
      )}

      {step === 4 && (
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">{t("copilot.match.title")}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("copilot.match.subtitle")}</p>

          {!authLoading && !isAuthenticated && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <p className="text-sm text-amber-800 dark:text-amber-200">{t("copilot.match.signInPrompt")}</p>
              <GoogleSignInButton />
            </div>
          )}

          {!job && !hasJobInfo && (
            <p className="text-sm text-amber-700 dark:text-amber-400">{t("copilot.match.completeJobFirst")}</p>
          )}

          <button
            type="button"
            disabled={loading || (!hasJobInfo && !job) || !isAuthenticated}
            onClick={() => match.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {match.isPending
              ? resume && job && hasAnalyzedProfile(job.profile)
                ? t("copilot.match.scoring")
                : t("copilot.match.saving")
              : resume && job && hasAnalyzedProfile(job.profile)
                ? t("copilot.match.scoreAndSave")
                : t("copilot.match.save")}
          </button>

          {savedApplication && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {t("copilot.match.saved")}{" "}
              <Link href="/applications" className="underline hover:no-underline">
                {t("header.myApplications")}
              </Link>
            </p>
          )}

          {matchScore && (
            <div className="space-y-4">
              <p className="text-4xl font-bold text-emerald-400">{matchScore.overall_score}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{matchScore.summary}</p>
              <ScoreBar label={t("copilot.match.technical")} value={matchScore.technical_match} />
              <ScoreBar label={t("copilot.match.domain")} value={matchScore.domain_match} />
              <ScoreBar label={t("copilot.match.ats")} value={matchScore.ats_score} />
              <ScoreBar label={t("copilot.match.experience")} value={matchScore.experience_match} />
              <ScoreBar label={t("copilot.match.resumeQuality")} value={matchScore.resume_quality} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
