"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

export function SiteHeader() {
  const { t } = useTranslation();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
        <Link href="/" className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-600 dark:text-violet-400">
            {t("header.brand")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight truncate">
            {t("header.title")}
          </h1>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeSwitcher />
          <LanguageSwitcher />

          {isAuthenticated && (
            <Link
              href="/applications"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500 dark:hover:text-white"
            >
              {t("header.myApplications")}
            </Link>
          )}

          {isLoading ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-500">{t("common.loading")}</span>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-8 w-8 rounded-full border border-zinc-300 dark:border-zinc-700"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-xs font-medium text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-zinc-500 leading-tight">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={() => logout()}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-white"
              >
                {t("header.signOut")}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              {t("header.signInGoogle")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export function GoogleSignInButton() {
  const { t } = useTranslation();

  return (
    <a
      href={api.googleLoginUrl()}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-medium hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {t("header.continueGoogle")}
    </a>
  );
}
