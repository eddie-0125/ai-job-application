import { GoogleSignInButton, SiteHeader } from "@/components/site-header";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <SiteHeader />
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20">
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 space-y-6">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-semibold">Welcome</h2>
            <p className="text-sm text-zinc-400">
              Sign in with your Google account to save applications and view your history.
            </p>
          </div>
          <GoogleSignInButton label="Sign in with Google" />
          <p className="text-center text-xs text-zinc-500">
            We only use your Google profile to identify your account. No posts or emails are sent.
          </p>
        </div>
      </div>
    </main>
  );
}
