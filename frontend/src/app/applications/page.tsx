"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/site-header";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const STATUS_OPTIONS = ["draft", "applied", "interview", "rejected", "offer"] as const;

function statusColor(status: string) {
  switch (status) {
    case "applied":
      return "text-blue-300 bg-blue-500/10";
    case "interview":
      return "text-amber-300 bg-amber-500/10";
    case "offer":
      return "text-emerald-300 bg-emerald-500/10";
    case "rejected":
      return "text-red-300 bg-red-500/10";
    default:
      return "text-zinc-300 bg-zinc-700/50";
  }
}

export default function ApplicationsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuthStore();
  const dateLocale = i18n.language === "zh" ? "zh-CN" : "en-US";

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

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.updateApplicationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100">
        <SiteHeader />
        <p className="py-20 text-center text-zinc-400">{t("common.loading")}</p>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{t("applications.title")}</h2>
            <p className="text-sm text-zinc-400">{t("applications.subtitle")}</p>
          </div>
          <Link
            href="/"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium hover:bg-violet-500"
          >
            {t("applications.newApplication")}
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {(error as Error).message}
          </div>
        )}

        {isFetching && applications.length === 0 ? (
          <p className="text-zinc-400">{t("applications.loading")}</p>
        ) : applications.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center space-y-4">
            <p className="text-zinc-400">{t("applications.empty")}</p>
            <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm">
              {t("applications.startFirst")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{app.job_title}</p>
                  <p className="text-sm text-zinc-400">{app.company}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {app.created_at
                      ? new Date(app.created_at).toLocaleDateString(dateLocale)
                      : "—"}
                    {app.score != null && (
                      <span className="ml-3 text-emerald-400">
                        {t("applications.score", { value: Math.round(app.score) })}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
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
                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs"
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
        )}
      </div>
    </main>
  );
}
