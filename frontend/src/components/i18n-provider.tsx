"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n/config";

function DocumentLocaleSync() {
  useEffect(() => {
    const sync = (lng: string) => {
      document.documentElement.lang = lng === "zh" ? "zh-CN" : "en";
      document.title = i18n.t("meta.title");
    };
    sync(i18n.language);
    i18n.on("languageChanged", sync);
    return () => {
      i18n.off("languageChanged", sync);
    };
  }, []);

  return null;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return (
    <I18nextProvider i18n={i18n}>
      <DocumentLocaleSync />
      {children}
    </I18nextProvider>
  );
}
