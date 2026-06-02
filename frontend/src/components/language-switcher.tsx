"use client";

import { useTranslation } from "react-i18next";
import { type Locale, supportedLocales } from "@/i18n/config";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = (supportedLocales.includes(i18n.language as Locale)
    ? i18n.language
    : "en") as Locale;

  return (
    <div
      className="flex items-center rounded-lg border border-zinc-300 p-0.5 text-xs dark:border-zinc-700"
      role="group"
      aria-label={t("language.switch")}
    >
      {supportedLocales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => void i18n.changeLanguage(locale)}
          className={`rounded-md px-2.5 py-1 font-medium transition ${
            current === locale
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-white"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          }`}
          aria-pressed={current === locale}
        >
          {t(`language.${locale}`)}
        </button>
      ))}
    </div>
  );
}
