# Haa Stores — Public Marketplace Hardening Plan

> **Status:** Implementation plan (read-only — describes work, does not execute it)
> **Plan date:** 2026-06-17
> **Source audit:** `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md`
> **Goal:** Take the public marketplace from "demo-ready" to "controlled-beta launch safe"
> **Strategy chosen:** Fix P0s first (commercial blockers), then P1s (launch readiness), then run external pen-test
> **Target:** Phase 4 exit gate (controlled-beta launch ready) by **end of week 4**

---

## 0. Plan Summary

| Phase | Theme | Duration | Parallel? | Owner gate at end |
|---|---|---|---|---|
| **Phase 0** | Documentation drift + audit re-baseline | 0.5 day | No (sequential — must come first) | None |
| **Phase 1** | P0-4 + P0-3 + P0-5 (isolation + accessToken + audit) | 2 days | Yes — 3 parallel tracks | `pnpm ci:local` green |
| **Phase 2** | P0-2 + P0-1 (category blocklist + SFDA) | 3 days | Sequential (2 depends on 1) | New tests T1-T4 green |
| **Phase 3** | P0-6 (legal copy) | 1 day + owner legal | Parallel with Phase 2 | DPO appointment + legal sign-off |
| **Phase 4** | P1 fixes + remaining integration tests (T5-T10) | 3 days | Yes — 3 parallel tracks | All T1-T10 green |
| **Phase 5** | Owner-only gates (CR, VAT, license, ASV scan) | 1-2 weeks calendar | Out of engineering scope | 6 owner action items closed |
| **Phase 6** | External pen-test + controlled-beta launch | 1-2 weeks calendar | Out of engineering scope | Pen-test report PASS |

**Total engineering:** ~10 working days spread across ~2 calendar weeks (with 3 parallel tracks)
**Total calendar (incl. owner gates + pen-test):** ~4-5 weeks

---

## 1. Sequencing Rationale

The order is chosen so that:
1. **Cheap, self-contained fixes ship first** (P0-4, P0-3, P0-5 — no schema changes or owner dependencies). These close the most embarrassing gaps and build momentum.
2. **Compliance gaps ship before legal copy** (P0-1, P0-2 need to actually be implemented before legal documents describe them). Legal copy (P0-6) goes last among P0s.
3. **Integration tests follow implementation** (T1-T8 must come AFTER their corresponding P0 fix lands).
4. **Pen-test waits for everything** (Phase 6 cannot start until all P0+P1 are merged to main).

Two parallel tracks throughout:
- **Engineering track:** P0-1, P0-2, P0-3, P0-4, P0-5 + P1-1..9 + tests
- **Owner/legal track:** P0-6 copy + DPO + CR + VAT + license + ASV scan

These two tracks converge at **Phase 4 exit gate**, then move together into Phase 5/6.

---

## 2. Phase 0 — Documentation Drift Correction (0.5 day)

**Why first:** The audit revealed that `SAUDI_COMPLIANCE_CHECKLIST.md:237-239` falsely claims SFDA fields exist in the product schema. Leaving this drift in place will mislead future agents and legal reviewers. Fix documentation BEFORE writing any code, so everyone agrees on the actual gap.

### Task 0.1 — Correct SAUDI_COMPLIANCE_CHECKLIST.md
- **File:** `docs/SAUDI_COMPLIANCE_CHECKLIST.md` lines 236-241
- **Action:** Replace the false "Marketplace product schema has it" claim with an accurate ❌ (Not Started) status matching the audit's P0-1 finding.
- **Why:** Prevent the same drift from re-occurring; reset the baseline.
- **Acceptance:** SAUDI_COMPLIANCE_CHECKLIST §6.2 reflects actual code state (0 SFDA fields in schema).
- **Effort:** 15 minutes.
- **Risk:** None.

### Task 0.2 — Add marketplace entry to CURRENT_STATE.md
- **File:** `docs/ops/CURRENT_STATE.md`
- **Action:** Add a new "Active Strategic Initiative" entry for marketplace hardening, citing the audit.
- **Acceptance:** CURRENT_STATE references the audit + the 6 P0 findings.
- **Effort:** 15 minutes.

### Task 0.3 — Register P0/P1 tasks in TASK_TRACKER.md
- **File:** `docs/ops/TASK_TRACKER.md`
- **Action:** Add tasks TASK-0036 through TASK-0044 corresponding to P0-1..6 and P1-1..9. Set status = "Open". Cross-reference audit report.
- **Acceptance:** Each task has: title, severity tag (P0/P1), audit reference, owner (eng / owner / legal), acceptance criteria.
- **Effort:** 30 minutes.

