You are Agent 2: Webhook and Twilio Security.

## Mission
Lock down all webhook ingress points and prevent spoofed callback traffic.

## File Ownership (edit only these)
- `osv-construct-os/backend/src/routes/twilio.js`
- `osv-construct-os/backend/src/routes/webhook.js`

## Required Outcomes
1. Twilio signature verification middleware for Twilio callback routes.
2. Signature verification controlled by `ENFORCE_TWILIO_SIGNATURE=true` in production.
3. Shared-secret verification for webhook routes (`x-osv-webhook-secret`).
4. Consistent 403 responses for invalid signatures/secrets.
5. Safe error responses (no internal stack/details to clients).
6. Optional route-level rate limit if not already covered globally.

## Constraints
- Do not alter business payload semantics unless required for security.
- Do not edit files outside ownership.

## Verify Before Completion
- Backend starts: `cd osv-construct-os/backend && npm start`
- Invalid or missing webhook secret returns 403.
- Invalid Twilio signature returns 403 when enforcement enabled.

## Output Format
Return:
1. files changed
2. middleware/guards implemented
3. negative tests executed
4. any edge-case notes
