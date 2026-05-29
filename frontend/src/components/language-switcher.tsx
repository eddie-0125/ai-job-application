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
      className="flex items-center rounded-lg border border-zinc-700 p-0.5 text-xs"
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
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
          aria-pressed={current === locale}
        >
          {t(`language.${locale}`)}
        </button>
      ))}
    </div>
  );
}
