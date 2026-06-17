"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ApplicationSummary } from "@shared/types";

const STATUS_OPTIONS = ["draft", "applied", "interview", "rejected", "offer"] as const;
type SortOrder = "newest" | "oldest" | "status";

const STATUS_SORT_ORDER: Record<string, number> = {
  offer: 0,
  interview: 1,
  applied: 2,
  draft: 3,
  rejected: 4,
};

function applicationDate(app: ApplicationSummary): number {
  const date = app.applied_at ?? app.created_at;
  return date ? new Date(date).getTime() : 0;
}

function statusRank(status: string): number {
  return STATUS_SORT_ORDER[status] ?? 99;
}

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

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuthStore();
  const dateLocale = i18n.language === "zh" ? "zh-CN" : "en-US";
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  const { data: applications = [], isFetching, error } = useQuery({
    queryKey: ["applications"],
    queryFn: () => api.listApplications(),
    enabled: isAuthenticated,
  });

  const sortedApplications = useMemo(() => {
    return [...applications].sort((a, b) => {
      if (sortOrder === "status") {
        const statusDiff = statusRank(a.status) - statusRank(b.status);
        if (statusDiff !== 0) return statusDiff;
        return applicationDate(b) - applicationDate(a);
      }
      const diff = applicationDate(b) - applicationDate(a);
      return sortOrder === "newest" ? diff : -diff;
    });
  }, [applications, sortOrder]);

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateApplicationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <SiteHeader />
        <p className="py-20 text-center text-zinc-600 dark:text-zinc-400">{t("common.loading")}</p>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-100">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{t("applications.title")}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("applications.subtitle")}</p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            {t("applications.newApplication")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-200">
            {(error as Error).message}
          </div>
        )}

        {isFetching && applications.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">{t("applications.loading")}</p>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white/80 p-10 text-center space-y-4 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="text-zinc-600 dark:text-zinc-400">{t("applications.empty")}</p>
            <Link href="/" className="text-violet-600 hover:text-violet-500 text-sm dark:text-violet-400 dark:hover:text-violet-300">
              {t("applications.startFirst")}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-end gap-2">
              <label htmlFor="application-sort" className="text-sm text-zinc-600 dark:text-zinc-400">
                {t("applications.sort")}
              </label>
              <select
                id="application-sort"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="newest">{t("applications.sortNewest")}</option>
                <option value="oldest">{t("applications.sortOldest")}</option>
                <option value="status">{t("applications.sortByStatus")}</option>
              </select>
            </div>
            <div className="space-y-3">
            {sortedApplications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-zinc-200 bg-white/80 p-4 flex flex-col sm:flex-row sm:items-center gap-4 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <Link
                  href={`/applications/${app.id}`}
                  className="flex-1 min-w-0 group"
                >
                  <p className="font-medium truncate group-hover:text-violet-600 dark:group-hover:text-violet-400">
                    {app.job_title}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{app.company}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {app.applied_at ? (
                      <>
                        {t("applications.appliedOn")}:{" "}
                        {new Date(app.applied_at).toLocaleDateString(dateLocale)}
                      </>
                    ) : app.created_at ? (
                      <>
                        {t("applications.savedOn")}:{" "}
                        {new Date(app.created_at).toLocaleDateString(dateLocale)}
                      </>
                    ) : (
                      "—"
                    )}
                    {app.score != null && (
                      <span className="ml-3 text-emerald-600 dark:text-emerald-400">
                        {t("applications.score", { value: Math.round(app.score) })}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-violet-600 dark:text-violet-400">
                    {t("applications.viewDetails")} →
                  </p>
                </Link>

                <div
                  className="flex items-center gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${statusColor(app.status)}`}
                  >
                    {t(`applications.status.${app.status}`, { defaultValue: app.status })}
                  </span>
                  <select
                    value={app.status}
                    onChange={(e) =>
                      updateStatus.mutate({ id: app.id, status: e.target.value })
                    }
                    className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {t(`applications.status.${s}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
