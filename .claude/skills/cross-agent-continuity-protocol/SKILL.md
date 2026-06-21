---
name: cross-agent-continuity-protocol
description: Use this skill when ending a Claude session, starting a session as a new agent (Claude/MiniMax/other), or when work must transfer between providers without losing context, decisions, or state.
disable-model-invocation: true
---

# Cross-Agent Continuity Protocol

## Purpose

Make every agent transition deterministic. Outgoing agent produces a complete handoff; incoming agent has a single startup sequence to follow. No tacit assumptions; no lost decisions.

## Read First

- `docs/agent-os/PROVIDER_HANDOFF.md` (canonical reading order + paste-ready prompts).
- `docs/agent-os/ACTIVE_WORK.md` (the live state).
- `docs/agent-os/TASK_HANDOFF_TEMPLATE.md` (the per-task fields).
- `docs/agent-os/OWNER_DECISIONS.md` (binding rulings, especially DECISION-OS-005 and OS-006).

## Rules

1. The handoff message is **the** source of truth between sessions — not chat memory, not provider-specific state.
2. Every transition updates `ACTIVE_WORK.md` first.
3. No commit "to save state". Uncommitted state is captured in `ACTIVE_WORK.md`; Git tracks the tree.
4. Incoming agent must read the canonical sequence from `PROVIDER_HANDOFF.md §8` before any edit.
5. Provider-specific artefacts (`.claude/skills/`) are not portable verbatim; their concepts reflect into prompts but other providers read `docs/agent-os/` instead.

## Steps

### Outgoing (current agent)

1. Update `docs/agent-os/ACTIVE_WORK.md` (task, branch, last commit, changed files, untracked, completed, incomplete, risks, next safe action).
2. Compose the handoff using `TASK_HANDOFF_TEMPLATE.md` (verbatim brief, parking method, resume prompt, first safe command).
3. Run and capture: `pwd`, `git branch --show-current`, `git status --short`.
4. Confirm captured output matches `ACTIVE_WORK.md`.
5. Stop. Do not commit, push, merge, or deploy unless explicitly approved in the latest owner message.

### Incoming (new agent)

1. `cd /Users/thwany/Desktop/haa-stores-core` (DECISION-OS-006).
2. Run: `git branch --show-current`, `git status --short`.
3. Read in order from `PROVIDER_HANDOFF.md §8` (AGENTS.md → CLAUDE.md → OWNER_DECISIONS.md → OPERATING_MANUAL.md → PROJECT_MEMORY.md → ACTIVE_WORK.md → RISK_AND_PERMISSION_POLICY.md → COMMAND_ROUTING_MATRIX.md).
4. Run the **First safe command** from the prior handoff.
5. Restate (one paragraph): in-progress task, next safe action, any unanswered question.
6. Wait for owner confirmation before any edit.

## Output

- Outgoing: a handoff message in the shape of `TASK_HANDOFF_TEMPLATE.md`, plus the three command outputs.
- Incoming: a one-paragraph restatement of state, ending with a single question or "ready to proceed when you confirm".
