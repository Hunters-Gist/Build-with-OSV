# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture Overview

This is a split-stack SaaS application for a Melbourne construction trades business (Build With OSV):

- **`osv-construct-os/backend/`** — Express 5 / Node.js API with ESM modules. Deployed on **Render** (see `render.yaml`).
- **`osv-construct-os/frontend/`** — Vite + React 19 SPA. Deployed on **Vercel** (see `osv-construct-os/frontend/vercel.json`).
- **`twilio-retell-setup/`** — Standalone diagnostic/setup scripts for Twilio & Retell integrations only. Not part of the app runtime.

The frontend and backend are **separately deployed services** — the frontend calls the backend API at runtime via an environment variable (`VITE_API_URL`). They are not co-located on the same host.

## Development Commands

### Backend
```bash
cd osv-construct-os/backend
npm start          # node src/index.js — runs on port 3001 by default
```

### Frontend
```bash
cd osv-construct-os/frontend
npm run dev        # Vite dev server (HMR)
npm run build      # Production build
npm run lint       # ESLint
npm run preview    # Preview production build locally
```

No test suite is configured. The backend `npm test` script exits with an error by design.

## Key Backend Details

**Entry point:** `osv-construct-os/backend/src/index.js`
**Database:** SQLite via `better-sqlite3`. The DB file is `osv-construct.db`. Location is controlled by `DB_DIR` env var (used on Render with a persistent disk at `/var/lib/osv-data`); locally it defaults to the backend root.

**Schema migrations** are applied inline in `src/db/index.js` using try/catch — `ALTER TABLE … ADD COLUMN` errors are silently swallowed if the column already exists. Add new migrations to that array.

**API routes** (all prefixed `/api/`):

| Route | File | Purpose |
|---|---|---|
| `/api/leads` | `routes/leads.js` | CRM pipeline |
| `/api/quotes` | `routes/quotes.js` | Quote CRUD |
| `/api/ai` | `routes/ai.js` | AI quoting engine |
| `/api/jobs` | `routes/jobs.js` | Job management |
| `/api/subcontractors` | `routes/subcontractors.js` | Subcontractor profiles |
| `/api/checkout` | `routes/checkout.js` | Stripe payment bridging |
| `/api/twilio` | `routes/twilio.js` | Twilio voice & recording webhooks |
| `/api/webhook` | `routes/webhook.js` | Inbound webhooks |
| `/api/dashboard` | `routes/dashboard.js` | Aggregated KPI data |
| `/health` | inline | Health check |

**Request size limit is 50 MB** — required for base64 image uploads in the AI quoting flow.

## AI Quoting Engine

The AI route (`src/routes/ai.js`) uses the **Anthropic SDK pointed at OpenRouter** — the `baseURL` is `https://openrouter.ai/api` and the key is `OPENROUTER_API_KEY` (not `ANTHROPIC_API_KEY`). The `render.yaml` lists `ANTHROPIC_API_KEY` as a legacy/unused env var; the active key for AI is `OPENROUTER_API_KEY`.

The quoting flow has three steps called in sequence from the frontend:
1. `POST /api/ai/determine-images` — asks the AI what site photos are needed
2. `POST /api/ai/qualifying-questions` — AI reviews uploaded photos and asks follow-up questions
3. `POST /api/ai/generate-quote` — generates the final itemised quote JSON with financials

Margin logic: Low risk = 20%, Medium = 25%, High = 35%. Minimum absolute profit floor is $500. GST is added at 10% on top of the client quote.

## External Integrations

All service logic is in `backend/src/services/`:
- **Trello** (`services/trello.js`) — job/lead board sync
- **Communications** (`services/communications.js`) — Twilio SMS/voice and Resend email

Before adding new API calls for Twilio, Trello, Resend, or Stripe, check the existing service files to avoid duplication.

## Environment Variables

Primary backend env is `osv-construct-os/backend/.env`. Never duplicate keys. Required vars:

```
OPENROUTER_API_KEY   # Powers all AI features (NOT ANTHROPIC_API_KEY)
TRELLO_API_KEY / TRELLO_TOKEN / TRELLO_SECRET_KEY
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN
RETELL_API_KEY
RESEND_API_KEY
STRIPE_SECRET_KEY
JWT_SECRET
DB_DIR               # Set by Render; omit locally
PORT                 # Defaults to 3001 locally, 10000 on Render
```

Frontend env (`osv-construct-os/frontend/.env.local`):
```
VITE_API_URL         # Backend URL (e.g. https://osv-construct-backend.onrender.com)
```

## Deployment

- **Backend → Render**: `render.yaml` configures the service. SQLite data persists on a 1 GB disk mounted at `/var/lib/osv-data`.
- **Frontend → Vercel**: Auto-deployed from git. `vercel.json` rewrites all routes to `index.html` for SPA routing.

## Repo Hygiene

- One-off test/diagnostic scripts belong in `osv-construct-os/backend/scripts/`, not the repo root.
- The `twilio-retell-setup/` scripts are standalone; they have their own `package.json` and may need their own `.env`.
- The `.docx` and `.pdf` files in the root contain business logic, pricing context, and system architecture — do not delete them.
