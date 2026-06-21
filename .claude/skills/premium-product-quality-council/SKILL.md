---
name: premium-product-quality-council
description: Use this skill when reviewing any high-risk change (feature, refactor, release prep). Reviews from eight angles — product, architecture, quality, design, UX, operations, maintainability, launch — and refuses superficial sign-off.
disable-model-invocation: true
---

# Premium Product Quality Council

## Purpose

Multi-perspective review for changes that move the needle on the product. Catches blind spots that a single-angle review misses.

## Read First

- `docs/agent-os/QUALITY_GATES.md` (all gates).
- `docs/agent-os/COMMAND_ROUTING_MATRIX.md` (per-type gates).
- `docs/agent-os/ISSUE_REGISTER.md` (existing risks to cross-check).
- `docs/agent-os/CURRENT_SYSTEM_AUDIT.md §10` (top risks).

## Rules

1. Each angle below must produce a verdict: `PASS` / `NEEDS-WORK` / `BLOCKS` / `OWNER_DECISION`.
2. A single `BLOCKS` from any angle blocks the change.
3. `OWNER_DECISION` parks the change until the owner rules.
4. No angle is skipped "because it doesn't apply" without one-line justification.
5. The council does not write code; it judges code.

## Steps

For the change in scope, walk these eight angles in order:

1. **Product** — does this serve a confirmed product goal? Evidence in `PROJECT_MEMORY.md` or owner brief?
2. **Architecture** — respects `AGENTS.md §5` (layer boundaries) and DECISION-OS-003 (no parallel themes)? Extends canonical owners (`SYSTEM_MAP.md`)?
3. **Quality** — typecheck/lint/test clean? Tenant isolation + RBAC verified? Idempotency / error handling adequate?
4. **Design** — `design-ux-excellence-gate` passed?
5. **UX** — Smart Execution Brief acceptance criteria met from the user's POV?
6. **Operations** — observability (logs/metrics/error codes), deploy implications, rollback path?
7. **Maintainability** — no parallel systems, no orphan files, no opaque names, tests for the changed surface?
8. **Launch** — interaction with the 10 owner-action gates (G1–G10)? Any new launch blocker introduced?

## Output

```
Council review — <change>
1. Product:         PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
2. Architecture:    PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
3. Quality:         PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
4. Design:          PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
5. UX:              PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
6. Operations:      PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
7. Maintainability: PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>
8. Launch:          PASS / NEEDS-WORK / BLOCKS / OWNER_DECISION — <one sentence>

Verdict: PASS / NEEDS-WORK / BLOCKED / OWNER_DECISION
Required follow-ups before merge: <list or none>
```