### Task 0.4 — Register ISSUE-YYYY in ISSUE_KNOWLEDGE_BASE.md
- **File:** `docs/ops/ISSUE_KNOWLEDGE_BASE.md`
- **Action:** Add ISSUE-0042: `shouldShowInMarketplace` import-but-not-used in `haa-marketplace.ts` — root cause + workaround notes.
- **Why:** This is a doc-vs-code drift pattern that will recur. Document it for future agents.
- **Acceptance:** Entry follows existing template; references commit + file:line.
- **Effort:** 15 minutes.

### Exit gate (Phase 0)
- [ ] SAUDI_COMPLIANCE_CHECKLIST corrected
- [ ] CURRENT_STATE references audit
- [ ] TASK_TRACKER has 14 new tasks
- [ ] ISSUE_KNOWLEDGE_BASE has ISSUE-0042
- [ ] `git diff --stat` shows ONLY docs changes

---

## 3. Phase 1 — Self-Contained P0s (2 days, 3 parallel tracks)

All three tracks touch independent files. They can run in parallel across 2 working days.

### Track 1A: P0-4 — Demo Isolation Contract

**Files to touch:**
- `apps/api/src/routes/haa-marketplace.ts` — replace raw `sql\`${s.stores.demoProfile} IS NOT NULL\`` with calls to shared `shouldShowInMarketplace` helper (4 sites: lines 92, 263, 400, 448)
- `packages/db/src/seed/index.ts` line 146 — change `demoProfile: 'general'` to `demoProfile: 'main'` (or add 'general' to whitelist in demo-rules.ts)
- `packages/shared/src/demo/demo-rules.ts` lines 86-97 — if adding 'general' to whitelist is the chosen path, add it explicitly with config

**Approach (TDD-first):**
1. Write a new HTTP-level test that asserts: `GET /marketplace/products` returns ZERO products for a store with `demoProfile='unknown'`. Watch fail (current code shows them).
2. Fix `haa-marketplace.ts` to import + call `shouldShowInMarketplace` for each demo store at query time. The function needs the full store row, so the query must include `stores.isDemo + stores.demoProfile` in SELECT.
3. Decide on seed: either change seed to 'main' (simpler) OR add 'general' to whitelist (more flexible). **Recommendation: change seed to 'main'** to avoid whitelist sprawl.
4. Run test → green.

**Acceptance:**
- New HTTP test passes
- Existing `tests/marketplace-demo.test.ts` still passes
- No demo store with unrecognized profile appears in marketplace
- `shouldShowInMarketplace` is the ONLY path to determine demo visibility (no raw SQL)

**Effort:** 4 hours (write test + fix + verify).

**Risks:**
- **R1:** If `haa-marketplace.ts` query is restructured to include the store's `isDemo` + `demoProfile` in every row, performance may regress slightly. Mitigation: the existing composite index `products_haa_marketplace_idx` plus the `stores` join already covers the lookup.
- **R2:** If a future seed uses a new profile, the whitelist path will silently show them. Mitigation: the HTTP test should also assert that stores with `demoProfile` outside the whitelist DO NOT appear (defense-in-depth, not just relying on whitelist).

---

### Track 1B: P0-3 — Order Tracking via AccessToken

**Files to touch:**
- `packages/db/src/schema/marketplace_orders.ts` — add column `accessToken: uuid('access_token').notNull().defaultRandom()` with unique index
- New migration file (e.g., `0058_marketplace_order_access_token.sql`)
- `apps/api/src/routes/haa-marketplace.ts` — modify `POST /orders` (line 477) to return the `accessToken` ONCE in the response (line 600-622); modify `GET /orders/:num` (line 625) to require `?access_token=` instead of `?phone=`
- `apps/storefront/src/pages/MarketplaceCheckout.tsx` line 159 — change `?phone=` to `?access_token=` in the tracking link
- `apps/storefront/src/pages/MarketplaceOrderTrack.tsx` — change the phone input to an access-token display + copy-to-clipboard UX
- `apps/api/src/routes/storefront/support.ts` — no changes (this fix mirrors the support-ticket `accessToken` pattern from R-0014)

**Approach (TDD-first):**
1. Write HTTP test: `GET /marketplace/orders/HM-FAKE?phone=0500000000` (without access_token) returns 401. Watch fail (current returns 404 or full data).
2. Write HTTP test: `GET /marketplace/orders/HM-XXX?access_token=valid-uuid` returns the order. Watch fail.
3. Add `accessToken` column + migration.
4. Modify POST handler to return token in response.
5. Modify GET handler to validate token.
6. Modify storefront UI to use token.
7. Run all tests green.

