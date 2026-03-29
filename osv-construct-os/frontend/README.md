# OSV Frontend

## Overview

The frontend now supports both quote generation and post-generation back-office improvement workflows.

## Environment variables

Template: copy `.env.example` to `.env.local` for local dev. On **Vercel**, define variables per environment (Preview / Production); never commit real values.

### Required (production builds)

| Variable | Notes |
| -------- | ----- |
| `VITE_API_URL` | Backend origin (no trailing slash), e.g. `https://osv-construct-backend.onrender.com`. The SPA falls back to a default host only for convenience; **set this explicitly in production** so Preview and Production point at the correct API. |

### Optional

| Variable | Notes |
| -------- | ----- |
| `VITE_SHOW_PRICING_DEBUG` | Set to `true` to show the Quote Builder pricing debug panel outside `npm run dev` (default: off in production builds). |

This Vite app does **not** use `ANTHROPIC_*` or `OPENROUTER_*` in the browser; all AI calls go to the backend using `VITE_API_URL`.

## Security / hardening alignment

Configure the **backend** with production hardening (see `osv-construct-os/backend/README.md`). Typical production values:

- `ENFORCE_ADMIN_AUTH=true`
- `ENFORCE_PORTAL_TOKEN=true`
- `ENFORCE_PORTAL_NONCE=true`
- `ENFORCE_WEBHOOK_SECRET=true`
- `ENFORCE_TWILIO_SIGNATURE=true`

When those are enabled, admin flows must send a valid Supabase bearer token; client portal links must include signed portal token query params where the API expects them.

Protected frontend API usage:

- Dashboard, quote admin actions, and quote editor endpoints always send `Authorization: Bearer <token>`.
- On `401/403`, UI redirects to `/quotes/new?reauth=1&next=<current-path>` for re-auth flow.

## Quick Verify

```bash
cd osv-construct-os/frontend
npm run lint
npm run build
```

## Key Routes

- `/quotes/new`
  - AI quote generation flow (`QuoteBuilder`)
  - save draft + issue to client portal
  - quick link to back-office editor after save
- `/quotes/:quoteRef/edit`
  - back-office quote revision workbench (`QuoteEditor`)
  - line-item editing + summary edits
  - mandatory edit reason before revision save
  - revision history timeline (newest first)
- `/client/quote/:quoteId`
  - client-facing portal for review/acceptance/payment (pricing edits remain back-office only)

## Back-Office Revision Workflow

1. Open quote from dashboard (`Edit` link in recent quotes) or from QuoteBuilder post-save action.
2. Update summary and line items.
3. Select required `edit_reason`.
4. Save revision.
5. Revision is persisted and visible in the local revision history panel.

The revision UI talks to:

- `GET /api/admin/quotes/:id`
- `POST /api/admin/quotes/:id/revisions`
- `GET /api/admin/quotes/:id/revisions`
- `GET /api/admin/quotes/:id/revisions/:revisionId/deltas`
- `GET /api/admin/quotes/:id/revisions/deltas.csv`

## Learning-Loop UX Notes

- Revision save confirmation includes revision id and delta count.
- Revision history panel displays:
  - reason and notes
  - editor identity
  - before/after totals
  - net delta
  - captured delta item count
  - expandable line-level change detail via `View Delta Details`
  - one-click `Export CSV` for all revision deltas on that quote

## OSV Quote Builder Debug Flags

- Internal pricing debug panel is shown automatically in local dev (`import.meta.env.DEV`).
- To force-enable it in non-dev environments, set:
  - `VITE_SHOW_PRICING_DEBUG=true`
- The panel appears on material line items in Quote Builder and shows:
  - supplier attempts
  - source/failure reasons
  - a `Copy Debug JSON` action for quick troubleshooting

## Commands

- Start dev server:
  - `npm run dev`
- Lint:
  - `npm run lint`
- Build:
  - `npm run build`
