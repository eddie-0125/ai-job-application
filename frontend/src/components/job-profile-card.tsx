"use client";

import { useTranslation } from "react-i18next";
import type { JobProfile } from "@shared/types";

export function JobProfileCard({ profile }: { profile: JobProfile }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3 text-sm">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-700 dark:text-violet-300">
          {profile.role}
        </span>
        <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-3 py-1">{profile.seniority}</span>
        {profile.industry && (
          <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 px-3 py-1">{profile.industry}</span>
        )}
      </div>
      {profile.required_skills.length > 0 && (
        <div>
          <p className="text-zinc-500 mb-1">{t("copilot.job.requiredSkills")}</p>
          <div className="flex flex-wrap gap-1">
            {profile.required_skills.map((s) => (
              <span key={s} className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.preferred_skills.length > 0 && (
        <div>
          <p className="text-zinc-500 mb-1">{t("applications.preferredSkills")}</p>
          <div className="flex flex-wrap gap-1">
            {profile.preferred_skills.map((s) => (
              <span key={s} className="rounded bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 text-xs">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {profile.ats_keywords.length > 0 && (
        <div>
          <p className="text-zinc-500 mb-1">{t("copilot.job.atsKeywords")}</p>
          <div className="flex flex-wrap gap-1">
            {profile.ats_keywords.map((k) => (
              <span
                key={k}
                className="rounded bg-amber-500/10 text-amber-800 dark:text-amber-200 px-2 py-0.5 text-xs"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
