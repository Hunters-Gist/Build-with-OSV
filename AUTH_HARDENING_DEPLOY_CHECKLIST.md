# Auth Hardening Deploy Checklist

Use this checklist before promoting the auth-guard upgrade to production.

## Backend Safety Gates

- [ ] `ENFORCE_ADMIN_AUTH=true` in production backend environment.
- [ ] `ENFORCE_PORTAL_TOKEN=true` in production backend environment.
- [ ] `ENFORCE_WEBHOOK_SECRET=true` in production backend environment.
- [ ] `QUOTE_PORTAL_SECRET` and `WEBHOOK_SHARED_SECRET` are set and non-empty.
- [ ] `CORS_ALLOWED_ORIGINS` is configured to explicit domains (no wildcard).

## Frontend Config

- [ ] `VITE_API_URL` points to the intended backend environment.
- [ ] Build has no `VITE_SHOW_PRICING_DEBUG=true` override in production.
- [ ] Auth redirect behavior is verified with safe `next` path handling.

## Route/Role Validation

- [ ] Unauthenticated users are redirected away from `/`, `/pipeline`, `/admin`, `/jobs`, `/quotes/:quoteRef/edit`.
- [ ] Authenticated admin roles (`owner_admin`, `ops_staff`, `estimator`) can access protected surfaces.
- [ ] Authenticated non-admin users see explicit "Access Denied" UX for protected surfaces.
- [ ] Expired token during in-app API activity triggers a clean re-auth redirect (no loops).

## Protected API Validation

- [ ] Admin endpoints are called through shared `apiClient` with Bearer token attached.
- [ ] `401/403` responses clear local/session tokens and reset cached session state.
- [ ] Back-office actions in quote flow (`save draft`, `issue`, `quote editor revisions`) require auth.
- [ ] Public quote-builder AI flow remains functional without requiring auth.

## Logout and Session Management

- [ ] Dashboard "Sign Out" clears known token storage keys and session cache.
- [ ] After sign-out, protected routes are no longer accessible.

## QA + Verification

- [ ] Run: `cd osv-construct-os/frontend && npm run lint && npm run build`.
- [ ] Manual smoke test on staging with:
  - [ ] fresh login path
  - [ ] forced token expiry path
  - [ ] non-admin account path
  - [ ] logout path
- [ ] Dev-only harness check (browser console): `window.OSVAuthHarness.run()`.

## Post-Deploy Monitoring

- [ ] Monitor 401/403 error rates for first 24 hours.
- [ ] Monitor user reports for redirect loops or blocked legitimate access.
- [ ] Rollback plan prepared (previous frontend build + backend env toggle strategy).
