import { CopilotWorkflow } from "@/components/copilot-workflow";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-400">
              AI Job Application Copilot
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Autonomous Career Agent
            </h1>
          </div>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400">
            Phase 1 MVP
          </span>
        </div>
      </header>
      <CopilotWorkflow />
      <footer className="mx-auto max-w-5xl px-4 py-8 text-center text-xs text-zinc-600">
        Human-in-the-loop · No fabricated experience · Approval required before submit
      </footer>
    </main>
  );
}
