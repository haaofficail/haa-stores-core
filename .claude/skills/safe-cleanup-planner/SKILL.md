---
name: safe-cleanup-planner
description: Use this skill when planning a cleanup batch — root-level reports, theme rationalization, docs reorg, dead-code removal. Plans only; does not execute.
disable-model-invocation: true
---

# Safe Cleanup Planner

## Purpose

Convert a sprawling cleanup ambition into a series of small, reviewable, revertable PRs. Each PR has one verb and one scope.

## Read First

- `docs/agent-os/CLEANUP_ARCHIVE_POLICY.md` (verbs + classifications).
- `docs/agent-os/ISSUE_REGISTER.md` (cleanup candidates).
- `docs/agent-os/OWNER_DECISIONS.md` (binding overlays — what must NOT be cleaned now).
- `cleanup-and-archive-policy` skill (per-artefact decision).

## Rules

1. One verb per PR. Never bundle archive + deprecate + delete.
2. One scope per PR. Themes get their own PR; docs reorg gets its own PR; dead-code removal gets its own PR.
3. PR size ≤ 50 changed files; if larger, split.
4. Branch naming: `docs/archive-cleanup`, `chore/theme-rationalization`, `chore/dead-code-<area>`.
5. Every plan respects DECISION-OS-001 / OS-002 / OS-003 / OS-004 / OS-005 — they tell you what NOT to touch.
6. Plan only; execution is a separate task with owner approval.

## Steps

1. List the candidate artefacts (from `ISSUE_REGISTER.md` + drift-cleanup pass).
2. Group by verb (archive / deprecate / delete / fix).
3. Group by scope (themes / docs / dead-code / tests / etc.).
4. Sequence the PRs (low-risk first).
5. For each PR: title, body (motivation, scope, out-of-scope, risks, test plan), expected file count, expected reviewer time.
6. Identify dependencies (e.g. "deprecate must merge before delete").
7. Stop. Do not execute.

## Output

```
Cleanup plan — <area>
PRs:
1. <branch> — <verb> — <scope> — ~<n> files — depends on: <none|prior>
2. <branch> — ...
...
Total PRs: <n>
Owner approvals needed: <list>
First PR to start with: <branch name>
```
