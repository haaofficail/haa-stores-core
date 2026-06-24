# Stale Docs Index — single page

> **Purpose:** Mark root-level legacy reports as archive candidates
> per DECISION-OS-001 + DECISION-OS-002 + DECISION-OS-004.
> **Status:** This file is the authoritative classification. The
> physical files remain in place (per DECISION-OS-001) — they are
> NOT to be deleted, only flagged here so a new agent knows what is
> current vs historical.

---

## How to read this index

| Tag                    | Meaning                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `STALE`                | Predates current state. Do NOT cite as truth.                |
| `PARTIALLY_SUPERSEDED` | Some sections still valid; full doc no longer authoritative. |
| `HISTORICAL`           | Useful as audit trail. Not a source of decisions.            |
| `KEEP`                 | Still current. Refresh when state changes.                   |

---

## Root-level legacy reports

| File                                         | Tag                    | Replaced by                                                                                                                                                        |
| -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `HAA_STORES_FULL_SYSTEM_AUDIT_2026-06-18.md` | `STALE`                | `docs/HAA_TASK_LEDGER.md` + `docs/ops/CURRENT_STATE.md` (latest 2026-06-24 entry)                                                                                  |
| `MARKETPLACE_AUDIT_REPORT.md`                | `STALE`                | DECISION-OS-002 says not authoritative. See `docs/agent-os/PHASE_2_ROADMAP.md` §1                                                                                  |
| `PHASE3-REPORT.md`                           | `HISTORICAL`           | Phase 3 work landed across PRs #161–#210; ledger §5 Update Log is the trail                                                                                        |
| `PHASE4-REPORT.md`                           | `HISTORICAL`           | Same — superseded by ledger                                                                                                                                        |
| `PHASE5-REPORT.md`                           | `HISTORICAL`           | Same                                                                                                                                                               |
| `PHASE6-REPORT.md`                           | `HISTORICAL`           | Same                                                                                                                                                               |
| `DEPLOYMENT_READINESS_PLAN.md`               | `PARTIALLY_SUPERSEDED` | `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` is the canonical runbook; this doc has legacy KPI targets that are no longer the baseline                                     |
| `DEPLOYMENT.md`                              | `PARTIALLY_SUPERSEDED` | Same                                                                                                                                                               |
| `DESIGN-HANDBOOK.md`                         | `PARTIALLY_SUPERSEDED` | DECISION-OS-010 (brand `#5c9cd5`) + DECISION-OS-009 (theme gateway) override any conflicting section. `tests/brand-consistency.test.ts` is the executable contract |
| `RELEASE-READINESS.md`                       | `PARTIALLY_SUPERSEDED` | `docs/agent-os/PRODUCTION_LAUNCH_GATES.md` (single-page truth)                                                                                                     |
| `VISUAL-QA-CHECKLIST.md`                     | `HISTORICAL`           | Replaced by per-area test files (brand-consistency, design-tokens, rtl-accessibility-guards)                                                                       |
| `AGENTS.md`                                  | `KEEP`                 | Authoritative agent constitution. Do not delete.                                                                                                                   |
| `CLAUDE.md`                                  | `KEEP`                 | Project memory + infrastructure rules. Do not delete.                                                                                                              |
| `README.md`                                  | `KEEP`                 | Repository entry point.                                                                                                                                            |

## Decision references

- **DECISION-OS-001** — Legacy root-level audits classified as
  ARCHIVE_CANDIDATE; physical files kept in place.
- **DECISION-OS-002** — Marketplace audits are not authoritative.
- **DECISION-OS-004** — `MASTER_PLAN_2026-06-18.md` is not the
  current plan.
- **DECISION-OS-020** — Truth-sync now, archive cleanup later.

## Cleanup path (when owner approves)

Do NOT delete or move these files inside a feature PR. Cleanup
happens in a dedicated `docs/archive-cleanup` PR that:

1. Creates `docs/archive/2026-06-25/` directory.
2. Moves the `STALE` + `HISTORICAL` files into it.
3. Updates this index to point at the new path.
4. Leaves `KEEP` files at the root.
5. Adds a `.gitattributes` entry so the archive doesn't pollute
   default code search.

That PR is OWNER-INITIATED. The autopilot does not move files in
the W21 pass — it only marks the classification.

## Cross-references

- `docs/agent-os/OWNER_DECISIONS.md` — full text of DECISION-OS-001/002/004/020.
- `docs/HAA_TASK_LEDGER.md` — current task dashboard (replaces the
  Phase reports as the live status).
- `docs/agent-os/PRODUCTION_LAUNCH_GATES.md` — replaces RELEASE-READINESS for launch tracking.
- `docs/agent-os/PHASE_2_ROADMAP.md` — replaces marketplace reports for forward planning.
