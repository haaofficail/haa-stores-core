# TASK-0044 Phase 5 Engineering Prep — Checklist

**Started:** 2026-06-18 09:06:14 +03
**Branch:** `feature/phase-9-cod-fee-policy`
**Owner:** Engineering (founder owns G1-G10 separately in `OWNER_CHECKLIST.md`)
**Goal:** Produce the 3 engineering deliverables pen-test firms + beta launch need to consume, without depending on G1-G10 closure.

## A1. Audit existing pen-test + launch docs

- [ ] Read `docs/ops/PEN_TEST_TRIAGE_TEMPLATE.md`
- [ ] Read `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md`
- [ ] Read `docs/ops/BETA_LAUNCH_CHECKLIST.md`
- [ ] Read `docs/ops/BETA_LAUNCH_MONITORING.md`
- [ ] Read `docs/ops/ASV_SCAN_TARGET.md`
- [ ] Read `docs/ops/MARKETPLACE_HARDENING_PLAN.md`
- [ ] Read `docs/ops/OWNER_CHECKLIST.md` (founder G1-G10 + sub-steps)
- [ ] Identify gaps that engineering must produce (not owner-side)

## A2. PHASE_5_DEPLOY_RUNBOOK.md

- [ ] Write deploy runbook covering: prod build commands, env vars, DB migrate, seed, smoke checks
- [ ] Include rollback procedure
- [ ] Include vendor access steps (SSH bastion, DB read-only user, log access)

## A3. PHASE_6_TECHNICAL_BRIEF.md

- [ ] Write pen-test firm technical brief: architecture diagram (text), test scope, test accounts, env URLs, contact
- [ ] Include explicit out-of-scope list (legal docs, business process)
- [ ] Include evidence-retention + safe-harbor statements

## A4. BETA_LAUNCH_TECHNICAL_CHECKLIST.md

- [ ] Engineering-side launch gates: secrets rotation, monitoring wired, alerting thresholds, backup verified, on-call rotation
- [ ] Separate from `BETA_LAUNCH_CHECKLIST.md` (owner-side) — this is engineering-only

## A5. Commit + bundle

- [ ] Single commit `docs(ops): TASK-0044 Phase 5 engineering prep` (3 new files)
- [ ] Refresh `/tmp/phase-9-design-system-polish.bundle`
- [ ] Update `docs/ops/MASTER_PLAN_2026-06-18.md` (mark A1-A5 done)
- [ ] Update `docs/ops/TASK_TRACKER.md` (TASK-0044 → in review)

---

## Status Legend

- ⏳ Pending
- ✅ Done
- ⚠️ Blocked
- ❌ Failed
