"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { JobProfileCard } from "@/components/job-profile-card";
import { MatchScoreDetails } from "@/components/match-score-details";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

function statusColor(status: string) {
  switch (status) {
    case "applied":
      return "text-blue-700 bg-blue-500/10 dark:text-blue-300";
    case "interview":
      return "text-amber-700 bg-amber-500/10 dark:text-amber-300";
    case "offer":
      return "text-emerald-700 bg-emerald-500/10 dark:text-emerald-300";
    case "rejected":
      return "text-red-700 bg-red-500/10 dark:text-red-300";
    default:
      return "text-zinc-700 bg-zinc-200 dark:text-zinc-300 dark:bg-zinc-700/50";
  }
}

export default function ApplicationDetailPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const applicationId = params.id as string;
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const dateLocale = i18n.language === "zh" ? "zh-CN" : "en-US";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  const { data: application, isLoading, error } = useQuery({
    queryKey: ["application", applicationId],
    queryFn: () => api.getApplication(applicationId),
    enabled: isAuthenticated && Boolean(applicationId),
  });

  if (authLoading || (!isAuthenticated && !authLoading)) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <SiteHeader />
        <p className="py-20 text-center text-zinc-600 dark:text-zinc-400">{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-100">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <Link
          href="/applications"
          className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
        >
          ← {t("applications.back")}
        </Link>

        {isLoading ? (
          <p className="text-zinc-600 dark:text-zinc-400">{t("common.loading")}</p>
        ) : error ? (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {(error as Error).message}
          </div>
        ) : application ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h2 className="text-2xl font-semibold">{application.job.title}</h2>
                <p className="text-lg text-zinc-600 dark:text-zinc-400">{application.job.company}</p>
              </div>
              <span
                className={`shrink-0 self-start rounded-full px-3 py-1 text-sm font-medium ${statusColor(application.status)}`}
              >
                {t(`applications.status.${application.status}`, { defaultValue: application.status })}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              {application.created_at && (
                <p>
                  {t("applications.savedOn")}:{" "}
                  {new Date(application.created_at).toLocaleDateString(dateLocale)}
                </p>
              )}
              {application.applied_at && (
                <p>
                  {t("applications.appliedOn")}:{" "}
                  {new Date(application.applied_at).toLocaleDateString(dateLocale)}
                </p>
              )}
              {application.score != null && (
                <p className="text-emerald-600 dark:text-emerald-400">
                  {t("applications.score", { value: Math.round(application.score) })}
                </p>
              )}
            </div>

            {application.job.source_url && (
              <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="mb-2 text-sm font-medium text-zinc-500">{t("applications.postingLink")}</h3>
                <a
                  href={application.job.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
                >
                  {application.job.source_url}
                </a>
              </section>
            )}

            {application.job.profile && (
              <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="mb-4 text-lg font-semibold">{t("applications.analysis")}</h3>
                <JobProfileCard profile={application.job.profile} />
              </section>
            )}

            <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
              <h3 className="mb-4 text-lg font-semibold">{t("applications.jobDescription")}</h3>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {application.job.description}
              </pre>
            </section>

            {application.match_details && (
              <section className="rounded-2xl border border-zinc-200 bg-white/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h3 className="mb-4 text-lg font-semibold">{t("applications.matchBreakdown")}</h3>
                <MatchScoreDetails match={application.match_details} />
              </section>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
