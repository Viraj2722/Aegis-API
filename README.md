# Aegis API

Aegis API is a full-stack API security analytics platform:

- Frontend: Next.js App Router UI for onboarding, auth, dashboard, admin, and agent setup.
- Backend: FastAPI service for ingestion, anomaly/risk analysis, graph generation, alerts, and LLM mitigations.
- Data: Supabase for user, profile, analysis, alerts, agents, and admin aggregations.

The platform focuses on detecting risky, shadow, and zombie API behavior from runtime logs and turning results into actionable mitigation guidance.

## Core Capabilities

- Ingest raw API log JSON and normalize schema variations.
- Detect risky endpoints (critical/high), zombie APIs, spikes, and shadow behavior.
- Visualize attack paths and endpoint relationships.
- Generate endpoint-specific mitigations via Groq LLM.
- Support downloadable/scheduled agent workflows (`logs.exe` + `config.json`).
- Support shared dashboard access using `agent_key` / `secret_key`.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- FastAPI + Uvicorn
- Pandas + scikit-learn + NumPy
- Supabase (Auth + DB)
- Tailwind CSS + Framer Motion
- Axios
- PyInstaller (scheduled agent build)

## Repository Layout

- `src/app`: Route-level pages (landing, auth, dashboard, agents, admin)
- `src/components`: UI components by domain (landing, dashboard, admin, auth)
- `src/context`: React auth/session context
- `src/utils`: API client, upload helpers, Supabase client
- `backend`: FastAPI application and data/risk pipeline
- `public`: Static assets served by Next.js (must include `public/logs.exe` for regular agent ZIP packaging)
- `schema.sql`, `supabase/schema.sql`: DB/schema references

## Requirements

- Node.js 18+
- npm 9+
- Python 3.10+ (Windows and Linux supported; Windows paths are used in scripts)
- Virtual environment at `backend/.venv`

## Environment Variables

Create `.env` in repository root (and optionally `backend/.env` for backend-local overrides).

Required for frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required for backend:

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL` fallback)
- `SUPABASE_SERVICE_ROLE_KEY` (or `SERVICE_ROLE_KEY`, or `NEXT_PUBLIC_SERVICE_ROLE_KEY` fallback)
- `GROQ_API_KEY` (required for mitigation generation)

Optional:

- `GROQ_MODEL` (default: `llama-3.1-8b-instant`)
- `AGENT_PUBLIC_BASE_URL` (used when generating scheduled agent config/ingest URL)
- `AGENT_DASHBOARD_BASE_URL` (used in dashboard URL normalization)
- `NEXT_PUBLIC_BACKEND_API_URL` (frontend direct backend call base, useful to bypass dev proxy for large scheduled ZIP downloads)

## Install

Frontend:

```bash
npm install
```

Backend (Windows PowerShell):

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Backend (macOS/Linux):

```bash
cd backend
python3 -m venv .venv
./.venv/bin/python -m pip install -r requirements.txt
```

## Run Locally

From repo root:

```bash
npm run dev
```

This starts:

- Next.js at `http://localhost:3000`
- FastAPI at `http://127.0.0.1:8000`

Useful scripts:

- `npm run dev`: run frontend + backend concurrently
- `npm run dev:api`: run backend without reload
- `npm run dev:api:reload`: run backend with reload
- `npm run dev:reset`: kill stale node process, clear `.next`, restart
- `npm run build`: production build

## Frontend-Backend Routing

`next.config.mjs` rewrites `/api/:path*` to backend `http://127.0.0.1:8000/api/:path*`.

Note: scheduled agent generation can produce large binary responses. In development, proxying these through Next may cause socket reset in some environments. The app supports direct backend calls via `NEXT_PUBLIC_BACKEND_API_URL` for that route.

## Authentication and Access Modes

- Standard mode: Supabase auth (Bearer token)
- Demo mode: local demo session
- Agent guest mode: shared dashboard access based on `agent_key`/`secret_key`

