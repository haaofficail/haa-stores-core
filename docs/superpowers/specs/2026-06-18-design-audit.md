# Design Audit — Haa Stores (3 apps, 89 pages)

> **Generated:** 2026-06-18
> **Method:** Code grep + size analysis + manual spot-check
> **Scope:** `apps/storefront` (26 pages), `apps/merchant-dashboard` (47 pages), `apps/admin-dashboard` (16 pages)

---

## 1. Inventory

| App | Pages | Largest | Avg | CSS files | Components |
|---|---:|---|---:|---:|---:|
| `storefront` | 26 | LandingPage (1983) | 280 | 1 (index.css) | 10 |
| `merchant-dashboard` | 47 | DashboardHome (1599) | 320 | 1 (index.css) | 22 |
| `admin-dashboard` | 16 | SettlementBatchDetail (774) | 250 | 2 (index.css + Compliance.css) | 0 (no components dir) |

**Total: 89 pages, 32 components, 4 CSS files, 1,213 lines of CSS.**

---

## 2. Strengths (already done well)

| Strength | Where | Notes |
|---|---|---|
| **Token system** | `apps/*/src/index.css` | `--haa-*` namespace across all 3 apps |
| **Brand primary darkened** | `index.css` × 3 | `#58a1e2` → `#2a6fb8` for WCAG AA (P2-#7) |
| **RTL-first** | All apps | `dir="rtl"`, logical CSS properties, no hardcoded left/right |
| **Arabic font** | All apps | IBM Plex Sans Arabic (full Arabic + Latin) |
| **Touch targets** | Most components | 44×44px enforced (Cart, Auth) |
| **Focus visible** | Most components | `focus-visible:ring-2` patterns present |
| **Empty states** | Some pages | Cart, Orders (merchant) have good copy |
| **Error boundaries** | All apps | `ErrorBoundary.tsx` exists in 2/3 |
| **Lucide icons** | All apps | Consistent icon family (per AGENTS.md) |
| **Reduced motion** | Theme system | `useReducedMotion` hook exists in `system-theme` |
| **Test coverage** | Tests dir | `color-contrast.test.ts` (11 tests), `card-visual-consistency.test.ts` (4) |
| **Theme registry** | `packages/theme-system` | 4 storefront themes (minimal, royal, night, nature) + 2 runtime |
| **Pre-launch smoke** | Tests | 29 E2E checks covering design + a11y |

---

## 3. Issues (by severity)

### 🔴 Tier 1 — Critical (a11y / spec violations)

| # | Issue | Count | Files | Fix |
|---|---|---:|---|---|
| 3.1 | `text-[10px]` and `text-[11px]` for body text | **101** | Cart, Category, Support, Fake3DS, Checkout, MarketplaceProductDetail, more | T1.3 in design plan |
| 3.2 | Body font 14px (mobile-first violation) | **3 apps** | All `index.css` | T1.2 |
| 3.3 | Hardcoded hex colors in components | ~15 | Category (`text-gray-500`), others | T1.1 |
| 3.4 | God-class pages (>500 lines) | **9** | LandingPage, DashboardHome, Settings, Orders, ThemeEditor, SettlementBatchDetail, Products, Shipping, Checkout | T2.1-T2.5 |
| 3.5 | `text-right` / `text-left` (RTL bypass) | Some | Various | Replace with `text-start`/`text-end` |
| 3.6 | `style={{ ... }}` for colors | Few | Category uses inline style for badge | Move to tokens |

### 🟡 Tier 2 — Important (consistency / polish)

| # | Issue | Notes |
|---|---|---|
| 3.7 | Empty states inconsistent | Some pages have copy, some have icon-only, some have nothing |
| 3.8 | Loading states inconsistent | Skeleton vs spinner vs blank varies |
| 3.9 | Error messages generic | Most are English-flavored, not "السبب + الحل" pattern |
| 3.10 | Two ProductCard implementations | `ProductCard.tsx` and `product-card/ProductCard.tsx` — consolidate |
| 3.11 | Admin dashboard has no `components/` dir | All code in `pages/` |
| 3.12 | No shared `EmptyState` / `LoadingState` / `ErrorState` | Each page reinvents |
| 3.13 | Form helper text sometimes uses placeholder-only | Few forms |

### 🟢 Tier 3 — Nice-to-have (deferred)

| # | Issue | Notes |
|---|---|---|
| 3.14 | Icon sizes not standardized | Lucide 16/20/24/32 mixed; need explicit tokens |
| 3.15 | Animation consistency | Some `transition-all`, some `transition-colors` |
| 3.16 | Section spacing varies | Some pages `space-y-8`, some `space-y-12` |
| 3.17 | Heading hierarchy | Some pages skip h2 (h1 → h3) |
| 3.18 | Reduced motion not always respected | Most use `motion-safe:`, but not all |

---

## 4. Per-page findings (top 20 by impact)

### Storefront

| Page | LOC | Issues | Priority |
|---|---:|---|---|
| **LandingPage** | 1983 | T2.1 (split), some `text-[Npx]` | 🔴 |
| **Home** | 380 | Mostly clean; verify hero spacing | 🟢 |
| **Checkout** | 661 | `text-[10px]` in VAT detail | 🟡 |
| **Category** | 617 | `text-[10px]` in product badges; raw `text-gray-500`; inline style | 🔴 |
| **Cart** | 442 | `text-[11px]` for shipping notice (3 instances) | 🟡 |
| **Auth** | 543 | Clean; `min-h-[44px]` correct | 🟢 |
| **ProductDetail** | ~350 | Verify gallery, variants | 🟢 |
| **HaaMarketplace** | ~400 | Clean | 🟢 |
| **Fake3DSChallenge** | ~150 | `text-[11px]` in footer (1 instance) | 🟢 |

### Merchant Dashboard

| Page | LOC | Issues | Priority |
|---|---:|---|---|
| **DashboardHome** | 1599 | T2.3 (split KPIs/charts/lists) | 🟡 |
| **Settings** | 1490 | T2.4 (split 10 tabs) | 🟡 |
| **Orders** | 1394 | T2.5 (split table/filters/detail) | 🟡 |
| **ThemeEditor** | 1378 | Complex; P2-2 already deferred | 🟢 |
| **Compliance** | 852 | New page (Session U); verify | 🟢 |
| **Products** | 772 | Data table; verify density | 🟡 |
| **Shipping** | 717 | Form-heavy | 🟡 |
| **LiveRadar** | 612 | Newer page; check | 🟢 |
| **Reports** | 545 | Charts; verify colors | 🟢 |
| **Wallet** | 544 | Verify trust signals | 🟢 |
| **OnboardingWizard** | 487 | P2-12 deferred (works correctly) | 🟢 |

### Admin Dashboard

| Page | LOC | Issues | Priority |
|---|---:|---|---|
| **SettlementBatchDetail** | 774 | T2-style split candidate | 🟡 |
| **Compliance** | 852 | T2-style split candidate | 🟡 |
| **Tenants** | ~600 | Verify table density | 🟡 |
| **Dashboard** | ~400 | Verify KPI density | 🟡 |
| **AuditLogs** | ~300 | Verify log table | 🟢 |
| **Marketplace** | ~300 | Verify moderation UI | 🟢 |

---

## 5. Quantitative summary

| Metric | Value | Target | Status |
|---|---:|---:|---|
| Pages with body < 16px (storefront) | ~50% (estimate) | 0% | 🔴 |
| Pages with body < 14px (admin) | unknown | 0% | 🟡 |
| Files with raw `#hex` in `.tsx` | ~15 | 0 | 🔴 |
| `text-[10px]` / `text-[11px]` violations | 101 | 0 | 🔴 |
| Pages > 500 lines | 9 | 0 | 🔴 |
| Pages with `text-right` (RTL bypass) | unknown | 0 | 🟡 |
| Pages with empty state | ~30 (estimate) | 89 | 🟡 |
| Pages with loading state | ~50 (estimate) | 89 | 🟡 |
| Pages with error state | ~20 (estimate) | 89 | 🟡 |
| Pages with WCAG AA color contrast verified | tested via smoke | all | ✅ |
| Pages with focus-visible | most | all | 🟡 |
| Pages with `prefers-reduced-motion` | most | all | 🟡 |

---

## 6. Content quality (Arabic copy)

| Aspect | Status | Notes |
|---|---|---|
| Headings | Mostly clean | Some English-mixed ("Support", "Track Order") |
| Button labels | Good | Verb-first Arabic |
| Empty states | Inconsistent | Some good ("سلتك فاضية"), some missing |
| Error messages | Generic | "Invalid input" → "ما قدرنا نكمل العملية" |
| Helper text | Mixed | Some helpful, some missing |
| Form labels | Mostly present | Few placeholder-only |

### Content gaps to fill

| Page | Gap |
|---|---|
| Auth | "نسيت كلمة المرور؟" flow copy |
| Onboarding | Step 3 (theme) — empty state when no themes |
| LiveRadar | Empty state copy (real-time data may be 0) |
| Compliance (admin) | Help text for each G1-G10 field |
| Audit log (admin) | Empty state ("ما في أحداث مسجلة") |
| Wallet | Empty state ("ما عندك رصيد") |

---

## 7. RTL audit

| Aspect | Status |
|---|---|
| `dir="rtl"` set in `<html>` | ✅ all 3 apps |
| Logical CSS properties (`margin-inline`, `padding-inline`) | ✅ most |
| `text-right` / `text-left` violations | 🟡 few (to fix in T1.x) |
| Icon direction (arrow left = "next" in RTL) | 🟡 needs audit (T3.4) |
| Number formatting (Arabic-Indic vs Western) | 🟡 needs decision |
| Date formatting (hijri vs gregorian) | 🟡 needs decision |

**Recommendation:** Adopt Western Arabic digits (0-9) for now (already used); hijri dates for compliance docs only.

---

## 8. What "polish" means for Haa Stores

Based on this audit, **"polish"** = closing 9 god-class pages, removing 101 small-text violations, harmonizing tokens, and adding empty/loading/error states to all 89 pages. This is **3 weeks of work**, organized into 3 sprints (see `MASTER_DESIGN_PLAN.md`).

**It does NOT mean:**
- Adding animations
- Switching fonts
- Major color overhaul
- Dark mode (already functional)
- Mobile app (out of scope)

**It DOES mean:**
- Visual consistency (tokens, type scale, spacing)
- Accessibility compliance (WCAG 2.1 AA)
- Code maintainability (≤ 500 lines per page)
- Content quality (Arabic-first, voice consistent)
- State coverage (empty/loading/error everywhere)
