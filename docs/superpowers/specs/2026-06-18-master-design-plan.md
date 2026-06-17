# Master Design Plan — Haa Stores

> **Generated:** 2026-06-18
> **Source spec:** `docs/superpowers/specs/2026-06-18-haa-stores-branding-design.md`
> **Scope:** 3 apps — `apps/storefront` (26 pages), `apps/merchant-dashboard` (47 pages), `apps/admin-dashboard` (16 pages)
> **Total pages audited:** 89
> **Total tasks:** 12 (organized into 3 sprints)

---

## Sprint 1: Foundations (week 1)

### T1.1 — Token harmonization across 3 apps ⚠ HIGH
**Status:** Mostly done. Verify alignment.
- All 3 apps have `index.css` with `--haa-*` tokens
- **Verify:** no hardcoded `#hex` in any `.tsx` file (currently some `text-gray-500` and inline `style={{}}` violations)
- **Action:** Add `tests/design-tokens.test.ts` — fails if any `#[0-9a-fA-F]{3,6}` appears in `.tsx` outside `themes.ts`
- **Acceptance:** Test passes; zero raw hex in components
- **Files:** All 89 pages

### T1.2 — Body font size: 14px → 16px (mobile-first) ⚠ HIGH
**Status:** Some files use 14px body, some 16px. Inconsistent.
- **Why:** 16px is iOS default; below this triggers auto-zoom on iOS
- **Action:** Global replace: `text-sm` (14px) → `text-base` (16px) for body content. Keep `text-sm` only for helper text, captions, table cells.
- **Bump:** `apps/merchant-dashboard/src/index.css` body font-size 14px → 16px
- **Acceptance:** Body text ≥ 16px on mobile; visual diff shows no regression
- **Files:** All 89 pages + `index.css` × 3

### T1.3 — Ban `text-[10px]` and `text-[11px]` ⚠ HIGH
**Status:** **101 violations** across pages
- **Why:** Below readable threshold; AGENTS.md spirit (12px minimum)
- **Action:**
  - Find: `grep -rE "text-\[1[0-3]px\]" apps/*/src/`
  - Replace:
    - `text-[10px]` → `text-xs` (12px) for badges
    - `text-[11px]` → `text-xs` (12px) for helper text
    - `text-[10px]` in **dense data tables** (admin) → `text-[11px]` → `text-xs` (12px) — accept slight visual regression
  - Add `tests/typography.test.ts` — fails if `text-[1[0-3]px]` appears
- **Files:** Cart, Category, Support, Fake3DSChallenge, Checkout, MarketplaceProductDetail (~10 pages)

### T1.4 — Add `--space-20` (80px) and adjust `--space-12` to 56px
**Status:** Current scale is 0-16 (64px max)
- **Action:** Update `apps/storefront/src/index.css` and `packages/system-theme/src/system-theme.css`
- **Acceptance:** New token exists, used in LandingPage hero
- **Files:** CSS only

---

## Sprint 2: Pages (week 2)

### T2.1 — Split `LandingPage.tsx` (1983 lines) into 6 sections ⚠ HIGH
**Status:** Single file, 1983 lines. Hard to maintain, hard to test.
- **Why:** AGENTS.md rule: ≤ 300 lines per route
- **Action:** Extract to `apps/storefront/src/landing/sections/`:
  - `HeroSection.tsx` (current h1, h2 blocks)
  - `FeaturesSection.tsx` (features grid)
  - `MarketplaceTeaser.tsx` (marketplace preview)
  - `PricingSection.tsx` (if exists)
  - `TestimonialsSection.tsx` (if exists)
  - `CTASection.tsx` (final CTA)
  - `LandingPage.tsx` becomes orchestrator (~150 lines)
- **Acceptance:** No file > 400 lines; LandingPage orchestrator ≤ 200 lines
- **Files:** 1 split into 7
- **Note:** Already documented in `docs/ops/REFACTOR_PLAN_P2-1.md`

