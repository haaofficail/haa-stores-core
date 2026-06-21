---
name: anti-runaway-loop
description: Use this skill whenever the same command/edit fails. After 3 failed attempts on the same step the agent must stop, switch to read-only diagnosis, and request a decision.
disable-model-invocation: true
---

# Anti-Runaway Loop

## Purpose

Loops cost tokens and confidence. The 3-strike rule converts a hopeless retry into a structured diagnosis.

## Read First

- `docs/agent-os/OPERATING_MANUAL.md §6, §7` (handling unfinished work; ending a task).
- `docs/agent-os/QUALITY_GATES.md §12` (anti-runaway).
- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md` (no `--no-verify` to bypass).

## Rules

1. After **3** failed attempts on the same step (same command, same edit objective), **stop**.
2. Do not retry the same command with the same inputs more than twice.
3. Do not "fix" the failure by disabling tests, bypassing hooks, or removing the check.
4. Switch to read-only diagnosis: re-state the goal, read the failure, locate the root cause.
5. If still blocked, escalate to the owner with the minimal reproducible case.
6. Variations of the same command count as the same attempt (e.g. re-running `pnpm test` three times in a row).

## Steps

1. On every failure: log attempt # + the exact command + the exact error.
2. After attempt 3:
   1. Restate the goal in one sentence.
   2. Restate the latest failure verbatim.
   3. Stop tool calls; switch to read-only `grep`/`Read`/log inspection.
   4. Form a hypothesis; either verify with one targeted observation or escalate.
3. If escalating: produce the minimal reproducible case (paths, command, output).
4. Do not resume retries without a new diagnosis.

## Output

```
Loop counter: <n>
Goal: <one sentence>
Latest failure: <verbatim>
Hypothesis: <one sentence>
Next step: read-only diagnosis at <path/file> / escalation to owner
```
