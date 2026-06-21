---
name: implementation-quality-gate
description: Use this skill when finalizing any code change and before claiming done. Checks architecture, types, validation, errors, RBAC, tenant isolation, tests, UI states, mobile, RTL.
disable-model-invocation: true
---

# Implementation Quality Gate

## Purpose

Catch shallow implementations — code that compiles and passes one happy-path test but fails on edges. Enforces the engineering baseline.

## Read First

- `docs/agent-os/QUALITY_GATES.md` (gates).
- `docs/agent-os/DEFINITION_OF_DONE.md` (per-type DoD).
- `docs/agent-os/TEST_STRATEGY.md` (test commands).
- `AGENTS.md §5, §6, §7, §9` (boundaries, non-negotiables, design).

## Rules

### Architecture

1. Respects layer boundaries (`AGENTS.md §5`).
2. Extends the canonical owner package, not a parallel one (DECISION-OS-003).
3. Hono routes registered without `/api` prefix (Caddy strips it).

### Types & validation

4. TypeScript strict-mode compliant for the touched files.
5. Input validated at the edge (Zod schemas from `packages/shared`).
6. Error returns use typed codes from `packages/shared/src/error-codes.ts`.

### Security

7. Every route binds the correct `requirePermission`-equivalent.
8. Every tenant-scoped query filters by `tenantId` / `storeId`.
9. Destructive user-data operations require a second factor (see `ISSUE_REGISTER.md` ISSUE-0010).
10. PII masked in logs and audit (`packages/shared` `maskObject`).

### Tests

11. Unit + boundary tests for the new surface.
12. Negative-path test (validation failure, permission denied, conflict).
13. Adjacent surface re-tested.

### UI

14. RTL + mobile verified (see `design-ux-excellence-gate`).
15. All four states present: empty, loading, error, success.

### Hygiene

16. No `--no-verify`, no `.gitleaksignore`, no `nosemgrep`.
17. No silent test disabling.
18. No out-of-scope edits; route discoveries to `ISSUE_REGISTER.md`.

## Steps

1. Walk the rules above against the diff.
2. For each unticked rule: fix now or document waiver with owner ack.
3. Run the relevant test commands (per `TEST_STRATEGY.md`).
4. If any blocker remains → declare `INCOMPLETE` and route to the right gate.

## Output

```
Implementation check — <change>
Architecture: ✓
Types/validation: ✓
Security (RBAC/tenant/2FA/PII): ✓
Tests (unit/boundary/negative/adjacent): ✓
UI (RTL/mobile/states): ✓ or N/A (non-UI)
Hygiene: ✓
Verdict: PASS / INCOMPLETE
Missing items: <list or none>
```
