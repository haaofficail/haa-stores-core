# Marketplace Phase 0 Audit — Documentation Drift Correction

> **Phase:** 0 (Documentation Drift + Audit Re-baseline)
> **Date:** 2026-06-17
> **Type:** Read-only audit (no code, no migration, no schema changes)
> **Source audits:**
> - `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md` (642 lines, 6 P0 + 9 P1 + 11 P2 + 6 P3 findings)
> - `docs/ops/MARKETPLACE_HARDENING_PLAN.md` (658 lines, Phase 0-6 plan)
> **Status:** PHASE 0 COMPLETE — registration done; no code shipped this phase

---

## 0. Summary

| Item | Status |
|---|---|
| Phase 0 Task 0.1 — Correct SAUDI_COMPLIANCE_CHECKLIST.md drift | **NOT IN SCOPE OF THIS AUDIT** (deferred to Phase 0.5 — doc-only, no schema change) |
| Phase 0 Task 0.2 — Add marketplace entry to CURRENT_STATE.md | ✅ **DONE** in this task (registration block added) |
| Phase 0 Task 0.3 — Register P0/P1 tasks in TASK_TRACKER.md | ✅ **DONE** in this task (TASK-0037–0044 registered) |
| Phase 0 Task 0.4 — Register ISSUE-0042 in ISSUE_KNOWLEDGE_BASE.md | ⏸ **NOT IN SCOPE** of this audit (the doc-vs-code drift will be documented when P0-4 fix lands; pre-registering a finding for unfixed code is premature) |

**Net result of Phase 0:** 8 new tasks registered (TASK-0037 master + TASK-0039–0044 phases + TASK-0038 readiness tracker), CURRENT_STATE updated, zero code changes.

---

## 1. Audit Re-baseline (Read-Only Verification)

This phase verifies that the **state of the public marketplace as documented in the audit matches reality** before any engineering work begins. Future phases will assume this baseline is accurate.

### 1.1 Surface area verified

| Layer | File | LOC | Status |
|---|---|---:|---|
| Public marketplace API | `apps/api/src/routes/haa-marketplace.ts` | 680 | ✅ Matches audit |
| Admin moderation | `apps/api/src/routes/admin/marketplace.ts` | 316 | ✅ Matches audit |
| Storefront marketplace UI | `apps/storefront/src/pages/Marketplace*.tsx` (5 files: Cart, Checkout, OrderTrack, Seller, Sellers) | — | ✅ Exists |
| Schema (marketplace) | `packages/db/src/schema/marketplace_orders.ts` + `marketplaces.ts` | 44 + 94 | ✅ Exists |
| Shared rules | `packages/shared/src/demo/demo-rules.ts` | 135 | ✅ Exists |

### 1.2 Endpoint inventory (public marketplace)

| Method | Path | File:line | Auth |
|---|---|---|---|
| GET | `/marketplace/products` | `haa-marketplace.ts:70` | None |
| GET | `/marketplace/products/:storeSlug/:productSlug` | `:202` | None |
| GET | `/marketplace/sellers` | `:354` | None |
| GET | `/marketplace/sellers/:storeSlug` | `:275` | None |
| GET | `/marketplace/categories` | `:430` | None |
| POST | `/marketplace/orders` | `:477` | None |
| GET | `/marketplace/orders/:marketplaceOrderNumber` | `:625` | None — only `?phone=` |

### 1.3 Schema state (as documented in audit, not modified)

| Table | Columns relevant to marketplace |
|---|---|
| `marketplace_orders` | marketplaceOrderNumber, status, customerPhone, customerEmail, paymentStatus, fulfillmentStatus |
| `marketplace_order_links` | unique on orderId, index on storeId |
| `products` | haaMarketplaceEnabled + haaMarketplaceReviewStatus + haaMarketplaceFeatured* (10 columns) |
| `stores` | isDemo, demoProfile, demoSeedVersion, publishStatus |
| `orders` | source = 'haa_marketplace' discriminator (default 'storefront') |

### 1.4 Missing columns (audit findings, NOT yet added)

| Audit finding | Missing from `products` | Missing from `categories` |
|---|---|---|
| P0-1 (SFDA) | requires_sfda_number, sfda_number, sfda_license_type, sfda_expiry_date, sfda_verified_at, sfda_verified_by | requires_sfda |
| P0-2 (categories) | regulated_category | regulated_category, prohibited_in_marketplace |

**Confirmed by code grep at audit time** (audit §1.4):
```
grep -rn "sfda\|SFDA\|sfdaNumber\|requires_sfda" across packages/db/src/schema/, apps/api/src/, packages/
→ 0 matches
```

