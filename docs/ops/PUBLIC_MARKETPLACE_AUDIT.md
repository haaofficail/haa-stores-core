# Haa Stores — Public Marketplace Audit Report

> **Audit type:** Read-only Professor-Level Audit
> **Auditor role:** Principal Marketplace Systems Auditor
> **Audit date:** 2026-06-17
> **Scope:** Haa Stores public marketplace (السوق العام) — readiness for commercial launch
> **Methodology:** Code inspection + schema analysis + test review + doc cross-check; no execution, no mutation, no commit.

---

## Executive Verdict

| Field | Value |
|---|---|
| **Final verdict** | **3. جاهز للديمو فقط** — NOT ready for commercial launch |
| **Readiness percentage** | **~38%** for commercial launch / ~70% for controlled internal beta |
| **Launch blocker count** | **6 P0** (legal/compliance/security); **9 P1** (must-fix-before-public) |
| **Recommended launch mode** | Controlled demo / invite-only beta only — DO NOT expose `/marketplace` to general public traffic |

**One-sentence verdict:** السوق العام في Haa Stores مبني بنية تحتية جيدة (rate limiting، CSRF، demo isolation في shared layer، state machine moderation)، لكنه **يفشل في 6 شروط حاسمة للإطلاق التجاري**: لا SFDA، لا تقييد فئات محظورة، تعداد طلبات عبر `phone`، فلاتر ديمو متعارضة، لا audit logging للـ moderation، لا تغطية legal copy للسوق.

---

## Scope Reviewed

### Files / directories reviewed
| Layer | Path | Notes |
|---|---|---|
| Public marketplace API | `apps/api/src/routes/haa-marketplace.ts` (680 LOC) | Core public marketplace |
| Admin moderation | `apps/api/src/routes/admin/marketplace.ts` (316 LOC) | Review queue + payouts + settlements |
| Storefront marketplace UI | `apps/storefront/src/pages/Marketplace*.tsx` (7 files, 1440 LOC) | Cart, checkout, order track, seller pages, product detail |
| Storefront mount | `apps/storefront/src/App.tsx` lines 27-92 | 9 marketplace routes |
| Admin marketplace UI | `apps/admin-dashboard/src/pages/Marketplace.tsx` (250 LOC) | Review console + reports |
| Schema (marketplace) | `packages/db/src/schema/marketplace_orders.ts` (44 LOC), `marketplaces.ts` (94 LOC) | marketplaceOrders, marketplaceOrderLinks |
| Schema (relevant) | `packages/db/src/schema/products.ts`, `stores.ts`, `orders.ts`, `compliance.ts`, `categories.ts` | isDemo, demoProfile, haaMarketplace* columns |
| Shared rules | `packages/shared/src/demo/demo-rules.ts` (135 LOC) | isDemoStore, shouldShowInMarketplace, demo profiles |
| API mount + middleware | `apps/api/src/index.ts` (357 LOC) | rate limiting, CSRF, route mounts |
| Demo seeds | `packages/db/src/seed/index.ts`, `seed/demo/haa-demo.ts`, `seed/demo/perfume-demo.ts` | demo store creation |
| Commerce core (checkout) | `packages/commerce-core/src/checkout.ts:208-253` | 'haa_marketplace' source detection |
| Cart | `packages/commerce-core/src/cart.ts:122` | source propagation |
| Docs | `docs/MARKETPLACE_CONNECT_GUIDE.md`, `docs/SAUDI_COMPLIANCE_CHECKLIST.md`, `docs/PRIVACY_POLICY.md`, `docs/TERMS_OF_SERVICE.md`, `docs/PUBLIC_API_SAFETY.md`, `docs/CURRENT_STATE.md` | 346 LOC SAUDI_COMPLIANCE_CHECKLIST + 262 LOC PRIVACY_POLICY |

### Endpoints reviewed (public marketplace — `/marketplace/*`)

| Method | Path | File:line | Auth | Tenant scoped? |
|---|---|---|---|---|
| GET | `/marketplace/products` | `haa-marketplace.ts:70` | None (public) | Yes (via status filter) |
| GET | `/marketplace/products/:storeSlug/:productSlug` | `:202` | None (public) | Yes |
| GET | `/marketplace/sellers` | `:354` | None (public) | Yes |
| GET | `/marketplace/sellers/:storeSlug` | `:275` | None (public) | Yes |
| GET | `/marketplace/categories` | `:430` | None (public) | Yes |
| POST | `/marketplace/orders` | `:477` | None (public) | Yes (via storeSlug in body) |
| GET | `/marketplace/orders/:marketplaceOrderNumber` | `:625` | None — only `?phone=` | Partial (phone-only gate) |
| GET | `/admin/marketplace/*` (8 routes) | `admin/index.ts:183-190` | requireAdminAuth | Yes |
| PATCH | `/admin/marketplace/products/:id/review` | `admin/index.ts:185` | requireAdminAuth + zValidator | Yes |
| PATCH | `/admin/marketplace/products/:id/feature` | `:186` | requireAdminAuth | Yes |

### Tables reviewed

- `marketplace_orders` (44 LOC) — marketplaceOrderNumber, status, customerPhone, customerEmail, paymentStatus, fulfillmentStatus
- `marketplace_order_links` (44 LOC) — unique on orderId, index on storeId
- `products.haaMarketplaceEnabled` + `haaMarketplaceReviewStatus` + `haaMarketplaceFeatured*` (10 columns)
- `stores.isDemo`, `demoProfile`, `demoSeedVersion`, `publishStatus`
- `orders.source = 'haa_marketplace'` discriminator (default 'storefront')
- `kyc_profiles`, `kyc_documents`, `merchant_bank_accounts` (compliance)

### Tests reviewed (144 test files total)

- `tests/marketplace-demo.test.ts` (127 lines) — ✅ Tests `shouldShowInMarketplace`, `isMarketplaceOrderMixedWithDemo` for shared layer
- `tests/multi-tenancy.test.ts` — ❌ Does NOT cover marketplace routes
- `tests/rbac-coverage.test.ts:59` — `haa-marketplace.ts` is in DENY_LIST (intentionally public)
- `tests/audit-depth.test.ts` — Does NOT cover admin marketplace review actions
- `tests/products-qa-regression.test.ts`, `oto-marketplace-platform-regression.test.ts`, `settlement-order-linking.test.ts` — touch marketplace peripherally

---

## Marketplace Architecture Map

