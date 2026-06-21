---
name: environment-safety-gate
description: Use this skill when running any command that could touch local DB, staging, or production. Prevents environment mix-ups and confirms which environment any action targets.
disable-model-invocation: true
---

# Environment Safety Gate

## Purpose

Each command runs against exactly one environment. A merge to `main` is not "just a merge" — it can trigger `deploy.yml`. Confirm the target before acting.

## Read First

- `CLAUDE.md` (approved server `72.61.108.208`, forbidden infra).
- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md §3` (push to `main` may trigger deploy).
- `docs/ops/HAA_STORES_HOSTINGER_TARGET.md` + `.haa/hostinger-target.json` (infra source of truth).

## Rules

1. Canonical local working directory is `/Users/thwany/Desktop/haa-stores-core` (DECISION-OS-006).
2. Approved server is `72.61.108.208`; production status is `not_promoted_yet`.
3. Forbidden server `187.124.41.239` (Nasaq) and forbidden domains (`nasaqpro.tech`, `tarmizos.com`, `haasoft.com`) — never touch.
4. Forbidden SSH key `nasaq_deploy`; forbidden PM2 services `nasaq-*`.
5. `git push origin main` may trigger the deploy workflow — treat as `launch-critical` and require explicit owner approval.
6. Do not run mutating commands against staging without owner approval.
7. Do not use Hostinger MCP for Haa Stores (per memory `haastores-dns-not-in-hostinger`).
8. Staging deploy does not auto-migrate (per memory `staging-deploy-no-auto-migrate`) — apply DB migrations manually with `drizzle-kit` first.

## Steps

1. State the environment target: `local | staging (72.61.108.208) | production (not provisioned)`.
2. Verify against the forbidden list (`CLAUDE.md`).
3. For staging or production: confirm owner approval is in the latest message.
4. For DB changes touching staging: confirm migration applied manually before deploy.
5. Run the action; capture output; report.

## Output

```
Environment: <local | staging | production>
Approved by owner (if non-local): <yes/no — quote>
Forbidden infra check: <passed>
Manual migration required (if DB): <yes/no — done?>
Action authorised: <yes/no>
```
