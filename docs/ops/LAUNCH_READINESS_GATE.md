# Launch Readiness Gate v1

> Created: 2026-06-28
> Scope: owner-facing and agent-facing launch decision board.
> This file does not authorize deployment, production migration, live
> payment calls, live shipping calls, or secret handling.

---

## Executive Verdict

| Launch mode         | Verdict     | Why                                                                                                                                                              |
| ------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Readiness sprint    | GO          | Local preflight is healthy and no active actionable monitoring events were found. This is a planning and verification sprint only.                               |
| Sandbox preparation | GO          | Owner selected sandbox preparation on 2026-06-28. This permits docs, local/staging planning, fake/sandbox-provider test design, and environment checklists only. |
| Staging rehearsal   | CONDITIONAL | Allowed after branch/worktree hygiene, dev or staging services are intentionally started, and current staging credentials are confirmed by the owner.            |
| Closed live beta    | NO-GO       | Owner gates, live credentials, pen-test, DR drill, DNS/secrets, and production operational checks are not all closed.                                            |
| Public launch       | NO-GO       | Public launch requires every closed-beta blocker plus burn-in evidence and owner approval.                                                                       |

**Recommended start now:** run a 48-hour Launch Readiness Sprint. The sprint
should produce evidence, owner decisions, and a short list of the first
beta candidates. It must not flip production flags or call live providers.

---

## Owner Answers Snapshot

Recorded from owner chat on 2026-06-28.

| Item                       | Owner answer        | Recorded status                                                                 | Launch implication                                                                            |
| -------------------------- | ------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| VAT / ZATCA                | No                  | G2 remains open.                                                                | Blocks live beta and public launch; does not block sandbox-only preparation.                  |
| E-commerce license         | Yes                 | G3 is owner-stated as available; license number/copy is still pending evidence. | Does not block sandbox preparation. Requires non-secret proof before live beta/public launch. |
| DPO / privacy owner        | No                  | G4 remains open.                                                                | Blocks live beta with real customer data and public launch.                                   |
| Immediate provider posture | Sandbox preparation | Sandbox path is approved for planning/rehearsal.                                | Do not enable live providers; build sandbox checklist first.                                  |
| First 3 beta merchants     | Not provided yet    | Cohort remains open.                                                            | Blocks live beta; not needed for sandbox checklist drafting.                                  |

---

## Sources Used

- `docs/system-map/SYSTEM_MAP.md` — architecture and source-of-truth order.
- `docs/agent-os/REMAINING_WORK.md` — current remaining launch work.
- `docs/agent-os/PRODUCTION_LAUNCH_GATES.md` — production launch blockers.
- `docs/ops/BETA_LAUNCH_CHECKLIST.md` — beta program prerequisites.
- `docs/ops/BETA_LAUNCH_TECHNICAL_CHECKLIST.md` — engineering-side launch checks.
- `docs/ops/BETA_LAUNCH_MONITORING.md` — beta monitoring model.
- `docs/ops/PRODUCTION_READINESS_CHECKLIST.md` — infrastructure/provider status.
- `docs/HAA_TASK_LEDGER.md` — owner-facing progress dashboard.
- Local evidence from this task: `pnpm preflight` passed; `pnpm ops:monitor`
  reported zero actionable events and no recommended incidents/tasks.

---

## Gate Definitions

| Status         | Meaning                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------- |
| GO             | Work may start now inside the stated scope.                                                   |
| CONDITIONAL    | Work may start only after the listed precondition is met.                                     |
| NO-GO          | Do not start this launch mode. Resolve blockers first.                                        |
| OWNER_DECISION | Engineering can prepare evidence, but the owner must decide or provide credentials/contracts. |

Priority labels follow Agent OS: P0 blocks launch, P1 must clear before the
next release batch, P2 is next sprint, P3 is backlog, and OWNER_DECISION is
not an engineering call.

---

## Domain Gate

