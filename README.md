# AI Job Application Copilot

Production-oriented AI agent platform that analyzes job descriptions, tailors resumes, generates application materials, scores job fit, and supports semi-automated browser-based applications.

## Architecture

```txt
Frontend (Next.js) → API Gateway (FastAPI) → AI Orchestrator → Agents
                                                      ↓
                                            LLM Providers + Postgres/pgvector
```

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for Postgres + Redis)

### 1. Infrastructure

```bash
docker compose up -d
cp .env.example .env
# Add OPENAI_API_KEY and Google OAuth credentials to .env
```

### Google OAuth setup

1. Open [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URI: `http://localhost:8000/api/auth/google/callback`
4. Copy Client ID and Secret into `.env`:

```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
SECRET_KEY=use-a-long-random-string
```

Users sign in via **Sign in with Google** → applications and resumes are scoped to their account.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). API docs: [http://localhost:8000/docs](http://localhost:8000/docs).

## Project Structure

```txt
frontend/          Next.js UI
backend/
  app/             FastAPI application
  agents/          Job, Resume, Cover Letter, Scoring agents
  workflows/       LangGraph orchestration
  prompts/         Prompt templates
  rag/             Vector retrieval (Phase 2)
  automation/      Playwright (Phase 3)
  evaluation/      AI quality checks (Phase 4)
shared/            Cross-cutting types
docs/              Design docs
infrastructure/    Docker, CI/CD
```

## Development Phases

| Phase | Features |
|-------|----------|
| **1 (MVP)** | Resume file upload (PDF/DOC/DOCX), JD analysis, tailoring, cover letters |
| **2** | RAG memory, dashboard, scoring engine |
| **3** | Browser automation, LangGraph workflows |
| **4** | Evaluation system, production deployment |

## Safety

- Human approval required before submission
- No fabricated experience — evaluation agent validates changes
- Audit logs for all AI generations

## License

MIT
