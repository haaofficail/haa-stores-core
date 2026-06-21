---
name: agent-permission-boundary
description: Use this skill whenever a tool call would commit, push, merge, deploy, install dependencies, edit secrets/CI/foundational files, or delete tracked content. Enforces the forbidden-action list.
disable-model-invocation: true
---

# Agent Permission Boundary

## Purpose

Stop the agent from performing irreversible or high-blast-radius actions without explicit, recent, scope-matched owner approval.

## Read First

- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md` (the canonical list).
- `docs/agent-os/OWNER_DECISIONS.md` (binding rulings; OS-005 untouchable `.claude/skills/`, OS-006 worktree lock, etc.).
- `CLAUDE.md` (forbidden infra, never print secrets).

## Rules

Forbidden without explicit, in-writing, recent, scope-matched owner approval:

1. `git commit`, `git push`, `git merge`, deploy workflows.
2. `git rebase -i`, `git reset --hard`, `git filter-repo`, BFG, any history rewrite.
3. `git push --force[-with-lease]`, especially to `main`.
4. `--no-verify`, `--no-gpg-sign`.
5. Dependency install (`pnpm add`, `pnpm install -D`); edits to `package.json` / `pnpm-lock.yaml`.
6. Edits to `scripts/preflight.mjs`, `AGENTS.md`, `CLAUDE.md` (foundational; DECISION-OS-006).
7. Edits to `.github/workflows/**` (CI).
8. Touch any `.env*`, `.hostinger-mcp.env`, `*.key`, `*.pem`. Never print a secret value.
9. Modify live payment/shipping config; modify production/staging env.
10. Delete tracked files; remove tests.
11. Add `.gitleaksignore`, `nosemgrep`, or any scanner-suppression mechanism.
12. Open / modify `.claude/skills/` in Batches A/B (DECISION-OS-005).
13. Use sibling worktrees for Agent OS execution (DECISION-OS-006).
14. Modify `MASTER_PLAN_2026-06-18.md` (DECISION-OS-004), marketplace audits (DECISION-OS-002), root-level legacy reports (DECISION-OS-001).
15. Create a parallel theme system (DECISION-OS-003).
16. Use Hostinger MCP for Haa Stores tasks (memory: zone not in Hostinger MCP).
17. Touch any forbidden server/domain (`CLAUDE.md`).

## Steps

1. Check the proposed action against the list above.
2. If forbidden and not approved in the latest owner message → refuse, cite the rule, offer the minimal safe alternative.
3. If approved → restate the exact action (paths, branch, environment, SHA) before executing.
4. After execution → report outcome with evidence (URL, SHA, run id).
5. Do not generalise the approval; the next similar action needs fresh approval.

## Output

```
Action: <verb + target>
Forbidden by: <rule # or "none">
Owner approval (verbatim): "<paste>"
Execution: <pending | done — evidence: <url/sha/run-id>>
```