**Acceptance:**
- `accessToken` is `uuid` (122-bit entropy) — not guessable
- Token returned ONCE at creation, never again (UI must copy it)
- Backward compat: keep `?phone=` accepting IF access_token not provided, for legacy links only (deprecate after 30 days via follow-up)
- OR: hard cutover, no backward compat (cleaner; the storefront UI is the only client)
- Audit log added: every successful order view writes `audit_logs` entry

**Effort:** 1.5 days (migration + API + UI + tests + audit).

**Risks:**
- **R1:** Existing customers with order numbers from before this fix won't have access tokens. Mitigation: backfill tokens in migration (existing orders get `defaultRandom()` UUIDs; UI shows "if you created this order before [date], use phone lookup" banner during transition).
- **R2:** Token in URL is still a leak vector (browser history, server logs). Mitigation: follow R-0014 pattern (already shipped for support tickets) — strip token from logs, document "do not share link".
- **R3:** Token rotation. Out of scope for this fix; document as future task.

---

### Track 1C: P0-5 — Audit Log on Admin Moderation

**Files to touch:**
- `apps/api/src/routes/admin/marketplace.ts` — line 58 (marketplaceProductReviewRoute), line 75 (marketplaceProductFeatureRoute)
- `packages/shared/src/types/audit.ts` — extend `AuditAction` union with `'marketplace_product_review'` and `'marketplace_product_feature'`
- `apps/api/src/services/audit-logs.ts` — verify export; pattern from `orders.ts:321+` and `wallet.ts:170+`
- `packages/shared/src/schemas/audit.ts` — add Arabic labels for new audit actions

**Approach (TDD-first):**
1. Write source-grep test: scan `admin/marketplace.ts` and assert both `marketplaceProductReviewRoute` and `marketplaceProductFeatureRoute` call `audit.record(...)`.
2. Watch fail (current code has no audit calls).
3. Add audit calls with structured meta: `{ productId, fromStatus, toStatus, note, actorAdminId }`.
4. Update AuditAction union + Arabic labels.
5. Run tests green.

**Acceptance:**
- Every `PATCH /admin/marketplace/products/:id/review` writes 1 audit log
- Every `PATCH /admin/marketplace/products/:id/feature` writes 1 audit log
- Audit log includes: actor admin user ID, fromStatus, toStatus, optional note, timestamp
- Source-grep test prevents regression
- Existing `tests/audit-depth.test.ts` still passes

**Effort:** 0.5 day.

**Risks:** None significant; pure additive change.

---

### Exit gate (Phase 1)
- [ ] All 3 P0 fixes merged to `feature/marketplace-p0-fixes` branch
- [ ] `pnpm preflight` green
- [ ] `pnpm typecheck` green
- [ ] `pnpm test` green (all new tests + 2329 existing tests)
- [ ] `pnpm ci:local` green
- [ ] 3 commits, each with test-first commit message (TDD red → green)
- [ ] Documentation updated: TASK_TRACKER shows TASK-0036, 0037, 0038 as Done

---

## 4. Phase 2 — Compliance Infrastructure (3 days, sequential)

### Task 2.1 — P0-2: Category Blocklist (1.5 days)

**Files to touch:**
- New migration `0059_category_compliance.sql`:
  - Add columns to `categories`: `regulated_category: varchar('regulated_category', { length: 50 })`, `prohibited_in_marketplace: boolean('prohibited_in_marketplace').notNull().default(false)`
- `packages/db/src/schema/categories.ts` — add columns + indexes
- `packages/shared/src/schemas/categories.ts` — add Zod schema for new fields
- `packages/shared/src/types/categories.ts` — add `RegulatedCategory` enum: `'food' | 'drug' | 'medical_device' | 'cosmetic' | 'supplement' | 'weapon' | 'adult' | 'counterfeit'`
- `apps/api/src/routes/haa-marketplace.ts` — add `eq(s.categories.prohibitedInMarketplace, false)` to all marketplace query WHERE clauses (4 sites: lines 95-101, 261-265, 371-381, 396-406, 441-450)
- `apps/admin-dashboard/src/pages/Marketplace.tsx` — add admin UI to toggle `prohibited_in_marketplace` per category
- `apps/admin-dashboard/src/pages/Stores.tsx` (or new `Categories.tsx`) — add category management page
- New test file `tests/category-blocklist.test.ts`

**Approach (TDD-first):**
1. Write HTTP test: a product in category with `prohibited_in_marketplace=true` does NOT appear in `GET /marketplace/products`.
2. Watch fail.
3. Add migration + schema + Zod.
4. Add WHERE clause filter.
5. Add admin UI to toggle.
6. Pre-seed: in the demo seed, mark `drugs`, `weapons`, `adult`, `counterfeit` categories as prohibited (if they exist; else add them).
7. Run tests green.