### Current architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ Browser — /marketplace/* (apps/storefront)                      │
│   ├ HaaMarketplace (browse)                                     │
│   ├ MarketplaceSellers + MarketplaceSeller                      │
│   ├ MarketplaceProductDetail                                   │
│   ├ MarketplaceCart (local cart, demo-aware via demo-rules)    │
│   ├ MarketplaceCheckout (groups by store, calls per-store API) │
│   └ MarketplaceOrderTrack (?phone= in query)                    │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│ API server — apps/api/src/routes/haa-marketplace.ts             │
│   GET /products, /products/:s/:p, /sellers, /sellers/:s,        │
│   /categories — public browse (rate-limited 600/10min prod)     │
│   POST /orders — creates marketplace order from subOrders      │
│   GET /orders/:num — phone-only access                          │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│ DB layer — packages/db                                          │
│   products + stores (with isDemo/demoProfile/haaMarketplace*)   │
│   marketplace_orders + marketplace_order_links                  │
│   orders (source='haa_marketplace' discriminator)                │
└─────────────────────────────────────────────────────────────────┘

Admin moderation — apps/api/src/routes/admin/marketplace.ts
   GET /summary, /products, /sellers, /orders, /settlements,
       /deep-report
   PATCH /products/:id/review (status: pending|approved|rejected|suspended)
   PATCH /products/:id/feature (featured, featuredUntil, sortOrder)
   ⚠ NO audit_log writes on review/feature actions
```

### Public flows
- **Browse:** `GET /marketplace/products` filters `stores.isDemo + haaMarketplaceEnabled + haaMarketplaceReviewStatus='approved'` OR `stores.isDemo + demoProfile IS NOT NULL`
- **Detail:** `GET /marketplace/products/:storeSlug/:productSlug` with same filter
- **Seller discovery:** `/marketplace/sellers` and `/marketplace/sellers/:storeSlug`
- **Categories:** `/marketplace/categories` aggregates from visible products
- **Cart:** local storage (`marketplace-cart.ts`); not persisted server-side
- **Checkout:** groups items by store; creates one cart + checkout session per store via `cartApi.create(group.slug)` (correct `storeId` propagation)
- **Order tracking:** `GET /marketplace/orders/:number?phone=` (no auth beyond phone)

### Admin flows
- Review queue with status filter
- Approve / Reject / Suspend buttons
- Feature toggle with sort order
- Settlement report (read-only, links to manual payouts)
- Deep report (GMV, top sellers, moderation counts)

### Merchant flows
- Products: opt-in via `haaMarketplaceEnabled` (default `false`)
- Status defaults to `pending`; admin reviews to `approved`/`rejected`/`suspended`
- Featured via admin (no merchant self-service)
- After checkout, marketplace suborders are converted to normal merchant orders and continue through merchant's normal shipping/support/return flows (per CURRENT_STATE.md §Important Decisions)

### Customer flows
- Browse → filter → product detail → add to cart → checkout → order tracking
- Guest checkout (no auth required); customer identified by phone + name at checkout
- CustomerEmail optional; paymentMethod is `fake_card_success | bank_transfer | cash_on_delivery` only (no Tabby/Tamara/Moyasar integration visible at checkout time despite CURRENT_STATE mentioning them)

---

## Findings Summary

| Severity | Count | Meaning |
|---|---:|---|
| **P0** | **6** | Must fix before ANY public exposure |
| **P1** | **9** | Must fix before commercial launch |
| **P2** | **11** | Quality issues, deferrable post-MVP |
| **P3** | **6** | Nice-to-have improvements |
| **Total** | **32** | findings |

---

## P0 Launch Blockers

| # | Title | Evidence | Impact | Probability | Damage | Blocker? | Fix scope |
|---|---|---|---|---|---|---|---|
| **P0-1** | **SFDA / restricted-categories control is ABSENT** | `grep -rn "sfda\|SFDA\|sfdaNumber\|requires_sfda"` across `packages/db/src/schema/`, `apps/api/src/`, `packages/` → **0 matches**. `SAUDI_COMPLIANCE_CHECKLIST.md:237` claims "Marketplace product schema has it" — **this is a doc-vs-code drift (false claim)**. `products` schema has no `sfdaNumber`, `categoryCompliance`, `requiresLicense`, `prohibitedCategory`, `regulatedCategory` columns. | A merchant can publish food, cosmetics, medical devices, supplements without SFDA number. Platform exposes consumers to illegal/unregulated products. Saudi Food & Drug Authority (SFDA) + MoCI penalties. | High (default path) | High (regulatory + consumer harm) | ✅ YES | Add `requires_sfda_number`, `sfda_number`, `regulated_category`, `prohibited_in_marketplace` to products + categories; block publish if `requires_sfda && !sfda_number`; admin override only. Add Zod enum. Estimated 2-3 days. |
| **P0-2** | **No exclusion of prohibited/regulated categories** | `categories` schema has no `regulatedCategory` field. No enum mapping food/cosmetic/medical. `MarketplaceCart` and `MarketplaceCheckout` accept any product from any category. | Same as P0-1, but for the category-level rule. Platform becomes a vector for illegal goods (drugs, weapons, counterfeit). MoCI blacklist. | High | Critical | ✅ YES | Add category classification table; hard-block entire categories at marketplace layer; admin must whitelist. 1-2 days. |
| **P0-3** | **Marketplace order tracking via `phone=` is an enumeration vector + PDPL leak** | `haa-marketplace.ts:625-678` — `GET /marketplace/orders/:marketplaceOrderNumber?phone=` returns full order details (customerName, customerPhone, all sub-orders, totals) if both match. Rate limit is `storefrontBrowseRateLimit = 600/10min` (shared with all marketplace browsing). Math: 600/10min × 6/hr × 24h = 86,400 attempts/day per IP. With phone space ~10M (Saudi format) → **an attacker can enumerate ~1% of customer phone space per IP per day**. Response also leaks phone in body (line 659). | Phone enumeration of real customers → PII breach; PDPL Article 19 violation (data subject rights compromised); reputational harm. | Medium-High | High | ✅ YES | Replace `phone=` with cryptographically-random `accessToken` (32+ chars) generated at order creation, returned once, stored hashed; require token + orderNumber to view. Add audit log on view. Estimated 1 day. Mirrors the support-ticket accessToken fix (R-0014 in CURRENT_STATE). |
| **P0-4** | **Demo isolation contract broken — `shouldShowInMarketplace` is imported but NEVER USED in `haa-marketplace.ts`** | `haa-marketplace.ts:10` imports `shouldShowInMarketplace` but the routes use raw `sql\`${s.stores.demoProfile} IS NOT NULL\`` (lines 92, 263, 400, 448). `seed/index.ts:146` creates demo store with `demoProfile: 'general'`, but `demo-rules.ts:86-97` only defines profiles `main` + `perfume` in the whitelist. Result: **demo store with `demoProfile='general'` passes the SQL filter and IS shown on marketplace**, contradicting `tests/marketplace-demo.test.ts:35-37` which asserts `'unknown'` profile → `shouldShowInMarketplace=false`. Doc-code-test drift confirmed. | Demo store with unrecognized profile leaks into public marketplace alongside real stores. Customer cannot distinguish demo from real (until badge renders, but only for 'main'/'perfume'). Trust erosion. | Medium (depends on seed profile values) | High (trust + regulatory — selling from non-existent demo data) | ✅ YES | Replace raw `demoProfile IS NOT NULL` with shared `shouldShowInMarketplace(store)` helper. Add 'general' to whitelist OR rewrite seed to use 'main'/'perfume'. Add HTTP-level test in `tests/marketplace-demo.test.ts` that hits the route and asserts no 'general' demo appears. Estimated 0.5 day. |
| **P0-5** | **No audit log on admin moderation actions (approve / reject / suspend / feature)** | `admin/marketplace.ts:58-87` — `marketplaceProductReviewRoute` and `marketplaceProductFeatureRoute` perform UPDATE but never call `audit.record(...)`. Compare to `orders.ts:321+` and `wallet.ts:170+` which DO audit. | No accountability for moderation decisions. MoCI consumer protection + PDPL Article 17 (accountability principle) violations. Cannot prove who approved what. | Low (admin-only) | High (compliance + forensic) | ✅ YES | Add `audit.record('marketplace_product_review', { productId, fromStatus, toStatus, note })` and `'marketplace_product_feature'` audit calls. Wire AuditLogService. Estimated 0.5 day. |
| **P0-6** | **PRIVACY_POLICY + TERMS_OF_SERVICE do NOT cover public marketplace** | `grep -rn "marketplace\|Marketplace" docs/PRIVACY_POLICY.md docs/TERMS_OF_SERVICE.md` → **0 matches**. PRIVACY_POLICY §2.2 covers customer data for "single store" model. Multi-merchant marketplace creates new flows: shared customer data across N merchants, unified order tracking, marketplace-specific dispute resolution. No seller disclosure (e.g. "this product is sold by an independent merchant on Haa, not by Haa Stores directly"). No PDPL legitimate-interest basis for cross-merchant data sharing. | Legal exposure: PDPL Article 6 (transparency), Article 10 (data sharing), Article 18 (complaints). MoCI consumer protection requires platform disclosure for marketplace. | Certain (if launched) | High (regulatory + liability) | ✅ YES | Add §3 "السوق العام" to PRIVACY_POLICY covering: (a) multi-merchant data flow, (b) marketplace analytics, (c) customer support routing. Add §8 "البائعون المستقلون" to TERMS disclosing independent seller model, Haa's role as intermediary, dispute escalation. Estimated 1 day + legal review. |

