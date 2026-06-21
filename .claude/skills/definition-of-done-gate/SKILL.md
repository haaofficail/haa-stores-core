---
name: definition-of-done-gate
description: Use this skill when about to claim a task is "done". Refuses the claim until the per-type bar in DEFINITION_OF_DONE.md is fully met.
disable-model-invocation: true
---

# Definition of Done Gate

## Purpose

A task is not done because files changed. It is done when the type-specific bar is met. This skill enforces that bar before the final report.

## Read First

- `docs/agent-os/DEFINITION_OF_DONE.md` (per-type checklists).
- `docs/agent-os/QUALITY_GATES.md` (gate definitions referenced from DoD).
- `docs/agent-os/TEST_STRATEGY.md` (test commands per type).

## Rules

1. Pick exactly one primary type for the task (UI, backend, DB, CI, docs, feature, cleanup, security, release, cross-agent handoff). Multi-type tasks check each.
2. Every checklist item must be ticked or explicitly waived in writing by the owner.
3. Forbidden "done" patterns (see `DEFINITION_OF_DONE.md §"Forbidden done claims"`):
   - no `git diff` review
   - no verification appropriate to the type
   - residual risks undocumented
   - tests disabled or `--no-verify` used
   - out-of-scope edits in the diff
   - handoff docs not updated
   - report uses adjectives without evidence
4. If the bar is unmet, declare the task `INCOMPLETE` with the exact missing items.

## Steps

1. Identify the task type(s).
2. Walk the relevant checklist from `DEFINITION_OF_DONE.md`.
3. For each unchecked item: run it now or document why it is waived (with owner ack).
4. If all checked → proceed to `verification-before-completion` → `documentation-handoff-gate`.
5. If any unchecked and not waived → stop; raise to owner.

## Output

```
DoD check — task type: <type>
[ ] item 1 — <met evidence>
[ ] item 2 — <met evidence>
...
Result: PASSED / INCOMPLETE
If INCOMPLETE: missing items: <list>
```