**Acceptance:**
- All P0-2 acceptance criteria met
- Pre-existing categories audited; admin can mark more as prohibited
- No `prohibited_in_marketplace=true` category shows up in marketplace queries
- Admin UI: 1 new page OR addition to existing category management

**Effort:** 1.5 days (migration + 5 query sites + UI + tests + admin audit).

**Risks:**
- **R1:** Existing products in now-prohibited categories may become invisible overnight. Mitigation: before migration, run a one-time report (out of scope of this fix, owner decision) listing affected products + merchants; communicate to merchants via email.
- **R2:** If a merchant creates a NEW category after this fix, they could bypass by naming it `drugs-2`. Mitigation: admin approval required for new categories (out of scope here; add to P2 backlog).

---

### Task 2.2 — P0-1: SFDA Field + Workflow (1.5 days, AFTER 2.1)

**Files to touch:**
- New migration `0060_product_sfda.sql`:
  - Add columns to `products`: `requires_sfda_number: boolean('requires_sfda_number').notNull().default(false)`, `sfda_number: varchar('sfda_number', { length: 100 })`, `sfda_license_type: varchar('sfda_license_type', { length: 30 })`, `sfda_expiry_date: timestamp('sfda_expiry_date')`, `sfda_verified_at: timestamp('sfda_verified_at')`, `sfda_verified_by: integer('sfda_verified_by')`
  - Add column to `categories`: `requires_sfda: boolean('requires_sfda').notNull().default(false)` (links to category-level rule)
- `packages/db/src/schema/products.ts` — add columns + composite index `(requires_sfda_number, sfda_verified_at)`
- `packages/db/src/schema/categories.ts` — add `requires_sfda` column
- `packages/shared/src/schemas/products.ts` — Zod: `sfdaNumber: z.string().regex(/^[A-Z0-9-]{5,50}$/).optional()` (format validation only; not SFDA API check)
- `apps/api/src/routes/products.ts` (merchant-side) — when product's category has `requires_sfda=true`, require `sfda_number` to be set + non-empty + format-valid; reject publish otherwise
- `apps/api/src/routes/admin/marketplace.ts` — admin UI to verify SFDA numbers (set `sfda_verified_at + sfda_verified_by`)
- `apps/admin-dashboard/src/pages/Marketplace.tsx` — show SFDA number + verify button in review queue
- New test file `tests/sfda-workflow.test.ts`

**Approach (TDD-first):**
1. Write test: merchant tries to publish product in `requires_sfda=true` category without SFDA number → 400 error.
2. Watch fail.
3. Add migration + schema + Zod.
4. Add validation in merchant products route.
5. Add admin review UI for SFDA verification.
6. Run tests green.

**Acceptance:**
- Categories with `requires_sfda=true` REQUIRE SFDA number on publish (no exception)
- Admin can verify SFDA number (sets `sfda_verified_at`)
- Verified SFDA number is required for `haaMarketplaceReviewStatus='approved'`
- No live SFDA API integration (format check only) — document as known limitation; future task = API integration

**Effort:** 1.5 days.

**Risks:**
- **R1:** SFDA API integration is OUT OF SCOPE. Mitigation: format validation + manual admin verification only. Document the limitation in PRIVACY_POLICY / TERMS.
- **R2:** SFDA expiry date is not enforced. Mitigation: add to P2 backlog; admin gets a weekly digest (future task).
- **R3:** Merchants may put fake SFDA numbers. Mitigation: admin verification step catches this. Eventually: SFDA API integration.

---

### Exit gate (Phase 2)
- [ ] Categories audit completed; ~5 high-risk categories marked prohibited
- [ ] Products in prohibited categories are invisible in marketplace
- [ ] Products in regulated categories require + display SFDA number
- [ ] Admin can mark SFDA verified
- [ ] All tests green
- [ ] Migration applied to dev DB without errors
- [ ] Migration applied to test DB (`haastores_test`) without errors

---

## 5. Phase 3 — Legal & Policy (parallel with Phase 2)

**Owner actions required.** Engineering writes copy; owner reviews and approves.

### Task 3.1 — PRIVACY_POLICY §3 Marketplace (0.5 day)

**Files to touch:**
- `docs/PRIVACY_POLICY.md` — add new section after §2.3:

```
### 2.4 بيانات السوق العام (Public Marketplace Data)

When you use the Haa public marketplace, additional data flows occur:

| Data | Purpose | Legal basis | Shared with |
|------|---------|-------------|-------------|
| Unified marketplace order | Order tracking across multiple merchants | Contract performance | All merchants in your cart |
| Marketplace search history | Product discovery, recommendations | Consent | Aggregated, anonymized only |
| Marketplace analytics events | Platform improvement, fraud detection | Legitimate interest | None (Haa internal only) |

**Multi-merchant disclosure:**
When you place a marketplace order, your data (name, phone, shipping address, order items) is shared with EACH independent merchant in your cart. Each merchant becomes a separate data controller for their portion of the order. Haa is the platform operator and unified order creator; merchants are responsible for their own data handling.

**Marketplace seller disclosure:**
Products on the Haa public marketplace are sold by INDEPENDENT MERCHANTS, not by Haa Stores directly. Haa is the platform operator and is not a party to the sale contract between you and the merchant.
```