| Domain                       | Current status                                                        | Priority                 | Owner                 | Evidence                                                                                                                                                 | Next action                                                                                               |
| ---------------------------- | --------------------------------------------------------------------- | ------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Legal entity                 | G1 CR is provided and wired.                                          | P1                       | Owner + Codex support | `docs/agent-os/REMAINING_WORK.md` marks G1 done; platform legal entity is wired in prior PRs.                                                            | Keep CR visible in legal/footer surfaces; finish the separate storefront footer task before merging it.   |
| VAT / ZATCA                  | Not closed for launch.                                                | P0 for live beta         | Owner                 | `docs/agent-os/PRODUCTION_LAUNCH_GATES.md` lists G2 as owner action; `docs/ZATCA_ROADMAP.md` tracks Phase 2 readiness.                                   | Owner completes VAT/ZATCA enrollment and shares non-secret proof/status.                                  |
| E-commerce license           | Owner says the license exists; proof details are pending.             | P1 evidence gate         | Owner                 | Owner answer on 2026-06-28.                                                                                                                              | Owner shares license number/copy or approved reference; Codex records it without exposing sensitive data. |
| DPO / PDPL operations        | Not closed.                                                           | P0 for live beta         | Owner                 | G4 open; beta checklist requires DPO contact before launch.                                                                                              | Owner appoints DPO/contact; Codex updates privacy surfaces after owner text is approved.                  |
| Trademark                    | Not launch-critical for a closed technical rehearsal, but still open. | P2                       | Owner                 | G5 open.                                                                                                                                                 | Owner files or explicitly accepts beta risk.                                                              |
| PCI / ASV                    | Not closed.                                                           | P0 for live payment beta | Owner + vendor        | G6 open; payment beta depends on provider and PCI posture.                                                                                               | Engage ASV vendor after payment environment decision.                                                     |
| Pen-test                     | Not closed.                                                           | P0 for live beta         | Owner + vendor        | G7 open; beta checklist requires signed-off pen-test.                                                                                                    | Owner selects vendor; Codex can prepare scope and triage template.                                        |
| KSA hosting / residency      | Not closed.                                                           | OWNER_DECISION           | Owner                 | G8 open; official server is `72.61.108.208`, hosting decision is separate.                                                                               | Owner decides Dubai-now vs wait-for-KSA region and records rationale.                                     |
| Tabby / BNPL DPA             | Not closed.                                                           | P1 for BNPL beta         | Owner                 | G9 open.                                                                                                                                                 | Owner signs DPA before live BNPL data flow.                                                               |
| Disaster recovery            | Not closed.                                                           | P0 for live beta         | Owner + Codex support | G10 open; restore drill is tied to launch gates.                                                                                                         | Schedule tabletop and restore drill.                                                                      |
| DNS / TLS                    | Production DNS not closed.                                            | P0 for production        | Owner                 | Production gates say Cloudflare DNS for `haastores.com` is not configured in the connected account.                                                      | Owner confirms Cloudflare access and required records.                                                    |
| Production secrets           | Not provisioned.                                                      | P0 for production        | Owner                 | Production gates list JWT/admin/encryption/database/Redis/Sentry/payment/shipping/storage secrets as not provisioned.                                    | Owner provisions secrets through approved secure channel; Codex must not print or inspect them.           |
| Payments                     | Infrastructure exists; owner selected sandbox preparation.            | P1 sandbox prep          | Owner + Codex support | `PRODUCTION_READINESS_CHECKLIST.md` shows Geidea implemented but live/sandbox credentials and smoke tests pending; owner selected sandbox on 2026-06-28. | Build sandbox provider checklist and keep live disabled.                                                  |
| Shipping                     | Abstraction exists; live credentials absent.                          | P1 sandbox prep          | Owner + Codex support | `PRODUCTION_READINESS_CHECKLIST.md` shows OTO/shipping live credentials and smoke tests pending; owner selected sandbox posture.                         | Build sandbox/mock shipping rehearsal first; live shipping remains blocked.                               |
| Wallet idempotency migration | File ready; execution owner-gated.                                    | P0 for commercial launch | Owner                 | `PRODUCTION_LAUNCH_GATES.md` says migration 0073 file is ready but not applied.                                                                          | Do not run `db:migrate`; owner approves and runs staging/prod migration workflow.                         |
| Monitoring / Sentry          | Local monitoring works; external observability not connected.         | P1                       | Owner + Codex support | `pnpm ops:monitor` found no actionable local events; Sentry DSN is still owner-gated.                                                                    | Start local monitoring cadence; owner provisions Sentry/uptime tools before live beta.                    |
| Backups / restore            | Not fully closed.                                                     | P0 for live beta         | Owner + Codex support | Remaining work lists backups + restore drill as open and tied to G10.                                                                                    | Codex can draft drill; owner schedules and runs/approves.                                                 |
| Merchant cohort              | No beta merchants identified.                                         | P0 for live beta         | Owner                 | Production gates show 0 named beta merchants.                                                                                                            | Owner names first 3 candidates for rehearsal, then 10-20 for closed beta.                                 |
| UX / trust surfaces          | Needs a focused beta QA pass.                                         | P1                       | Codex                 | Current worktree has separate storefront footer/legal-entity edits.                                                                                      | Finish or park that footer task, then run mobile/RTL trust-surface QA.                                    |

