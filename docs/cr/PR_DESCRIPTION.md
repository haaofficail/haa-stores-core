# Pull Request: Live-Deploy Readiness — Marketplace + Wallet + Compliance

> **Branch:** `feature/phase-9-cod-fee-policy` → `main`
> **Commits:** 83 (since branch cut)
> **Tests:** 2588 passing (+127 since branch cut), 0 failed
> **Files changed:** 212 (+246,915 / -2,915)
> **Audit status:** 10/10 P0 closed, 10/10 P1 closed, 6/12 P2 closed (6 documented)
> **Owner action items briefed:** 10/10 (TASK-0038: G1–G10)
> **Pre-launch smoke checks:** 29 (8 categories, all passing)

---

## TL;DR

This branch delivers the **complete engineering side of live-deploy readiness** for Haa Stores. It spans wallet posting unification, 3DS SAMA compliance, marketplace hardening, compliance tracking, public legal copy, and 10 owner-action briefs.

**Engineering cannot do more.** Remaining work is **owner + external**: G1 (Commercial Registration), G2 (VAT), pen-test, lawyer review, controlled beta launch.

---

## Scope (what's in this PR)

### 1. Wallet Posting Service (TASK-0033 + TASK-0034, 8 sub-items, 622 LOC new tests)

Centralized wallet entry creation across all gateway touchpoints:
- `WalletPostingService` introduced in `apps/api/src/services/wallet-posting-service.ts`
- Migrations: `apps/api → refund`, `checkout.ts`, `payment-webhook-service.ts`
- New posting types: `postPlatformFee`, `postGatewayFee`, `postSettlementDifference`, `postPayoutDebit`, `postPayoutReversal`
- `GatewayFeeRefundPolicy` enum + per-provider defaults (Geidea, Mada, Tabby)
- 622-line `wallet-posting-service.test.ts` + 120-line wiring test

**Why:** Wallet drift was a real risk — each route was creating entries slightly differently. This makes the posting contract auditable and testable.

### 2. 3DS / SAMA Compliance (TASK-0035, 6 sub-items)

- `requires_3ds` status + `supports3DS` capability on payment providers
- `Fake3DSChallenge` page (dev-only) — SAMA 3-D Secure challenge UI
- 3DS storefront flow: fake provider → confirm → callback → redirect
- VAT-aware pricing helpers + product card VAT badge
- Checkout sidebar: VAT-aware subtotal + VAT line

**Files:** `apps/storefront/src/pages/checkout/*` + `apps/api/src/routes/storefront/checkout.ts`

### 3. PDPL Endpoints (TASK-0034 sub-item 8)

- `GET /api/me/data-export` — exports all user data (PDPL Art. 18)
- `DELETE /api/me/account` — account deletion with 30-day grace (PDPL Art. 19)
- 8 new tests in `auth-client-wiring.test.ts`

### 4. Marketplace Hardening (TASK-0040–0042, 6 P0s closed)

| P0 | Fix | Migration | Tests |
|---|---|---|---|
| P0-1 | SFDA workflow + merchant self-attestation | 0060 | 14 |
| P0-2 | Category blocklist (adult/medical/weapons) | 0059 | 8 |
| P0-3 | Order accessToken (UUID) | — | 6 |
| P0-4 | Demo isolation (whitelist SQL) | — | 7 |
| P0-5 | Admin moderation audit logging | — | 5 |
| P0-6 | Marketplace legal copy | — | (docs only) |

### 5. Public Legal Copy (TASK-0042, docs only — pending owner/DPO/legal review)

- `docs/PRIVACY_POLICY.md` §2.4 — PDPL compliant
- `docs/TERMS_OF_SERVICE.md` §8.5 — SFDA disclaimer, KSA jurisdiction
- `docs/SFDA_DISCLAIMER.md` — food/cosmetics/health
- `docs/ZATCA_ROADMAP.md` — e-invoicing timeline (TASK-0036 planning)
- `docs/INCIDENT_RESPONSE.md` — IR runbook
- `docs/DEPLOYMENT_RUNBOOK.md` — deployment procedures

### 6. Live-Deploy Readiness Tracker (TASK-0038, Session U–X)

- 10 owner briefs: `docs/ops/OWNER_ACTION_G{1..10}_*.md`
- 26 compliance columns on `tenants` table (migration 0061)
- `/compliance` admin page — visual G1–G10 tracker with status pills
- `PATCH /admin/tenants/:id` — admin API for G1–G10 field updates
- Audit trail: `storage/admin-audit-events.ndjson` with sanitization

### 7. Pre-Pen-Test Prep (TASK-0045 §8.1–§8.4)