- **Acceptance:** Section covers (a) multi-merchant data flow, (b) marketplace analytics, (c) seller disclosure. Reviewed by DPO/legal.

**Effort:** 0.5 day (engineering) + DPO review time (owner).

---

### Task 3.2 — TERMS_OF_SERVICE §8 Independent Sellers (0.5 day)

**Files to touch:**
- `docs/TERMS_OF_SERVICE.md` — add new section:

```
### 8. البائعون المستقلون (Independent Sellers on Haa Marketplace)

The Haa public marketplace allows independent merchants to list products for sale to the public. By using the marketplace, you acknowledge and agree that:

8.1 **Independent seller relationship.** Each product on the marketplace is sold by an independent merchant. Haa Stores operates the platform only and is NOT a party to the sale contract between you and the merchant. The merchant is the seller of record.

8.2 **Merchant responsibility.** The merchant is responsible for: product authenticity, accurate descriptions, shipping, returns, refunds, customer support, and any warranty. Haa's role is limited to: order aggregation, payment processing, dispute escalation (see §8.4), and platform moderation.

8.3 **Haa's liability.** To the maximum extent permitted by Saudi law, Haa is not liable for: product defects, shipping delays, merchant bankruptcy, merchant misrepresentation, or unauthorized charges by the merchant. Haa's total liability for marketplace transactions is capped at the platform fee charged for that transaction.

8.4 **Dispute escalation.** If you have a dispute with a merchant, first contact the merchant directly via their store page. If unresolved within 14 days, escalate to Haa at disputes@haastores.sa. Haa may mediate but is not obligated to refund.

8.5 **Verification of merchants.** Haa performs KYC verification (CR + VAT + bank account) on all merchants before they can sell. Haa does NOT verify product-level compliance (e.g., SFDA registration for food/cosmetic products) — see SFDA_DISCLAIMER.md for the merchant's responsibility.

8.6 **Right to suspend.** Haa reserves the right to suspend any merchant or product that violates Saudi law, MoCI regulations, or Haa's marketplace policies.
```

- **Acceptance:** Section covers (a) seller-not-platform relationship, (b) Haa's liability cap, (c) dispute escalation, (d) merchant verification scope, (e) right to suspend.

**Effort:** 0.5 day + legal review.

---

### Task 3.3 — SFDA Disclaimer Doc (0.25 day)

**Files to touch:**
- New `docs/SFDA_DISCLAIMER.md` — short document explaining:
  - Merchants are solely responsible for SFDA compliance
  - Haa provides format validation + admin verification but does NOT integrate with SFDA's API
  - Customers should verify SFDA registration independently for regulated products
- Reference this doc from PRIVACY_POLICY §2.4 and TERMS §8.5

**Acceptance:** Doc exists; referenced from main policy docs.

---

### Task 3.4 — DPO Appointment (owner action)

**Owner must:**
- Appoint a Data Protection Officer (PDPL Article 22)
- Publish DPO contact in PRIVACY_POLICY header
- Update `docs/PRIVACY_POLICY.md` §2.4 with DPO email

**Engineering effort:** 0 (owner-only). **Calendar time:** 1-2 weeks (hiring + paperwork).

---

### Exit gate (Phase 3)
- [ ] PRIVACY_POLICY §2.4 added and reviewed
- [ ] TERMS_OF_SERVICE §8 added and reviewed
- [ ] SFDA_DISCLAIMER.md created
- [ ] DPO appointed + contact published
- [ ] All three docs cross-reference each other

---

## 6. Phase 4 — P1s + Integration Tests (3 days, 3 parallel tracks)

### Track 4A: P1-1 + P1-9 (security/rate-limit hardening)

**P1-1: CSRF guest endpoint test (0.5 day)**
- New test `tests/csrf-origin-marketplace.test.ts` — assert marketplace guest endpoints (POST /orders, GET /products) accept without Origin header (server-to-server allowed) but reject with mismatched Origin (browser cross-site blocked).

**P1-9: Separate rate limit on POST /marketplace/orders (0.25 day)**
- In `apps/api/src/index.ts`, define new `marketplaceOrderRateLimit = rateLimiter({ windowMs: 10min, maxRequests: env.NODE_ENV === 'development' ? 100 : 30 })`.
- Mount: `app.use('/marketplace/orders', marketplaceOrderRateLimit, ...)` BEFORE the broader `/marketplace/*` rate limit.
- Source-grep test: assert `marketplace/orders` POST has a stricter rate limit than the browse rate limit.

