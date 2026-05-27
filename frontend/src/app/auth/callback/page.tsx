"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { useAuthStore } from "@/store/auth";

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setToken, fetchUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError("Missing authentication token.");
      return;
    }

    setToken(token);
    fetchUser()
      .then(() => router.replace("/applications"))
      .catch(() => setError("Failed to complete sign in."));
  }, [searchParams, setToken, fetchUser, router]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      {error ? (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      ) : (
        <p className="text-zinc-400">Completing sign in…</p>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <Suspense fallback={<p className="py-20 text-center text-zinc-400">Loading…</p>}>
        <AuthCallbackInner />
      </Suspense>
    </main>
  );
}
