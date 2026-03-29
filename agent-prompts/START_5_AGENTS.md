# Start 5 Agents Fast (Recommended Now, macOS)

From repo root:

```bash
cd /Users/gerardgrenville/Documents/OSV-SaaS-main
git checkout -b hardening-24h
```

## Open this runbook first

- `AGENT_SWARM_24H_RUNBOOK.md`

## Agent tabs to open

Open 5 agent chats/tabs and paste one prompt into each.

Agent 1:
```bash
pbcopy < agent-prompts/01-backend-core-hardening.md
```

Agent 2:
```bash
pbcopy < agent-prompts/02-webhook-security.md
```

Agent 3:
```bash
pbcopy < agent-prompts/03-portal-lockdown.md
```

Agent 4:
```bash
pbcopy < agent-prompts/04-frontend-auth-guard.md
```

Agent 5 (single lane, two sequential prompts in same chat):
```bash
pbcopy < agent-prompts/05-db-migration-reliability.md
```
After Agent 5 completes DB work, send:
```bash
pbcopy < agent-prompts/06-ci-deploy-docs.md
```

Integrator final pass:
```bash
pbcopy < agent-prompts/99-integrator-final-pass.md
```

## Merge target

Use `hardening-24h` as integration branch.

If agents work in isolated branches/worktrees, merge everything into `hardening-24h` and run the integrator pass.
