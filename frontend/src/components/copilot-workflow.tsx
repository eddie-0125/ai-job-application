"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "@/lib/api";
import { useCopilotStore } from "@/store/copilot";
import type { JobProfile } from "@shared/types";

const STEPS = ["Resume", "Job", "Tailor", "Cover Letter", "Match"] as const;

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

export function CopilotWorkflow() {
  const [step, setStep] = useState(0);
  const [resumeText, setResumeText] = useState("");
  const [resumeTitle, setResumeTitle] = useState("My Resume");
  const [jobDesc, setJobDesc] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

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

  const uploadResume = useMutation({
    mutationFn: () => api.createResumeText(resumeText, resumeTitle),
    onSuccess: (data) => {
      setResume(data);
      setError(null);
      setStep(1);
    },
    onError: (e: Error) => setError(e.message),
  });

  const analyzeJob = useMutation({
    mutationFn: () =>
      api.analyzeJob({ description: jobDesc, company, title: jobTitle }),
    onSuccess: (data) => {
      setJob(data);
      setError(null);
      setStep(2);
    },
    onError: (e: Error) => setError(e.message),
  });

  const tailor = useMutation({
    mutationFn: () => {
      if (!resume || !job) throw new Error("Resume and job required");
      return api.tailorResume(resume.resume_id, job.job_id);
    },
    onSuccess: (data) => {
      setTailorResult(data);
      setError(null);
      setStep(3);
    },
    onError: (e: Error) => setError(e.message),
  });

  const cover = useMutation({
    mutationFn: () => {
      if (!resume || !job) throw new Error("Resume and job required");
      return api.generateCoverLetter({
        resume_id: resume.resume_id,
        job_id: job.job_id,
        length: "medium",
      });
    },
    onSuccess: (data) => {
      setCoverLetter(data);
      setError(null);
      setStep(4);
    },
    onError: (e: Error) => setError(e.message),
  });

  const match = useMutation({
    mutationFn: async () => {
      if (!resume || !job) throw new Error("Resume and job required");
      const score = await api.scoreMatch(job.job_id, resume.resume_id);
      await api.createApplication(job.job_id, resume.resume_id);
      return score;
    },
    onSuccess: (data) => {
      setMatchScore(data);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const loading =
    uploadResume.isPending ||
    analyzeJob.isPending ||
    tailor.isPending ||
    cover.isPending ||
    match.isPending;

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
          <h2 className="text-xl font-semibold">Upload your resume</h2>
          <p className="text-sm text-zinc-400">
            Paste resume text for MVP. PDF upload is available via API.
          </p>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Resume title"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
          />
          <textarea
            className="w-full min-h-[240px] rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono"
            placeholder="Paste your resume content..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
          />
          <button
            type="button"
            disabled={loading || resumeText.length < 50}
            onClick={() => uploadResume.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {uploadResume.isPending ? "Uploading…" : "Continue"}
          </button>
          {resume && (
            <p className="text-xs text-emerald-400">Saved: {resume.title}</p>
          )}
        </section>
      )}

      {step === 1 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Analyze job description</h2>
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

      {step === 2 && (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Tailor resume</h2>
          <p className="text-sm text-zinc-400">
            AI rewrites bullets for ATS fit — no fabricated experience.
          </p>
          <button
            type="button"
            disabled={loading || !resume || !job}
            onClick={() => tailor.mutate()}
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium hover:bg-violet-500 disabled:opacity-50"
          >
            {tailor.isPending ? "Tailoring…" : "Generate tailored resume"}
          </button>
          {tailorResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">ATS estimate</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {tailorResult.ats_score_estimate}
                </span>
              </div>
              <p className="text-sm text-zinc-300">{tailorResult.explanation}</p>
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

      {step === 3 && (
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

      {step === 4 && (
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
