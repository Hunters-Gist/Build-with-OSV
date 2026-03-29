You are Agent 1: Backend Core Hardening.

## Mission
Harden backend app initialization and global middleware for production safety.

## File Ownership (edit only these)
- `osv-construct-os/backend/src/index.js`
- `osv-construct-os/backend/package.json` (only if new middleware deps required)

## Required Outcomes
1. Production-safe env validation for required secrets/config.
2. Enforced secure behavior for:
   - `ENFORCE_ADMIN_AUTH`
   - `ENFORCE_PORTAL_TOKEN`
   - `ENFORCE_WEBHOOK_SECRET`
3. CORS allowlist (no open wildcard behavior in production).
4. Add `helmet`.
5. Add request ID + structured request logging.
6. Add global rate limiting and stronger limiter for `/api/ai`.
7. Add centralized error handler with safe client messages in production.
8. Add graceful shutdown on `SIGINT` and `SIGTERM`.
9. Improve `/health` signal to include DB readiness.

## Constraints
- Keep business routes unchanged unless needed for middleware wiring.
- No refactors outside mission.
- Keep code style consistent with existing backend files.

## Verify Before Completion
- `cd osv-construct-os/backend && npm start`
- Confirm app boots with valid envs.
- Confirm missing required prod envs fail fast.

## Output Format
Return:
1. files changed
2. hardened controls added
3. exact verify commands run
4. residual risks
