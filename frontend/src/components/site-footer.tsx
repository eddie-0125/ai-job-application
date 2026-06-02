"use client";

import { useTranslation } from "react-i18next";

export function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-zinc-500 dark:text-zinc-600">
      {t("footer.tagline")}
    </footer>
  );
}