---

## 48-Hour Launch Readiness Sprint

### Day 0: Branch and Evidence Hygiene

- Resolve current dirty worktree before opening another implementation PR:
  - existing storefront footer/legal edits are separate from this launch-gate task.
  - monitoring event log changes are generated evidence, not product code.
- Run and record:
  - `pnpm preflight`
  - `pnpm ops:monitor`
  - `pnpm check:skills`
- Confirm no P0/P1 active incidents in monitoring.

### Day 1: Owner Action Packet

- Owner has chosen the immediate provider posture:
  - sandbox preparation only,
  - no live provider enablement,
  - no production launch.
- Owner supplies statuses for G2, G3, G4, G6, G7, G8, G9, and G10.
- Owner names the first 3 beta merchants or confirms the cohort is not ready.
- Codex turns owner answers into updates in:
  - `docs/agent-os/PRODUCTION_LAUNCH_GATES.md`
  - `docs/agent-os/REMAINING_WORK.md`
  - `docs/HAA_TASK_LEDGER.md`
  - `docs/ops/BETA_LAUNCH_CHECKLIST.md`

### Day 2: Technical Rehearsal Planning

- Start only a non-production rehearsal plan:
  - no production deploy,
  - no production `db:migrate`,
  - no live payment/shipping calls,
  - no secret printing.
- Define the rehearsal target:
  - local full smoke,
  - staging smoke,
  - sandbox payment/shipping smoke,
  - beta merchant onboarding dry run.
- Produce a short GO/NO-GO report for closed beta.

---

## Closed Beta Entry Criteria

Closed beta can start only when all rows below are green or explicitly
accepted by the owner in writing.

| Criterion          | Required evidence                                                 | Current state           |
| ------------------ | ----------------------------------------------------------------- | ----------------------- |
| G1-G10 owner gates | Updated owner-gate table with proof/status.                       | Not all green.          |
| Pen-test           | PASS report or Critical/High findings fixed.                      | Not green.              |
| DR / restore       | Tabletop plus restore drill evidence.                             | Not green.              |
| DNS / TLS          | Production domains resolving with TLS and safe headers.           | Not green.              |
| Production secrets | Provisioned through approved secret path.                         | Not green.              |
| Payment mode       | Sandbox/live provider credentials verified without fake/live mix. | Not green.              |
| Shipping mode      | Chosen aggregator and sandbox/live tests verified.                | Not green.              |
| Monitoring         | Local + external alerting paths verified.                         | Local only.             |
| Beta merchants     | 3 rehearsal merchants, then 10-20 closed-beta merchants.          | 0 recorded.             |
| Rollback           | Marketplace/public flags and rollback communication rehearsed.    | Planned, not rehearsed. |

---

## What Codex Should Do First

1. Close or park the current storefront footer/legal-entity work as its own
   scoped task.
2. Run the local mock rehearsal from
   `docs/ops/SANDBOX_REHEARSAL_CHECKLIST.md` before any staging sandbox run.
3. Ask the owner for the e-commerce license number/reference, DPO plan, and
   first 3 beta merchant candidates when moving beyond sandbox planning.

---

## Explicit Non-Actions

- No deploy was performed.
- No `db:migrate` was run.
- No SSH or production host access was attempted.
- No secrets or `.env` files were read or printed.
- No live payment-provider calls were made.
- No live shipping-provider calls were made.
- No DNS, firewall, Nginx, Caddy, or server changes were made.
