"use client";

import { useTranslation } from "react-i18next";
import { GoogleSignInButton } from "@/components/site-header";

export function LoginCard() {
  const { t } = useTranslation();

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold">{t("login.welcome")}</h2>
        <p className="text-sm text-zinc-400">{t("login.subtitle")}</p>
      </div>
      <GoogleSignInButton />
      <p className="text-center text-xs text-zinc-500">{t("login.privacy")}</p>
    </div>
  );
}