---

## P1 Must Fix Before Public Launch

| # | Title | Evidence | Impact | Probability | Damage | Fix scope |
|---|---|---|---|---|---|---|
| **P1-1** | **No CSRF protection on `POST /marketplace/orders`** | CSRF middleware (`apps/api/src/middleware/csrf-origin.ts`) IS mounted globally (`index.ts:91`) — this is good. **But:** marketplace orders are guest-checkout; session cookies absent, so attack surface reduced but CSRF still blocks cross-origin form-submits from attackers who exploit the cookie-less flow. Verify CSRF allows guest requests without `Origin` header. | Cross-origin order submission on behalf of logged-in admin/merchant. Need explicit test. | Low | Medium | 0.5 day — add test in `tests/csrf-origin.test.ts` confirming marketplace guest endpoints accept without Origin (server-to-server allowed) but reject with mismatched Origin. |
| **P1-2** | **No explicit `requirePermission` granularity on admin marketplace review** | `admin/index.ts:185` — `PATCH /marketplace/products/:id/review` only requires `requireAdminAuth()`. Any admin (even read-only) can approve/reject. `kycRoutes.review` has dedicated permission pattern. | Privilege escalation risk: support-staff admin accounts can change moderation state. | Medium | High (compliance + abuse) | 0.5 day — add `requireAdminPermission('marketplace.review')` + corresponding permission to PERMISSION_CATALOG. |
| **P1-3** | **Admin reports and settlements queries lack pagination** | `admin/marketplace.ts:48, 118` — `limit(200)` hardcoded. No pagination params. With growth, admin marketplace pages will time out / load slowly. | Performance degradation; admin UX. | High (at scale) | Medium | 0.5 day — add pagination schema + offset/cursor. |
| **P1-4** | **Search uses `ILIKE %term%` — no FTS, no trigram, O(n) scan** | `haa-marketplace.ts:103-106` — `ilike(products.name, '%search%') OR ilike(stores.name, '%search%')`. No `pg_trgm` index, no `to_tsvector`. | At 10k products, search p95 >2s. User-facing regression. | Certain at scale | Medium-High | 1-2 days — add `pg_trgm` extension + GIN index on `products.name` + `stores.name`. Or migrate to `tsvector` with Arabic analyzer. |
| **P1-5** | **Subquery per product for categoryName/Slug — N+1 risk at scale** | `haa-marketplace.ts:156-171, 230-245` — two correlated subqueries per row in `/products` and `/products/:storeSlug/:productSlug`. With limit=100, that's 200 subqueries per request. | Slow marketplace pages at 100+ products. | High at scale | Medium | 1 day — refactor to `LEFT JOIN LATERAL` or `GROUP BY` aggregate; or denormalize `primaryCategoryName` into products. |
| **P1-6** | **`generateMarketplaceOrderNumber` uses `Math.random()` with 36⁶ = 2.2B space** | `haa-marketplace.ts:22-29`. Today `phone` gate is the actual auth. **Once P0-3 is fixed** (accessToken), this becomes less critical, but predictability remains a risk. | Order number prediction (mostly mitigated by accessToken). | Low | Low | 0.25 day — use `crypto.randomUUID()` or `crypto.randomBytes(4).toString('hex')` for the random suffix. |
| **P1-7** | **No `seller disclosure` in checkout copy / order confirmation** | `MarketplaceCheckout.tsx:140-165` — success page mentions "كل متجر مسؤول" but does NOT explicitly say "this is a marketplace; Haa is the platform, not the seller". | PDPL/MoCI platform transparency gap. Customer confusion on who to contact for issues. | Certain | Medium (legal + UX) | 0.5 day — add prominent disclosure text + link to TERMS §8. |
| **P1-8** | **CustomerEmail validation gap** | `haa-marketplace.ts:467` — `customerEmail: z.string().email().optional()` accepts any well-formed email. No MX check, no disposable-email block. Order confirmation emails may bounce. | Bounce rate + spam complaints; SFDA / SDAIA don't care but customer trust drops. | Medium | Low-Medium | 0.5 day — add disposable-domain blocklist + optional confirmation email flow. |
| **P1-9** | **No customer-side rate limit on `POST /marketplace/orders` beyond shared `storefrontBrowseRateLimit`** | `index.ts:156` — `app.use('/marketplace/*', storefrontBrowseRateLimit)` covers all marketplace routes incl. POST. 600/10min is for browsing — too generous for order creation. With phone enumeration attempts (P0-3), this becomes a brute-force surface. | Order spam; cost amplification (cart/checkout sessions consume DB writes). | High | Medium | 0.25 day — separate `marketplaceOrderRateLimit = 30/10min` and apply only to POST. |

