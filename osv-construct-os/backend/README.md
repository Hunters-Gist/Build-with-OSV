# OSV Backend

## Overview

This backend now includes a full quote-learning loop so manual back-office changes continuously improve future AI quote output.

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

Add these to `backend/.env`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ENFORCE_ADMIN_AUTH=true` (enable auth enforcement on internal route groups)
- `QUOTE_PORTAL_SECRET` (HMAC secret for signing client portal tokens)
- `ENFORCE_PORTAL_TOKEN=true` (require signed token for public accept/decline/payment actions)
- `ENFORCE_PORTAL_NONCE=true` (require one-time nonce for public mutation actions)
- `ENFORCE_WEBHOOK_SECRET=true` (enforce shared-secret check on `/api/webhook/leads`)
- `WEBHOOK_SHARED_SECRET` (shared secret value sent in `x-osv-webhook-secret`)
- `ENFORCE_TWILIO_SIGNATURE=true` (verify Twilio callback signatures)
- `PUBLIC_API_BASE_URL` (public backend base URL for Twilio signature validation)

JWT should be sent as:

- `Authorization: Bearer <supabase_access_token>`

> Note: `ENFORCE_ADMIN_AUTH` defaults to `false` to avoid breaking existing frontend flows during rollout.
> `/api/quotes` remains open until admin and client portal quote endpoints are split.

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
- Webhook/Twilio signature verification failures are written to `security_audit_events`.
- Audit endpoints support filters:
  - `limit`
  - `outcome`
  - `from` (unix ms)
  - `to` (unix ms)
  - plus `action` for portal audit and `source` / `event_type` for security audit.

## Quote Learning Loop

The learning loop is built around four stages:

1. Generate quote (`POST /api/ai/generate-quote`)
2. Save quote (`POST /api/quotes`)
3. Manually revise quote in back-office (`POST /api/quotes/:id/revisions`)
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

`POST /api/quotes/:id/revisions`

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

`GET /api/quotes/:id/revisions?limit=25`

Returns newest-first revision records with `deltas_count`, totals before/after, reason metadata, and timestamps.

### Fetch detailed delta rows for one revision

`GET /api/quotes/:id/revisions/:revisionId/deltas`

Returns per-line-item delta detail for the selected revision, including:

- change type (`updated` / `added` / `removed`)
- qty before/after
- unit price before/after and percent change
- total before/after and percent change
- category + item signature context

### Export revision deltas as CSV (single quote)

`GET /api/quotes/:id/revisions/deltas.csv`

Exports all revision delta rows for the selected quote as CSV.

### Export revision deltas as CSV (date range / reporting)

`GET /api/quotes/revisions/deltas.csv`

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
cd backend
npm run smoke:validation
```

#### Environment Variables

| Variable | Purpose |
| -------- | ------- |
| `API_BASE` | Backend origin (default `http://127.0.0.1:3001`) |
| `ADMIN_BEARER` | Supabase access JWT (`Authorization: Bearer …`) when `ENFORCE_ADMIN_AUTH=true` — without it, admin quote tests may see **401** before Zod runs (the script accepts 400 or 401 for those three cases) |
| `SMOKE_WEBHOOK_SECRET` | Must match `WEBHOOK_SHARED_SECRET` when `ENFORCE_WEBHOOK_SECRET=true`, or the webhook case returns **401** instead of **400** (the script accepts either) |
| `SMOKE_QUOTE_ID` | UUID path segment for PATCH/revisions smoke only (default placeholder) |
| `SMOKE_PORTAL_REF` | Quote ref in portal URL (default dummy; body is invalid so the quote need not exist) |

Scripts live in `scripts/smokeApiValidation.sh` (runner) and `scripts/smokeApiValidation.lib.sh` (shared helpers).

If several checks fail with **404** or unexpected codes, another app may be bound to the default port — point `API_BASE` at the OSV backend (or start it with `npm start` and confirm `GET /health` returns this app’s JSON).

### API positive smoke (curl)

Runs a compact happy-path flow:

1. Create admin quote (draft)
2. Issue quote (gets portal token)
3. Read portal quote with token
4. Accept quote
5. Attempt checkout session create

```bash
cd backend
ADMIN_BEARER='your_supabase_access_jwt' npm run smoke:positive
```

Optional env:

| Variable | Purpose |
| -------- | ------- |
| `API_BASE` | Backend origin (default `http://127.0.0.1:3001`) |
| `ADMIN_BEARER` | Required for admin route flow |
| `SMOKE_CLIENT_NAME` | Quote create payload value |
| `SMOKE_CLIENT_EMAIL` | Quote create payload value |

Notes:

- `smoke:positive` intentionally allows `POST /api/checkout/create-session` to return **200** (Stripe configured) or **500** (Stripe not configured in local env) while still confirming payload/route path behavior.
- The script does create local quote rows when it runs successfully.

### Cleanup smoke-created quotes

Dry-run (default, no deletes):

```bash
cd backend
npm run cleanup:smoke
```

Execute deletion (explicit):

```bash
cd backend
npm run cleanup:smoke -- --yes
```

Optional filters:

```bash
npm run cleanup:smoke -- --email=smoke@example.com --name="Smoke Client" --summary-contains="Smoke positive quote" --yes
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