### T2.2 — Polish ProductCard visual hierarchy ⚠ MEDIUM
**Status:** Two implementations exist (`ProductCard.tsx` 199 lines, `product-card/ProductCard.tsx` 169 lines)
- **Action:**
  - Consolidate to single canonical `ProductCard` in `components/product-card/`
  - Add `ProductImageFrame`, `ProductTitle`, `ProductPrice`, `AddToCartButton` as subcomponents
  - Ensure all variants use `--space-*` tokens, no raw px
  - Test: regression guard already exists (`tests/card-visual-consistency.test.ts`)
- **Files:** 2 components → 1 component + 4 subcomponents

### T2.3 — Merchant Dashboard Home (1599 lines) ⚠ MEDIUM
**Status:** Largest page in merchant app; KPIs + charts + lists
- **Action:** Extract:
  - `KPISection.tsx` (KPI cards)
  - `RecentOrders.tsx`
  - `TopProducts.tsx`
  - `SalesChart.tsx` (lazy-loaded)
  - `DashboardHome.tsx` orchestrator (≤ 200 lines)
- **Files:** 1 → 5

### T2.4 — Settings.tsx (1490 lines) ⚠ MEDIUM
**Status:** Single page with 10+ tabs
- **Action:** Extract each tab to `settings/sections/`:
  - `StoreInfo.tsx`
  - `Shipping.tsx`
  - `Payments.tsx`
  - `Policies.tsx`
  - `Domains.tsx`
  - `Team.tsx`
  - `Settings.tsx` orchestrator (≤ 150 lines)
- **Files:** 1 → 8

### T2.5 — Orders.tsx (1394 lines) ⚠ MEDIUM
**Status:** Orders list + filters + bulk actions + detail drawer
- **Action:** Extract:
  - `OrdersTable.tsx`
  - `OrderFilters.tsx`
  - `OrderDetailDrawer.tsx`
  - `BulkActionBar.tsx`
  - `Orders.tsx` orchestrator
- **Files:** 1 → 5

---

## Sprint 3: Polish & consistency (week 3)

### T3.1 — Empty state audit + library ⚠ MEDIUM
**Status:** Inconsistent empty states; some pages have them, some don't
- **Action:**
  - Create `apps/storefront/src/components/EmptyState.tsx` (canonical)
  - Create `apps/merchant-dashboard/src/components/ui/EmptyState.tsx`
  - Create `apps/admin-dashboard/src/components/EmptyState.tsx` (no shared package — different audiences)
  - Apply 4 canonical empty states per BRANDING_BRIEF §4.2
  - **Audit:** Find pages without empty states (likely: Auth error, Compliance no-tenant, etc.)
- **Files:** 3 new components + apply to 89 pages

### T3.2 — Error message library (Arabic) ⚠ MEDIUM
**Status:** Generic English-flavored error messages
- **Action:**
  - Create `packages/shared/src/copy/error-messages-ar.ts` with 30+ canonical messages
  - Pattern: "السبب + الحل" (per BRANDING_BRIEF §4.3)
  - Replace `apps/api/src/middleware/error-handler.ts` to use this
  - Update client `sonner` toasts to use Arabic messages
- **Files:** 1 new + apply across API + 3 apps

### T3.3 — Form label audit ⚠ LOW
**Status:** Some forms use placeholder-only labels
- **Action:**
  - Find: `grep -rE "<input[^>]*placeholder=.*[\u0600-\u06FF]" apps/*/src/pages/ | grep -v "label"` (placeholder in Arabic without visible label)
  - Add `<label>` for each; use `aria-describedby` for helper text
  - Required fields: `*` after label (red)
- **Files:** Likely 5-10 forms

### T3.4 — Icon size standardization ⚠ LOW
**Status:** Lucide used but sizes are mixed (16, 20, 24, 32)
- **Action:**
  - Document: Default 24px, button 18-20px, feature 32px, empty state 48-64px
  - Audit + standardize the 10 most-touched components