---

## P2 Post-MVP Improvements

| # | Title | Evidence | Recommendation |
|---|---|---|---|
| **P2-1** | No product image count + size limit per product enforced | `products` schema + image upload not capped; potential abuse vector. | Add `imageCount <= 10` + `imageSize <= 5MB` validation in marketplace review. |
| **P2-2** | Suborder tracking: customer cannot see WHICH store is currently fulfilling | `haa-marketplace.ts:643-676` returns all suborders but no per-store fulfillment timeline. | Add per-store fulfillment events aggregation. |
| **P2-3** | No `similarProducts` uses real related-product API | `MarketplaceProductDetail.tsx:51-56` uses `categorySlug` filter, not actual similarity. CURRENT_STATE §Next Recommended Tasks acknowledges this. | Wire real "customers also bought" endpoint. |
| **P2-4** | `salesCount` displayed on product card has no anti-spoofing | `salesCount` is a column that merchants can edit (schema lookup needed). If editable, marketplace shows inflated numbers. | Lock `salesCount` to derived from `orders` table (server-side counter). |
| **P2-5** | No marketplace-specific analytics exclusion | `shouldExcludeFromMarketplaceAnalytics` defined in `demo-rules.ts:116` but no consumer (grep confirms zero usages outside definition). Analytics events from demo stores will pollute marketplace KPIs. | Wire shared helper in analytics event emitter. |
| **P2-6** | No `featured stores` query — only featured products | `haa-marketplace.ts:122-125` has `featuredOnly` for products but no parallel store-level feature. | Add `stores.haaMarketplaceFeatured` column + admin toggle. |
| **P2-7** | CheckoutPaymentMethod limited to 3 mock options | `MarketplaceCheckout.tsx:37, 215-219` — `fake_card_success`, `bank_transfer`, `cash_on_delivery`. CURRENT_STATE §Completed mentions 3DS + Tabby/Tamara support shipped but storefront checkout doesn't expose them. | Wire Tabby/Tamara/Moyasar in marketplace checkout UI. |
| **P2-8** | No 3DS-aware flow at marketplace checkout | `MarketplaceCheckout.tsx:97-98` calls `checkoutApi.confirm` directly; 3DS challenge flow (TASK-0035) requires session redirect handling. | Add 3DS redirect handling in marketplace checkout. |
| **P2-9** | No multi-store cart UX hint when shipping differs | `MarketplaceCheckout.tsx:242-263` shows groups but no upfront message about "this cart will create N separate orders, each with its own shipping". | Add prominent banner in cart step. |
| **P2-10** | No VAT display on product cards in marketplace | CURRENT_STATE §Completed claims "شامل الضريبة" badge on product card, but marketplace pages don't show it. | Confirm badge renders on `MarketplaceEdition.tsx` and `MarketplaceProductDetail.tsx` (grep did not find VAT badge code in marketplace pages). |
| **P2-11** | No structured-data (Schema.org Product) JSON-LD on marketplace product pages | Marketplace product detail sets `<title>` and `description` via `useSEO` but does NOT emit `application/ld+json` Product schema. | Add JSON-LD for SEO. |

---

## P3 Nice-to-Have

| # | Title | Evidence | Recommendation |
|---|---|---|---|
| **P3-1** | No canonical URL / hreflang | Marketplace pages set SEO title but no `<link rel="canonical">`. | Add canonical URLs. |
| **P3-2** | No structured seller trust score | Sellers have product count but no aggregated trust signal (order completion rate, dispute rate). | Add trust score derived from orders/disputes. |
| **P3-3** | No marketplace homepage hero personalization | Marketplace edition page is static; no personalization by location/history. | Defer to Phase 2 personalization. |
| **P3-4** | No wishlist/favorites persistence server-side | `MarketplaceProductDetail.tsx:185-188` has a heart icon but it's UI-only (no state, no backend). | Wire server-side wishlist post-MVP. |
| **P3-5** | No `related searches` / `customers also searched` | Search is one-shot. | Defer to search UX pass. |
| **P3-6** | No Arabic pluralization handling | UI uses ad-hoc numbers; no `Intl.PluralRules` for "منتج/منتجين/منتجات". | Adopt react-intl or custom helper. |

---

## Demo Leakage Assessment

**Verdict: ⚠ CONDITIONAL — design is sound but implementation has 1 critical gap (P0-4) and 1 ignored capability (P2-5).**

### Evidence
1. **`isDemo` filter is present in all marketplace queries** (`haa-marketplace.ts:84, 90-93, 262-263, 309-319, 372-381, 396-406, 447-449`). ✅
2. **`isDemoStore()` + `shouldShowInMarketplace()` shared helpers exist** in `packages/shared/src/demo/demo-rules.ts` with 135 LOC of well-documented rules. ✅
3. **Mixed-cart prevention in marketplace orders** — `haa-marketplace.ts:528-537` rejects mixed demo+real orders with code `MIXED_DEMO_REAL_MARKETPLACE_ORDER_NOT_ALLOWED`. ✅
4. **Demo-only orders use mock flow** — `haa-marketplace.ts:540-558` sets `paymentStatus='demo'`, `paymentMethod='demo_mock'`, `metadata.mockPaymentUsed=true`. ✅
5. **Demo badge UI config exists** — `getMarketplaceDemoBadgeConfig()` returns Arabic label "متجر تجريبي". ✅
6. **Seed uses 3 distinct profiles** — `seed/index.ts:146` (`general`), `seed/demo/haa-demo.ts:40` (`main`), `seed/demo/perfume-demo.ts:94, 108` (`perfume`). ⚠️ `general` is NOT in the demo-rules whitelist (`demo-rules.ts:86-97` defines only `main` + `perfume`).

### Failure modes
- **P0-4**: `haa-marketplace.ts` imports `shouldShowInMarketplace` but uses raw `sql\`${s.stores.demoProfile} IS NOT NULL\``. A demo store with `demoProfile='general'` (created by main seed) **passes the SQL filter** and IS shown on marketplace. **The `tests/marketplace-demo.test.ts:35-37` test would FAIL if it actually called the route** — but it only tests the shared helper in isolation.
- **P2-5**: `shouldExcludeFromMarketplaceAnalytics` and `excludeFromMarketplaceAnalytics` defined in shared but never used by any analytics emitter. Demo orders will count in marketplace KPIs.

