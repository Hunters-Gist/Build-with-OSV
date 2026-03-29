You are Agent 4: Frontend Auth Guarding.

## Mission
Ensure protected frontend surfaces and API calls require authenticated sessions.

## File Ownership (edit only these)
- `osv-construct-os/frontend/src/App.jsx`
- `osv-construct-os/frontend/src/dashboard/Dashboard.jsx`
- `osv-construct-os/frontend/src/quotes/QuoteBuilder.jsx`
- `osv-construct-os/frontend/src/quotes/QuoteEditor.jsx`

## Required Outcomes
1. Add route-level guard for admin/protected screens.
2. Ensure protected API calls include Bearer token.
3. Handle 401/403 with clear UX (redirect/re-auth pattern).
4. Keep debug UI disabled in production by default.
5. Do not break normal quote-builder user flow.

## Constraints
- Use existing auth pattern if already present; do not invent large new auth architecture.
- Avoid broad UI redesign/refactor.

## Verify Before Completion
- `cd osv-construct-os/frontend && npm run lint && npm run build`
- Unauthenticated user cannot access protected pages.
- Authenticated user can access protected dashboard/actions.

## Output Format
Return:
1. files changed
2. route/API auth protections added
3. lint/build results
4. any assumptions made