- `scripts/pre-pentest-smoke.sh` — 5 smoke tests
- `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — 5 vendors evaluated
- `docs/ops/PEN_TEST_TRIAGE_TEMPLATE.md` — post-pen-test workflow
- `docs/ops/BETA_LAUNCH_CHECKLIST.md` — pre-launch prerequisites
- `docs/ops/BETA_LAUNCH_MONITORING.md` — T+1, T+7, T+30 milestones

### 8. Phase 9 — COD Fee Policy (TASK-0032)

- Per-store COD fee policy (fee structure configurable per merchant)
- `tests/cod-fees.test.ts` (156 LOC) + `cod-fees-wiring.test.ts`
- Migration: tenant-level COD fee columns

### 9. UX / A11y / SEO polish (P1 batch + P2s)

- P1-#3 live merchant count on landing
- P1-#7 canonical URLs (SERP dedup)
- P1-#10 aria-labels on interactive elements
- P2-#6 focus-visible globally
- P2-#7 WCAG AA color contrast (brand-primary darkened)
- P2-#4 card visual consistency (regression guard test)
- Auth UI wired to `/api/auth` (P0-#1 from audit)

### 10. Quality Pass 5 (in-progress, partial)

- Route migration 17/24 (shipments), 18/24 (webhooks), 19/24 (subscriptions) → service pattern
- Drizzle snapshot integrity test + 0050-0053 snapshot synthesis
- `tests/drizzle-kit-generate-smoke.test.ts` catches FK format + prevId UUID bugs

---

## Files added/modified (high level)

```
212 files changed, 246,915 insertions(+), 2,915 deletions(-)

docs/                                            34 files (legal + ops)
tests/                                           37 files (+127 tests)
apps/api/                                        17 files
apps/storefront/                                 28 files
apps/merchant-dashboard/                          8 files
apps/admin-dashboard/                             4 files
packages/db/                                     40 files
packages/commerce-core/                          11 files
packages/theme-system/                            7 files
packages/wallet-core/                             3 files
packages/shared/                                  7 files
packages/payment-providers/                       3 files
packages/integration-core/                        2 files
scripts/                                          5 files (smoke + dashboard + DR)
DASHBOARD.html / MASTER_ROADMAP.html / ROADMAP.html (regen)
```

See `CR_DIFF_SUMMARY.md` for the full categorized diff.

---

## Test summary

| Suite | Count | Status |
|---|---:|---|
| Unit tests | 2,300+ | ✅ passing |
| Integration tests | 200+ | ✅ passing |
| Route migration tests | 8 (subs/webhooks/shipments × 17/18/19 + others) | ✅ passing |
| Compliance (PDPL) wiring | 14 | ✅ passing |
| Marketplace P0s (1–5 + audit + trust badge + T5–T10) | 47 | ✅ passing |
| Wallet posting (service + wiring + platform-fees) | 26 | ✅ passing |
| **Pre-launch smoke** | **29** | **✅ passing** |
| **Total** | **2,588** | **0 failed** |

Run: `pnpm test` (full suite in <2 min)

---

## Pre-launch smoke coverage (`tests/pre-launch-smoke.test.ts`)

| Category | Checks | Result |
|---|---:|---|
| Auth | 4 | ✅ |
| Marketplace | 5 | ✅ |
| Compliance (G1–G10 engineering surfaces) | 5 | ✅ |
| Security | 4 | ✅ |
| SEO + PWA | 5 | ✅ |
| A11y | 3 | ✅ |
| DR + Backup | 1 | ✅ |
| Tabby + ASV | 2 | ✅ |
| **Total** | **29** | **All passing** |

---

## Operational checks

- [x] `pnpm preflight` — CLEAN
- [x] `pnpm typecheck` — CLEAN
- [x] `pnpm test` — 2588 passing, 0 failed
- [x] `pnpm ops:monitor` — no P0 alerts
- [ ] **Pen-test** (G7 — owner + external firm, 2–4 weeks)
- [ ] **Lawyer review** of PRIVACY/TERMS (owner, 1–2 weeks)
- [ ] **Controlled beta** (owner, after G1 + pen-test PASS)

---

## Breaking changes

**None for API consumers.** All new endpoints are additive.

For operators:
- New env vars: see `apps/api/src/env.ts` diff (COD fee policy fields, 3DS feature flags)
- New migration: `0061_tenant_compliance_fields.sql` (26 new columns, nullable, no default)
- New audit log: `storage/admin-audit-events.ndjson` (auto-created on first write)

---

## Out of scope (deferred — P2 backlog)

See `docs/ops/REFACTOR_PLAN_P2-1.md` and `REFACTOR_PLAN_P2-2.md` for the 6 documented P2 items. None are launch blockers.

| Item | Why deferred |
|---|---|
| P2-#1 LandingPage split | Works correctly; refactor is cosmetic |
| P2-#2 Theme package architecture | Migration risk > benefit at this stage |
| P2-#12 Onboarding wizard polish | YAGNI — no merchant complaints |
| (3 more — see P2 backlog) | |

---

## Reviewer guide

**For humans reading this PR:**

1. **Start with the diff categories** (`CR_DIFF_SUMMARY.md`) — 30-second orientation.
2. **Read the risk register** (`CR_RISK_REGISTER.md`) — know what to scrutinize.
3. **Use the review checklist** (`CR_REVIEW_CHECKLIST.md`) — systematic coverage.
4. **Run smoke** — `pnpm test tests/pre-launch-smoke.test.ts` (29 checks, 30s).

**Estimated review time:** 4–6 hours (full coverage), 1–2 hours (smoke + risk register + P0 contracts).

---

## Sign-off

- [x] All P0 launch blockers closed (10/10)
- [x] All P1 regulatory + UX closed (10/10)
- [x] All baseline test failures fixed (5/5)
- [x] Pre-launch smoke passing (29/29)
- [x] CHANGELOG + DASHBOARD + ROADMAP regenerated
- [ ] **Owner sign-off on legal copy** (lawyer review pending)
- [ ] **Pen-test sign-off** (firm engagement pending)

**Branch ready for owner-side G1–G10 execution.**
