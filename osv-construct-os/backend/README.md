# OSV Backend

## Overview

This backend now includes a full quote-learning loop so manual back-office changes continuously improve future AI quote output.

## Environment variables

Template for local setup: copy `.env.example` to `.env` and fill values (never commit secrets).

### Production: required for successful boot (`NODE_ENV=production`)

These are enforced in `src/index.js` at startup (the process exits if validation fails).

| Variable | Notes |
| -------- | ----- |
| `JWT_SECRET` | Non-empty secret (required by startup validator). |
| `CORS_ALLOWED_ORIGINS` | Comma-separated browser origins; must be non-empty; `*` is rejected. |
| `ENFORCE_ADMIN_AUTH` | Must be `true`. |
| `ENFORCE_PORTAL_TOKEN` | Must be `true`. |
| `ENFORCE_WEBHOOK_SECRET` | Must be `true`. |
| `QUOTE_PORTAL_SECRET` | Required when `ENFORCE_PORTAL_TOKEN=true` (portal HMAC). |
| `WEBHOOK_SHARED_SECRET` | Required when `ENFORCE_WEBHOOK_SECRET=true`; inbound webhooks must send `x-osv-webhook-secret`. |

### Production: required for admin APIs and auth health

When `ENFORCE_ADMIN_AUTH=true`, protected routes and `GET /api/auth/me` use the Supabase service client (`src/services/supabaseAdmin.js`). Without these, auth middleware throws at runtime.

| Variable | Notes |
| -------- | ----- |
| `SUPABASE_URL` | Project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only; never expose to the browser). |

### Hardening flags (recommended production values)

| Variable | Recommended | Purpose |
| -------- | ----------- | ------- |
| `ENFORCE_PORTAL_NONCE` | `true` | One-time nonce for public portal mutations / checkout replay protection. |
| `ENFORCE_TWILIO_SIGNATURE` | `true` | Validate Twilio webhook signatures (`src/routes/twilio.js`). |
| `PUBLIC_API_BASE_URL` | `https://<backend-host>` | Public URL Twilio uses for signature validation (must match configured webhooks). |
| `FRONTEND_URL` | `https://<frontend-host>` | Used for redirects / links (e.g. quotes, Stripe return URLs). |

### Integration secrets (set in Render / `.env` as you use each feature)

| Variable | Used for |
| -------- | -------- |
| `OPENROUTER_API_KEY` | All AI quoting routes and Twilio recording summarisation. **Not** `ANTHROPIC_API_KEY` — that name is unused by this codebase. |
| `STRIPE_SECRET_KEY` | Checkout session and payment confirmation. |
| `RESEND_API_KEY` | Outbound email (communications + some Twilio flows). |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio API and voice webhooks. |
| `TWILIO_PHONE_NUMBER` | SMS/voice “from” number (`src/services/communications.js`). |
| `TWILIO_RECORDING_EMAIL` | Optional override for recording notification recipient (`src/routes/twilio.js`). |
| `TRELLO_API_KEY` / `TRELLO_TOKEN` | Trello card create/move (`src/services/trello.js`, jobs). |
| `TRELLO_LIST_POSTED` / `TRELLO_LIST_ASSIGNED` / `TRELLO_LIST_IN_PROGRESS` / `TRELLO_LIST_COMPLETED` | Target list IDs for job status sync (`src/routes/jobs.js`). |

### Optional feature keys

| Variable | Notes |
| -------- | ----- |
| `TAVILY_API_KEY` | Live supplier pricing; omitted → fallback logic (`src/services/suppliers/tavilyPricing.js`). |
| `GOOGLE_MAPS_API_KEY` | Location resolution for pricing (`src/services/suppliers/locationResolver.js`). |
| `PORTAL_ACCESS_WINDOW_MS` / `PORTAL_ACCESS_LOCKOUT_MS` / `PORTAL_ACCESS_MAX_FAILS` | Portal access rate limits (`src/services/quotePortalSecurity.js`; defaults apply if unset). |

### Deploy / platform

| Variable | Notes |
| -------- | ----- |
| `DB_DIR` | SQLite directory. On Render, use persistent disk path (see `render.yaml`; default locally is backend root). |
| `PORT` | Listen port (Render blueprint sets `10000`). |
| `NODE_ENV` | Set to `production` on Render. |

