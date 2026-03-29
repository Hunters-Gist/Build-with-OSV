# 24H Hardening Swarm Runbook

This runbook is optimized for parallel "vibe coding" with low merge-conflict risk.

## Recommended Agent Count

### Default (recommended now)

- Run **5 execution agents** in parallel.
- Keep **1 coordinator (you)** to review diffs, run integration checks, and merge.
- Effective total: **6 lanes** (5 doers + 1 integrator).

Why default to 5 right now:

- Frontend has active in-progress edits, so one frontend owner lowers merge conflicts.
- You still keep strong backend parallelism.

### Optional turbo mode

- Run **6 execution agents** only if the tree is quieter.
- In 6-agent mode, split DB and CI/docs into separate lanes.

## Agent Lanes and Ownership (5-Agent Default)

Each agent owns specific files only.

1. **Agent 1 - Backend Core Hardening**
   - `osv-construct-os/backend/src/index.js`
   - `osv-construct-os/backend/package.json` (only if middleware deps needed)

2. **Agent 2 - Webhook/Twilio Security**
   - `osv-construct-os/backend/src/routes/twilio.js`
   - `osv-construct-os/backend/src/routes/webhook.js`

3. **Agent 3 - Portal and Quote Public Surface**
   - `osv-construct-os/backend/src/services/quotePortalSecurity.js`
   - `osv-construct-os/backend/src/routes/quotes.js`
   - `osv-construct-os/backend/src/routes/checkout.js`

4. **Agent 4 - Frontend Auth Guarding**
   - `osv-construct-os/frontend/src/App.jsx`
   - `osv-construct-os/frontend/src/dashboard/Dashboard.jsx`
   - `osv-construct-os/frontend/src/quotes/QuoteBuilder.jsx`
   - `osv-construct-os/frontend/src/quotes/QuoteEditor.jsx`

5. **Agent 5 - DB Reliability + CI/Deploy/Docs**
   - `osv-construct-os/backend/src/db/index.js`
   - `render.yaml`
   - `.github/workflows/hardening-checks.yml` (new)
   - `osv-construct-os/backend/README.md`
   - `osv-construct-os/frontend/README.md`
   - Optional tests/scripts in `osv-construct-os/backend/scripts/` if required

## Agent Lanes and Ownership (6-Agent Optional)

Use this split only if you want maximum parallelism and accept more merge coordination:

1. Agent 1: Backend core
2. Agent 2: Webhook/Twilio
3. Agent 3: Portal/quotes/checkout
4. Agent 4: Frontend auth guarding
5. Agent 5: DB migration reliability
6. Agent 6: CI/deploy/docs

## Kickoff Order (10 minutes)

1. Create a branch:
   - `git checkout -b hardening-24h`
2. Open 5 agent chats/tabs (or 6 for optional turbo mode).
3. Paste the matching init prompt from `agent-prompts/`.
4. Tell each agent: "Work only in your owned files. No scope creep."
5. Let them run in parallel.

## Prompt Files

- `agent-prompts/01-backend-core-hardening.md`
- `agent-prompts/02-webhook-security.md`
- `agent-prompts/03-portal-lockdown.md`
- `agent-prompts/04-frontend-auth-guard.md`
- `agent-prompts/05-db-migration-reliability.md`
- `agent-prompts/06-ci-deploy-docs.md`
- `agent-prompts/99-integrator-final-pass.md` (for your final merge/check pass)

For 5-agent mode, Agent 5 runs both:

1) `05-db-migration-reliability.md`, then
2) `06-ci-deploy-docs.md`

## Coordinator Merge Flow

After agents finish:

1. Pull each agent's diff into your working branch.
2. Resolve conflicts in this order:
   - `index.js` and middleware
   - route files
   - frontend routes/API calls
   - DB migration file
   - CI/docs
3. Run integration checks:
   - Frontend: `npm run lint && npm run build`
   - Backend: `npm start`
4. Smoke test key paths:
   - admin unauthorized -> blocked
   - admin authorized -> allowed
   - unsigned webhook -> blocked
   - invalid portal token -> blocked
   - AI/checkout errors -> no internal leakage
5. Ship one consolidated PR.

## Hard Rules for All Agents

- Do not edit files outside lane ownership.
- Do not remove existing business logic unless it is directly unsafe.
- Keep changes minimal and production-safe.
- Add short comments only where behavior is non-obvious.
- Return:
  1. files changed
  2. what was hardened
  3. verification commands run
  4. any blockers

## Stop Conditions

Pause swarm and re-scope if any of these happen:

- 3+ files conflict across lanes
- auth model ambiguity between frontend and backend
- deployment env uncertainty
- failing build/lint after two fix attempts

If stopped, run only Agent 1 + Agent 2 first, then resume remaining lanes.
