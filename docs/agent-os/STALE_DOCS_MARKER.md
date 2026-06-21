# Stale Docs Marker — Wave 21 (post-QA autopilot)

> Per DECISION-OS-001 + DECISION-OS-020, the full archive cleanup of legacy reports must happen in a **dedicated `docs/archive-cleanup` PR**, separate from any autopilot or feature work. This file is a **marker** — it records the status so any agent reading the repo knows which root-level reports must not be treated as current truth, without moving or deleting the files themselves.

---

## Root-level reports — classified `ARCHIVE_CANDIDATE`

The following files at the repository root predate the Agent OS bootstrap and are NOT the current source of truth:

- `HAA_STORES_FULL_SYSTEM_AUDIT_2026-06-18.md`
- `MARKETPLACE_AUDIT_REPORT.md` (also classified STALE per DECISION-OS-002)
- `PHASE3-REPORT.md`
- `PHASE4-REPORT.md`
- `PHASE5-REPORT.md`
- `PHASE6-REPORT.md`
- `DEPLOYMENT_READINESS_PLAN.md`
- `DEPLOYMENT.md`
- `DESIGN-HANDBOOK.md`
- `RELEASE-READINESS.md`
- `VISUAL-QA-CHECKLIST.md`

## Stale ops docs

- `docs/ops/MASTER_PLAN_2026-06-18.md` — STALE per DECISION-OS-004. Branch context references `feature/phase-9-cod-fee-policy` (no longer active).
- `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md` — STALE / PARTIALLY_SUPERSEDED per DECISION-OS-002.
- `docs/operations/` — overlaps `docs/ops/`; merge planned (ISSUE-0005).

## Cite policy (binding on every agent)

When referencing any file above, prefix the citation with `(historical, ARCHIVE_CANDIDATE per DECISION-OS-001)` or `(historical, STALE per DECISION-OS-002)` as applicable. Do not treat them as a source of decisions.

## What this file does NOT do

- Does NOT move or rename any file.
- Does NOT delete any file.
- Does NOT change `docs/ops/MASTER_PLAN_2026-06-18.md` content.

Final cleanup remains scheduled for a dedicated `docs/archive-cleanup` PR opened separately.