### Not used by this backend service

- `ANTHROPIC_API_KEY` — not read; use `OPENROUTER_API_KEY`.
- `RETELL_API_KEY` — only for standalone `twilio-retell-setup/` tooling, not `npm start` runtime.

## Quick Verify

```bash
cd osv-construct-os/backend
JWT_SECRET=local-dev-secret npm start
```

Optional API smoke while backend is running:

```bash
cd osv-construct-os/backend
npm run smoke:validation
```

Optional **authenticated-positive** check (proves a valid admin Supabase JWT against `GET /api/auth/me` → **200**). Omit `ADMIN_BEARER` to skip that check and the admin/portal happy path without failing:

```bash
cd osv-construct-os/backend
ADMIN_BEARER='your_supabase_access_jwt' npm run smoke:positive
```

## Admin Authentication (Supabase)

Internal operational routes are now protected by Supabase-backed JWT authentication and role checks.

Protected route groups:

- `/api/leads`
- `/api/ai`
- `/api/subcontractors`
- `/api/jobs`
- `/api/dashboard`

Auth health endpoint:

- `GET /api/auth/me` (requires valid bearer token + admin role)

Required roles for protected routes:

- `owner_admin`
- `ops_staff`
- `estimator`

### Required Environment Variables

Use the tables in [Environment variables](#environment-variables) above. For admin auth, set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the hardening / portal / webhook variables for your environment.

JWT should be sent as:

- `Authorization: Bearer <supabase_access_token>`

> Note: for local development only, you can run with `ENFORCE_ADMIN_AUTH=false`.
> In production, startup validation requires `ENFORCE_ADMIN_AUTH=true`.

### Portal Security Rollout Notes

- Issued quotes now receive a signed portal token (stored hashed in DB).
- New explicit endpoints:
  - Admin quote API: `/api/admin/quotes/*`
  - Admin portal audit API: `/api/admin/portal-audit`
  - Admin security audit API: `/api/admin/security-audit`
  - Admin security summary API: `/api/admin/security-summary`
  - Portal quote API: `/api/portal/quotes/*`
- Public quote actions now use token-verified routes:
  - `POST /api/portal/quotes/:ref/accept`
  - `POST /api/portal/quotes/:ref/decline`
- Checkout endpoints now validate portal access and support nonce-based replay protection:
  - `POST /api/checkout/create-session`
  - `POST /api/checkout/confirm-payment`
- Portal actions are now written to `quote_portal_audit` for operational traceability.
- Legacy `/api/quotes/*` is now read-only (GET only) and mutation routes are blocked.
- Webhook shared-secret and Twilio signature verification failures return **403 Forbidden** (not 401) and are written to `security_audit_events`.
- Audit endpoints support filters:
  - `limit`
  - `outcome`
  - `from` (unix ms)
  - `to` (unix ms)
  - plus `action` for portal audit and `source` / `event_type` for security audit.

## Quote Learning Loop

The learning loop is built around four stages:

1. Generate quote (`POST /api/ai/generate-quote`)
2. Save quote (`POST /api/admin/quotes`)
3. Manually revise quote in back-office (`POST /api/admin/quotes/:id/revisions`)
4. Apply learned calibration in future generations

## Data Model Additions

The following tables were added:

- `quote_revisions`
  - stores full before/after quote snapshots plus edit metadata.
- `quote_adjustment_deltas`
  - stores normalized per-line item changes for analytics and calibration.
- `quote_calibration_profiles`
  - stores aggregated pricing drift patterns by trade/category/item signature.
- `quote_prompt_profiles`
  - stores versioned AI optimization profiles (active profile + rollback support).
- `quote_learning_metrics`
  - stores lightweight operational counters for observability.

The `quotes` table now also stores:

- `calibration_profile_version`
- `prompt_profile_version`

These are populated from `learning_context` returned by quote generation.

## API Endpoints (Learning Loop)

### Save revision

`POST /api/admin/quotes/:id/revisions`

Required fields:

- `generated_json` (object)
- `edit_reason` (enum):
  - `client_request`
  - `scope_change`
  - `supplier_update`
  - `risk_adjustment`
  - `compliance_adjustment`
  - `rounding_correction`
  - `internal_quality_control`
  - `other`

Optional fields:

- `summary`
- `total_cost`
- `margin`
- `profit`
- `final_client_quote`
- `edit_notes`
- `edited_by`
- `edit_source`

### Fetch revision history

`GET /api/admin/quotes/:id/revisions?limit=25`

Returns newest-first revision records with `deltas_count`, totals before/after, reason metadata, and timestamps.

### Fetch detailed delta rows for one revision

`GET /api/admin/quotes/:id/revisions/:revisionId/deltas`

Returns per-line-item delta detail for the selected revision, including:

- change type (`updated` / `added` / `removed`)
- qty before/after
- unit price before/after and percent change
- total before/after and percent change
- category + item signature context

### Export revision deltas as CSV (single quote)

`GET /api/admin/quotes/:id/revisions/deltas.csv`

Exports all revision delta rows for the selected quote as CSV.

### Export revision deltas as CSV (date range / reporting)

`GET /api/admin/quotes/revisions/deltas.csv`

Query params:

- `from` (optional): unix ms or ISO datetime
- `to` (optional): unix ms or ISO datetime
- `quote` (optional): quote id or quote number to filter
- `limit` (optional): max rows (default `5000`, max `20000`)

Defaults to the last 30 days when `from`/`to` are not provided.

## Calibration + Prompt Optimization

### Deterministic calibration

- Quote generation now reads calibration signals and appends bounded guidance into AI prompt context.
- A bounded deterministic line-item adjustment pass is applied after generation:
  - minimum sample threshold (`minSamples`, default `3`)
  - confidence gating
  - maximum absolute adjustment cap (`maxPct`, default `0.12`)

### Active prompt profile

- The AI path checks for an active prompt profile and appends `system_append` instructions when present.
- Prompt profile version is returned in `learning_context`.

## Optimizer Script

Run:

- `npm run optimize:quotes`

Modes:

- `--dry-run`: print generated profile JSON only
- `--activate`: store and activate generated profile
- `--rollback=<version>`: activate an older profile version

The optimizer only runs when enough high-confidence historical deltas exist.

## External Pricing Training (Drop Folder)

You can now train the quote engine with curated pricing files by dropping data into:

- `backend/training-data/inbox/`

Run:

- `npm run import:quote-training`

Supported inputs:

- `.json`
- `.xlsx`

On import:

- rows are stored in `quote_external_pricing_metrics`
- package formulas are stored in `quote_external_pricing_bundles`
- files are moved to `training-data/processed/` on success
- files are moved to `training-data/failed/` on parse/import failure

During quote generation (`POST /api/ai/generate-quote`), imported pricing rows are injected into the system prompt as bounded pricing anchors for the matching trade.

### `xlsx` (SheetJS) — npm audit / supply-chain note

The backend depends on `xlsx` for parsing `.xlsx` in **quote training import** only (`src/services/quotes/quoteTrainingImportService.js`, `npm run import:quote-training`, and admin upload/import routes). Upstream advisories (prototype pollution / ReDoS) have **no patched release** on the community package at this time.

**Operational mitigation (keep dependency):**

- Treat workbooks as **trusted, operator-curated** input. Only staff with admin access should place files in `training-data/inbox/` or call the admin import/upload APIs.
- Do **not** pipe arbitrary internet-uploaded Excel through this path without the same trust boundary you use for other admin-only data.
- Imports are **filesystem-local** with a **20 MB** cap (`MAX_UPLOAD_BYTES` in `quoteTrainingImportService.js`); keep that limit in mind if you extend upload surfaces.

Admin API for UI automation:

- `GET /api/admin/quote-training/status`
- `POST /api/admin/quote-training/upload`
- `POST /api/admin/quote-training/import`

## Metrics (quote_learning_metrics)

The backend increments counters for:

- quote generation requests/errors
- calibration signals seen
- calibration adjustments applied
- revisions captured
- deltas captured
- calibration profiles updated
- per-profile usage counters (`calibration_profile_version_*`, `prompt_profile_version_*`)

## Verification Commands

### API validation smoke (curl)

Runs eight lightweight checks against a **running** backend (invalid payloads where possible so SQLite is not mutated).

```bash
cd osv-construct-os/backend
npm run smoke:validation
```

#### Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `API_BASE` | Backend origin (default `http://127.0.0.1:3001`) |
| `ADMIN_BEARER` | Supabase access JWT (`Authorization: Bearer …`) with an allowed admin role when `ENFORCE_ADMIN_AUTH=true` — without a valid token, tests typically see **401** before Zod runs; a valid token without `owner_admin` / `ops_staff` / `estimator` yields **403**; with auth+role OK, invalid bodies return **400** (the script accepts **400**, **401**, or **403** for those three cases) |
| `SMOKE_WEBHOOK_SECRET` | Must match `WEBHOOK_SHARED_SECRET` when `ENFORCE_WEBHOOK_SECRET=true`, or the webhook case returns **403** instead of **400** (the script accepts **400** or **403**) |
| `SMOKE_QUOTE_ID` | UUID path segment for PATCH/revisions smoke only (default placeholder) |
| `SMOKE_PORTAL_REF` | Quote ref in portal URL (default dummy; body is invalid so the quote need not exist) |

Scripts live in `scripts/smokeApiValidation.sh` (runner) and `scripts/smokeApiValidation.lib.sh` (shared helpers).

If several checks fail with **404** or unexpected codes, another app may be bound to the default port — point `API_BASE` at the OSV backend (or start it with `npm start` and confirm `GET /health` returns this app’s JSON).

### API positive smoke (curl)

Script: `scripts/smokeApiPositive.sh` (`npm run smoke:positive`).

**Authenticated-positive (integrator pass):** when `ADMIN_BEARER` is set, the script first calls `GET /api/auth/me` with `Authorization: Bearer …` and **fails unless the response is 200**. That endpoint is always JWT-protected (unlike some `/api/admin/*` mounts, which skip auth when `ENFORCE_ADMIN_AUTH=false`), so it is the reliable signal that Supabase credentials and role claims are wired correctly.

**Without `ADMIN_BEARER`:** the script prints a clear skip message for the auth-positive step and for the admin/portal flow, then exits **0** (no failure).

**With `ADMIN_BEARER`**, it then runs a compact happy-path flow:

1. Create admin quote (draft)
2. Issue quote (gets portal token)
3. Read portal quote with token
4. Accept quote
5. Attempt checkout session create

```bash
cd osv-construct-os/backend
ADMIN_BEARER='your_supabase_access_jwt' npm run smoke:positive
```

Optional env:

| Variable | Purpose |
| -------- | ------- |
| `API_BASE` | Backend origin (default `http://127.0.0.1:3001`) |
| `ADMIN_BEARER` | Supabase access JWT; when set, required for auth-positive check and admin route flow |
| `SMOKE_CLIENT_NAME` | Quote create payload value |
| `SMOKE_CLIENT_EMAIL` | Quote create payload value |

Notes:

- `smoke:positive` intentionally allows `POST /api/checkout/create-session` to return **200** (Stripe configured) or **500** (Stripe not configured in local env) while still confirming payload/route path behavior.
- The script does create local quote rows when it runs successfully.
- For `GET /api/auth/me` to return **200**, the backend needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, and the JWT must belong to a user with an allowed admin role (`owner_admin`, `ops_staff`, or `estimator`).

### Cleanup smoke-created quotes

Dry-run (default, no deletes):

```bash
cd osv-construct-os/backend
npm run cleanup:smoke
```

Execute deletion (explicit):

```bash
cd osv-construct-os/backend
npm run cleanup:smoke -- --yes
```

Optional filters:

```bash
cd osv-construct-os/backend && npm run cleanup:smoke -- --email=smoke@example.com --name="Smoke Client" --summary-contains="Smoke positive quote" --yes
```

By default it targets `client_email=smoke@example.com`.
It deletes matching rows from:

- `quotes`
- `quote_revisions`
- `quote_adjustment_deltas`
- `quote_portal_audit`
- `quote_portal_nonces`

- Learning tests:
  - `npm run test:learning`
- Frontend lint (for revision UI):
  - `cd ../frontend && npm run lint`

## Live Supplier Pricing Notes

- Required backend env vars for live pricing:
  - `TAVILY_API_KEY`
  - `GOOGLE_MAPS_API_KEY`
- If `TAVILY_API_KEY` is missing or misspelled (example: `TRAVILY_API_KEY`), materials fallback logic is used.
- `POST /api/ai/generate-quote` returns pricing audit details including per-material `supplier_attempts` and failure reasons.
