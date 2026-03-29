# OSV Frontend

## Overview

The frontend now supports both quote generation and post-generation back-office improvement workflows.

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

- `GET /api/quotes/:id`
- `POST /api/quotes/:id/revisions`
- `GET /api/quotes/:id/revisions`
- `GET /api/quotes/:id/revisions/:revisionId/deltas`
- `GET /api/quotes/:id/revisions/deltas.csv`

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
