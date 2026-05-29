"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { I18nProvider } from "@/components/i18n-provider";
import { useAuthStore } from "@/store/auth";
import "@/i18n/config";

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <I18nProvider>
      <QueryClientProvider client={client}>
        <AuthBootstrap>{children}</AuthBootstrap>
      </QueryClientProvider>
    </I18nProvider>
  );
}