**Total Track 4A:** 0.75 day.

---

### Track 4B: P1-2 + P1-3 (admin moderation hardening)

**P1-2: Permission granularity (0.5 day)**
- Add `marketplace.review` permission to `packages/shared/src/permissions.ts`
- Wire into `admin/index.ts:185-186`: `requireAdminPermission('marketplace.review')` on `PATCH /marketplace/products/:id/review`
- Add `marketplace.feature` permission similarly
- Owner/Manager roles get both
- New source-grep test: assert both review + feature endpoints have `requireAdminPermission`

**P1-3: Admin pagination (0.5 day)**
- Add `paginationSchema` query param to:
  - `GET /admin/marketplace/products` (replace hardcoded `limit(200)`)
  - `GET /admin/marketplace/orders` (replace hardcoded `limit(200)`)
- Wire to `admin/marketplace.ts:48, 118`
- Update admin UI to use new pagination (preserve filter state across pages)
- New test: pagination works (page=2 returns different rows than page=1)

**Total Track 4B:** 1 day.

---

### Track 4C: T5-T10 integration tests (1 day)

**T5: Admin review writes to audit_logs** (covered by P0-5 implementation, but write the HTTP-level test)
**T6: Public marketplace excludes non-`published` stores**
**T7: Public marketplace excludes non-`active` products**
**T8: Public `/sellers/:slug` does not leak `email` or `phone`**
**T9: Search performance at 10k products (optional — manual benchmark with `EXPLAIN ANALYZE`)**
**T10: XSS sanitization in product name / description / notes**

All in a new test file `tests/marketplace-public-safety.test.ts`. Use the test DB seeded with fixtures.

**Total Track 4C:** 1 day.

---

### Exit gate (Phase 4)
- [ ] All P1-1, P1-2, P1-3, P1-9 fixes merged
- [ ] T1-T10 all green
- [ ] `pnpm ci:local` green (expect ~2400 tests now)
- [ ] Source-grep tests prevent regression
- [ ] All P0/P1 tasks in TASK_TRACKER marked Done

---

## 7. Phase 5 — Owner-Only Gates (1-2 weeks calendar)

These are NOT engineering tasks. They are owner-coordinated items that MUST close before beta launch.

| # | Item | Owner action | Source |
|---|---|---|---|
| G1 | Commercial Registration (CR) | Register company with MoCI | `SAUDI_COMPLIANCE_CHECKLIST.md:178` |
| G2 | VAT Registration | Register with ZATCA; obtain VAT certificate | `:134` |
| G3 | E-Commerce License | Apply for online sales license | `:179` |
| G4 | DPO Appointment | Hire/appoint DPO; publish contact | `:97-98` |
| G5 | Trademark Registration | Register "هاء متاجر" with SAIP | `:280` |
| G6 | PCI-DSS ASV Scan | Engage approved ASV vendor | `:43` |
| G7 | Penetration Test | Engage CREST-certified firm (separate from ASV) | Audit Phase 6 |
| G8 | KSA Hosting Decision | Decide Dubai-now vs wait-for-KSA-region | `:208` |
| G9 | Tabby DPA | Sign DPA with Tabby (UAE cross-border) | `:96` |
| G10 | Disaster Recovery Plan | Document + test DR procedure | NCA requirement |

**Engineering support (minimal):**
- Provide deploy access to test environment for vendor scans
- Provide technical documentation for pen-test firm
- Be available for clarification calls
- Triage and fix any pen-test findings (estimate 2-5 days depending on findings count)

---

## 8. Phase 6 — Pen-Test + Controlled Beta Launch (1-2 weeks)

### Step 8.1 — Pre-pen-test smoke (0.5 day engineering)

Run a final local smoke test (read-only, against dev environment):
```bash
# 1. Marketplace returns only approved/published/active products
curl -s http://localhost:3000/marketplace/products?limit=5 | jq '.data.total'

# 2. Demo stores appear (only 'main' profile after P0-4 fix)
curl -s http://localhost:3000/marketplace/sellers | jq '.data[].slug'

# 3. Order tracking requires accessToken (no phone)
curl -s "http://localhost:3000/marketplace/orders/HM-FAKE" | jq '.success'
# expected: false (401, no token)

# 4. Admin route requires auth
curl -s http://localhost:3000/admin/marketplace/summary | jq '.success'
# expected: false (401)

# 5. Prohibited category products are hidden
# (after seeding a category as prohibited, assert empty result)
```

### Step 8.2 — External pen-test (1 week calendar)

