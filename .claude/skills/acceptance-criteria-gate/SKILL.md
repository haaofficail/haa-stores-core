---
name: acceptance-criteria-gate
description: Use this skill when starting any non-trivial task. Refuses implementation until 2–3 testable acceptance criteria exist.
disable-model-invocation: true
---

# Acceptance Criteria Gate

## Purpose

Convert a request into a testable target before writing code. If the criteria cannot be written, the brief is not yet a task.

## Read First

- `AGENTS.md §3` (Request Expansion Rule template).
- `docs/agent-os/QUALITY_GATES.md §1` (acceptance criteria).
- `docs/agent-os/DEFINITION_OF_DONE.md` (the bar each criterion clears).

## Rules

1. Criteria are **testable** — a future agent can run a test/observation and answer yes/no.
2. Two to three criteria is the sweet spot. More than five usually means scope is too wide.
3. Negative criteria allowed (and encouraged for security/RBAC): "non-admin users cannot reach /admin/\*".
4. Out-of-scope is part of the brief; declare it explicitly.
5. If the user is vague, ask before guessing — do not invent criteria.

## Steps

1. Restate the user's request verbatim.
2. Identify the success picture in concrete terms.
3. Draft 2–3 acceptance criteria, each in the form "Given … When … Then …".
4. Declare Out-of-scope (at least one bullet).
5. Confirm with the user when the task is `high` or `launch-critical` risk.

## Output

```
Acceptance criteria
1. Given <state>, when <action>, then <observable>.
2. ...
3. ...

Out-of-scope
- <bullet>
- <bullet>
```
