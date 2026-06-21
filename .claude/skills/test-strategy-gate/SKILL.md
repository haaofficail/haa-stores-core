---
name: test-strategy-gate
description: Use this skill when picking the right tests for the task type. Refuses invented commands; uses only project-defined scripts in package.json.
disable-model-invocation: true
---

# Test Strategy Gate

## Purpose

Select the smallest set of tests that gives confidence for the task type. No invented commands.

## Read First

- `docs/agent-os/TEST_STRATEGY.md` (per-type strategy + the confirmed `package.json` script list).
- `docs/agent-os/COMMAND_ROUTING_MATRIX.md` (verification level per task type).
- `package.json` (authoritative list of scripts).

## Rules

1. Use **only** project-defined scripts. If unsure, use exactly the wording: "Use the project's existing typecheck/test commands from package.json."
2. Run the wider suite when the touched surface is sensitive (auth, payment, shipping, tenant isolation, themes, checkout).
3. Never disable a failing test.
4. Pre-commit hook uses `--max-warnings 0` (stricter than CI). Lint clean before staging.
5. DB changes: fresh-DB replay (`pnpm db:reset && pnpm db:migrate`) before claiming done.
6. E2E or browser checks where the matrix demands; do not over-test small text edits.

## Steps

1. Classify the change by task type (see `COMMAND_ROUTING_MATRIX.md`).
2. Pull the test plan from `TEST_STRATEGY.md §2.<type>`.
3. Run unit/typecheck/lint first; then integration; then e2e if required.
4. Capture exact command + outcome (pass/fail, counts, duration).
5. If a failure appears: triage via `regression-safety-gate` and `anti-runaway-loop`.

## Output

```
Test plan for: <task type>
Commands chosen:
- <script name> — <reason>
- <script name> — <reason>
Outcomes:
- <command> → <result, counts, duration>
Wider-suite needed: <yes/no — why>
```
