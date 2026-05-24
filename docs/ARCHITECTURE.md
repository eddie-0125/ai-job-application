# Architecture

## High-Level Flow

```mermaid
flowchart TB
    UI[Next.js Frontend]
    API[FastAPI Gateway]
    ORCH[AI Orchestrator]
    JA[Job Agent]
    RA[Resume Agent]
    CA[Cover Letter Agent]
    MS[Match Scoring Agent]
    BA[Browser Agent - Phase 3]
    LLM[OpenAI / Anthropic]
    DB[(Postgres + pgvector)]
    S3[Document Storage]

    UI --> API
    API --> ORCH
    ORCH --> JA & RA & CA & MS & BA
    JA & RA & CA & MS --> LLM
    ORCH --> DB
    API --> S3
```

## Phase 1 MVP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobs/analyze` | Extract structured job profile |
| POST | `/api/resumes/upload` | Upload PDF/text resume |
| POST | `/api/resumes/tailor` | Tailor resume to job |
| POST | `/api/cover-letters/generate` | Generate cover letter |
| POST | `/api/jobs/{id}/match/{resume_id}` | Score fit |
| POST | `/api/applications` | Create tracked application |

## Safety Model

1. All resume edits preserve factual authenticity (prompt-enforced + evaluation agent in Phase 4)
2. Browser submission requires explicit human approval (Phase 3)
3. `ai_generations` table audits prompts and outputs
