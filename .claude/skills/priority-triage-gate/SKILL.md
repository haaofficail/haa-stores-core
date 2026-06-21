---
name: priority-triage-gate
description: Use this skill when classifying a new issue/finding, comparing competing tasks, or deciding whether to drop everything to fix a bug. Assigns P0/P1/P2/P3/Backlog/OWNER_DECISION.
disable-model-invocation: true
---

# Priority Triage Gate

## Purpose

Stop priority drift. Same vocabulary for every issue. Clear escalation behaviour per level.

## Read First

- `docs/agent-os/ISSUE_REGISTER.md` (existing rows; classification examples).
- `docs/agent-os/QUALITY_GATES.md §15` (priority triage rules).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md` (top risks for reference).

## Rules

Levels:

| Level              | Trigger                                                                                                                                          | Behaviour                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| **P0**             | Blocks launch or active work; data loss; security breach in flight; tenant cross-access; payment integrity break                                 | **Stop other tasks.** Owner notified immediately. Fix or revert before resuming. |
| **P1**             | Must clear before the next major batch / release. Examples: missing RBAC on a sensitive route, partial migration, regression in critical UX path | Clear in current sprint; raise visibility.                                       |
| **P2**             | Next sprint. Examples: stale comment, minor drift, doc duplication.                                                                              | Plan; do not interrupt active work.                                              |
| **P3**             | Backlog. Examples: nice-to-have refactor, optional doc reorg.                                                                                    | Park; revisit during a cleanup pass.                                             |
| **OWNER_DECISION** | Not an engineering call. Examples: provider activation, legal gate, server promotion.                                                            | Record in `PROJECT_MEMORY.md §11`; do not act.                                   |

Additional rules:

1. Default for any tenant-isolation or auth/payment finding = **P0** until proven otherwise by reading code.
2. Do not lower priority to make a sprint look better.
3. Do not raise priority to grab attention without evidence.
4. Disagreement with an existing classification → propose change with evidence; do not unilaterally edit.

## Steps

1. Restate the finding in one sentence with Evidence.
2. Apply the trigger table to pick a level.
3. If `P0`: alert the owner, pause other tasks, file in `ISSUE_REGISTER.md` with the highest visibility.
4. If `P1`/`P2`/`P3`: add or update the `ISSUE_REGISTER.md` row.
5. If `OWNER_DECISION`: add to `PROJECT_MEMORY.md §11 Owner decisions needed`.
6. Cross-link related rows.

## Output

```
Finding: <one sentence>
Evidence: <file:line | command>
Priority: P0 / P1 / P2 / P3 / OWNER_DECISION
Reason: <one sentence>
Action: <immediate | this sprint | next sprint | backlog | owner only>
Recorded at: <ISSUE-NNNN | PROJECT_MEMORY §11>
```
