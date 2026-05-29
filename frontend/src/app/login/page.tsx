import { LoginCard } from "@/components/login-card";
import { SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
        <LoginCard />
      </div>
    </main>
  );
}
