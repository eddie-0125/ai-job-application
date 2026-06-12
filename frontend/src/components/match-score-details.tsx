"use client";

import { useTranslation } from "react-i18next";
import type { MatchScoreResponse } from "@shared/types";

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

export function MatchScoreDetails({ match }: { match: MatchScoreResponse }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{match.overall_score}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{match.summary}</p>
      <ScoreBar label={t("copilot.match.technical")} value={match.technical_match} />
      <ScoreBar label={t("copilot.match.domain")} value={match.domain_match} />
      <ScoreBar label={t("copilot.match.ats")} value={match.ats_score} />
      <ScoreBar label={t("copilot.match.experience")} value={match.experience_match} />
      <ScoreBar label={t("copilot.match.resumeQuality")} value={match.resume_quality} />
    </div>
  );
}
