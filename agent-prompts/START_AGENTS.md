# Start Agents Fast (macOS)

From repo root:

```bash
cd /Users/gerardgrenville/Documents/OSV-SaaS-main
```

## Open this runbook first

- `AGENT_SWARM_24H_RUNBOOK.md`

## Copy a prompt to clipboard per agent tab

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

Agent 5:
```bash
pbcopy < agent-prompts/05-db-migration-reliability.md
```

Agent 6:
```bash
pbcopy < agent-prompts/06-ci-deploy-docs.md
```

Integrator final pass:
```bash
pbcopy < agent-prompts/99-integrator-final-pass.md
```

## Suggested branch setup

```bash
git checkout -b hardening-24h
```

If agents work in isolated branches/worktrees, merge to `hardening-24h` for integration.
