---
name: product-canonical-state
description: Use this skill when a task depends on "what is true about the product right now" — feature status, launch readiness, provider choice, branch state. Prevents reliance on stale reports.
disable-model-invocation: true
---

# Product Canonical State

## Purpose

Tell the next decision what is currently true (not what was once true). The canonical answer derives from a fixed priority order, not from whichever report was read first.

## Read First

- `docs/agent-os/PROJECT_MEMORY.md` (durable identity/infra/provider facts).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md` (evidence base).
- `docs/agent-os/OWNER_DECISIONS.md` (binding rulings, especially DECISION-OS-002 marketplace and DECISION-OS-004 master plan).
- `docs/ops/CURRENT_STATE.md` (live ops state; check date freshness).

## Rules

1. Priority order for "what is true now":
   1. `AGENTS.md` + `CLAUDE.md`.
   2. `docs/agent-os/OWNER_DECISIONS.md`.
   3. `docs/agent-os/PROJECT_MEMORY.md`.
   4. Current code (`grep`, `Read`).
   5. Git branch/history + PR metadata (`gh pr view`).
   6. `docs/ops/CURRENT_STATE.md` **after** the next truth-sync.
2. Reports flagged `STALE`, `PARTIALLY_SUPERSEDED`, or `ARCHIVE_CANDIDATE` are **never** the canonical answer.
3. If two canonical sources disagree, stop and raise the conflict for owner ruling.
4. Cite the source for every fact stated in a report.

## Steps

1. Restate the question being answered.
2. Walk the priority order; record the first source that answers.
3. If multiple sources answer, ensure they agree; if not, stop.
4. Reply with the answer + Evidence (file:line, command, or message ref).
5. If no canonical source answers, classify it as `PROJECT_MEMORY.md §11 Owner decisions needed` (do not invent).

## Output

```
Question: <one sentence>
Canonical answer: <fact>
Source: <file:line | command | OWNER_DECISIONS-NNN>
Conflicts: <none | list>
If conflict: stop and raise to owner
```