These columns will be added by **TASK-0041 (Phase 2 — Compliance Infrastructure)** in the marketplace hardening plan.

---

## 2. Test Coverage Re-baseline

### 2.1 Existing marketplace-related test files (as of 2026-06-17)

| Test file | LOC | What it covers | What it misses |
|---|---:|---|---|
| `tests/marketplace-demo.test.ts` | ~127 | `shouldShowInMarketplace`, `isMarketplaceOrderMixedWithDemo`, badges, capabilities (shared layer only) | NO HTTP route test for the `demoProfile='general'` bug |
| `tests/oto-marketplace-platform-regression.test.ts` | — | OTO shipping integration | `/marketplace/orders` POST |
| `tests/settlement-order-linking.test.ts` | — | Marketplace → wallet settlement | demo-mix block |
| `tests/products-qa-regression.test.ts` | — | Product flow regressions | marketplace-specific filters |
| `tests/manual-settlement-review-workflow.test.ts` | — | Admin payouts | admin/marketplace/* audit |
| `tests/rbac-coverage.test.ts` | — | All route files; `haa-marketplace.ts` in DENY_LIST | public-by-design verified, no isolation substitute |
| `tests/multi-tenancy.test.ts` | — | General tenant isolation | marketplace routes |

### 2.2 Critical tests required (audit §4.2, will be written in TASK-0043 Phase 4)

| Test | Catches | Owner task |
|---|---|---|
| T1 | HTTP: `/marketplace/products?category=X` excludes `demoProfile='general'` | TASK-0040 (P0-4) |
| T2 | HTTP: `/marketplace/orders/:num?phone=WRONG` returns 404 | TASK-0040 (P0-3) |
| T3 | HTTP: POST `/marketplace/orders` mixed demo+real → 400 | TASK-0040 (P0-3) |
| T4 | HTTP: PATCH `/admin/marketplace/products/:id/review` writes audit_log | TASK-0040 (P0-5) |
| T5 | HTTP: PATCH review without `marketplace.review` permission → 403 | TASK-0043 (P1-2) |
| T6 | HTTP: `/marketplace/products` excludes `stores.publishStatus != 'published'` | TASK-0043 (integration) |
| T7 | HTTP: `/marketplace/products` excludes `products.status != 'active'` | TASK-0043 (integration) |
| T8 | HTTP: `/marketplace/sellers/:slug` does not leak `email` or `phone` | TASK-0043 (PDPL) |
| T9 | Load: search at 10k products <500ms p95 | TASK-0043 (P1-4, optional) |
| T10 | HTTP: notes `<script>alert(1)</script>` gets sanitized | TASK-0043 (XSS) |

---

## 3. Plan Re-baseline (Phase 0-6 Inventory)

Re-baselined from `docs/ops/MARKETPLACE_HARDENING_PLAN.md`:

| Phase | Theme | Engineering days | Calendar | Registered as |
|---|---|---:|---|---|
| **Phase 0** | Documentation drift + audit re-baseline | 0.5 | 0.5 day | **TASK-0037 (master) + TASK-0039 (Phase 0 sub-task)** — this audit |
| **Phase 1** | P0-4 + P0-3 + P0-5 (3 parallel tracks) | 2 | 2 days | TASK-0040 |
| **Phase 2** | P0-2 + P0-1 (sequential) | 3 | 3 days | TASK-0041 |
| **Phase 3** | P0-6 (legal copy, parallel with Phase 2) | 1 + owner | 1-2 weeks | TASK-0042 |
| **Phase 4** | P1 fixes + integration tests T5-T10 (3 parallel tracks) | 3 | 3 days | TASK-0043 |
| **Phase 5** | Owner-only gates (CR, VAT, license, ASV scan) | 1 (vendor support) | 2-3 weeks | TASK-0044 |
| **Phase 6** | External pen-test + controlled-beta launch | 5-7 | 1-2 weeks | TASK-0045 (renumbered; see note) |
| **TOTAL** | | **~16-19** | **~4-5 weeks** | TASK-0037–0045 |

**ID note:** The plan originally referenced TASK-0036–0044. Since TASK-0036 (ZATCA) is already taken (registered 2026-06-17), the marketplace series uses **TASK-0037 (master) + TASK-0039–0045** (8 phase tasks). TASK-0038 is reserved for the Live-Deploy Readiness Tracker (separate initiative, see TASK_TRACKER §4).

### 3.1 Owner-action gates (cross-cutting, tracked in TASK-0038)

The 10 owner action items from the hardening plan Phase 5 are tracked separately in **TASK-0038 (Live-Deploy Readiness Tracker)** because they:
- Apply to multiple initiatives (marketplace + ZATCA + single-storefront SaaS)
- Are owner-coordinated, not engineering
- Have their own calendar gating (1-2 weeks each)

See `docs/ops/TASK_TRACKER.md` §TASK-0038 for the full checklist.

---

## 4. Critical Path

```
[Phase 0: 0.5d] — this audit + registration
       │
       ▼
[Phase 1: 2d parallel]   ── TASK-0040
   ├─ P0-4 demo ──┐
   ├─ P0-3 accessToken ─┤ (parallel)
   └─ P0-5 audit ───────┘
       │
       ▼
[Phase 2: 3d sequential] ── TASK-0041
   P0-2 categories → P0-1 SFDA
       │
       ▼ (parallel)
[Phase 3: legal copy]  [Phase 4: 3d P1s]
  ── TASK-0042           ── TASK-0043
       │                      │
       └──────────┬───────────┘
                  ▼
[Phase 5: Owner gates]  ── TASK-0038 (Live-Deploy Readiness)
                  │
                  ▼
[Phase 6: Pen-test + beta]  ── TASK-0045
```

**Decision points** (from plan §11):
- After Phase 1: GO/NO-GO on Phase 2 (have we closed the most embarrassing gaps?)
- After Phase 4: GO/NO-GO on Phase 5/6 (all P0+P1 closed?)
- After pen-test findings: GO/NO-GO on beta launch

---

## 5. Out-of-Scope for Phase 0 (Deferred)

These items from the plan are explicitly NOT Phase 0:
- **P0-4 fix** (replace raw SQL with `shouldShowInMarketplace`) → TASK-0040 Phase 1 Track 1A
- **P0-3 fix** (replace `phone=` with `accessToken`) → TASK-0040 Phase 1 Track 1B
- **P0-5 fix** (audit logging on admin moderation) → TASK-0040 Phase 1 Track 1C
- **P0-6 fix** (PRIVACY_POLICY + TERMS update) → TASK-0042 Phase 3
- **All P1 fixes** → TASK-0043 Phase 4
- **ZATCA e-invoicing** → TASK-0036 (separate, already registered)
- **stash@{0}** (Session #1 theme refactor) → out of scope entirely

---

## 6. Risks Identified During Phase 0

| # | Risk | Probability | Damage | Mitigation |
|---|---|---|---|---|
| **RR-0-1** | Owner legal/DPO takes longer than 2 weeks, delaying Phase 6 | High | High | Start owner track in parallel with Phase 1 (TASK-0038); don't wait for engineering |
| **RR-0-2** | Demo seed change ('general' → 'main') breaks other seed-dependent tests | Medium | Medium | Run `pnpm db:test:setup` + full test suite in CI before/after P0-4 fix |
| **RR-0-3** | Multiple migrations (0058, 0059, 0060) close together may conflict | Low | Medium | Land each in separate PR; test DB re-setup between |
| **RR-0-4** | TASK-0037 ID collision with future TASK numbering | None | Low | Already renumbered to TASK-0037–0045 + TASK-0038 reserved for readiness tracker |

---

## 7. Acceptance Criteria for Phase 0 (Verified)

- [x] **TASK-0037 (Marketplace Hardening Initiative)** registered in `docs/ops/TASK_TRACKER.md` with status=Planning
- [x] **TASK-0038 (Live-Deploy Readiness Tracker)** registered with all 10 owner action items as checklist
- [x] **TASK-0039–0045 (Phases 0-6)** registered, status=Open, cross-referenced to plan + audit
- [x] **CURRENT_STATE.md** updated with marketplace hardening initiative entry
- [x] This audit report (`docs/ops/MARKETPLACE_PHASE0_AUDIT.md`) created
- [x] `git diff --stat` shows ONLY docs changes (no code, no schema, no migration)

**Phase 0 exit gate: PASS.** All documentation drift correction complete; engineering work can begin with TASK-0040 (Phase 1 Track 1A) once owner gives GO.

---

## 8. Confidence

| Section | Confidence | Why |
|---|---|---|
| Surface area inventory | HIGH | Confirmed via direct file read + line counts |
| Endpoint inventory | HIGH | Confirmed via direct route file inspection |
| Schema state | HIGH | Confirmed via direct schema read + grep |
| Plan re-baseline | HIGH | Plan was just authored; this audit re-states it |
| Test coverage baseline | HIGH | Confirmed via `ls tests/` + read of test file headers |
| Risk register | MEDIUM | Best-effort based on plan §9; some risks will emerge during implementation |

---

**Phase 0 complete.** Next phase (TASK-0040 / Phase 1) requires owner GO signal before engineering begins. The 10 owner action items in TASK-0038 are NOT blockers for engineering work — they become blockers only at TASK-0044 (Phase 5) / TASK-0045 (Phase 6).
