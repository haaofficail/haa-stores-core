# Master Plan — Haa Stores Core: All Branches, Dependencies, and Sequenced Steps

> **Generated:** 2026-06-18
> **Branch context:** `feature/phase-9-cod-fee-policy` (210 commits ahead of `main`)
> **Scope:** All work streams — Design, Hardening, Marketplace, Owner-Actions, Post-Launch
> **Audience:** Solo founder + AI agent; designed for resumability across sessions

---

## 🌳 High-level roadmap

```
                           ┌─────────────────────────────────┐
                           │     MAIN BRANCH (stable)         │
                           └────────────────┬────────────────┘
                                            │
        ┌───────────────────────────────────┼───────────────────────────────────┐
        │                                   │                                   │
        ▼                                   ▼                                   ▼
┌────────────────┐                ┌────────────────┐                ┌────────────────┐
│ QUALITY PASSES │                │ DESIGN SYSTEM │                │ MARKETPLACE    │
│  1 → 5         │                │  Sprint 1-3   │                │  Phase 0-6     │
│  (DONE ✅)      │                │  (DONE ✅)     │                │  (Phase 0-3 ✅ │
│                │                │                │                │   4-6 pending) │
└────────────────┘                └────────────────┘                └────────────────┘
        │                                   │                                   │
        └───────────────────────────────────┼───────────────────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │   POST-LAUNCH SPRINT    │
                              │   4+ (TBD)               │
                              │   - Mobile               │
                              │   - Performance          │
                              │   - Observability        │
                              └─────────────────────────┘
```

---

## ✅ Stream 1: Quality Passes (DONE)

All 5 quality passes completed before this session.

| Pass | TASK | Status |
|---|---|---|
| Quality Pass 1 — System Health | TASK-0025 | ✅ |
| Quality Pass 2 — Component Unification | TASK-0026 | ✅ (11 files refactored) |
| Quality Pass 3 — Security & Permissions | TASK-0027 | ✅ (CSRF + RBAC) |
| Quality Pass 4 — Operations & Quality | TASK-0028 | ✅ (CI/CD + observability shim) |
| Quality Pass 5 — Architectural Cleanup | TASK-0029 | ✅ (Service layer + Queue + Theme) |

---

## ✅ Stream 2: Design System (DONE in this session)

| Sprint | Items | Status | Result |
|---|---|---|---|
| Sprint 1: Foundations | T1.1-T1.4 | ✅ | Color migration #58a1e2 → #56a1e3 + tokens |
| Sprint 2: Pages | T2.1-T2.5 | ✅ | LandingPage, ProductCard, DashboardHome, Settings, Orders (−5636 LOC) |
| Sprint 3: Polish | T3.1-T3.6 | ✅ | EmptyState, Error messages, Form/Icon/Loading standards, 71 motion-reduce annotations |

**Net result:** 11 commits / session, 0 regressions, 2595 tests green, typecheck CLEAN.

**Tasks tracked:** TASK-0046 (LandingPage), TASK-0047 (ProductCard), TASK-0048 (T2.3-T2.5 + T3.1-T3.2), TASK-0049 (T3.3-T3.6)

---

## 🟡 Stream 3: Marketplace Hardening (Phase 0-3 done, 4-6 pending)

### Phase 1: Foundation (DONE)

| Phase | TASK | Status | Outcome |
|---|---|---|---|
| Phase 0 | TASK-0039 | ✅ DONE | Documentation drift correction |
| Phase 1 | TASK-0040 | ✅ DONE | Self-contained P0s (demo isolation + accessToken + audit log) |
| Phase 2 | TASK-0041 | ✅ DONE | Compliance (category blocklist + SFDA workflow) |
| Phase 3 | TASK-0042 | ✅ DONE | Legal copy (PRIVACY_POLICY + TERMS + SFDA_DISCLAIMER) |

### Phase 2: Engineered + Awaiting (PENDING)