Engage pen-test firm. Scope:
- Public marketplace endpoints
- Admin moderation endpoints
- Tenant isolation
- XSS in product/store content
- Rate limit bypass
- Order tracking enumeration resistance
- Demo store visibility
- SFDA field workflow

### Step 8.3 — Pen-test findings triage (2-5 days engineering)

Findings classification:
- **Critical (P0):** Must fix before beta launch
- **High (P1):** Must fix within 2 weeks of beta launch
- **Medium (P2):** Add to backlog, fix in next sprint
- **Low (P3):** Backlog

### Step 8.4 — Controlled beta launch (0.5 day)

- Invite 10-20 handpicked merchants (verify KYC + product compliance)
- Soft-launch: marketplace visible only to invited merchants' customers via shared link
- Monitor for 1 week before general availability
- Have rollback plan ready (env flag: `MARKETPLACE_PUBLIC_ENABLED=false`)

---

## 9. Risk Register (Cumulative)

| # | Risk | Probability | Damage | Mitigation | Owner |
|---|---|---|---|---|---|
| **RR-1** | Owner legal/DPO takes longer than 2 weeks | High | High (delays Phase 6) | Start owner track in parallel with Phase 1; don't wait for engineering | Owner + Engineering |
| **RR-2** | Pen-test finds Critical issues requiring schema migration | Medium | High (delays Phase 6 by 1-2 weeks) | Reserve 5 days in Phase 6.3 for findings triage | Engineering |
| **RR-3** | Existing merchants lose visibility when categories become prohibited | High | Medium (merchant complaints) | Pre-migration report + email blast 1 week before | Owner (comm) + Engineering |
| **RR-4** | Existing orders without accessToken break tracking | Medium | Medium (customer support burden) | Backfill tokens in migration; show fallback UI for pre-fix orders | Engineering |
| **RR-5** | `shouldShowInMarketplace` import not used causes 4 query rewrites → potential perf regression | Low | Medium | Add perf benchmark before/after | Engineering |
| **RR-6** | Demo seed change ('general' → 'main') breaks other seed-dependent tests | Medium | Medium | Run `pnpm db:test:setup` + full test suite in CI | Engineering |
| **RR-7** | Multiple migrations (0058, 0059, 0060) close together may conflict | Low | Medium | Land each in separate PR; test DB re-setup between | Engineering |
| **RR-8** | External pen-test firm not CREST-certified | Low | Medium | Verify firm credentials before engagement | Owner |
| **RR-9** | Tabby DPA signing delayed | Medium | Medium | If delayed, restrict marketplace to non-BNPL merchants for beta | Owner |
| **RR-10** | KSA hosting region not available at launch | High | Low (Dubai acceptable) | Use Dubai region with documented plan to migrate | Owner |

---

## 10. Estimated Effort Summary

| Phase | Engineering days | Owner/Legal days | Calendar |
|---|---:|---:|---|
| Phase 0 | 0.5 | 0 | 0.5 day |
| Phase 1 (3 parallel tracks) | 2 | 0 | 2 days |
| Phase 2 | 3 | 0 | 3 days |
| Phase 3 | 1 | 5-10 | 1-2 weeks |
| Phase 4 (3 parallel tracks) | 3 | 0 | 3 days |
| Phase 5 | 1 (vendor support) | 10-15 | 2-3 weeks |
| Phase 6 | 5-7 | 1-2 | 1-2 weeks |
| **Total** | **~16-19 eng days** | **~16-27 owner days** | **~5-7 weeks** |

With 1 engineer at full capacity + parallel owner track, **~4-5 weeks to controlled-beta launch**.

---

## 11. Critical Path & Decision Points

```
[Phase 0: 0.5d]
       │
       ▼
[Phase 1: 2d parallel]
   ├─ P0-4 demo ─┐
   ├─ P0-3 accessToken ─┤ (parallel)
   └─ P0-5 audit ───────┘
       │
       ▼
[Phase 2: 3d sequential]
   P0-2 categories → P0-1 SFDA
       │
       ▼ (parallel)
[Phase 3: legal copy]        [Phase 4: 3d P1s]
       │                              │
       └────────────┬─────────────────┘
                    ▼
[Phase 5: Owner gates - calendar-driven]
                    │
                    ▼
[Phase 6: Pen-test + beta launch]
```

**Decision points where we may want to stop and assess:**
- **After Phase 1:** Have we closed the most embarrassing gaps? Is momentum building? → GO/NO-GO on Phase 2.
- **After Phase 4:** Are all P0/P1 closed in code? Is owner track (Phase 3 + 5) on track? → GO/NO-GO on Phase 5/6.
- **After pen-test findings triage:** Are all Critical/High issues fixed? → GO/NO-GO on beta launch.