Shared links use key-based access for read endpoints and allow guest-mode dashboard usage without interactive login.

## Agent Workflows

There are two agent distribution paths:

1. Regular Agent ZIP (frontend packaging)

- Packages `logs.exe` + `config.json` in browser.
- Expects `logs.exe` to be available at `public/logs.exe`.
- If missing, UI reports explicit error.

2. Scheduled Agent ZIP (backend generation)

- `POST /api/agents/scheduled/generate`
- Backend generates `logs.py`, compiles to `logs.exe` via PyInstaller, then returns `scheduled-agent.zip`.
- Requires `pyinstaller` installed in backend venv.

## Supported Log Schema

Log ingestion is schema-tolerant. Canonical fields are inferred from aliases:

- endpoint: `api`, `path`, `endpoint`, `url`, `uri`, `route`, `resource`
- method: `method`, `http_method`, `verb`
- status: `response_code`, `status_code`, `status`, `code`, `http_status`
- latency: `response_time`, `latency`, `duration`, `time_ms`, `response_ms`
- payload: `payload_size`, `bytes`, `size`, `length`, `content_length`
- time: `timestamp`, `time`, `date`, `created_at`, `event_time`

Minimum requirement: an endpoint-like field must be present.

## API Endpoints

Primary:

- `POST /api/upload`
- `POST /api/agent/ingest`
- `POST /api/agents/ingest`
- `POST /api/agents`
- `GET /api/agents`
- `POST /api/agents/scheduled/generate`
- `GET /api/analysis`
- `GET /api/graph`
- `GET /api/alerts`
- `GET /api/profile`
- `POST /api/mitigations/generate`
- `POST /api/reset-data`
- `GET /api/health`

Admin:

- `GET /api/admin/stats`
- `GET /api/admin/risk-distribution`
- `GET /api/admin/api-categories`
- `GET /api/admin/system-health`
- `GET /api/admin/heatmap`
- `GET /api/admin/user-distribution`

## LLM Mitigations

Mitigation generation is LLM-only and uses Groq chat completions. If `GROQ_API_KEY` is missing or Groq fails, mitigation endpoint returns error instead of fallback text.

## Troubleshooting

1. Backend import/version mismatch (`pydantic-core incompatible`)

- Cause: global Python/uvicorn used instead of backend venv.
- Fix: run backend with venv interpreter:

```powershell
E:\Aegis-API\backend\.venv\Scripts\python.exe -m uvicorn main:app --app-dir E:\Aegis-API\backend --host 127.0.0.1 --port 8000
```

2. Scheduled agent generation returns 500

- Cause: `pyinstaller` missing.
- Fix: install backend dependencies from `backend/requirements.txt` (includes `pyinstaller==6.11.1`).

3. Scheduled generate returns 200 in backend but frontend sees `ECONNRESET` / socket hang up

- Cause: dev proxy reset on long/binary response.
- Fix: set `NEXT_PUBLIC_BACKEND_API_URL` and call backend directly for scheduled ZIP route.

4. Regular Agent ZIP downloads but missing `logs.exe`

- Cause: `public/logs.exe` not present.
- Fix: place executable at `public/logs.exe`.

5. Agent redirect opens dashboard but API calls return 401

- Ensure shared URL includes `agent_key` or `secret_key`.
- Ensure backend read endpoints are reached with key params.

## Deployment Notes

Backend can be deployed on Railway or similar platforms using Uvicorn.

Suggested start command:

```bash
python -m uvicorn main:app --host 0.0.0.0 --port $PORT
```

Important:

- Railway/Linux can host Python backend but does not run Windows-native `.exe` binaries.
- `logs.exe` should be generated/distributed appropriately for target OS.

## Security Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` private; never expose to browser.
- Use HTTPS and trusted origins in production.
- Rotate `secret_key` values when compromised.
- Restrict CORS before production hardening.

## License and Ownership

Internal project README for Aegis API repository. Add your preferred license file if this project will be distributed publicly.
