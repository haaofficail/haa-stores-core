---
name: documentation-handoff-gate
description: Use this skill when closing any task. Produces the Final Report and updates the right docs (TASK_TRACKER, CURRENT_STATE, ACTIVE_WORK, etc.) before the task is considered closed.
disable-model-invocation: true
---

# Documentation Handoff Gate

## Purpose

The closing gate. A task is not closed without a Final Report and the docs trail. Otherwise future agents repeat the work.

## Read First

- `docs/agent-os/TASK_HANDOFF_TEMPLATE.md` (full handoff format).
- `docs/agent-os/PROVIDER_HANDOFF.md` (cross-provider transition).
- `docs/agent-os/ACTIVE_WORK.md` (live state to update).
- `AGENTS.md §8, §10` (Final Report Rule + per-task docs updates).

## Rules

1. Final Report must include: what changed, why, files modified, verification run, residual risks, what was NOT changed, suggested next step.
2. Update at minimum (per `AGENTS.md §10`):
   - `docs/ops/TASK_TRACKER.md` (every task).
   - `docs/ops/CURRENT_STATE.md` (if state changed).
   - `docs/ops/CHANGELOG_INTERNAL.md` (if behavior/structure changed).
   - `docs/ops/ISSUE_KNOWLEDGE_BASE.md` (if root cause found).
   - `docs/ops/REGRESSION_CHECKLIST.md` (if a regression risk exists).
   - `docs/ops/DECISIONS.md` (if an architectural decision was made).
3. Update `docs/agent-os/ACTIVE_WORK.md` for the session boundary.
4. If another agent will continue: full `TASK_HANDOFF_TEMPLATE.md` with `Resume prompt` and `First safe command`.
5. No secrets in any doc; mask PII per `packages/shared` `maskObject`.
6. Evidence-led (see `evidence-led-reporting`).

## Steps

1. Confirm `verification-before-completion` has passed.
2. Compose the Final Report.
3. Update the docs listed in Rule #2 that apply.
4. If continuing across sessions: fill the handoff template and capture `pwd`, `git branch --show-current`, `git status --short`.
5. Send the Final Report; stop.

## Output

```
Final Report — <task>
What changed: <list>
Why: <one sentence>
Files modified: <paths>
Verification run: <from verification-before-completion>
Residual risks: <list with Evidence>
What was NOT changed: <list>
Docs updated: <paths>
Handoff prepared (if cross-session): <path or "none">
Suggested next step: <single line>
```
