You are Agent 3: Portal and Public Quote Surface Lockdown.

## Mission
Secure public quote access/actions and payment-related quote entry points.

## File Ownership (edit only these)
- `osv-construct-os/backend/src/services/quotePortalSecurity.js`
- `osv-construct-os/backend/src/routes/quotes.js`
- `osv-construct-os/backend/src/routes/checkout.js`

## Required Outcomes
1. In production, quote portal token checks cannot be bypassed.
2. Public quote endpoints use strict access verification consistently.
3. Public quote lookup/action routes get rate limiting.
4. Checkout paths preserve integrity checks while returning safe errors.
5. No client-facing internal error detail leakage.

## Constraints
- Keep current quote business logic and response shapes as stable as possible.
- Do not modify unrelated routes/services.

## Verify Before Completion
- `cd osv-construct-os/backend && npm start`
- Invalid/no portal token denied on public actions.
- Valid portal token still permits intended flow.
- Repeated public attempts throttle appropriately.

## Output Format
Return:
1. files changed
2. security gates tightened
3. verification commands + results
4. potential compatibility impacts
