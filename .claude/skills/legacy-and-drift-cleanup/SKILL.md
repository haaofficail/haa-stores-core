---
name: legacy-and-drift-cleanup
description: Use this skill when auditing duplicates, deprecated packages, divergent docs, or any drift from the canonical truth. Catalogues drift without deleting.
disable-model-invocation: true
---

# Legacy and Drift Cleanup

## Purpose

Identify drift (duplicate truths, deprecated packages still in use, stale reports, parallel systems) and route it through the cleanup policy. Never delete unilaterally.

## Read First

- `docs/agent-os/CLEANUP_ARCHIVE_POLICY.md` (the seven verbs and seven classifications).
- `docs/agent-os/OWNER_DECISIONS.md` (binding overlays: OS-001 root reports, OS-002 marketplace audits, OS-003 themes, OS-004 master plan, OS-005 legacy skills).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md` (known drift).

## Rules

1. Read-only by default.
2. Use the classification vocabulary: KEEP / FIX / MERGE / ARCHIVE / DEPRECATE / DELETE_AFTER_VERIFICATION / OWNER_DECISION_NEEDED.
3. **Never delete** without the deletion review in `CLEANUP_ARCHIVE_POLICY.md §4.4`.
4. Respect locked overlays:
   - Root-level reports → ARCHIVE_CANDIDATE, defer cleanup to a dedicated PR (OS-001).
   - Marketplace audits → STALE/PARTIALLY_SUPERSEDED, no in-place fix (OS-002).
   - `@haa/theme-system` → DEPRECATE; no removal in routine work (OS-003).
   - `MASTER_PLAN_2026-06-18.md` → not source of truth; refresh deferred (OS-004).
   - `.claude/skills/` untracked → review only in Batch C (OS-005).
5. Drift is recorded in `ISSUE_REGISTER.md`; the fix (if any) is its own task.

## Steps

1. Pick the surface: docs, theme packages, routes, services, components, configs, audits.
2. Identify duplicates via `grep`, `diff`, `find -name "<basename>"`.
3. For each candidate: classify with one of the seven verbs.
4. If owner approval is needed (archive/deprecate/delete), record the request — do not act.
5. Add or update `ISSUE_REGISTER.md` rows; do not modify the surface itself.

## Output

```
Drift pass — <surface>
Items reviewed: <n>
Findings:
- <path> → <classification> (Evidence: <file:line | diff>) → <action route>
Owner decisions needed (if any): <list, with one-line each>
```
