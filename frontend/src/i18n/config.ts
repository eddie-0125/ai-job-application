import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

export const LOCALE_STORAGE_KEY = "ai-job-locale";
export const supportedLocales = ["en", "zh"] as const;
export type Locale = (typeof supportedLocales)[number];

export function normalizeLocale(lng: string): Locale {
  const code = lng.toLowerCase().split("-")[0];
  return code === "zh" ? "zh" : "en";
}

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: [...supportedLocales],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ["localStorage"],
      convertDetectedLanguage: normalizeLocale,
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
