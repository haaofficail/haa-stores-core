---
name: verification-before-completion
description: Use this skill when about to write the Final Report on any task. Forces git diff review, git diff --check, the relevant test commands, and git status --short before "done".
disable-model-invocation: true
---

# Verification Before Completion

## Purpose

The last gate before "done". Most "done" failures come from skipping a one-minute verification step. This skill makes them mandatory.

## Read First

- `docs/agent-os/DEFINITION_OF_DONE.md` (per-type bar).
- `docs/agent-os/QUALITY_GATES.md §3` (verification rule).
- `docs/agent-os/TEST_STRATEGY.md` (test commands).
- `test-strategy-gate`, `regression-safety-gate`, `definition-of-done-gate` (sibling gates).

## Rules

1. Always run, in order:
   1. `git diff` review (line-by-line) on every changed file.
   2. `git diff --check` (no whitespace errors).
   3. Test commands appropriate to the task type (`TEST_STRATEGY.md`).
   4. `git status --short` to confirm only expected changes are present.
2. For UI changes: load the affected page in a browser at desktop + mobile RTL.
3. For backend changes: hit the route at least once locally when feasible.
4. For DB changes: fresh-DB replay (`pnpm db:reset && pnpm db:migrate`).
5. For releases: full release-readiness commands per `TEST_STRATEGY.md §2.16`.
6. Never claim done with unreviewed diff, even one-line changes.
7. Never bypass a hook (`--no-verify`) to "make it work".

## Steps

1. List the changed files.
2. Run the four mandatory commands.
3. Run the type-specific tests.
4. Run any wider regression set if `regression-safety-gate` says so.
5. Capture every command's outcome (counts + duration).
6. Verify final `git status --short` matches expectation.
7. Only then proceed to `documentation-handoff-gate`.

## Output

```
Verification — <task>
1) git diff review: ✓ all <n> files reviewed
2) git diff --check: ✓ clean
3) Tests:
   - <command> → <result>
   - <command> → <result>
4) git status --short: <output>
Browser check (if UI): ✓ desktop ✓ mobile RTL
Wider regression set (if sensitive): <yes — outcomes / no — why>
Verdict: VERIFIED / INCOMPLETE
```