| Phase | TASK | Scope | Owner Gate |
|---|---|---|---|
| **Phase 4** | **TASK-0043** | P1 fixes (10 items) + Integration Tests T5-T10 | Engineering can start; no owner gate |
| **Phase 5** | **TASK-0044** | Owner-only gates closure (depends on TASK-0038 G1-G10) | BLOCKED on owner |
| **Phase 6** | **TASK-0045** | Pre-pen-test smoke + External pen-test + Triage + Beta launch | BLOCKED on Phase 5 |

---

## 🔴 Stream 4: Owner Action Items (BLOCKING Phase 5)

**TASK-0038 (Live-Deploy Readiness Tracker)** — 10 owner-coordinated actions:

| Gate | Action | Documented in | Phase Block |
|---|---|---|---|
| **G1** | Commercial Registration (CR) — MoCI | `OWNER_ACTION_G1_CR.md` | Phase 5 |
| **G2** | VAT Registration — ZATCA | `OWNER_ACTION_G2_VAT.md` | Phase 5 + ZATCA Phase 2 |
| **G3** | E-Commerce License — MoCI | `OWNER_ACTION_G3_ECOMMER_LICENSE.md` | Phase 5 |
| **G4** | DPO Appointment (PDPL Art. 22) | `OWNER_ACTION_G4_DPO.md` | Phase 3.4 + Phase 5 |
| **G5** | Trademark Registration — SAIP | `OWNER_ACTION_G5_TRADEMARK.md` | Phase 5 |
| **G6** | PCI-DSS ASV scan | `OWNER_ACTION_G6_PCI_ASV.md` | Phase 5 |
| **G7** | External Pen-Test (CREST firm) | `OWNER_ACTION_G7_PENTEST.md` | Phase 6 |
| **G8** | KSA Hosting decision | `OWNER_ACTION_G8_KSA_HOSTING.md` | Phase 5 |
| **G9** | Tabby DPA | `OWNER_ACTION_G9_TABBY_DPA.md` | Phase 5 |
| **G10** | DR Plan + tabletop exercise | `OWNER_ACTION_G10_DR_PLAN.md` | Phase 5 |

**⚠️ Phase 5 cannot start until G1, G2, G3, G4, G5, G6, G8, G9, G10 are closed.**

---

## 🟢 Stream 5: Compliance Tracks (Independent from launch)

| TASK | Title | Scope | Dependency |
|---|---|---|---|
| TASK-0033 | Financial Wallet Phase 2-3 | WalletPostingService | None (engineering) |
| TASK-0034 | Financial Wallet Phase 4-9 + PDPL | Reconciliation + audit + retention | Depends on G2 (VAT) |
| TASK-0035 | 3DS Flow + VAT-Aware Pricing | SAMA mandatory 3DS + ZATCA integration | Depends on G2 |
| TASK-0036 | ZATCA E-Invoicing Phase 1+2 | الفوترة الإلكترونية | Depends on G2 |

**These can run in parallel with Phase 5/6 from the engineering side.**

---

## 📋 Stream 6: Sprint 4+ Backlog (Post-launch)

Deferred from Sprint 2/3 follow-ups + new initiatives:

| Item | Source | Estimated Effort |
|---|---|---|
| T2.4 remaining Settings tabs (info, contact, general, payment, shipping, wallet, features, sizes, gift, pickup) | TASK-0048 follow-ups | 1-2 hours |
| T3.5 application — apply `MerchantEmptyState` to 5 dashboard sub-components | TASK-0048 follow-ups | 30-45 min |
| Mobile-responsive refactor (Sprint 4 candidate) | New | TBD |
| Performance optimization (Lighthouse, bundle splitting) | New | TBD |
| Observability maturity (Datadog/Sentry after live) | New | TBD |
| Redis integration (currently deferred per `PRODUCTION_READINESS.md:53`) | TASK-0029 follow-up | TBD |
| WCAG 2.1 AA audit (deferred per `RELEASE_1_REPORT.md:78`) | Compliance | TBD |
| Load testing (deferred per `RELEASE_1_REPORT.md:79`) | Operations | TBD |

---

## 🐛 Stream 7: P0 Alerts from `pnpm ops:monitor` (Pre-existing, not caused by Sprint 2/3)

6 old fingerprints from 2026-06-15 (3 days before this session). Investigate separately:

| Fingerprint | Count | Suggested Action |
|---|---|---|
| `useRef is not defined` | ×2 | Record in `INCIDENTS.md` + RCA |
| `tickerRef is not defined` | ×1 | Record in `INCIDENTS.md` + RCA |
| `Failed to fetch dynamically imported module: Login.tsx` | ×2 | Record in `INCIDENTS.md` + RCA |
| `API-001::Failed_query` (various) | ×6 | Open RCA for each |

**No regressions from Sprint 2/3 changes** — verified by clean test suite + typecheck.

---

## 🗺️ Sequenced next steps

### Path A: Continue Marketplace (engineering side, can start now)

```
NOW ────────► TASK-0043 (Phase 4: P1 fixes + integration tests T5-T10)
                  │
                  ├── Phase 5 GATE: Wait for G1-G10 from owner
                  │
                  ▼ (after G1-G10 closed)
                  
              TASK-0044 (Phase 5: confirm all gates + build deploy artifacts)
                  │
                  ▼
                  
              TASK-0045 (Phase 6: pre-pen-test smoke → pen-test → triage → beta)
```

**Engineering can do TASK-0043 today** (no owner gate). Estimated 3-5 days.

### Path B: Sprint 4 Planning (separate session)

```
NOW ────────► Sprint 4 Discovery
                  │
                  ├── Define scope: mobile / performance / observability
                  ├── Write spec docs/superpowers/specs/2026-XX-XX-sprint-4.md
                  ├── Identify top 5-7 items with ROI
                  │
                  ▼
                  
              Sprint 4 Execution (1 week)
```

**Requires planning session before execution.**

### Path C: Housekeeping (can do in 30 min)

```
NOW ────────► Complete deferred Sprint 2/3 follow-ups
                  ├── T2.4: extract remaining 8 Settings tabs
                  ├── T3.5: apply MerchantEmptyState to 5 components
                  │
                  ▼
                  
              Open PR (manual — repo has no remote)
```

**Estimated 1.5-2 hours total.**

### Path D: Bug Investigation (separate session)

```
NOW ────────► Investigate 6 P0 alerts
                  ├── Reproduce each in dev
                  ├── Record in INCIDENTS.md
                  ├── Open RCA documents
                  ├── Fix root causes (separate commits)
```

**Estimated 2-3 hours.**

---

## 🎯 Recommended next action

**Path A + C combined** — Highest ROI:

1. **Start TASK-0043 (Phase 4)** in parallel — engineering side unblocked
2. **Complete Path C** in same session (1.5 hours) — clean follow-through on Sprint 2/3
3. **Document G1-G10 status** — owner can pick up where we left off

**Path D** can wait for dedicated investigation session.

**Path B** (Sprint 4 planning) requires user input on priorities first.

---

## 📊 Status summary

| Stream | Status | Next Action |
|---|---|---|
| Quality Passes | ✅ DONE | None |
| Design System (Sprint 1-3) | ✅ DONE | Path C (housekeeping) |
| Marketplace Phase 0-3 | ✅ DONE | Path A (TASK-0043) |
| Marketplace Phase 4-6 | 🟡 PENDING | Path A (start Phase 4 now) |
| Owner Actions G1-G10 | 🔴 OPEN | Owner execution (no eng) |
| Compliance Tracks (3DS, ZATCA, Wallet) | 🟢 Independent | Can run in parallel |
| Sprint 4+ | 📋 PLANNING | Path B (separate session) |
| P0 Alerts Investigation | 🐛 OPEN | Path D (separate session) |

---

## 📦 Deliverables ready for handoff

- ✅ Branch `feature/phase-9-cod-fee-policy` — 210 commits ahead of main
- ✅ `docs/ops/PR_DESCRIPTION_DESIGN_SYSTEM.md` — PR body ready
- ✅ `/tmp/phase-9-design-system-polish.bundle` — 9.4 MB full backup
- ✅ All 4 Sprint 2/3 tasks tracked in `TASK_TRACKER.md`
- ✅ Test suite green: 2595 passing, 0 failed
- ✅ Typecheck: CLEAN across all packages
