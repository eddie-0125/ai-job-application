import { CopilotWorkflow } from "@/components/copilot-workflow";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <SiteHeader />
      <CopilotWorkflow />
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-zinc-600">
        Human-in-the-loop · No fabricated experience · Approval required before submit
      </footer>
    </main>
  );
}
