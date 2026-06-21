---
name: cleanup-and-archive-policy
description: Use this skill when deciding what to do with an old/duplicate/stale artefact — code, doc, or config. Applies the seven verbs and the seven classifications.
disable-model-invocation: true
---

# Cleanup and Archive Policy

## Purpose

Decide between cleanup / archive / deprecate / delete with the right approval path. Avoid the "I cleaned up by deleting" anti-pattern.

## Read First

- `docs/agent-os/CLEANUP_ARCHIVE_POLICY.md` (full policy with workflows).
- `docs/agent-os/OWNER_DECISIONS.md` (binding overlays).
- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md §1 #14, #15` (delete + remove tests forbidden by default).

## Rules

1. Use **one** of the seven classifications: `KEEP / FIX / MERGE / ARCHIVE / DEPRECATE / DELETE_AFTER_VERIFICATION / OWNER_DECISION_NEEDED`.
2. Match the verb to the classification:
   - cleanup → small `FIX`
   - archive → `ARCHIVE`
   - deprecate → `DEPRECATE`
   - delete → `DELETE_AFTER_VERIFICATION` after the verification listed in the issue
3. Owner approval required for archive / deprecate / delete (the latter two with a written approval per task).
4. Binding overlays:
   - Root reports → `ARCHIVE_CANDIDATE`, defer to dedicated PR (OS-001).
   - Marketplace audits → `STALE` / `PARTIALLY_SUPERSEDED`, no in-place edits (OS-002).
   - `@haa/theme-system` → `DEPRECATE`; no removal (OS-003).
   - `MASTER_PLAN_2026-06-18.md` → keep in place; refresh deferred (OS-004).
   - `.claude/skills/` legacy → evaluate only in Batch C (OS-005).
5. Never disable a failing test — that is not cleanup.

## Steps

1. Identify the artefact and its current state.
2. Decide classification using `CLEANUP_ARCHIVE_POLICY.md §2`.
3. Decide verb using `CLEANUP_ARCHIVE_POLICY.md §1`.
4. If owner approval is needed → record the request; do not act.
5. If approval is in hand → execute via the workflow in `CLEANUP_ARCHIVE_POLICY.md §4`.
6. Record the decision in `ISSUE_REGISTER.md` (and `DECISIONS.md` if architectural).

## Output

```
Artefact: <path>
Classification: <one of seven>
Verb: <cleanup | archive | deprecate | delete>
Owner approval needed: <yes/no — quote if yes>
Workflow used: <reference to CLEANUP_ARCHIVE_POLICY §>
Recorded at: <ISSUE-NNNN, DECISIONS-NNN if any>
```
