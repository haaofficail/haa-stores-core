---
name: project-memory-sync
description: Use this skill when a project decision is made, when state changes meaningfully (branch merged, gate closed, provider chosen), or when the audit reveals a memory file has drifted from reality.
disable-model-invocation: true
---

# Project Memory Sync

## Purpose

Keep the durable facts of Haa Stores correct and current in `docs/agent-os/PROJECT_MEMORY.md` and `docs/agent-os/DECISIONS.md`. Prevents stale facts from infecting future decisions.

## Read First

- `docs/agent-os/PROJECT_MEMORY.md` (current memory).
- `docs/agent-os/DECISIONS.md` (current Agent OS decisions).
- `docs/agent-os/OWNER_DECISIONS.md` (binding rulings).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md` (audit evidence).
- `docs/agent-os/ISSUE_REGISTER.md` (open items that may become memory).

## Rules

1. Never record an unverified claim as a fact. Move uncertain items to `PROJECT_MEMORY.md §11 Owner decisions needed`.
2. Every memory entry carries Evidence (file:line, command output, or owner-message ref).
3. Decisions supersede; do not delete old decisions. Mark them `SUPERSEDED by …` with a date.
4. No secrets in memory files.
5. Do not edit `MASTER_PLAN_2026-06-18.md` (DECISION-OS-004) — refresh is its own task.

## Steps

1. State what changed and the evidence.
2. Decide which file owns it:
   - Identity / providers / infra / launch → `PROJECT_MEMORY.md`.
   - Process / scoping / cross-agent → `docs/agent-os/DECISIONS.md`.
   - Architecture / product behavior → `docs/ops/DECISIONS.md` (with a cross-link).
   - Owner-only ruling → propose for `OWNER_DECISIONS.md` (owner authors it).
3. Locate the relevant section; update or add the entry with Evidence.
4. If the change supersedes a prior entry, mark the prior one `SUPERSEDED on <date> by <id>`.
5. Cross-link `ISSUE_REGISTER.md` rows that are now resolved/changed.
6. Do not commit — leave the diff for owner review.

## Output

```
Memory sync — <date>
- Changed: <one sentence>
- Evidence: <file:line | command | message ref>
- File(s) updated: <paths>
- Supersedes: <id or none>
- Related: <ISSUE-NNNN, OWNER_DECISIONS-NNN>
- Owner action needed: <yes/no — if yes, where logged>
```