- **Files:** Header, Footer, ProductCard, Button, Modal — all 3 apps

### T3.5 — Loading state audit ⚠ LOW
**Status:** Inconsistent — some pages show skeleton, some show spinner, some show nothing
- **Action:**
  - Define standard: skeleton for > 300ms, spinner for < 300ms, never "blank" for async
  - Apply across all pages with `fetch`/`useQuery`
- **Files:** 89 pages

### T3.6 — Reduced motion audit ⚠ LOW
**Status:** Some animations may not respect `prefers-reduced-motion`
- **Action:**
  - Find: `grep -rE "transition-|animate-|duration-" apps/*/src/ | wc -l`
  - Add `motion-safe:` prefix where appropriate
  - Test: Chrome DevTools → Rendering → Emulate `prefers-reduced-motion: reduce`
- **Files:** Likely 20-30 components

---

## Estimated impact

| Sprint | Tasks | Est. duration | Lines changed | Risk |
|---|---|---|---|---|
| **Sprint 1** (Foundations) | 4 | 1 week | ~500 + token CSS | **Medium** (visual regression possible) |
| **Sprint 2** (Pages) | 5 | 1 week | ~3,500 (splits, no behavior change) | **Low** (refactor only) |
| **Sprint 3** (Polish) | 6 | 1 week | ~1,500 | **Low** |
| **Total** | 15 | **3 weeks** | ~5,500 | — |

---

## Acceptance criteria per app

### Storefront
- [ ] 0 raw hex in components (T1.1)
- [ ] 0 `text-[10px]` / `text-[11px]` body text (T1.3)
- [ ] Body ≥ 16px (T1.2)
- [ ] LandingPage ≤ 200 lines orchestrator (T2.1)
- [ ] All 26 pages have empty state (T3.1)
- [ ] All 26 pages have loading state (T3.5)
- [ ] All 26 pages have error state (T3.2)

### Merchant Dashboard
- [ ] 0 raw hex in components (T1.1)
- [ ] 0 `text-[10px]` / `text-[11px]` body text (T1.3)
- [ ] Body ≥ 15px (slightly tighter for data density) (T1.2)
- [ ] DashboardHome, Settings, Orders ≤ 200 lines each (T2.3-T2.5)
- [ ] All 47 pages have empty/loading/error state

### Admin Dashboard
- [ ] 0 raw hex in components (T1.1)
- [ ] 0 `text-[10px]` / `text-[11px]` body text (T1.3)
- [ ] Body ≥ 14px (highest density; justified) (T1.2)
- [ ] All 16 pages have empty/loading/error state

---

## Out of scope (deferred)

| Item | Why |
|---|---|
| Dark mode polish | Currently functional; visual refinement can wait |
| Mobile app | Out of project scope (web-only) |
| Animation overhaul | Functional motion exists; not redesign priority |
| Theme-ability for merchant dashboard | AGENTS.md forbids |
| Custom illustrations | External work (designer needed) |

---

## Verification commands

```bash
# After Sprint 1
pnpm test tests/design-tokens.test.ts   # 0 raw hex
pnpm test tests/typography.test.ts      # 0 text-[10/11px]

# After Sprint 2
pnpm test tests/page-size.test.ts       # all pages ≤ 500 lines (configurable)

# Continuous
pnpm preflight && pnpm typecheck && pnpm test

# Visual regression (optional, requires Playwright)
pnpm test:e2e -- visual-snapshots
```

---

## Decision log

| Date | Decision | Why |
|---|---|---|
| 2026-06-18 | Plan = 3 sprints, 15 tasks, 3 weeks | Right-sized for "polish" pass before launch |
| 2026-06-18 | Admin body can stay 14px | Operational density justifies tighter |
| 2026-06-18 | No shared `EmptyState` package | Three audiences, three different needs |
| 2026-06-18 | Token enforcement via test, not lint | Tests are runtime-verified; lint rules can be ignored |
