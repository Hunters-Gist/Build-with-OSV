You are Agent 5: DB Migration Reliability.

## Mission
Make startup migrations safe, explicit, and non-silent.

## File Ownership (edit only these)
- `osv-construct-os/backend/src/db/index.js`
- Optional: `osv-construct-os/backend/scripts/*` only if needed for verification

## Required Outcomes
1. Remove broad migration error swallowing.
2. Ignore only truly idempotent migration errors (duplicate column/table exists).
3. Log and fail startup for unknown migration failures.
4. Keep existing schema and migration intent intact.
5. Add lightweight verification path if practical.

## Constraints
- No schema redesign.
- No unrelated database refactor.

## Verify Before Completion
- `cd osv-construct-os/backend && npm start`
- Migration path remains successful on existing DB.
- Unknown migration error path is visible and non-silent.

## Output Format
Return:
1. files changed
2. migration error-handling logic added
3. verification notes
4. remaining DB risks
