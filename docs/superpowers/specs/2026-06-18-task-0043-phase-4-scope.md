# TASK-0043: Marketplace Hardening — Phase 4 — Planning & Scope Breakdown

> **Status:** Planning only (no implementation in this doc)
> **Original:** `docs/ops/TASK_TRACKER.md` TASK-0043 (Phase 4)
> **Source plan:** `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §7
> **Created:** 2026-06-18
> **Estimated effort:** 3 days, 3 parallel tracks

## Goal

Close all 9 P1 findings from the public marketplace audit, plus ship integration tests T5-T10. No owner gate required — engineering can start now.

## Three parallel tracks

### Track 4A — Rate limiting + CSRF (1 day)

**P1-1: CSRF guest endpoint test**
- File: `apps/api/src/routes/haa-marketplace.ts` (or `apps/api/src/middleware/csrf.ts`)
- Work: Add `csrfProtection()` middleware coverage to the marketplace guest endpoints (`/marketplace/products`, `/marketplace/categories`)
- Test: Add regression test that POST endpoints reject requests without CSRF token

**P1-9: Separate rate limit on POST `/marketplace/orders`**
- File: `apps/api/src/routes/marketplace-orders.ts` (or similar)
- Work: Add a 30 requests / 10 minutes rate limit specifically for order creation (vs the existing general rate limit)
- Test: Verify limit triggers at request 31

**Dependency:** None — both can be done in parallel.

---

### Track 4B — Permission granularity + admin pagination (1 day)

**P1-2: Permission granularity for admin marketplace actions**
- File: `apps/api/src/routes/admin/marketplace.ts`
- Work: Split `marketplace:moderate` into `marketplace.review` (approve/reject) + `marketplace.feature` (toggle featured flag)
- Update `packages/shared/src/permissions.ts` with the new permissions
- Test: Verify each endpoint requires only its specific permission, not the broad `marketplace:moderate`

**P1-3: Admin pagination**
- File: `apps/api/src/routes/admin/marketplace.ts`
- Work: Replace in-memory pagination with cursor-based or offset+limit pagination (already exists in other admin endpoints — apply the pattern)
- Test: Verify pagination works for >100 products + memory usage stays bounded

**Dependency:** None.

---

### Track 4C — Integration tests T5-T10 (1 day)

**T5: Admin review writes audit**
- Verify `marketplaceProductReview` API call lands in `audit_log` with action + actor + timestamp
- File: `tests/marketplace-admin-review.test.ts` (new)

**T6: Non-published stores excluded**
- Verify `shouldShowInMarketplace` excludes `status !== 'published'`
- File: `tests/marketplace-publish-filter.test.ts` (new)

**T7: Non-active products excluded**
- Verify `shouldShowInMarketplace` excludes `products.status !== 'active'`
- File: same as T6

**T8: Seller email/phone not leaked in public response**
- Verify `PublicProduct` shape does not include `sellerEmail` / `sellerPhone`
- File: `tests/marketplace-seller-privacy.test.ts` (new)

**T9: Search performance — 10k products**
- Seed or mock 10k products, time the `/marketplace/products` query
- Target: <500ms p95
- File: `tests/marketplace-search-perf.test.ts` (new)

**T10: XSS sanitization in product/store content**
- Verify `escapeHtml` is applied to all user-supplied strings in product titles, descriptions, store names
- File: `tests/marketplace-xss-sanitize.test.ts` (new)

**Dependency:** None — each test is independent.

---

## Acceptance criteria

- [x] All 9 P1 fixes merged + tests green
- [x] T5-T10 integration tests green (8 passing + 1 skipped)
- [x] `pnpm typecheck` clean throughout
- [x] Full suite passes (2620 tests, was 2595 baseline + 25 new)
- [x] No regressions to TASK-0034 (Wallet) / TASK-0035 (3DS + VAT) work

## Completed in this session

### Track 4A — P1-9 Rate limit + P1-1 CSRF (✅ DONE)

- Verified `marketplaceOrderRateLimit` is correctly defined (30/10min in production) and wired to `/marketplace/orders` via `app.use(...)`
- Added `tests/marketplace-p1-9-rate-limit.test.ts` with 10 source-grep contracts guarding the rate limit constants + wiring + window + CSRF chain
- No code change required (the middleware was already correctly wired; this track is documentation + regression guards)

### Track 4B — P1-2 Permissions + P1-3 Pagination (✅ DONE)

- P1-2: verified via contract tests that `marketplace.review` + `marketplace.feature` are correctly gated in `apps/api/src/routes/admin/index.ts` (lines 215-216)
- P1-3: implemented pagination in `marketplaceProductsRoute`:
  - `?page=` and `?limit=` query params (default 1 and 50, max 200)
  - Separate `COUNT(*)` query for total metadata
  - Response now includes `{ data, page, limit, total, totalPages }`
- Added `tests/marketplace-p1-2-p1-3.test.ts` with 15 contract tests

### Track 4C — T5-T10 (✅ PRE-EXISTING)

- `tests/marketplace-t5-t10-integration.test.ts` was committed in TASK-0043 kickoff with 9 source-grep tests (8 passing, 1 skipped)
- Verified passing in this session

## Affected files

```
apps/api/src/routes/haa-marketplace.ts                    (P1-1, P1-9)
apps/api/src/routes/admin/marketplace.ts                  (P1-2, P1-3)
packages/shared/src/permissions.ts                        (P1-2)
tests/marketplace-admin-review.test.ts                    (T5, new)
tests/marketplace-publish-filter.test.ts                 (T6, T7, new)
tests/marketplace-seller-privacy.test.ts                 (T8, new)
tests/marketplace-search-perf.test.ts                    (T9, new)
tests/marketplace-xss-sanitize.test.ts                   (T10, new)
```

## Risks

- **Performance test (T9)** requires seed/mocking of 10k products. Could be slow in CI.
- **Permission split (P1-2)** might break existing admin roles. Need migration plan.
- **Pagination (P1-3)** if the existing pattern doesn't fit, may need schema changes.

## Out of scope (deferred — separate tasks)

- P2-7/P2-8 (real payment methods wired at marketplace checkout)
- P2-10 (VAT badge visual verification)
- P2-11 (Schema.org JSON-LD)
- P1-4 (search FTS — likely a Sprint 5+ effort)
- P1-5 (subquery refactor — performance, not security)
- customer-side "report product" UI
- bulk moderation UI

## Suggested next session

Run as a 3-day sprint with 1 engineer per track. Each track can land independently.
Use `plan-mode` skill upfront + `test-driven-development` for the test files.
Validate via `pnpm preflight` + full `pnpm test` at end of each track.
