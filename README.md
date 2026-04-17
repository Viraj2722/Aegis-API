# Aegis API

Aegis API is a Next.js-based frontend with a FastAPI backend for analyzing API logs and surfacing risky endpoints, zombie APIs, and traffic anomalies.

## Domain Relevance

AegisAPI directly aligns with Cyber Defence and Digital Trust by focusing on one of the most overlooked attack surfaces in modern applications: APIs.

Modern banking, fintech, and SaaS systems rely heavily on APIs, but many of those APIs become undocumented, outdated, or unused over time. These zombie APIs often stay active and unmonitored, which makes them attractive targets for attackers.

This project strengthens cyber defence by:

- Detecting hidden and vulnerable APIs
- Identifying abnormal behavior using AI
- Highlighting possible attack paths

It also supports digital trust by:

- Providing visibility into API ecosystems
- Supporting secure handling of sensitive data
- Following a privacy-first approach with no raw log exposure

## Stack

- Next.js 15 App Router
- React 19
- FastAPI + Uvicorn
- Tailwind CSS
- Framer Motion
- Axios

## What It Does

- Landing page with an upload-driven Analyze Logs flow
- Login and signup screens with Google OAuth entry points
- Protected dashboard for API analysis results
- API graph, statistics, table view, and detail panel
- Backend analysis and graph endpoints powered by mock or uploaded JSON log data

## Project Structure

- `src/app` - Next.js routes and layout
- `src/components` - shared UI components
- `src/context` - auth context
- `src/utils` - API client and upload helpers
- `backend` - FastAPI application and analysis pipeline
- `api_logs.json` - sample log file for uploads

## Requirements

- Node.js 18+
- Python 3.10+
- A Python virtual environment in `backend/.venv`

## Development

Install dependencies:

```bash
npm install
```

Start the full app:

```bash
npm run dev
```

This runs:

- Next.js on `http://localhost:3000`
- FastAPI on `http://127.0.0.1:8000`

If the dev server gets into a bad state, run:

```bash
npm run dev:reset
```

## Build

```bash
npm run build
```

## How Log Upload Works

The landing page and dashboard both accept a JSON file upload.

Supported input:

- A JSON array of log objects

The upload flow sends the data to the existing backend endpoint:

- `POST /api/upload`

After upload, the dashboard refreshes and re-runs analysis.

## Backend Endpoints

- `GET /api/analysis` - returns analysis metrics and API data
- `GET /api/graph` - returns graph nodes and edges
- `POST /api/upload` - uploads log data for analysis
- `POST /api/reset-demo` - restores demo data

## Notes

- The app uses separate Next.js output directories for dev and build to avoid cache corruption issues.
- The old Vite frontend is no longer part of the runtime.
