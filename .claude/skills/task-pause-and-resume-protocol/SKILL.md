---
name: task-pause-and-resume-protocol
description: Use this skill when an in-flight task must pause (session timeout, owner interruption, blocker, context budget) or resume after a gap. Classifies the pause state precisely so no work is lost.
disable-model-invocation: true
---

# Task Pause and Resume Protocol

## Purpose

Convert an in-flight task into a state that any future agent can pick up safely. Classify the parking method so the next agent does the right thing.

## Read First

- `docs/agent-os/ACTIVE_WORK.md` (live state to be updated).
- `docs/agent-os/TASK_HANDOFF_TEMPLATE.md` (fields to fill).
- `docs/agent-os/PROVIDER_HANDOFF.md` (cross-agent transition).
- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md` (do not commit just to save state).

## Rules

1. Always classify the pause state with one of the seven labels below.
2. Never commit "to save state" — uncommitted changes are captured in `ACTIVE_WORK.md`.
3. Never push or merge as a pause action.
4. If the working tree is dirty and the next agent will be a different provider, prefer `PARKED_PATCH` or `PARKED_BRANCH` to make the diff portable.
5. Record the **First safe command** for the next agent.

## Steps

1. Decide the state:
   - `PAUSED_CLEAN` — no uncommitted changes; safe to resume on any branch.
   - `PAUSED_DIRTY` — uncommitted changes; capture every changed/untracked path in `ACTIVE_WORK.md`.
   - `BLOCKED` — waiting on owner or external; state the blocker.
   - `PARKED_PATCH` — diff saved as a patch file (`git diff > path/to.patch`, cite the path).
   - `PARKED_BRANCH` — changes committed to a parking branch (owner-approved commit only); cite branch name and SHA.
   - `READY_TO_RESUME` — handoff complete; next agent may proceed immediately.
   - `ABANDON_CANDIDATE` — recommend dropping; explain why.
2. Update `ACTIVE_WORK.md` with state + branch + last commit + changed files + untracked + risks + next safe action.
3. Fill `TASK_HANDOFF_TEMPLATE.md`.
4. Capture `pwd`, `git branch --show-current`, `git status --short`.
5. Stop.

## Output

A short pause report:

```
Pause state: <one of the 7 labels>
Branch: <name>
Last commit: <sha + subject>
Changed files: <list>
Untracked files: <list>
Blocker (if BLOCKED): <one sentence>
Patch path (if PARKED_PATCH): <path>
Parking branch (if PARKED_BRANCH): <name + sha>
Resume prompt: <paste-ready>
First safe command: <single line>
```