**If NO-GO at any point:** pause; address blockers; reassess in 1 week.

---

## 12. Out of Scope (Documented for Future Passes)

The following are explicitly deferred and will be tracked as P2/P3 backlog items:
- **P2-7 + P2-8:** Real payment methods (Tabby/Tamara/Moyasar) wired at marketplace checkout (depends on storefront checkout refactor — separate sprint)
- **P2-10:** Verify VAT badge actually renders in marketplace UI (CURRENT_STATE claim needs visual confirmation)
- **P2-11:** Schema.org JSON-LD for SEO
- **P1-4:** Search FTS or trigram index (performance optimization for 10k+ products)
- **P1-5:** Subquery refactor for category lookup (performance optimization)
- **Customer-side "report product" → admin queue** (1-2 days, separate)
- **Bulk moderation UI** (separate feature)
- **ZATCA e-invoicing** (already in `docs/ZATCA_ROADMAP.md`, separate TASK-0036)
- **Tabby API integration** (separate, post-MVP)
- **External SFDA API integration** (separate, post-MVP)

These are tracked in `docs/ops/TASK_TRACKER.md` as future tasks.

---

## 13. Exit Criteria for "Phase 6 Complete = Beta Live"

The marketplace is SAFE TO LAUNCH TO CONTROLLED BETA when ALL of the following are true:

- [ ] All 6 P0s closed + tests green
- [ ] All 9 P1s closed + tests green
- [ ] All 10 critical tests (T1-T10) passing
- [ ] Owner legal copy (PRIVACY_POLICY §2.4, TERMS §8, SFDA_DISCLAIMER) published
- [ ] DPO appointed + contact published
- [ ] CR + VAT + E-commerce license obtained (or beta restricted to internal users)
- [ ] External pen-test report PASS or all Critical/High findings fixed
- [ ] Disaster recovery plan documented and tested
- [ ] Rollback plan documented (env flag: `MARKETPLACE_PUBLIC_ENABLED=false`)
- [ ] Monitoring dashboards configured (ops:monitor + new marketplace-specific alerts)
- [ ] Incident response runbook reviewed for marketplace-specific scenarios
- [ ] 10-20 handpicked merchants onboarded with KYC verified
- [ ] Beta cohort agreed to feedback loop (weekly sync for first month)

**If any of the above is NOT met → do not launch. Stay in demo mode.**

---

## 14. Communication Plan

| Audience | Cadence | Content | Owner |
|---|---|---|---|
| Engineering team | Daily standup (during Phase 1-4) | Tasks in flight, blockers | Eng lead |
| Owner | Weekly status (Monday) | Phase progress, blockers, upcoming owner-action items | Eng lead |
| Beta merchants | Pre-launch (1 week) | Onboarding instructions, KYC requirements, marketplace policies | Owner |
| Beta customers (via merchants) | At launch | What the marketplace is, who Haa is, who the merchant is | Owner |
| Legal/DPO | At PRIVACY_POLICY/TERMS draft | Privacy + seller-disclosure copy for review | Eng lead |

---

## 15. Documentation Updates (Final)

This plan should be referenced from:
- `docs/ops/CURRENT_STATE.md` — add as active strategic initiative
- `docs/ops/TASK_TRACKER.md` — reference this plan from each new TASK
- `docs/ops/COMMITMENTS.md` — note "marketplace launch gated by this plan's exit criteria"
- `docs/ops/DEFINITION_OF_READY.md` — add "marketplace launch must follow this plan"
- `docs/PUBLIC_MARKETPLACE_AUDIT.md` — add cross-reference to this plan

---

## Plan Confidence

| Section | Confidence | Why |
|---|---|---|
| Phase 1 effort estimates | HIGH | Self-contained fixes; pattern matches existing fixes (R-0014 for accessToken, audit pattern from orders.ts) |
| Phase 2 effort estimates | HIGH | Schema additions are well-trodden path; admin UI additions are routine |
| Phase 3 legal effort | LOW | Legal review is unpredictable; could be 1 day or 2 weeks |
| Phase 4 effort estimates | HIGH | Standard pagination + permission + test work |
| Phase 5 owner-track | LOW | Owner actions are highly variable; could be 2 weeks or 2 months |
| Phase 6 pen-test findings | LOW | Pen-test findings can range from 0 to dozens; triage effort varies wildly |
| Total calendar estimate (4-5 weeks) | MEDIUM | Best-case if everything aligns; could be 6-8 weeks with realistic owner/legal delays |

**If anything takes longer than estimated, the safe action is to NOT launch and stay in demo mode. The cost of a delayed launch is small; the cost of a regulatory or security incident is large.**

---

**Plan complete.** No code was written; no files were modified except this plan itself. The plan is the deliverable.
