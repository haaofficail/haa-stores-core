---
name: haa-command-orchestrator
description: Use this skill when receiving any user command on Haa Stores. Converts a short command into a Smart Execution Path — picks the gates that fire, the scope, the non-goals, the risk level, the verification depth, and whether external research is needed.
disable-model-invocation: false
---

# Haa Command Orchestrator

## Purpose

The single entry point for any Haa Stores task. Refuses to act on a vague command. Produces a Smart Execution Path that other skills can enforce. Does not call every skill — picks the minimum needed set.

## Read First

- `AGENTS.md` §2 (Mandatory Start Rule), §3 (Request Expansion), §4 (Work Types).
- `docs/agent-os/OPERATING_MANUAL.md` (the canonical sequence).
- `docs/agent-os/COMMAND_ROUTING_MATRIX.md` (map command → gates).
- `docs/agent-os/RISK_AND_PERMISSION_POLICY.md` (forbidden actions).
- `docs/agent-os/OWNER_DECISIONS.md` (binding rulings).
- `docs/agent-os/ACTIVE_WORK.md` (what is in flight).

## Rules

1. Never execute a one-line user command verbatim. Always expand first.
2. Pick gates from `COMMAND_ROUTING_MATRIX.md`; do not invent gates.
3. Stop and ask the owner if any of these is true: forbidden action requested, two decisions conflict, acceptance criteria unwritable, `launch-critical` risk.
4. Do not bundle two task types (e.g. cleanup + feature) in one execution.
5. Web research only when the row in `COMMAND_ROUTING_MATRIX.md` says so.
6. The plan is the artifact; do not edit files before the plan is stated.

## Steps

1. Capture the user's exact words.
2. Classify the task per `AGENTS.md §4` and find its row in `COMMAND_ROUTING_MATRIX.md`.
3. Write a Smart Execution Brief (see `OPERATING_MANUAL.md §3`):
   - Original request (verbatim)
   - What the user wants (interpretation)
   - Task type + risk level
   - Scope / Out-of-scope
   - Affected files
   - Acceptance criteria (2–3, testable)
   - Required gates (list, from the matrix row)
   - Optional gates (list)
   - Web research? (yes/no)
   - Verification level
   - Stop conditions
4. Activate only the required gates (other skills) — name them in the brief.
5. Confirm the brief with the owner if any item is unclear or risky.
6. Proceed only after confirmation when the row demands it; else proceed and report after each step.

## Output

A Smart Execution Brief as the first text in the response, before any file edit, in this shape:

```
Smart Execution Brief
- Original: "<verbatim>"
- Interpretation: <one sentence>
- Task type / Risk: <type> / <low|medium|high|launch-critical>
- Scope: <bulleted>
- Out-of-scope: <bulleted>
- Affected files: <paths>
- Acceptance criteria: <2-3 testable>
- Gates (required): <skill names>
- Gates (optional): <skill names>
- Web research: <yes/no, why>
- Verification: <local-only|unit|integration|e2e|release>
- Stop if: <conditions>
- Handoff: <none | ACTIVE_WORK update | full handoff>
```