### Risk verdict
**Can a customer accidentally purchase from a demo store thinking it's real?**
- YES, for `demoProfile='general'` store (the main seed). Other demo profiles (`main`, `perfume`) get the "متجر تجريبي" badge and explicit mock order flow.
- **Quantitative**: 1 demo store out of all seed data is at risk.
- **Mitigation already in code**: Demo orders use mock payment (`paymentMethod='demo_mock'`, `metadata.mockPaymentUsed=true`). Customer never sees a real charge. So financial harm is zero — but **trust + legal (selling non-existent goods)** is real.

---

## Tenant Isolation Assessment

**Verdict: ✅ MOSTLY SOLID for /s/* and /merchant/* — ✅ for admin — ⚠ /marketplace/orders tracking has gap (P0-3).**

### Public marketplace routes (no auth by design)
| Endpoint | Tenant scoping mechanism | Verdict |
|---|---|---|
| `GET /marketplace/products` | WHERE clause: `stores.isActive + stores.publishStatus='published' + stores.status='active' + products.status='active' + (real OR demo profile)` | ✅ Correct |
| `GET /marketplace/products/:s/:p` | Same WHERE plus storeSlug match | ✅ Correct |
| `GET /marketplace/sellers/:s` | storeSlug match + status filter + count of visible products | ✅ Correct |
| `POST /marketplace/orders` | Suborder storeSlug match + `orders.source='haa_marketplace'` + phone match for each subOrder | ✅ Correct — proves ownership via stored phone |
| `GET /marketplace/orders/:num` | marketplaceOrderNumber + customerPhone match | ⚠ Insecure gate (P0-3) — phone enumeration possible |

### Admin routes
| Endpoint | Auth | Tenant scope | Verdict |
|---|---|---|---|
| `/admin/marketplace/*` (8 routes) | `requireAdminAuth()` | Implicit (admin sees all) | ✅ Correct |
| `/admin/marketplace/products/:id/review` | `requireAdminAuth()` + `zValidator` | No explicit permission | ⚠ Coarse (P1-2) |
| `/admin/marketplace/products/:id/feature` | `requireAdminAuth()` | No explicit permission | ⚠ Coarse (P1-2) |

### Cross-tenant leakage tests
- `tests/multi-tenancy.test.ts` does NOT cover marketplace routes.
- `tests/rbac-coverage.test.ts:59` explicitly exempts `haa-marketplace.ts` from auth requirements (intentional, but no substitute isolation test).

### Gap: missing test
No test asserts that:
- Customer A cannot see Customer B's marketplace order (only relies on phone equality)
- Customer cannot bypass `stores.publishStatus='published'` filter (only relies on SQL WHERE)
- Customer cannot see a `draft` or `archived` product via marketplace

These should be added as integration tests using the test DB.

---

## Product Compliance Assessment

**Verdict: ❌ NOT READY for commercial launch — SFDA + prohibited categories both missing.**

### Evidence
- `grep -rn "sfda\|SFDA\|sfdaNumber\|requires_sfda\|requiresSfda"` across `apps/`, `packages/` (excluding `/dist/`) → **0 matches** in source code.
- `SAUDI_COMPLIANCE_CHECKLIST.md:237-239` states "Marketplace product schema has it; merchant dashboard requires it" → **doc claims it exists; code does NOT**. **This is a documentation/code drift that needs to be fixed in both directions.**
- `categories` schema: no `regulatedCategory` enum, no `requiresCompliance`, no `prohibited`.
- `products` schema: no `sfdaNumber`, no `regulatedCategory`, no `healthClaims`, no `ingredientsDisclosure`.
- `compliance.ts` route: handles KYC (CR, VAT, bank account) at merchant level — NOT product-level.

### Categories covered by Saudi regulations not enforced
| Category | SFDA required? | Current state | Risk |
|---|---|---|---|
| Food products | Yes (varies) | ❌ No SFDA check at publish | High |
| Drugs (prescription) | Yes (strict) | ❌ Blocked in policies claim — but no enforcement in code | High |
| Medical devices | Yes | ❌ No check | High |
| Cosmetics | Yes | ❌ No notification check | High |
| Health supplements | Yes | ❌ No approval check | High |
| Counterfeit goods | MoCI blacklist | ❌ No check | Critical |
| Adult content | MoCI/CITC | ❌ No check | High |
| Weapons | MoCI/Saudi Police | ❌ No check | Critical |
| Digital products (need age) | CITC | ❌ No check | Medium |

### MVP recommendation
**Two-tier launch:**
1. **Phase 0 (now):** Hard-code a category blocklist at marketplace layer (e.g., reject any product whose category slug matches `/drugs|weapons|adult|counterfeit/i`). Admin can override per-product.
2. **Phase 1 (pre-launch):** Add `requires_sfda_number` boolean to category. If true, product publish requires `sfda_number` field. Admin reviews SFDA number format only (not validity).

### Estimated minimum effort
- Category blocklist + admin override: **1 day**
- SFDA field + format check + admin review queue: **2-3 days**
- Health claim / disclaimer display: **0.5 day**

---

## Checkout / Wallet / Order Integrity Assessment

**Verdict: ✅ MOSTLY CORRECT — storeId propagation is right, commission is snapshotted, demo mode isolated. ⚠ Tracking via phone is weak (P0-3).**

### What works correctly
- `MarketplaceCheckout.tsx:62-104` groups items by `store.slug` and creates one cart + checkout session per group. **This ensures `storeId` is correctly bound to each suborder.** ✅
- `cartApi.addItem(... 'haa_marketplace')` (line 73) sets source on each cart item. ✅
- `commerce-core/checkout.ts:208` aggregates source: any item with `source='haa_marketplace'` → order `source='haa_marketplace'`. ✅
- `commerce-core/checkout.ts:252-253` sets `platformCommissionRate = haaMarketplaceCommissionRate` (default 0.05). Commission is snapshotted onto the order at creation time. ✅
- `wallet-posting-service.ts` (per CURRENT_STATE) handles all 8 posting methods including platform_fee, gateway_fee, etc. — order-related flows verified. ✅
- `commerce-core/cart.ts:122` preserves source on cart add. ✅

### Where it's weak
- **P0-3**: Tracking endpoint uses phone-only gate.
- **P1-9**: Order POST uses shared 600/10min rate limit (too generous).
- **P2-7**: Payment methods limited to mock — real payments not wired at marketplace checkout despite 3DS infrastructure being ready.

### What is NOT vulnerable
- ❌ Cannot redirect order to wrong store: `haa-marketplace.ts:486-516` validates `subOrder.storeSlug + orderNumber + phone + source='haa_marketplace'` match.
- ❌ Cannot use demo order for real fulfillment: demo orders get `status='demo'`, `paymentMethod='demo_mock'`, `metadata.mockPaymentUsed=true`. Sub-orders' metadata also gets `isMockOrder=true` flag.
- ❌ Cannot combine demo + real in one order: explicit 400 error.

---

## Admin Moderation Assessment

**Verdict: ⚠ FUNCTIONAL but WITH GAPS — review flow exists; audit + permissions need tightening.**

### What exists
- ✅ Pending queue with status filter
- ✅ Approve / Reject / Suspend buttons (Marketplace.tsx:58-67)
- ✅ Feature toggle with sort order
- ✅ Seller list with product counts (pending + approved)
- ✅ Settlement report (links to manual payouts, no auto-execution)
- ✅ Deep report (GMV, top sellers, moderation counts)

### What's missing
- ❌ **No audit log on review/feature actions** (P0-5)
- ❌ **No explicit permission granularity** (P1-2 — any admin can moderate)
- ❌ **No reports/abuse flow from customer** — no way for a customer to report a product as inappropriate
- ❌ **No bulk moderation** — must moderate one-by-one
- ❌ **No moderation queue assignment** — first-come-first-served
- ❌ **No takedown flow** — cannot force-remove a product without going through `suspended` state and waiting for merchant
- ❌ **No SFDA verification workflow** — admin has no SFDA number field to verify (P0-1)
- ❌ **No demo exclusion from moderation queue** — demo stores are `isDemo=true` and not in the marketplace review flow, but admin could waste time on them
- ❌ **No analytics: time-to-review, approval rate, rejection reasons distribution** — needed for operational excellence

### Minimum viable admin for commercial launch
1. Add audit log on review (P0-5) — **0.5 day**
2. Add `marketplace.review` permission (P1-2) — **0.5 day**
3. Add customer-side "report product" link → admin queue — **1-2 days**
4. Add SFDA number field + verification workflow (P0-1) — **2-3 days**
5. Pagination on admin lists (P1-3) — **0.5 day**

---

## Public UX / Trust Assessment

**Verdict: ✅ POLISHED but TRUST-SIGNAL-INCOMPLETE for commercial launch.**

### Strengths
- RTL-aware design (`MarketplaceEdition.tsx`, `MarketplaceProductDetail.tsx`)
- Trust strip on product detail (تسوق آمن، حماية المشتري، توصيل سريع، دفع آمن، مرتجعات، دعم فني)
- Currency in SAR with `SarIcon` component
- BNPL installment display (4 payments × price/4)
- Savings badge with discount %
- Specs card (SKU, category, store, city, inventory, shipping, weight, dimensions)
- Mobile-first responsive (uses CSS logical properties throughout)
- Breadcrumb navigation
- Demo badge (for `main`/`perfume` profiles)

### Weaknesses for commercial launch
- ❌ **No seller disclosure**: "منتج يُباع بواسطة تاجر مستقل على منصة هاء، وهاء ليست البائع" — missing prominent disclosure (P1-7)
- ❌ **No tax-inclusive display**: CURRENT_STATE claims "شامل الضريبة" badge but **grep in `apps/storefront/src/pages/marketplace/` finds no VAT badge** (P2-10)
- ❌ **No return policy per product**: links to general marketplace policy only
- ❌ **No shipping cost estimate before checkout**: customer doesn't know total until checkout step
- ❌ **No ratings distribution**: only aggregate rating + count, no star histogram
- ❌ **No review submission flow**: no way for buyer to leave a review after delivery
- ❌ **No "verified seller" badge**: only count-based trust signal
- ❌ **No comparison feature**
- ❌ **No Arabic copy editing pass**: lots of machine-translated-feeling strings

---

## Test Coverage Assessment

### Existing marketplace tests

| Test file | What it covers | What it misses |
|---|---|---|
| `tests/marketplace-demo.test.ts` | `shouldShowInMarketplace`, `isMarketplaceOrderMixedWithDemo`, badges, capabilities — shared layer only | NO HTTP route test (the demoProfile='general' bug goes uncaught) |
| `tests/oto-marketplace-platform-regression.test.ts` | OTO shipping integration | Doesn't cover `/marketplace/orders` POST |
| `tests/settlement-order-linking.test.ts` | Marketplace orders → wallet settlement | Doesn't cover the demo-mix block |
| `tests/products-qa-regression.test.ts` | Product flow regressions | Marketplace-specific filters not asserted |
| `tests/manual-settlement-review-workflow.test.ts` | Admin payouts | Doesn't assert admin/marketplace/* routes require audit |
| `tests/rbac-coverage.test.ts` | Scans all route files; `haa-marketplace.ts` in DENY_LIST (intentional) | Confirms public-by-design; no substitute isolation test |
| `tests/multi-tenancy.test.ts` | General tenant isolation | Does NOT cover marketplace routes |

### Critical tests required before commercial launch

| # | Test | Why |
|---|---|---|
| T1 | HTTP test: `GET /marketplace/products?category=X` returns ZERO products for `demoProfile='general'` stores | Catches P0-4 (demoProfile='general' bug) |
| T2 | HTTP test: `GET /marketplace/orders/:num?phone=WRONG` returns 404 for valid orderNumber | Catches P0-3 (phone enumeration) |
| T3 | HTTP test: `POST /marketplace/orders` with suborder from `stores.isDemo=true` and another from `isDemo=false` returns 400 `MIXED_DEMO_REAL_MARKETPLACE_ORDER_NOT_ALLOWED` | Confirms P0-3-mitigation (mixed-cart block) |
| T4 | HTTP test: Admin `PATCH /admin/marketplace/products/:id/review` writes to `audit_logs` | Catches P0-5 (missing audit) |
| T5 | HTTP test: Admin `PATCH /admin/marketplace/products/:id/review` without `marketplace.review` permission returns 403 | Catches P1-2 |
| T6 | HTTP test: Public `GET /marketplace/products` does NOT include any product where `stores.publishStatus != 'published'` | Catches tenant isolation regression |
| T7 | HTTP test: Public `GET /marketplace/products` does NOT include any product where `products.status != 'active'` | Same |
| T8 | HTTP test: Public `GET /marketplace/sellers/:slug` does NOT leak `email` or `phone` to non-owner | Catches PDPL regression |
| T9 | Load test: `GET /marketplace/products?search=foo` with 10k products returns in <500ms p95 | Catches P1-4 (search performance) |
| T10 | HTTP test: Customer can submit marketplace order with `notes` containing `<script>alert(1)</script>` and it gets sanitized | Catches XSS |

### Recommended smoke test (read-only, safe to run)
```bash
# 1. Verify marketplace routes respond
curl -s http://localhost:3000/marketplace/products?limit=5 | jq '.data.total'

# 2. Verify demo stores appear (should have haa-demo + demo-perfumes + general)
curl -s http://localhost:3000/marketplace/sellers | jq '.data[].slug'

# 3. Verify order tracking requires phone
curl -s "http://localhost:3000/marketplace/orders/HM-FAKE?phone=0500000000" | jq '.success'
# expected: false (404)

# 4. Verify admin route requires auth
curl -s http://localhost:3000/admin/marketplace/summary | jq '.success'
# expected: false (401)
```
**⚠ Do NOT run any of the above against production — only against local dev server.**

---

## Performance Assessment

### Indexes present (verified)
- `products_haa_marketplace_idx` on `(haaMarketplaceEnabled, haaMarketplaceReviewStatus, status, createdAt)` ✅
- `products_store_status_created_at_idx` ✅
- `products_store_brand_idx` ✅
- `stores.slug` unique constraint ✅
- `orders_store_*_created_at_idx` (5 indexes) ✅
- `marketplace_orders_created_at_idx`, `_customer_phone_idx` ✅
- `marketplace_order_links_marketplace_order_idx`, `_store_idx`, unique on `orderId` ✅

### Indexes MISSING (P1)
1. **No trigram / FTS index on `products.name` + `stores.name`** for marketplace search (P1-4).
2. **No composite index for the demo+marketplace filter** that `haa-marketplace.ts` actually uses. Current index `products_haa_marketplace_idx` covers `(enabled, reviewStatus, status, createdAt)` but query also joins on `stores.isDemo` + `stores.demoProfile`. A composite `(stores.isDemo, stores.demoProfile, stores.publishStatus)` would speed up the demo branch.
3. **No index on `products.trackInventory, products.stockQuantity`** for the `availableOnly` filter (haa-marketplace.ts:121).
4. **No index on `products.haaMarketplaceFeaturedUntil`** for the expiry check (line 124).

### Query performance risks
| Risk | Severity | Estimated scale when it bites |
|---|---|---|
| `ilike %term%` full table scan | High | 10k products |
| Subquery for `categoryName/Slug` per row | Medium | 100 products per page |
| `marketplaceOrders` customerPhone lookup without compound index | Low | 100k orders |
| `marketplaceOrders` join with `marketplaceOrderLinks + orders` | Low | 100k orders |
| Admin `/marketplace/products` `limit(200)` no pagination | Medium | 5k products in queue |

### P0/P1/P2 performance risks
- **P1-3**: Admin reports lack pagination (200-limit).
- **P1-4**: Search uses ILIKE — needs FTS or trigram.
- **P1-5**: Subqueries for category per row.
- **P2-?**: Marketplace homepage queries multiple endpoints in parallel (Promise.all in admin/Marketplace.tsx:35-42) — currently OK but no caching layer.

---

## Commercial Readiness Assessment

### Trust signals
- ✅ Platform name + branding consistent
- ✅ Trust strip on product detail
- ✅ "متجر تجريبي" badge for whitelisted demo profiles
- ❌ No "verified merchant" / CR-validated badge (KYC exists in schema but not surfaced)
- ❌ No seller ratings/reviews
- ❌ No dispute resolution link
- ❌ No Haa customer support direct contact (only merchant contact via store)
- ❌ No SLA / response time commitment

### Legal copy
- ❌ PRIVACY_POLICY.md does NOT mention marketplace (P0-6)
- ❌ TERMS_OF_SERVICE.md does NOT mention marketplace (P0-6)
- ❌ No "ملكية المحتوى" or "حقوق الملكية الفكرية" clause for marketplace products
- ❌ No "البائعون المستقلون" disclosure (P1-7)
- ❌ No return/refund SLA per seller
- ❌ No DMCA takedown procedure (CLAIMED in TERMS §6.3 but not implemented as a flow)

### Payment disclosure
- ❌ No mention of which payment providers are used at marketplace checkout (Tabby/Tamara/Moyasar not wired yet — P2-7)
- ❌ No security badges (PCI-DSS, SAMA licensed)
- ❌ No 3DS-required disclosure

### Tax
- ⚠ VAT badge claimed in CURRENT_STATE but not found in marketplace UI (P2-10)
- ❌ No ZATCA-compliant invoice mention

### Shipping
- ✅ Multi-store split clearly shown
- ❌ No shipping SLA per store
- ❌ No "what if my package is lost" process

### Recommendation
**Do NOT launch to general public.** Two viable paths:

1. **Invite-only beta (10-20 handpicked merchants)**: fix P0-1 through P0-5 first (estimated 5-7 days engineering + 1-2 days legal copy + DPO consultation). Time to launch: **2-3 weeks**.

2. **Single-storefront only mode**: drop the public marketplace; let each merchant advertise their own `/s/:slug` URL. Avoids the entire SFDA / multi-merchant / PDPL marketplace complexity. Merchants handle their own marketing. This is what most successful SaaS platforms in Saudi do (Salla, Zid). Time to launch: **immediate** (already works).

---

## Recommended Execution Plan

### Phase 1: Launch blockers (5-7 days engineering)
- P0-1: SFDA field + format check + admin review workflow (2-3 days)
- P0-2: Category blocklist + admin override (1-2 days)
- P0-3: Replace phone tracking with `accessToken` (1 day)
- P0-4: Fix `shouldShowInMarketplace` enforcement + add 'general' to whitelist OR rewrite seed (0.5 day)
- P0-5: Audit logging on admin marketplace review/feature (0.5 day)
- P0-6: Update PRIVACY_POLICY + TERMS with marketplace sections (1 day legal + 0.5 day eng for link wiring)
- T1-T8 from test coverage section (1-2 days parallel)
- **Verify**: `pnpm preflight && pnpm typecheck && pnpm test && pnpm ci:local`

### Phase 2: Compliance and moderation tightening (3-4 days)
- P1-1: CSRF guest endpoint test (0.5 day)
- P1-2: Permission granularity on admin review (0.5 day)
- P1-3: Admin pagination (0.5 day)
- P1-7: Seller disclosure copy (0.5 day)
- P1-9: Separate rate limit on POST /marketplace/orders (0.25 day)
- Add customer-side "report product" → admin queue (1-2 days)
- DPO appointment (owner action)
- KYC verification gate (currently `kycProfiles.status='not_started'` allows publish)

### Phase 3: UX / trust / performance (1-2 weeks)
- P1-4: Search FTS or trigram (1-2 days)
- P1-5: Subquery refactor or denormalization (1 day)
- P2-1 to P2-11 (various, 1 week total)
- P3 items (parallel work)

### Phase 4: Final launch gate (1-2 days)
- Owner GO on PRIVACY_POLICY + TERMS updates
- Penetration test by 3rd party (owner-coordinated)
- PCI-DSS ASV scan (owner-coordinated)
- Disaster recovery drill
- Smoke test on production-equivalent env
- **Launch to controlled beta** (10-20 merchants, invite-only)

**Total to controlled-beta launch: ~3-4 weeks** (with Phase 1 + Phase 4 + owner legal).

---

## Final Professor-Level Judgment

### Is the public marketplace a viable launch NOW?

**No.** As built, the marketplace is technically demo-ready but **commercially not safe**. Six P0 gaps, any one of which can:
- Get Haa into regulatory trouble (SFDA, MoCI, PDPL).
- Cause a customer-data leak (phone enumeration).
- Result in a customer buying from a non-existent demo merchant.
- Prevent forensic accountability for moderation decisions.

### Should it be launched at all?

**Yes — but on a delayed, controlled timeline.** The technical foundation is genuinely good (rate limiting, CSRF, RBAC, state machine moderation, demo isolation design). The gaps are fixable in 3-4 weeks with focused engineering + owner legal action. The marketplace is a strategically valuable differentiator vs Salla/Zid (which are single-storefront platforms).

### Better path: single-storefront only first?

**Yes, this is the safer MVP launch.** Launch Haa as a multi-tenant SaaS for individual merchants. Each merchant gets their own `/s/:slug` URL with their branding. **No public marketplace.** This:
- ✅ Already works (Current Local Demo Script confirms it).
- ✅ Avoids entire SFDA / multi-merchant / PDPL marketplace complexity.
- ✅ Merchants handle their own marketing (KSA reality — most merchants already have Instagram/TikTok presence).
- ✅ Merchants own their own customer relationship (matches current `orders.source='storefront'` flow).
- ✅ Platform role is clear: SaaS provider, not marketplace operator.
- ✅ Smaller legal surface (KYC for merchants only, not product-level compliance).
- ✅ PDPL much simpler (single-merchant customer data, no cross-merchant flows).

When the platform has 50-100 active merchants with real transactions, AND SFDA/PDPL/legal work is complete, THEN introduce public marketplace as a Phase 2 differentiator.

### Lowest-risk commercial decision

**Launch single-storefront SaaS first.** Document marketplace as "Phase 2 roadmap." Spend Phase 1 + Phase 4 of the recommended plan on compliance foundation (SFDA workflow, DPO, KYC gates) so that when marketplace DOES launch, the infrastructure is ready.

This is what the founder should choose **if minimizing risk is the priority**. The marketplace code is good enough to keep, but should not see public traffic until the 6 P0s are closed.

### Recommended first 5 tasks (in order)

1. **P0-4 (demo isolation)** — 0.5 day, no external dependencies. Fixes a doc-vs-code drift with a real data leak.
2. **P0-3 (order tracking)** — 1 day. Mirrors the support-ticket accessToken fix (R-0014 already shipped). Closes enumeration vector.
3. **P0-5 (audit log on moderation)** — 0.5 day. Closes compliance accountability gap. Mirrors pattern from `orders.ts` and `wallet.ts`.
4. **P0-1 (SFDA field + workflow)** — 2-3 days. Largest single P0. Required for any regulated product category.
5. **P0-6 (legal copy)** — 1-2 days including DPO + legal review. Blocks commercial launch in Saudi regardless of tech state.

### Last gate before commercial launch

**A 3rd-party penetration test of `/marketplace/*` and `/admin/marketplace/*` by a CREST-certified firm, covering:**
- Tenant isolation across public marketplace
- Phone enumeration resistance (P0-3 verification)
- XSS in product name / description / store name
- Rate limit bypass attempts
- Admin moderation privilege escalation
- Demo store visibility

Until that pen-test passes, treat marketplace as `beta` only.

---

## Documentation / State Updates Required

- [ ] `docs/ops/CURRENT_STATE.md` — add marketplace audit task #X with status
- [ ] `docs/ops/TASK_TRACKER.md` — register P0-1 through P0-6 as tasks
- [ ] `docs/ops/ISSUE_KNOWLEDGE_BASE.md` — document the `demoProfile='general'` discrepancy as ISSUE-YYYY
- [ ] `docs/ops/DECISIONS.md` — DECISION-XXX: "Defer public marketplace launch; launch single-storefront SaaS first"
- [ ] `docs/SAUDI_COMPLIANCE_CHECKLIST.md` — correct SFDA status (line 237) — remove false claim that schema has it
- [ ] `docs/PRIVACY_POLICY.md` — add §3 Marketplace section
- [ ] `docs/TERMS_OF_SERVICE.md` — add §8 Independent Sellers disclosure
- [ ] `docs/PUBLIC_API_SAFETY.md` — add section for `/marketplace/*` endpoints (currently only covers `/s/*`)
- [ ] `docs/ops/REGRESSION_CHECKLIST.md` — add marketplace tenant-isolation test cases

---

## Audit Confidence & Limitations

| Confidence | Area | Why |
|---|---|---|
| HIGH | Demo isolation contract (P0-4) | Confirmed via direct grep + test inspection + seed file read. |
| HIGH | Order tracking enumeration (P0-3) | Confirmed via direct route inspection + rate-limit policy read. |
| HIGH | Audit log absence (P0-5) | Confirmed via grep in admin/marketplace.ts + comparison with orders.ts/wallet.ts. |
| HIGH | SFDA absence (P0-1) | Confirmed via grep across all schema files; SAUDI_COMPLIANCE_CHECKLIST doc/code drift confirmed. |
| HIGH | Privacy/Terms marketplace omission (P0-6) | Confirmed via grep in both files. |
| HIGH | Permission granularity (P1-2) | Confirmed via direct read of admin/index.ts. |
| HIGH | Rate limit scope (P1-9) | Confirmed via direct read of index.ts:156. |
| HIGH | Search implementation (P1-4) | Confirmed via direct read of haa-marketplace.ts:103-106. |
| MEDIUM | Performance risk at scale (P1-4, P1-5) | Index inspection is direct, but load-test numbers are estimates based on typical Postgres behavior with `ilike %term%` and subqueries — no actual load test was run. |
| MEDIUM | UI trust signals (P2-10 VAT badge) | CURRENT_STATE.md claims badge shipped in TASK-0035 sub-item 6; grep did not find badge code in marketplace pages, but it may be in a shared component loaded differently. Needs visual verification on dev server. |
| LOW | Payment methods at checkout (P2-7) | CURRENT_STATE mentions Tabby/Tamara support; MarketplaceCheckout.tsx shows only 3 mock options. The actual checkout API call chain (`commerce-core/checkout.ts`) may support more, but UI doesn't expose them. Could not verify without running. |
| LOW | KYC blocking at publish (Phase 2 note) | The KYC status defaults to `'not_started'` per schema; need to confirm whether `kyc.status != 'approved'` is actually enforced before `haaMarketplaceEnabled=true`. Not directly inspected. |

---

**Audit closed.** No files were modified. No commits were made. No migrations were added. No seeds were changed. All findings are read-only.
