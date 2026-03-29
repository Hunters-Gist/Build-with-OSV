You are Agent 6: CI, Deploy Spec, and Documentation Alignment.

## Mission
Create a minimum quality gate and align deployment/docs with real runtime requirements.

## File Ownership (edit only these)
- `render.yaml`
- `.github/workflows/hardening-checks.yml` (create/update)
- `osv-construct-os/backend/README.md`
- `osv-construct-os/frontend/README.md`

## Required Outcomes
1. `render.yaml` matches active backend env requirements.
2. Add CI workflow with at least:
   - frontend lint/build
   - backend install + startup/smoke check
3. README updates include:
   - required env vars
   - hardening flags
   - quick verify commands
4. Keep docs concise and operational.

## Constraints
- No code edits outside ownership files.
- Do not add speculative architecture docs.

## Verify Before Completion
- Validate workflow syntax and command paths.
- Run local equivalents:
  - `cd osv-construct-os/frontend && npm run lint && npm run build`
  - `cd osv-construct-os/backend && npm start`

## Output Format
Return:
1. files changed
2. CI checks added
3. deploy/env doc alignment made
4. any unresolved assumptions
