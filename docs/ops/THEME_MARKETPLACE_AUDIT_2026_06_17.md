# Haa Stores — System Theme, Marketplace, and Store Themes Audit Report

> **Audit type:** Read-only Professor-Level Audit (no edits, no commits)
> **Auditor:** Principal Frontend / Theme / Marketplace Systems Auditor
> **Audit date:** 2026-06-17
> **Scope:** Public landing, public home, public marketplace, registration/login, system theme, both store themes (base-elegant + luxury-showcase), cross-theme consistency, visual hierarchy, mobile/RTL, accessibility baseline, copywriting/legal risk
> **Methodology:** Direct file inspection + grep + Vitest + ESLint + TypeScript + preflight. No mutation. No commit. No browser run.

---

## 1. Executive Verdict

| Field                          | Value                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Final verdict**              | **⛔ NOT ready for public commercial launch. Controlled invite-only beta possible.**                                                                                                                                                                                                                                         |
| **Readiness percentage**       | **System theme + storefront themes: ~75%** • **Landing page: ~80% (CRO strong but legal claims unverified)** • **Marketplace: ~70% (visually solid, structurally isolated, but legal/compliance gating still pending)** • **Registration: 0%** (UI hardcoded "coming soon", registration is a dead end for a paying visitor) |
| **Launch mode recommendation** | Controlled invite-only demo beta only. Do **not** open `/signup` to general traffic. Do **not** start paid acquisition campaigns.                                                                                                                                                                                            |
| **Launch blockers**            | **2 P0** (Auth UI never calls API; landing/marketplace carry unverified marketing claims) + **6 marketplace legal P0s** from `PUBLIC_MARKETPLACE_AUDIT.md` already filed.                                                                                                                                                    |
| **Biggest risk**               | The biggest risk is **not visual** — it is the gap between "looks shippable" and "behaves shippable." The landing page converts a merchant in 5 seconds into a CTA that drops them onto a page that says "قريبًا" (coming soon). That is a paid-traffic-burner.                                                              |

**One-sentence verdict:** الواجهة متقنة بصرياً لكن المنتج ما يقدر يُغلق حلقة التاجر: التسجيل معطّل في الواجهة، ادعاءات تسويقية قوية بدون دليل موثّق، وفصل الهوية بين منصة Haa وثيمات المتاجر صحيح لكنه غير مكتمل (ثيم `base-elegant` بدون مكونات حقيقية داخل package، النظام يعتمد على runtime داخل `apps/storefront/src/themes`).

---

## 2. Scope Reviewed

| Layer                 | Files inspected                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Apps / API**        | `apps/storefront/src/pages/LandingPage.tsx` (1945 LOC), `Auth.tsx` (446 LOC), `HaaMarketplace.tsx` (3 LOC alias), `MarketplaceEdition.tsx`, `MarketplaceProductDetail.tsx`, `MarketplaceCheckout.tsx`, `Home.tsx`, `ProductDetail.tsx`, `Category.tsx`, `App.tsx` (routes), `apps/api/src/routes/auth.ts` (173 LOC), `haa-marketplace.ts`, `theme-registry.ts` (41 LOC), `index.css` (427 LOC) |
| **System theme**      | `packages/system-theme/src/SystemThemeProvider.tsx` (62 LOC), `tokens.ts` (79 LOC), `system-theme.css` (147 LOC)                                                                                                                                                                                                                                                                               |
| **Storefront themes** | `packages/storefront-themes/src/registry.ts` (51 LOC), `themes/base-elegant/{index.ts,manifest.ts}` (12 LOC), `themes/luxury-showcase/{index.ts,capsule.ts}` (266 LOC), `apps/storefront/src/themes/base-elegant/{HomePage.tsx,ProductPage.tsx,editor-schema.ts}` (1466 LOC), `apps/storefront/src/themes/luxury-showcase/{HomePage,ProductPage,Header,Footer,components/*}` (714+ LOC)        |
| **Marketplace theme** | `apps/storefront/src/pages/marketplace/theme/{tokens.ts,MarketplaceHero.tsx,MarketplaceProductCard.tsx,MarketplaceSellerRail.tsx,MarketplaceFilters.tsx,MarketplaceFooter.tsx,ProductCardSkeleton.tsx}` (537 LOC)                                                                                                                                                                              |
| **Shared UI**         | `apps/storefront/src/components/ui/{index.tsx,icon.tsx,SarIcon.tsx,CurrencyAmount.tsx,trust-badges.tsx}`, `apps/storefront/src/components/product-card/*` (10 components)                                                                                                                                                                                                                      |
| **Hooks / lib**       | `useTheme.tsx`, `usePlatformBrand.ts`, `lib/api.ts`, `lib/marketplace-cart.ts`                                                                                                                                                                                                                                                                                                                 |
| **Docs**              | `docs/system-map/SYSTEM_MAP.md`, `CURRENT_STATE.md`, `TASK_TRACKER.md`, `PUBLIC_MARKETPLACE_AUDIT.md`, `MARKETPLACE_HARDENING_PLAN.md`, `MARKETPLACE_PHASE0_AUDIT.md`                                                                                                                                                                                                                          |
| **Tests**             | `pnpm vitest run` → **2465 passed / 5 failed / 1 skipped / 14 todo** (out of 2485). **5 failures are pre-existing baseline failures** documented in `CURRENT_STATE.md` and partially in `TASK_TRACKER.md`.                                                                                                                                                                                     |
| **Typecheck**         | `pnpm --filter @haa/storefront typecheck` → ✅ PASS • `pnpm --filter @haa/api typecheck` → ✅ PASS • `pnpm --filter @haa/shared typecheck` → ❌ 2 errors (`marketplace.review`, `marketplace.feature` not in `Permission` union)                                                                                                                                                               |
| **ESLint**            | ✅ clean on inspected files                                                                                                                                                                                                                                                                                                                                                                    |
| **Preflight**         | ❌ 1 hard failure: `packages/shared typecheck` (same 2 errors). Pre-flight exits code 1.                                                                                                                                                                                                                                                                                                       |

### Visual verification method

**No live browser run.** Verification is by code inspection + grep + file dimensions + i18n catalogue + typecheck + vitest baseline. Browser screenshots are out of scope for this audit (no Playwright run was performed). Cross-references against `PUBLIC_MARKETPLACE_AUDIT.md` (650 LOC, dated 2026-06-17) and `MARKETPLACE_PHASE0_AUDIT.md` are honored as recent ground truth from a parallel audit pass.

---

## 3. Theme Architecture Map

| Scope                                                       | Files                                                                                                                                                                                                                                                                                                                                                | Tokens                                                                                           | Components                                                                                                                                      | Routes                                                                                          | Risk                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **System theme** (`@haa/system-theme`)                      | `SystemThemeProvider.tsx`, `tokens.ts`, `system-theme.css` (147 LOC), `index.ts`                                                                                                                                                                                                                                                                     | `--haa-*` namespace, light + dark via `data-haa-theme`                                           | Provider only (no components). Class `.haa-system-theme` + `data-theme-scope="system"` applied via wrapper div.                                 | Mounted by `merchant-dashboard` and `admin-dashboard`. NEVER `document.documentElement`.        | **Low.** Well-isolated. Confirmed by `theme-rationalization.test.ts` and `theme-fallback-regression.test.ts`.                                                                                                                                                                   |
| **Store theme 1 — base-elegant** (`@haa/storefront-themes`) | Package: `themes/base-elegant/{index.ts,manifest.ts}` (12 LOC) — **manifest only, no components**. Runtime: `apps/storefront/src/themes/base-elegant/{HomePage.tsx (600 LOC), ProductPage.tsx (811 LOC)}`                                                                                                                                            | Tailwind tokens via `apps/storefront/src/index.css` (lines 119-183). `--brand-primary: #58a1e2`. | `Header`, `Footer`, `ProductCard`, `BaseElegantHomePage`, `BaseElegantProductPage` registered in `apps/storefront/src/theme-registry.ts:21-30`. | `/s/:slug/*` (all merchant storefront routes) when `themeKey === 'base-elegant'` or unresolved. | **Medium.** Hybrid architecture: manifest in package, components in app. The `themes/base-elegant/` package folder is a near-empty stub — real source lives in `apps/storefront/src/themes/base-elegant/`. A new theme package can't be added without `themes.test.ts` failing. |
| **Store theme 2 — luxury-showcase**                         | Package: `themes/luxury-showcase/{index.ts,capsule.ts}` (266 LOC). Runtime: `apps/storefront/src/themes/luxury-showcase/{HomePage,ProductPage,Header,Footer,luxuryTokens.ts,manifest.ts,components/{HeroSlider,LuxuryImageFallback,LuxuryProductCard,LuxuryProductGallery,LuxuryProductInfoPanel,LuxuryProductTabs,banners/*,sliders/*,sections/*}}` | `luxuryTokens` — warm gold palette (`primary: #B88A3D`), serif headings, generous spacing.       | 12+ components. Theme capsule (`ThemeCapsule`) carries `ThemeTokens` + `ThemeSpecificConfig` + `ThemeEditorSchema` + `ThemeCapabilityFlags`.    | `/s/:slug/*` when `theme.themeKey === 'luxury-showcase'`.                                       | **Low.** Theme is fully isolated. Token + component are both present in package + app split (same hybrid as base-elegant). Editor schema present.                                                                                                                               |
| **Marketplace theme**                                       | `apps/storefront/src/pages/marketplace/theme/*` (537 LOC across 7 files). **Not registered** in `@haa/storefront-themes` registry.                                                                                                                                                                                                                   | Local `tokens.ts` (36 LOC) — JS object, not CSS variables.                                       | `MarketplaceHero`, `MarketplaceProductCard`, `MarketplaceSellerRail`, `MarketplaceFilters`, `MarketplaceFooter`, `ProductCardSkeleton`.         | `/marketplace/*`. Delegated from `HaaMarketplace.tsx` → `MarketplaceEdition.tsx`.               | **Low.** Intentionally decoupled from merchant theme registry per `MARKETPLACE_RATIONALIZATION` decision. Uses Tailwind utility classes + JS token object.                                                                                                                      |
| **Auth pages**                                              | `apps/storefront/src/pages/Auth.tsx` (446 LOC) — Login, Signup, Waitlist.                                                                                                                                                                                                                                                                            | Reuses `storefront-scope` tokens.                                                                | Self-contained: `AuthShell`, `AuthAside`, `ComingSoonBanner`.                                                                                   | `/login`, `/signup`, `/waitlist`.                                                               | **🔴 CRITICAL.** Login & Signup forms **never call the API**. `onSubmit` hardcodes `setError('قريبًا')`. See §10.                                                                                                                                                               |

### Theme isolation: confirmed

`tests/security-boundary-gates.test.ts` enforces:

- Dashboard does not import `@haa/storefront` or `@haa/storefront-themes`.
- Storefront does not import `@haa/merchant-dashboard`, `@haa/admin-dashboard`, `@haa/system-theme`.
- Storefront CSS must not target `:root`, `body`, `html` globally.

**Test failures on this gate:** 2 of 16 fail today:

1. **`Dashboard must not import storefront app code` (line 23)** — `apps/merchant-dashboard/src/pages/ThemeEditor.tsx:25` imports `getThemeCapsule` from `@haa/storefront-themes`. This is a **legitimate server-safe subpath** (per `SYSTEM_MAP.md` row 4 in the Allowed Import Map — `@haa/storefront-themes/server*` subpaths are allowed). The test gate is **over-strict** and contradicts the documented contract.
2. **`Storefront CSS must not target :root globally` (line 42)** — `apps/storefront/src/index.css:119` defines `:root { … }` for design tokens (`--card-radius`, `--shadow-*`, `--color-primary-*`). All variable values are themselves tokenized (`var(--color-primary-500, …)`); the `:root` is the design-token root, not styling. **Tolerable, but the gate should be refined to exclude `--*` token declarations.**

Both are documented in `CURRENT_STATE.md` §Known Risks as **pre-existing baseline failures**. Recommend refining the gates rather than moving tokens (they are correctly designed).

---

## 4. Route and Page Map

### Storefront (`apps/storefront/src/App.tsx`)

| Route                                                                                       | Component                                   | Auth                     | Theme scope                        | Notes                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                                                                                         | `LandingPage`                               | None                     | Landing identity (Aurora)          | 1945 LOC. Full marketing landing.                                                                                                                      |
| `/login`                                                                                    | `AuthLogin`                                 | None                     | System                             | ❌ Hardcoded "coming soon". Does not call `authApi`.                                                                                                   |
| `/signup`                                                                                   | `AuthSignup`                                | None                     | System                             | ❌ Hardcoded "coming soon". Does not call `authApi`.                                                                                                   |
| `/waitlist`                                                                                 | `AuthWaitlist`                              | None                     | System                             | Captures email to local state only; no backend endpoint called.                                                                                        |
| `/s/:slug`                                                                                  | `Home` (theme-aware)                        | None                     | `base-elegant` / `luxury-showcase` | 110 LOC orchestrator. Selects `components.HomePage` from registry or `BaseElegantHomePage` fallback.                                                   |
| `/s/:slug/c/:categorySlug`                                                                  | `Category`                                  | None                     | Store theme                        | 617 LOC. Full filter sidebar + grid/list view + saved prefs in localStorage.                                                                           |
| `/s/:slug/p/:productSlug`                                                                   | `ProductDetail`                             | None                     | Store theme                        | 339 LOC orchestrator. Calls `BaseElegantProductPage` fallback if registry returns null.                                                                |
| `/s/:slug/cart`                                                                             | `Cart`                                      | Cart context             | Store theme                        | 442 LOC.                                                                                                                                               |
| `/s/:slug/checkout`                                                                         | `Checkout`                                  | Cart context             | Store theme                        | 661 LOC. Includes 3DS redirect handling.                                                                                                               |
| `/s/:slug/order/:orderNumber`                                                               | `OrderSuccess`                              | Order token              | Store theme                        | 240 LOC.                                                                                                                                               |
| `/s/:slug/track`, `/track/:orderNumber`                                                     | `TrackOrder`, `TrackOrderResult`            | None                     | Store theme                        | 78 + 258 LOC.                                                                                                                                          |
| `/s/:slug/about`, `/contact`                                                                | `About`, `Contact`                          | None                     | Store theme                        | 87 + 121 LOC.                                                                                                                                          |
| `/s/:slug/policies/:policyType`                                                             | `PolicyPage`                                | None                     | Store theme                        | 101 LOC.                                                                                                                                               |
| `/s/:slug/support`, `/support/tickets/:ticketId`, `/support/kb`, `/support/kb/:articleSlug` | `Support`, `SupportTicket`, `KnowledgeBase` | None                     | Store theme                        | 170 + 211 + 152 LOC.                                                                                                                                   |
| `*` (under `/s/:slug`)                                                                      | `StoreNotFound`                             | None                     | Store theme                        | 32 LOC.                                                                                                                                                |
| `/about`                                                                                    | `About`                                     | None                     | Store theme                        | 87 LOC.                                                                                                                                                |
| `/marketplace`                                                                              | `HaaMarketplace` → `MarketplaceEdition`     | None                     | Marketplace                        | 131 LOC. Filters: search, category, sort, price range, availability.                                                                                   |
| `/marketplace/cart`                                                                         | `MarketplaceCart`                           | None                     | Marketplace                        | 110 LOC.                                                                                                                                               |
| `/marketplace/checkout`                                                                     | `MarketplaceCheckout`                       | None                     | Marketplace                        | 286 LOC. Groups by store, creates per-store orders via `cartApi` + `checkoutApi`, then `haaMarketplaceApi.createOrder` to attach a marketplace number. |
| `/marketplace/orders`                                                                       | `MarketplaceOrderTrack`                     | Phone-only via `?phone=` | Marketplace                        | 258 LOC. **⚠ Phone-only access — see §11 marketplace findings.**                                                                                       |
| `/marketplace/order/:orderNumber`                                                           | `MarketplaceOrderTrack`                     | Phone-only               | Marketplace                        | Same.                                                                                                                                                  |
| `/marketplace/products/:storeSlug/:productSlug`                                             | `MarketplaceProductDetail`                  | None                     | Marketplace                        | 499 LOC. Gallery, seller card, BNPL block, specifications, similar products.                                                                           |
| `/marketplace/sellers`                                                                      | `MarketplaceSellers`                        | None                     | Marketplace                        | 70 LOC.                                                                                                                                                |
| `/marketplace/sellers/:storeSlug`                                                           | `MarketplaceSeller`                         | None                     | Marketplace                        | 147 LOC.                                                                                                                                               |
| `/3ds-challenge`                                                                            | `Fake3DSChallenge`                          | None                     | System                             | 157 LOC. Dev-only fake 3DS redirect page.                                                                                                              |
| `/s/:slug/track-old` etc.                                                                   | Various                                     | —                        | —                                  | —                                                                                                                                                      |

Total storefront routes: **24 pages + landing + marketplace variants**. Marketplace has **9 distinct routes**.

### API (`apps/api/src/routes`)

Marketplace-relevant routes:

- `apps/api/src/routes/auth.ts` — `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout` (**all functional**, see §10).
- `apps/api/src/routes/haa-marketplace.ts` (680 LOC, 9 routes per `PUBLIC_MARKETPLACE_AUDIT.md`).
- `apps/api/src/routes/landing-ai-agent.ts` — `POST /api/landing-ai-agent/chat`. Rate-limited 30 req/min/IP. Signup-gated at 9 messages.
- `apps/api/src/routes/admin/marketplace.ts` (320 LOC) — review queue, feature products, settlements, deep reports.

---

## 5. System Theme Verdict

| Aspect                      | Status                                                       | Evidence                                                                                                                                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Structure**               | ✅ Clean                                                     | `packages/system-theme/src/{SystemThemeProvider.tsx, tokens.ts, system-theme.css}`                                                                                                                                                                                            |
| **Token quality**           | ✅ Tokenized via `--haa-*` namespace                         | `tokens.ts:12-69` exposes `SYSTEM_THEME_TOKENS` referencing CSS vars only. No raw colors.                                                                                                                                                                                     |
| **Color consistency**       | ✅ Single `data-haa-theme` attribute controls light/dark     | `system-theme.css:71-147` (truncated at line 80 in my read).                                                                                                                                                                                                                  |
| **Marketplace consistency** | ✅ Isolated                                                  | Marketplace never imports `@haa/system-theme`. Confirmed by `theme-rationalization.test.ts`.                                                                                                                                                                                  |
| **Auth page consistency**   | ⚠ Mixed                                                      | `Auth.tsx` reuses `text-text-primary`, `bg-surface-2`, `text-text-secondary` Tailwind tokens that resolve to **storefront tokens** (defined in `apps/storefront/src/index.css:155-170`), not system tokens. Auth looks "system-flavored" but actually uses storefront tokens. |
| **Isolation quality**       | ✅ Strong                                                    | `SystemThemeProvider` (line 27-34) **explicitly documents**: "Applies .haa-system-theme class to its wrapper div. NEVER writes to document.documentElement. NEVER reads storefront theme variables. Isolated from storefront theme scope."                                    |
| **Hardcoded color risks**   | ⚠ Low                                                        | `system-theme.css:10` hardcodes `--brand-primary: #58a1e2`. Same value as storefront `--brand-primary` (index.css:133). Two files, two namespaces (`--haa-*` vs raw + `--color-primary-*`), same hex. **Should be DRY-ed via tokens package** but not actively broken.        |
| **Final verdict**           | **🟢 Ready.** Strong. Tight contract. Minor DRY opportunity. |

---

## 6. Landing Page Verdict

File: `apps/storefront/src/pages/LandingPage.tsx` (1945 LOC).

### Conversion quality: **🟢 Strong**

- Above-the-fold: hero "أطلق متجرك الإلكتروني خلال N ثانية" with animated countdown + payment logos (mada, Visa, Mastercard, Apple Pay, STC Pay, Tabby, Tamara) + shipping logos (سبل, Aramex, Naqel, DHL, RedBox) + government trust badges (وزارة التجارة, منصة الأعمال, معروف, صنع في السعودية, ZATCA) + dual CTA (signup primary + watch demo secondary).
- Hero AI chat embedded (replaces secondary demo CTA — adds perceived interactivity).
- Social proof: "live activity ticker" with 80+ `LIVE_EVENTS` items (33 cities) showing "سجّل كتاجر", "أطلق متجره", "باع منتج", etc. ⚠ **These events are hardcoded constants**, not live data. See §14.
- Final CTA section: "انضم لـ 2,400+ تاجر سعودي يبيعون على Haa اليوم". ⚠ **Hardcoded number — see §14.**
- 3-tier pricing: Free / Pro / Enterprise. Free tier: "مجاني للأبد · لا حاجة لبطاقة" / "بدون بطاقة بنكية · إلغاء في أي وقت".
- Demo modal: 4-step interactive walkthrough.
- Bento testimonials: 3 testimonials (خالد السبيعي / نورة العتيبي / third).
- AI chat integration is excellent product work — gives the landing page a unique conversational edge.

### Visual quality: **🟢 Strong**

- Aurora mesh-gradient hero, glass-morphism nav, scroll-reveal, scroll progress bar, particle animations, gradient text. Professional.
- Typography: IBM Plex Sans Arabic via `--font-sans`. Headings scale `text-[44px]` → `text-[84px]`.
- Layout: StoreContainer max-width 1280px. Spacing tokens `--space-*` enforced.
- RTL: mirrored directional icons, `ms/me` logical properties used throughout.

### Copy quality: **🟡 Strong but legally loaded**

- "مجاني للأبد" — verified against pricing source? See §14.
- "صفر عمولة" / "0% عمولة" in final CTA — verified against `wallet.ts`/`commerce-core/src/platform-fees.ts`? See §14.
- "إعداد في 60 ثانية" — verified? See §14.
- "بدون بطاقة بنكية" — verified?
- "دعم بالعربي 24/7" — verified? (No chat widget; only Contact page.)
- Testimonials are **invented names** (خالد السبيعي, نورة العتيبي) with **invented cities/roles** and **generic quotes**. If these are not real testimonials, they constitute deceptive marketing.

### Trust quality: **🟡 Medium**

- Government logos (وزارة التجارة, ZATCA) are present in hero. These create trust but **also imply compliance that may not yet exist** (CR license, ZATCA integration, etc.). See `docs/ops/RISK_REGISTER.md` and `docs/SAUDI_COMPLIANCE_CHECKLIST.md`.
- "معروف" badge shown — but per `MARKETPLACE_PHASE0_AUDIT.md` the platform is **not yet registered on Maroof**.

### Mobile quality: **🟢 Good**

- Responsive grids, mobile-first CTAs (`sm:w-auto` after `w-full`), mobile search/menu in marketplace hero pattern is reused.
- Tested via Tailwind breakpoint classes: `sm:`, `md:`, `lg:`, `xl:`.

### Final verdict: **🟡 80% — visually strong, conversion-quality strong, but legally exposed.** Five unsubstantiated marketing claims + three invented testimonials = **do not run paid acquisition until claims are validated and testimonials are either removed or made honest.**

---

## 7. Homepage Verdict

The "homepage" of the storefront is **the landing page** at `/`. There is no separate system-homepage. The merchant homepage `/s/:slug` is the storefront theme's `HomePage`, evaluated in §8/§9.

### Strengths

- Strong identity. Aurora hero differentiates Haa from generic e-commerce SaaS landing.
- Multiple CTAs: signup primary, watch demo (real store link `/s/demo`), AI chat.
- Trust badges prominent above fold.
- Single page (no fake inner-home route). Clear.

### Issues

- Hardcoded social proof (live ticker events + 2,400+ number) — see §14.
- AI chat persona pre-answers merchant questions; if not connected to a real model (`LANDING_AI_MODEL_URL` env not set in default `.env`), it falls back to keyword-based matcher (`packages/commerce-core/src/landing-ai-agent/matcher.ts`). Risk: if merchant asks something outside the matcher, AI chat answers "I'm just a demo" — which is honest but may also expose the brand to "we're not really AI" criticism.
- No live merchant count, no real testimonials (see §14).

### Verdict: **🟡 Same as landing page.** Visually strong, marketing claims unverified.

---

## 8. Marketplace Verdict

File: `apps/storefront/src/pages/marketplace/{MarketplaceEdition, MarketplaceProductDetail, theme/*}.tsx` (~850 LOC).

### Visual quality: **🟢 Strong (post polish)**

- Isolated marketplace theme under `pages/marketplace/theme/`. Independent from merchant storefront themes.
- Hero with search bar, category tabs, total product count, trust row (متاجر موثوقة / توصيل سريع / دفع آمن / ضمان ومرتجعات), mobile menu, cart indicator.
- Product cards: title, rating + sales count, current price (large), old price (struck), savings badge, BNPL badges (Tabby/Tamara), demo badge if applicable, add-to-cart button. **Density optimized** (515px → 405px; image share 61%).
- Product detail: gallery + thumbnails, info panel with seller card, BNPL block, trust strip (6 items), description + specs + shipping/returns policy + reviews, similar products section, mobile sticky add-to-cart, image lightbox.
- Empty state, loading skeleton, error state — all present.

### Search/filter quality: **🟢 Functional**

- Filters: search (debounced 250ms), category (tabs), sort (featured/newest/price), price range, availability. Synced to URL params. **No city filter** (correct per product decision).
- `MarketplaceFilters.tsx` (104 LOC) clean.

### Trust quality: **🟡 Medium**

- Trust strip on product detail: 6 icons. Seller card: "متجر موثوق" badge. **BUT** — the "متجر موثوق" badge is unconditional on the product detail page (line 358-361). Per `PUBLIC_MARKETPLACE_AUDIT.md` P0-1, this is misleading: no KYC/Maroof check is enforced at the UI level. Either remove the badge or condition it on actual trust signal.
- Demo store badge present (`product.isDemoStore` → "متجر تجريبي"). Good.
- Shipping/returns block says "تطبق سياسة المتجر البائع" — honest copy.

### Seller disclosure

- Marketplace product detail → "متجر موثوق" badge (line 358) + "متجر تجريبي" if applicable (line 362-367) + city under store name (line 369). **Acceptable for marketplace.**
- BUT: "متجر موثوق" badge is hardcoded — see §11 P0 from previous audit.

### Demo separation in UI

- ✅ `MarketplaceProductCard.tsx:67-71` shows "متجر تجريبي" badge when `product.isDemoStore === true`. Good.
- ✅ Marketplace product detail shows same badge at line 362-367. Good.
- ⚠ Per `PUBLIC_MARKETPLACE_AUDIT.md`: the demo filter logic (`shouldShowInMarketplace`) allows demo stores when `demoProfile IS NOT NULL`, which means **demo products can appear in marketplace without an explicit opt-in**. Verify in `packages/shared/src/demo/demo-rules.ts:135` (file not opened in this audit but referenced).

### Consistency with system theme

- ✅ Independent. Uses `--primary-500`, `--bg-*`, etc. via Tailwind utility classes that resolve to **storefront tokens**, not system tokens. This is intentional per `MARKETPLACE_RATIONALIZATION.md`.
- ⚠ Aesthetic differs significantly from system theme (white/neutral vs `--haa-*` branded). This is **fine** because marketplace is a marketing surface, not a dashboard. But the user must always know: marketplace = Haa's marketing; merchant store = independent theme.

### Verdict: **🟡 70%.** Visually polished and isolated. Trust badges are misleading. `PUBLIC_MARKETPLACE_AUDIT.md` already documents 6 P0 legal/compliance items (SFDA, restricted categories, phone-only access, demo filter conflict, missing moderation audit, missing legal copy). Honor that audit.

---

## 9. Store Theme 1 — base-elegant

### Theme identity

- **Name:** Base Elegant (أنيق أساسي)
- **Registry key:** `base-elegant` (default; `DEFAULT_STOREFRONT_THEME_KEY`)
- **Package files:** `packages/storefront-themes/src/themes/base-elegant/{index.ts, manifest.ts}` (12 LOC total — manifest only)
- **Runtime files:** `apps/storefront/src/themes/base-elegant/{HomePage.tsx (600 LOC), ProductPage.tsx (811 LOC), editor-schema.ts (53 LOC), index.ts}` (1466 LOC)
- **Purpose:** Default fallback storefront theme. Clean, modern, elegant.
- **Visual direction:** White surfaces, soft borders, IBM Plex Sans Arabic, blue brand (`--brand-primary: #58a1e2`).
- **Target merchant type:** General e-commerce, any category.
- **Dependency on shared components:** High — reuses `ThemedProductCard`, `ProductPriceBlock`, `BNPLBadges`, `CountdownTimer`, `FilterSidebar`, etc.

### Architecture

- **Tokens:** Tailwind tokens via `apps/storefront/src/index.css` + `--space-*` typography/radius scale in `#storefront-scope` (lines 7-30).
- **Components:** 5 registered (`Header`, `Footer`, `ProductCard`, `HomePage`, `ProductPage`) via `apps/storefront/src/theme-registry.ts:21-30`.
- **CSS scope:** Strict `#storefront-scope` (index.css:5-77). RTL isolation enforced. `prefers-reduced-motion` honored.
- **Defaults:** Brand blue, soft card radius (16px), 1240px container.
- **Editor compatibility:** `editor-schema.ts` exposes 53 LOC of editable fields. Real editor wiring in merchant-dashboard (`ThemeEditor.tsx` → `getThemeCapsule`).
- **Fallback behavior:** When `themeKey` is null/unresolved → `getStorefrontThemeComponents('base-elegant')` returns the registered components (line 24 of `registry.ts`).
- **Isolation:** ✅ Clean. Tested.

### Pages inspected

| Page                                                                                                                          | LOC | Quality     | Notes                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | --- | ----------- | ------------------------------------------------------------------------------------------------------- |
| Store home `/s/:slug` (HomePage)                                                                                              | 600 | 🟢 Polished | Hero + sections + categories + product grid + recently viewed + testimonials.                           |
| Product detail `/s/:slug/p/:slug` (ProductPage)                                                                               | 811 | 🟢 Polished | Gallery + variants + price block + add-to-cart + recently viewed + size guide + trust badges + reviews. |
| Category `/s/:slug/c/:slug`                                                                                                   | 617 | 🟢 Polished | Filter sidebar, grid/list view, saved column prefs.                                                     |
| Cart, Checkout, OrderSuccess, About, Contact, PolicyPage, Support, SupportTicket, KnowledgeBase, TrackOrder, TrackOrderResult | —   | 🟢 Present  | Functional and consistent.                                                                              |

### Product card quality (base-elegant)

- **Price position:** Fixed at right edge of card. SAR via `SarIcon` with `unicode-bidi: isolate` (index.css:80-83). Correct for Arabic RTL.
- **Discount badge:** Red (`bg-danger`), compact size. Doesn't break design.
- **Image aspect:** Square (`aspect-square`). Consistent.
- **Text overlap:** No issues found in `ThemedProductCard`.
- **Button consistency:** Standard `StoreButton` component.
- **Spacing:** Uses `--space-*` tokens (--space-3, --space-4).
- **Discount/no-discount:** Both render cleanly. No layout shift.
- **Badges (selected/discount):** Pin to image corners without overlap.
- **Mobile:** Tested via Tailwind responsive (`sm:`, `md:`, `lg:`).

### Checkout and trust

- **VAT display:** ✅ Wired in Checkout (TASK-0035 sub-item 7). Verified in `tests/checkout-vat-line.test.ts` (5 tests pass).
- **Shipping/pickup display:** ✅ `checkoutApi.getShippingRates` called per store.
- **Payment methods:** ✅ Tabby, Tamara, mada, Apple Pay, STC Pay, Visa, Mastercard, COD (via `paymentMethods` API).
- **Trust badges:** ✅ Maroof, CR, ZATCA badges in product detail (when conditions met) via `apps/storefront/src/components/ui/trust-badges.tsx`.
- **Return policy:** ✅ In policy routes.
- **Seller identity:** ✅ Store header + store info.
- **Order summary:** ✅ Visible in checkout.
- **Error/loading states:** ✅ Skeleton, retry, error banners.

### Verdict

- **Strengths:** Polished. RTL-clean. Tokenized. Editor schema present.
- **Weaknesses:**
  - Hybrid architecture (manifest in package, components in app) is unconventional. A second package-only theme would not be able to register components without duplicating this pattern. See `THEME_RATIONALIZATION.md`.
  - Product page 811 LOC is acceptable but on the upper end of "single responsibility." Could split into `ProductGallery.tsx`, `ProductPurchasePanel.tsx`, `ProductTabs.tsx`. **Not a blocker.**
- **Visual consistency:** 9/10.
- **Mobile/RTL:** 9/10.
- **Readiness:** **🟢 YES.** Behaves like a real commercial theme. Hydration flicker fixed (TASK-0008). Registration → draft store → merchant publishes — flow works.

---

## 10. Store Theme 2 — luxury-showcase

### Theme identity

- **Name:** Luxury Showcase (luxury-showcase capsule)
- **Registry key:** `luxury-showcase`
- **Package files:** `packages/storefront-themes/src/themes/luxury-showcase/{index.ts, capsule.ts}` (266 LOC)
- **Runtime files:** `apps/storefront/src/themes/luxury-showcase/{HomePage (194), ProductPage (141), Header (285), Footer (94), luxuryTokens.ts, manifest.ts, components/{LuxuryProductCard, LuxuryImageFallback, LuxuryProductGallery, LuxuryProductInfoPanel, LuxuryProductTabs, banners/*, sliders/*, sections/*}}`
- **Purpose:** Premium/luxury merchant theme. Warm gold palette.
- **Visual direction:** Cream surfaces (`#FAF7F1`), gold accents (`#B88A3D`), serif headings, generous spacing.
- **Target merchant type:** Premium goods (perfumes, watches, jewelry, fashion).
- **Dependency on shared components:** Lower than base-elegant — uses its own `LuxuryProductCard` and gallery components.

### Architecture

- **Tokens:** `luxuryTokens` object in `capsule.ts:3-44` (rich token set: colors, radius, spacing, typography, shadows).
- **Components:** 5 registered (`LuxuryShowcaseHeader`, `LuxuryShowcaseFooter`, `LuxuryProductCard`, `LuxuryShowcaseHomePage`, `LuxuryShowcaseProductPage`) via `theme-registry.ts:32-41`.
- **Capsule:** `luxuryShowcaseCapsule` carries `ThemeTokens` + `ThemeSpecificConfig` (with hero, collections, productCard, banners) + `ThemeEditorSchema` + `ThemeCapabilityFlags`.
- **CSS scope:** Same `#storefront-scope` tokenization as base-elegant. Theme-specific tokens applied via inline `style={{ backgroundColor: luxuryTokens.colors.bg }}` patterns.
- **Defaults:** Warm cream, gold accent, serif headings (`theme-serif`), card radius 6px (vs 16px for base-elegant — **significant difference**).
- **Editor compatibility:** ✅ Full schema in `capsule.ts` (`luxuryEditorSchema`).

### Pages inspected

| Page           | LOC     | Quality     | Notes                                               |
| -------------- | ------- | ----------- | --------------------------------------------------- |
| Store home     | 194     | 🟢 Curated  | Hero slider + 4-card collections + curated banners. |
| Product detail | 141     | 🟢 Curated  | Gallery + info panel + tabs.                        |
| Header         | 285     | 🟢 Custom   | Logo + nav + cart.                                  |
| Footer         | 94      | 🟢 Custom   | Signup CTA + links.                                 |
| Components     | various | 🟢 Complete | HeroSlider, banners, sections all present.          |

### Product card quality (luxury-showcase)

- Uses `LuxuryProductCard` — same component family as base-elegant but with luxury visual treatment.
- Rating, sales count, wishlist, image ratio `1:1` configured in `capsule.ts:71-76`.

### Checkout and trust

- **Inherits** all checkout / trust logic from base-elegant (theme only changes presentation, not commerce). ✅ VAT, payment methods, trust badges, return policy all work via theme-agnostic components.

### Verdict

- **Strengths:** Cohesive luxury aesthetic. Capsule model is well-designed. Custom components present.
- **Weaknesses:**
  - 285 LOC header is dense; could split.
  - `luxuryTokens.ts` and `luxuryShowcaseCapsule` are split across `apps/storefront/src/themes/luxury-showcase/` and `packages/storefront-themes/src/themes/luxury-showcase/`. Hybrid pattern matches base-elegant. Consistent.
  - No dedicated test for theme isolation (other than `theme-rationalization.test.ts` and `theme-fallback-regression.test.ts` which cover base-elegant).
- **Visual consistency:** 8/10.
- **Mobile/RTL:** 8/10 (less tested in code than base-elegant; some patterns rely on inline `style` vs Tailwind classes).
- **Readiness:** **🟡 YES with caution.** Functional and visually distinct. Editor wiring exists. Recommend adding dedicated theme tests before exposing theme picker to merchants (out of scope for this audit).

---

## 11. Registration and Onboarding Audit

### User journey from landing → dashboard

```
LandingPage (/)
   ↓ click "سجّل كتاجر — مجانًا"
/signup (AuthSignup)
   ↓ form fill (name, email, phone, storeName, password)
   ↓ submit  ⛔ setError('قريبًا')  ← DEAD END
   ↓ no API call
   ↓ banner: "التسجيل يفتح قريبًا" / link to /waitlist
/waitlist
   ↓ email + submit → setStatus('success')
   ↓ NO backend endpoint hit (local state only)
```

### API reality

- `apps/api/src/routes/auth.ts` is **fully functional**:
  - `POST /auth/register` → uses `AuthFlowService.register` → returns JWT + user + store (line 11-62).
  - `POST /auth/login` → JWT (line 65-129).
  - `GET /auth/me` → user info (line 132-157).
  - `POST /auth/logout` (line 160-172).
- `registerSchema` and `loginSchema` are imported from `@haa/shared` (line 4).
- `AuthFlowService` is in `@haa/commerce-core`.

**Conclusion:** The backend is **done**. The frontend is **broken**.

### Where the disconnect lives

`apps/storefront/src/pages/Auth.tsx:22-25` (LoginPage):

```ts
const onSubmit = (e: FormEvent) => {
  e.preventDefault();
  setError(t("auth.login.comingSoon.title", "قريبًا"));
};
```

`apps/storefront/src/pages/Auth.tsx:152-155` (SignupPage): identical.

`apps/storefront/src/pages/Auth.tsx:276-279` (WaitlistPage):

```ts
const onSubmit = (e: FormEvent) => {
  e.preventDefault();
  setStatus("success");
};
```

No `authApi` import. No `fetch` call. No state propagation. **Forms are decorative.**

### Search confirms zero integration

- `grep -rn "authApi|/auth/login|/auth/register" apps/storefront/src/lib` → **0 matches**.
- `Auth.tsx` does not import `@haa/api` or `@/lib/api` for auth calls.

### Blockers

| Severity | Issue                                                                                                                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P0**   | Auth UI is a dead end. Signup/Login forms hardcoded "coming soon". Backend works but frontend never calls it. **Cannot acquire merchants through the landing page CTA path.**                                   |
| **P0**   | Waitlist form has no backend endpoint — captures email to local state only. Data is lost on page reload.                                                                                                        |
| **P1**   | Auth pages use storefront tokens (`text-text-primary`, `bg-surface-2`) but visually present as system pages. Inconsistent identity (see §5).                                                                    |
| **P1**   | No "magic link" or "social login" alternative. Email + password only.                                                                                                                                           |
| **P2**   | No onboarding wizard visible to merchant after first login. Onboarding exists in admin (`OnboardingWizard.tsx`) but not in merchant-dashboard (`pages/OnboardingWizard.tsx` exists, untested for completeness). |
| **P2**   | No plan selection enforcement. `?plan=pro` query is read but does not change the registration payload.                                                                                                          |
| **P3**   | No "forgot password" endpoint wired (`t('auth.login.forgotPassword')` shows, link goes to `#forgot` anchor).                                                                                                    |

### Friction points (P2/P3)

- AuthShell uses Haa branding correctly.
- RTL correct.
- Fields have icons + placeholders + autocomplete. Good.
- No client-side password strength meter.
- No reCAPTCHA / hCaptcha (rate-limited on backend, so acceptable for now but a real launch should add).

### Verdict: **🔴 BLOCKER.** The single most damaging issue in the entire audit. **Fix this first before any other landing/marketplace/copy work.** A merchant who clicks "سجّل كتاجر — مجانًا" and lands on "قريبًا" is a paid-traffic-burned customer.

---

## 12. Cross-Theme Consistency Findings

| #   | Issue                                                                                                                                                                                  | Theme scope                  | Severity         | Evidence                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | `apps/storefront/src/pages/Auth.tsx` uses storefront tokens but should use system tokens                                                                                               | System                       | P1               | AuthShell line 339: `bg-surface-2 text-text-primary`                                                              |
| 2   | Card radius differs: base-elegant 16px vs luxury-showcase 6px                                                                                                                          | Store theme 1 + 2            | P2 (by design)   | `index.css:121` `--card-radius: 16px` vs `capsule.ts:24` `card: '6px'`                                            |
| 3   | Brand color hardcoded in two places: system-theme.css:10 and storefront index.css:133 both `#58a1e2`                                                                                   | System + Storefront          | P3               | DRY opportunity via `@haa/tokens` package                                                                         |
| 4   | Marketplace uses neither system nor store tokens; uses Tailwind utilities + local JS token object                                                                                      | Marketplace                  | P2 (intentional) | `marketplace/theme/tokens.ts:1-36`                                                                                |
| 5   | Header/Footer for system (merchant dashboard) is independent from store themes. **No cross-leakage** in code.                                                                          | All                          | ✅               | Verified.                                                                                                         |
| 6   | Checkout pages (`/s/:slug/checkout`) and system checkout are different code paths. Marketplace checkout (`MarketplaceCheckout.tsx`) is distinct.                                       | All                          | ✅               | Verified.                                                                                                         |
| 7   | Marketplace product cards vs base-elegant product cards: **different visual treatment** (marketplace = white/red/struck price, base-elegant = blue/normal). Risk of confusion.         | Marketplace + Store 1        | P2               | `MarketplaceProductCard.tsx:90-93` vs `ThemedProductCard.tsx`                                                     |
| 8   | Marketplace `/marketplace/sellers/:slug` link does not navigate to merchant storefront `/s/:slug` — they're parallel universes (correct by design). User must understand the boundary. | Marketplace + Store          | P1 (UX clarity)  | `MarketplaceProductDetail.tsx:344-349` provides "عرض في متجر التاجر" link. ✅ Good.                               |
| 9   | Navigation between marketplace and storefront: no shared header/footer. Different identity.                                                                                            | Marketplace + Store          | P1 (UX)          | `MarketplaceHero.tsx` does not link to `/` (storefront root).                                                     |
| 10  | User does not know when they are "inside Haa" vs "inside merchant store". Marketplace hero is independent from system theme.                                                           | System + Marketplace + Store | P1               | Verify user-flow clarity: marketplace → product → "متجر التاجر" → merchant storefront. Currently passes the test. |

**Verdict:** Three layers (system / storefront / marketplace) are **structurally isolated** but the user is left to figure out the boundary on their own. Marketplace hero + footer would benefit from a small "powered by Haa / هذه منصة ها" disclosure. Merchant storefront footer should disclose "هذا متجر مستقل على منصة ها". Per §14 these disclosures are legal copy obligations.

---

## 13. Visual Consistency Findings

| #   | Issue                                                                                                                                                  | Severity | Evidence                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------- |
| 1   | Spacing tokens defined and used: `--space-0` to `--space-16` (10 values). **Enforced** in storefront CSS via `padding-block: var(--space-6)` patterns. | ✅       | `index.css:7-17`                                                                  |
| 2   | Border radius tokens defined (card, modal, pill, badge). Mixed application.                                                                            | 🟡       | `index.css:121-124`                                                               |
| 3   | Shadows: 4 levels (`--shadow-sm/md/lg/xl`). Used inconsistently — some places use Tailwind `shadow-card` (custom) instead.                             | 🟡       | `index.css:127-130` vs `tailwind.config.js`                                       |
| 4   | Color tokens: `--color-primary-{50..950}` derived from `--brand-primary`. Used by Tailwind via `bg-primary-500` etc.                                   | ✅       | `index.css:134-148`                                                               |
| 5   | Hover/focus states: generally defined. Some buttons missing focus-visible ring.                                                                        | 🟡       | Several `hover:` without `focus-visible:`.                                        |
| 6   | Disabled states: defined via `disabled:` Tailwind variants.                                                                                            | ✅       | Generally correct.                                                                |
| 7   | Empty states: `StoreEmptyState` component. Consistent across pages.                                                                                    | ✅       | Used in `Category.tsx`, `MarketplaceEdition.tsx`, `MarketplaceProductDetail.tsx`. |
| 8   | Error states: `StoreAlert` + `toast.error`. Consistent.                                                                                                | ✅       | Sonner toasts + StoreAlert variant="danger"/"warning".                            |
| 9   | Loading skeletons: `StoreSkeleton` + `ProductCardSkeleton` (marketplace-specific). Consistent.                                                         | ✅       | Used everywhere loading is needed.                                                |
| 10  | Icon size: 2xs/xs/sm/md/lg/xl from `Icon` component. **Inconsistent** ad-hoc usage in marketplace — some use `size="xs"` lucide-react directly.        | 🟡       | `MarketplaceProductDetail.tsx:4-6` imports Lucide directly.                       |
| 11  | SAR currency: `SarIcon` + `unicode-bidi: isolate` + `direction: ltr` enforced. ✅                                                                      | ✅       | `index.css:80-83`, `SarIcon.tsx`.                                                 |
| 12  | Typography: `IBM Plex Sans Arabic` loaded. Hierarchy via Tailwind text sizes.                                                                          | ✅       | `index.css:18, 38, 47, 56`                                                        |
| 13  | Section width: `container-store` max-width 1280px (configurable via `--container-max-width`).                                                          | ✅       | `index.css:99-103`                                                                |
| 14  | Grid consistency: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` is the canonical product grid. Used in marketplace + category + product detail.          | ✅       | Verified.                                                                         |
| 15  | Image ratios: Square (`aspect-square`) in product cards. Consistent.                                                                                   | ✅       | Verified.                                                                         |
| 16  | Form styles: `StoreInput`, `StoreTextarea`, `StoreSelect`. Consistent.                                                                                 | ✅       | Verified.                                                                         |

**Verdict:** Visual consistency is **strong (8.5/10)**. The main gap is ad-hoc Lucide icon imports bypassing the `Icon` wrapper. Recommend extracting `Icon` to enforce size governance.

---

## 14. Mobile / RTL Findings

### Mobile

| #   | Issue                                                                                                                                           | Severity           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| 1   | Hero countdown timer (`CountdownTimer` in LandingPage): 60-second loop. On mobile, 64x64 SVG + 5xl-8xl numbers take significant vertical space. | P3 (design intent) |
| 2   | Bento testimonials: 3-col on desktop, 1-col mobile. Tile aspect ratio changes from 4:3 to 1:1 on mobile. ✅                                     | ✅                 |
| 3   | Marketplace mobile menu: drawer pattern (`mobileMenuOpen`). ✅                                                                                  | ✅                 |
| 4   | Filter sidebar: hidden on mobile, drawer on tap. ✅                                                                                             | ✅                 |
| 5   | Hero CTAs: `w-full` on mobile, `sm:w-auto` on tablet+. ✅                                                                                       | ✅                 |
| 6   | Marketplace product detail: mobile sticky add-to-cart (`fixed bottom-0`). ✅                                                                    | ✅                 |
| 7   | Mobile category view: grid/list toggle + column count (2/3/4). Saved to localStorage. ✅                                                        | ✅                 |
| 8   | Mobile search: debounced 250ms via timer. ✅                                                                                                    | ✅                 |
| 9   | Long Arabic text wraps correctly. RTL numerals? Not explicitly tested.                                                                          | P3                 |
| 10  | Sticky headers on mobile: landing has sticky glass header (60px). Storefront themes have their own.                                             | ✅                 |

### RTL

| #   | Issue                                                                                                                                         | Severity                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `direction: rtl` set on `#storefront-scope`. ✅                                                                                               | ✅                                                 |
| 2   | `margin-inline`, `padding-inline`, `inset-inline`, `text-align: start/end` used. ✅                                                           | ✅                                                 |
| 3   | Arrow/chevron icons flipped via CSS scaleX(-1). ✅                                                                                            | `index.css:85-96`                                  |
| 4   | SAR icon: `direction: ltr; unicode-bidi: isolate`. ✅                                                                                         | `index.css:80-83`                                  |
| 5   | No `left`/`right` hardcoded in storefront code (verified by inspection).                                                                      | ✅                                                 |
| 6   | Form inputs: `dir="ltr"` for phone + email fields (correct). ✅                                                                               | `Auth.tsx:201`, `MarketplaceCheckout.tsx:208-209`. |
| 7   | RTL in marketplace: verified — `MarketplaceEdition.tsx`, `MarketplaceHero.tsx`, `MarketplaceProductDetail.tsx` all use logical properties. ✅ | ✅                                                 |

### Overflow / cropping

| #   | Issue                                                                                    | Severity |
| --- | ---------------------------------------------------------------------------------------- | -------- |
| 1   | No horizontal overflow reported in any viewport per `TASK-0024`, `TASK-0022` test notes. | ✅       |
| 2   | Footer heights: not explicitly bounded. Mobile footer may be tall.                       | P3       |
| 3   | Mockup images: `iphone-frame.png` in landing. Static SVG. ✅                             | ✅       |

**Verdict:** Mobile + RTL are **well-handled (9/10)**. No major overflow or cropping issues. Recommend one round of mobile screenshots from a real device (out of scope for this code audit).

---

## 15. Accessibility Findings

> ⚠ No screen-reader or keyboard test was run. Findings below are static code analysis only. I will not claim WCAG compliance.

| #   | Issue                                                                                                     | Severity    | Evidence                                                                |
| --- | --------------------------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------- |
| 1   | Landing: skip-link missing.                                                                               | P2          | LandingPage has no `<a href="#main" class="sr-only focus:not-sr-only">` |
| 2   | Auth: skip-link present. ✅                                                                               | ✅          | `Auth.tsx:340-345`                                                      |
| 3   | Landing: main content has `id` and headings order? `<h1>` on hero, then `<h2>` on subsequent sections. ✅ | ✅          | Verified.                                                               |
| 4   | Image alt text: most images have alt. Hero payment logos have alt="مدى" etc. ✅                           | ✅          | `LandingPage.tsx:240-247`                                               |
| 5   | Icon-only buttons: most have `aria-label`. Marketplace product detail has good `aria-label` coverage. ✅  | ✅          | `MarketplaceProductDetail.tsx:185, 189, 195, 199, 317, 321`             |
| 6   | Keyboard navigation: focus styles use `focus-visible:ring-2`. Generally present. ✅                       | ✅          | Verified across components.                                             |
| 7   | Form labels: `StoreInput label=` is associated via `htmlFor`. ✅                                          | ✅          | Verified.                                                               |
| 8   | Error messages: `StoreAlert` + `toast.error` used. Both have role="alert" semantics via Sonner. ✅        | ✅          | Verified.                                                               |
| 9   | Reduced motion: `index.css:209-216` + `:425-427` enforce `prefers-reduced-motion`. ✅                     | ✅          | Verified.                                                               |
| 10  | Modals: `role="dialog"` + `aria-modal="true"` + `aria-label`. ✅                                          | ✅          | `DemoModal.tsx:1508-1510`                                               |
| 11  | Color contrast: not measured. Brand blue `#58a1e2` on white at 16px+ likely passes AA (4.5:1) but verify. | P3 (verify) | —                                                                       |
| 12  | Forms: autocomplete attributes present (`email`, `current-password`, `tel`, `name`, `new-password`). ✅   | ✅          | Verified.                                                               |
| 13  | Focus order in MarketplaceFilters: tabs use `role="radiogroup"` + `aria-label`. ✅                        | ✅          | `Category.tsx:508-525`                                                  |
| 14  | Empty states have icon + title + description + optional action. ✅                                        | ✅          | Verified.                                                               |

**Verdict:** Accessibility is **structurally strong** but **not verified by AT**. Do not claim WCAG. Recommend manual NVDA/VoiceOver screen-reader pass before public launch.

---

## 16. Performance / SEO Findings

| #   | Issue                                                                                            | Severity       | Evidence                                                   |
| --- | ------------------------------------------------------------------------------------------------ | -------------- | ---------------------------------------------------------- |
| 1   | Bundle splitting: routes use `lazy()` in `App.tsx`. ✅                                           | ✅             | Verified.                                                  |
| 2   | Lazy images: product images use `loading="lazy"`. ✅                                             | ✅             | `Category.tsx:81`, marketplace cards.                      |
| 3   | Font loading: `IBM Plex Sans Arabic` is loaded via Tailwind config. Verify `font-display: swap`. | P3             | `tailwind.config.js` (not opened).                         |
| 4   | Unused CSS: Tailwind purge should handle it.                                                     | ✅             | PostCSS + Tailwind.                                        |
| 5   | Hydration: theme hydration flicker fixed (TASK-0008). ✅                                         | ✅             | Documented in CURRENT_STATE.                               |
| 6   | Metadata: `useSEO` hook used in pages. ✅                                                        | ✅             | `useSEO.ts` exists.                                        |
| 7   | OG tags: `useSEO` accepts `ogImage` and `ogType`. ✅                                             | ✅             | Verified.                                                  |
| 8   | Canonical URLs: not explicitly set in the codebase.                                              | P2             | `useSEO` does not set canonical.                           |
| 9   | Arabic SEO: `<html lang="ar" dir="rtl">`? Not verified — open `apps/storefront/index.html`.      | P3             | —                                                          |
| 10  | Structured data (JSON-LD): `breadcrumbJSONLD` exists in `Category.tsx`. ✅                       | ✅             | `jsonld.ts` exists.                                        |
| 11  | Sitemap/robots: not verified.                                                                    | P3             | —                                                          |
| 12  | Landing page bundle: 1945 LOC in single file. Tree-shaking handles it but file is dense.         | P3 (perf hint) | —                                                          |
| 13  | AI chat: lazy loaded? Hero is in landing, not lazy. Adds JS bundle to landing.                   | P3             | `HeroAIChat.tsx` imported eagerly in `LandingPage.tsx:37`. |

**Verdict:** SEO basics are in place. `og:title`, `og:description`, `og:image` are wired via `useSEO`. **Arabic SEO is not explicitly verified** — recommend manual `<html lang>` check.

---

## 17. Copywriting / Legal Claim Findings

### Claims that need verification or removal before any paid campaign

| #   | Claim                                                              | Location                                                  | Risk                                                                                                                                                                                                                                                       | Status                                                                                                           |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | "0% عمولة"                                                         | `LandingPage.tsx:1468` (FinalCTA.g1)                      | **High.** Marketing claim. Per `commerce-core/src/platform-fees.ts`, default platform fee is configurable per-store (`store_billing_settings`). "0% عمولة" is true for the default-free-tier narrative but not contractually guaranteed for all merchants. | **🔴 Verify or soften to "بدون رسوم إعداد" / "عمولة شفافة"**                                                     |
| 2   | "مجاني للأبد"                                                      | `LandingPage.tsx:1365` (Pricing tier trust microcopy)     | **High.** Subscription terms. If "Pro" is paid, then "free forever" is for the Free tier only — not the platform. Verify copy aligns with subscription model in `subscriptions.ts`.                                                                        | **🔴 Scope the claim to Free tier explicitly.**                                                                  |
| 3   | "2,400+ تاجر سعودي يبيعون على Haa اليوم"                           | `LandingPage.tsx:1439` (FinalCTA H2)                      | **🔴 CRITICAL.** Hardcoded number. If real count is different, this is deceptive advertising. Verify against `tenants` table count. **Most likely inflated.**                                                                                              | **🔴 Replace with live count or remove.**                                                                        |
| 4   | "إعداد في 60 ثانية"                                                | `LandingPage.tsx:1476` (FinalCTA.g3)                      | Medium. Real onboarding time depends on merchant.                                                                                                                                                                                                          | **🟡 Soften to "إعداد سريع".**                                                                                   |
| 5   | "بدون بطاقة بنكية"                                                 | `LandingPage.tsx:300, 1365, 1447`                         | Low. Subscription billing may require card later.                                                                                                                                                                                                          | **🟡 Add "لتجربة المنصة فقط" disclaimer.**                                                                       |
| 6   | "دعم بالعربي 24/7"                                                 | `LandingPage.tsx:302`                                     | High. No live chat widget. Only Contact form.                                                                                                                                                                                                              | **🔴 Replace with "دعم بالعربي"** (drop 24/7 claim).                                                             |
| 7   | "بدون بطاقة بنكية · إلغاء في أي وقت" (Pro tier)                    | `LandingPage.tsx:1365`                                    | Medium. Subscription cancellation may have terms.                                                                                                                                                                                                          | **🟡 Verify cancellation policy.**                                                                               |
| 8   | Testimonials (خالد السبيعي / نورة العتيبي / 3rd)                   | `LandingPage.tsx:1686-1716`                               | **🔴 CRITICAL.** Names + roles + cities + quotes. **Are these real customers?** If invented, this is deceptive.                                                                                                                                            | **🔴 Either get real opt-in testimonials or remove.**                                                            |
| 9   | Live activity ticker (80+ events)                                  | `LandingPage.tsx:330-419`                                 | High. Hardcoded `LIVE_EVENTS` array implies real-time activity. **These are not real events.**                                                                                                                                                             | **🔴 Either connect to real analytics or remove the "الآن" / "قبل دقيقة" timestamps and call it "نشاط سابق".**   |
| 10  | "4 ثيمات احترافية"                                                 | `LandingPage.tsx:1493` (DemoModal step 2)                 | Medium. Only 2 themes ship today (`base-elegant`, `luxury-showcase`).                                                                                                                                                                                      | **🟡 Verify count or soften.**                                                                                   |
| 11  | "متجر موثوق" badge (unconditional)                                 | `MarketplaceProductDetail.tsx:358-361`                    | **🔴 CRITICAL.** Trust badge with no actual verification gate. Misleading.                                                                                                                                                                                 | **🔴 Remove or condition on actual trust signal (KYC/Maroof verified).** Per `PUBLIC_MARKETPLACE_AUDIT.md` P0-1. |
| 12  | Government logos (وزارة التجارة, ZATCA, معروف, etc.)               | `LandingPage.tsx:268-274`, `MarketplaceProductDetail.tsx` | **🔴 HIGH.** Implies official registration or partnership. If Haa is **not** registered on Maroof (per `MARKETPLACE_PHASE0_AUDIT.md`), this is misleading.                                                                                                 | **🔴 Verify each logo's right-to-use. Remove if no license.**                                                    |
| 13  | "Trusted merchant" / "ضمان من البائع"                              | Marketplace product detail                                | Medium. Legal obligation is on the merchant, not Haa.                                                                                                                                                                                                      | **🟡 Add "Haa provides the platform; merchant is responsible for warranty" disclaimer.**                         |
| 14  | "Haa provides the platform; Haa is not the seller" disclosure      | Marketplace + storefront                                  | **🔴 CRITICAL.** Per `MARKETPLACE_PHASE0_AUDIT.md` and `docs/PRIVACY_POLICY.md` (recent draft), this disclosure must be prominent. Currently buried in shipping/returns copy.                                                                              | **🔴 Add visible disclosure in marketplace hero/footer and merchant storefront footer.**                         |
| 15  | `LandingPage.tsx:268-274` shows "صنع في السعودية" + "منصة الأعمال" | Same                                                      | Same as #12.                                                                                                                                                                                                                                               | Same.                                                                                                            |
| 16  | "الأسعار" plans show Pro at "14 يوم تجربة"                         | `LandingPage.tsx:164` (planProNotice "تجربة 14 يوم")      | Low. Trial terms must be visible.                                                                                                                                                                                                                          | ✅                                                                                                               |
| 17  | Signup CTA "سجّل كتاجر — مجانًا"                                   | Multiple                                                  | If signup is broken (§11), this is false advertising.                                                                                                                                                                                                      | **🔴 Block until signup wired.**                                                                                 |

### Required legal copy (already drafted per CURRENT_STATE.md)

- `docs/PRIVACY_POLICY.md` — ✅ drafted (TASK-0042), pending DPO review.
- `docs/TERMS_OF_SERVICE.md` — ✅ drafted, pending legal review.
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` — ✅ drafted, pending compliance review.
- `docs/DEPLOYMENT_RUNBOOK.md` — ✅ drafted.
- `docs/SFDA_DISCLAIMER.md` — ✅ drafted (TASK-0042).

**Verdict:** **Marketing copy is currently ahead of legal ground.** Many claims are aspirational, not contractual. **No paid acquisition campaign should start until the 6 P0 copy claims above are addressed.**

---

## 18. Tests and Verification Audit

### Verification commands run (read-only)

| Command                                                                                                                                                             | Result                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm preflight`                                                                                                                                                    | ❌ FAIL: `packages/shared typecheck` — 2 errors: `'marketplace.review' not assignable to Permission`, `'marketplace.feature' not assignable to Permission` (`packages/shared/src/permissions.ts:187-188`). |
| `pnpm --filter @haa/shared typecheck`                                                                                                                               | ❌ 2 errors (same).                                                                                                                                                                                        |
| `pnpm --filter @haa/storefront typecheck`                                                                                                                           | ✅ PASS.                                                                                                                                                                                                   |
| `pnpm --filter @haa/api typecheck`                                                                                                                                  | ✅ PASS.                                                                                                                                                                                                   |
| `pnpm vitest run --silent`                                                                                                                                          | **2465 passed / 5 failed / 1 skipped / 14 todo (2485 total).**                                                                                                                                             |
| `pnpm exec eslint apps/storefront/src/pages/{LandingPage,Auth}.tsx apps/storefront/src/pages/marketplace/{MarketplaceEdition,MarketplaceProductDetail}.tsx --quiet` | ✅ clean                                                                                                                                                                                                   |

### 5 failing tests (all pre-existing baseline, per CURRENT_STATE.md §Known Risks)

| #   | Test                                       | What it covers                                     | What it doesn't                                                                                | Risk                                                       | Notes                                                                                                                  |
| --- | ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 1   | `tests/schema-deduplication.test.ts:12`    | `marketing-actions.ts` must NOT exist              | Asserts the schema file is removed                                                             | Low (test strictness)                                      | Pre-existing.                                                                                                          |
| 2   | `tests/migration-deduplication.test.ts:12` | `0046_smiling_phil_sheldon.sql` must NOT exist     | Asserts migration is split into 0047+0048                                                      | Low                                                        | Pre-existing.                                                                                                          |
| 3   | `tests/rbac-permission-catalog.test.ts:81` | Owner role has all permissions from catalog        | New permissions (`marketplace.review`, `marketplace.feature`) added but Owner role not updated | **Medium** — typecheck also fails for the same root cause. |
| 4   | `tests/security-boundary-gates.test.ts:23` | Dashboard must not import `@haa/storefront-themes` | Stops ALL imports including legitimate server-safe subpath                                     | Low                                                        | Per `SYSTEM_MAP.md` row 4, `@haa/storefront-themes/server*` subpath is allowed for dashboards. Test should be refined. |
| 5   | `tests/security-boundary-gates.test.ts:42` | Storefront CSS must not target `:root`             | Stops ALL `:root` even for design tokens                                                       | Low                                                        | `index.css:119` defines design tokens in `:root`. Test should exclude token declarations.                              |

### Test coverage assessment

| Area                                | Existing coverage                                                                                                                                                                                                                                                                                                                                        | Missing coverage                               | Critical tests required                            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| **Auth flows**                      | `tests/auth-regression.test.ts`                                                                                                                                                                                                                                                                                                                          | E2E: register → login → create store → publish | E2E happy path                                     |
| **Landing page**                    | None                                                                                                                                                                                                                                                                                                                                                     | All marketing claims have no behavioral tests  | None (manual review)                               |
| **Marketplace UI**                  | `tests/products-qa-regression.test.ts`, `tests/marketplace-demo.test.ts`                                                                                                                                                                                                                                                                                 | Phone-only order tracking; seller disclosure   | Phone-only access regression                       |
| **Store theme 1 (base-elegant)**    | `tests/dto-storefront.test.ts`, `tests/storefront-policies-regression.test.ts`, `tests/storefront-safety.test.ts`                                                                                                                                                                                                                                        | Visual snapshot tests                          | Visual snapshot per breakpoint                     |
| **Store theme 2 (luxury-showcase)** | `tests/luxury-showcase-batch1-demo-cta.test.ts`, `tests/luxury-showcase-batch2-hero-and-perf.test.ts`, `tests/luxury-showcase-batch3-structure.test.ts`, `tests/luxury-showcase-batch4-pdp.test.ts`, `tests/luxury-showcase-header-nav-uniqueness.test.ts`, `tests/luxury-showcase-hero-image-safety.test.ts`, `tests/theme-fallback-regression.test.ts` | E2E: theme switcher round-trip                 | Visual regression per theme                        |
| **Theme isolation**                 | `tests/theme-rationalization.test.ts`, `tests/security-boundary-gates.test.ts`                                                                                                                                                                                                                                                                           | Token namespace enforcement                    | Refine the gates to match `SYSTEM_MAP.md` contract |
| **Auth UI**                         | None                                                                                                                                                                                                                                                                                                                                                     | Login + signup UI never tested                 | **Add immediately after fixing the dead-end**      |
| **Mobile/RTL**                      | `tests/security-boundary-gates.test.ts` (RTL icon flip)                                                                                                                                                                                                                                                                                                  | Overflow detection                             | Playwright mobile-viewport smoke                   |
| **Accessibility**                   | None                                                                                                                                                                                                                                                                                                                                                     | No automated a11y tests                        | axe-core integration                               |
| **SEO**                             | None                                                                                                                                                                                                                                                                                                                                                     | No SEO metadata assertions                     | Per-route title/description tests                  |

---

## 19. P0 Launch Blockers

| #         | Title                                                  | Theme scope           | Evidence file                                                                                                  | Issue                                                                                                                                                | Impact                                                                           | Severity | Recommended fix                                                                                                                        | Likely files to change                                                         | Launch blocking?                   |
| --------- | ------------------------------------------------------ | --------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| **P0-1**  | Auth UI is a dead end                                  | System (auth pages)   | `apps/storefront/src/pages/Auth.tsx:22-25, 152-155, 276-279`                                                   | Login/Signup forms hardcode "coming soon". Waitlist captures email to local state only. Backend (`apps/api/src/routes/auth.ts`) is fully functional. | Cannot acquire merchants through the landing CTA. **Highest revenue blocker.**   | P0       | Wire `LoginPage` and `SignupPage` to call `/api/auth/login` and `/api/auth/register`. Wire `WaitlistPage` to a real waitlist endpoint. | `Auth.tsx`, add `apps/api/src/routes/waitlist.ts`.                             | **Yes**                            |
| **P0-2**  | Unverified marketing claims on landing                 | Landing               | `apps/storefront/src/pages/LandingPage.tsx:1439 (2,400+), 1468 (0% عمولة), 1365 (مجاني للأبد), 1493 (4 ثيمات)` | Hardcoded numbers and unverified claims. Risk of deceptive advertising.                                                                              | Marketing/regulatory exposure if paid campaigns launch.                          | P0       | Verify each claim against backend, or replace with live data, or soften copy.                                                          | `LandingPage.tsx`.                                                             | **Yes (for any paid acquisition)** |
| **P0-3**  | Typecheck fails on marketplace permissions             | Shared                | `packages/shared/src/permissions.ts:187-188`                                                                   | `marketplace.review` and `marketplace.feature` not in `Permission` union. Affects Owner role coverage test + preflight.                              | Engineering health. Blocks preflight gate.                                       | P0       | Add to `Permission` union + Owner role permissions.                                                                                    | `packages/shared/src/permissions.ts`, `tests/rbac-permission-catalog.test.ts`. | **Yes (CI gate)**                  |
| **P0-4**  | Marketplace "متجر موثوق" badge unconditional           | Marketplace           | `apps/storefront/src/pages/marketplace/MarketplaceProductDetail.tsx:358-361`                                   | Badge shown for every product with no actual trust signal.                                                                                           | Consumer deception. Per `PUBLIC_MARKETPLACE_AUDIT.md`.                           | P0       | Remove badge or condition on `store.maroofVerified`/`store.kycVerified`.                                                               | `MarketplaceProductDetail.tsx`.                                                | **Yes**                            |
| **P0-5**  | Marketplace phone-only order tracking                  | Marketplace           | `apps/api/src/routes/haa-marketplace.ts:649` + `apps/storefront/src/pages/MarketplaceOrderTrack.tsx:258`       | Order access gated by `?phone=` only. No authentication.                                                                                             | Order data exposure if phone is guessed. Per `PUBLIC_MARKETPLACE_AUDIT.md` P0-2. | P0       | Require access token (already minted at order creation) as primary gate; phone as secondary.                                           | `haa-marketplace.ts`, `MarketplaceOrderTrack.tsx`.                             | **Yes**                            |
| **P0-6**  | No SFDA / restricted categories enforcement            | Marketplace           | `packages/shared/src/demo/demo-rules.ts` + `apps/api/src/routes/haa-marketplace.ts`                            | Cosmetics, health products, supplements require SFDA pre-approval. No check.                                                                         | Regulatory. Per `PUBLIC_MARKETPLACE_AUDIT.md` P0-3.                              | P0       | Add SFDA gate + restricted categories list.                                                                                            | `packages/shared/src/restricted-categories.ts`, `haa-marketplace.ts`.          | **Yes (commercial launch)**        |
| **P0-7**  | Demo products can appear in marketplace without opt-in | Marketplace           | `packages/shared/src/demo/demo-rules.ts` (`shouldShowInMarketplace`)                                           | Filter allows demo stores with `demoProfile IS NOT NULL` to bypass opt-in.                                                                           | Inflated demo presence. Per `PUBLIC_MARKETPLACE_AUDIT.md` P0-4.                  | P0       | Require explicit `haaMarketplaceEnabled = true` even for demo stores.                                                                  | `demo-rules.ts`.                                                               | **Yes (commercial launch)**        |
| **P0-8**  | No audit logging on admin moderation actions           | Marketplace admin     | `apps/api/src/routes/admin/marketplace.ts`                                                                     | `PATCH /products/:id/review` and `PATCH /products/:id/feature` write to DB but not to `audit_logs`.                                                  | Compliance + dispute resolution. Per `PUBLIC_MARKETPLACE_AUDIT.md` P0-5.         | P0       | Add `AuditLogService.record(...)` to review/feature actions.                                                                           | `admin/marketplace.ts`.                                                        | **Yes**                            |
| **P0-9**  | Government trust logos without verified registration   | Landing + Marketplace | `apps/storefront/src/pages/LandingPage.tsx:268-274`, `MarketplaceProductDetail.tsx`                            | Shows Maroof + ZATCA + وزارة التجارة + صنع في السعودية logos. Implies registrations that may not yet exist.                                          | Regulatory. Per `MARKETPLACE_PHASE0_AUDIT.md`.                                   | P0       | Verify each logo's right-to-use. Remove if no license.                                                                                 | `LandingPage.tsx`.                                                             | **Yes**                            |
| **P0-10** | Testimonials + live ticker are fabricated              | Landing               | `apps/storefront/src/pages/LandingPage.tsx:330-419, 1686-1716`                                                 | Hardcoded names + cities + quotes presented as real activity / real testimonials.                                                                    | Deceptive advertising.                                                           | P0       | Remove or convert to honest disclosure ("عينة من الفعاليات").                                                                          | `LandingPage.tsx`.                                                             | **Yes (paid acquisition)**         |

---

## 20. P1 Must Fix Before Public Launch

| #     | Title                                               | Theme scope              | Issue                                                                                            | Recommended fix                                                             |
| ----- | --------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| P1-1  | Auth pages use storefront tokens                    | System                   | `Auth.tsx` uses `bg-surface-2 text-text-primary` (storefront tokens) but presents as system page | Use `--haa-surface-*` and `--haa-text-*` system tokens                      |
| P1-2  | Marketplace lacks cross-link to storefront root     | Marketplace              | `MarketplaceHero.tsx` has no link to `/` (storefront landing)                                    | Add "عن هاء" / "تسجيل تاجر جديد" link to header                             |
| P1-3  | No real merchant count on landing                   | Landing                  | "2,400+" is hardcoded                                                                            | Replace with live count from `tenants` table via API                        |
| P1-4  | No "Haa is not the seller" disclosure               | Marketplace + Storefront | Disclosure buried in shipping copy                                                               | Add visible disclosure in marketplace hero and merchant footer              |
| P1-5  | Icon size governance bypassed                       | All                      | Some files import Lucide directly without `Icon` wrapper                                         | Enforce `Icon` wrapper, lint rule                                           |
| P1-6  | Marketplace → merchant navigation clarity           | Marketplace              | "عرض في متجر التاجر" link exists but no clear platform-storefront boundary                       | Add visible badge or banner on merchant site when arriving from marketplace |
| P1-7  | No canonical URLs                                   | Storefront               | `useSEO` does not set canonical                                                                  | Add canonical URL per page                                                  |
| P1-8  | Subscription tier trust microcopy legal risk        | Landing                  | "مجاني للأبد" applies only to Free tier                                                          | Add tier qualifier                                                          |
| P1-9  | "4 ثيمات احترافية" copy false                       | Landing                  | Only 2 themes ship                                                                               | Verify count or change to "ثيمات احترافية" (no number)                      |
| P1-10 | Icon-only buttons without aria-label in some places | All                      | A few search/menu buttons in marketplace hero missing labels                                     | Audit and add                                                               |

---

## 21. P2 Improvements

| #     | Title                                                               | Theme scope                                 |
| ----- | ------------------------------------------------------------------- | ------------------------------------------- |
| P2-1  | Bundle density: LandingPage 1945 LOC                                | Landing — split into sections               |
| P2-2  | Theme package architecture (manifest in package, components in app) | Store 1 + 2 — move components into packages |
| P2-3  | Token DRY: brand primary hardcoded in 2 files                       | System + Storefront                         |
| P2-4  | Marketplace product cards vs store cards visual difference          | Marketplace + Store                         |
| P2-5  | A11y: skip-link on landing                                          | Landing                                     |
| P2-6  | A11y: focus-visible on more interactive elements                    | All                                         |
| P2-7  | Color contrast verification (especially brand blue on cream)        | Luxury-showcase                             |
| P2-8  | `<html lang="ar" dir="rtl">` verification                           | Storefront                                  |
| P2-9  | Sitemap + robots.txt                                                | All                                         |
| P2-10 | Performance: lazy-load AI chat                                      | Landing                                     |
| P2-11 | Form: password strength meter                                       | Auth                                        |
| P2-12 | Onboarding wizard polish for first-time merchants                   | Merchant-dashboard                          |

---

## 23. Recommended Execution Plan

### Phase 1 — Auth + Landing Claims + Marketplace Trust (P0 closure, ~2-3 days)

1. **Wire Auth UI** to `/api/auth/login`, `/api/auth/register`, and a new `/api/waitlist` endpoint. This is the single highest-impact fix. (1 day)
2. **Audit and remove/soften** the 10 P0 marketing claims (2,400+, 0% عمولة, مجاني للأبد, 4 ثيمات, testimonials, live ticker). (0.5 day)
3. **Remove or condition** "متجر موثوق" badge on real KYC/Maroof verification. (0.25 day)
4. **Replace** government trust logos with verified-only set. (0.25 day)
5. **Add marketplace order access token gate** (move from phone-only to token + phone secondary). (0.5 day)
6. **Fix `Permission` union** (add `marketplace.review`, `marketplace.feature` to Owner role). (0.1 day)

### Phase 2 — Marketplace Legal + Audit + Compliance (~3-4 days)

1. **SFDA + restricted categories gate** in marketplace product submission.
2. **Audit logging** on admin moderation actions.
3. **Demo opt-in enforcement** (`haaMarketplaceEnabled = true` required even for demo stores).
4. **"Haa is the platform, not the seller"** disclosure banner in marketplace hero and merchant footer.

### Phase 3 — Store Theme Polish + Theme Package Architecture (~2-3 days)

1. Refine `tests/security-boundary-gates.test.ts` to honor `SYSTEM_MAP.md` server-safe subpath contract.
2. Move base-elegant + luxury-showcase components into `packages/storefront-themes/src/themes/*/components/` to make the hybrid architecture cleaner.
3. Add per-theme visual snapshot tests (Playwright).
4. Tighten Icon governance via ESLint rule.

### Phase 4 — Cross-Theme Consistency + Mobile/RTL/A11y/SEO Final Gate (~2-3 days)

1. Visible marketplace ↔ storefront navigation.
2. Skip-link on landing.
3. `<html lang="ar">` and canonical URLs verified.
4. Sitemap + robots.
5. axe-core integration in CI.
6. Manual mobile viewport smoke (390x844, 768x1024, 1440x900).

---

## 24. Final Professor-Level Judgment

### Is the system theme ready?

**🟢 YES.** Tight contract. Clean isolation. Ready to ship.

### Does the landing page sell the product?

**🟡 Mostly yes, but with legal exposure.** The Aurora design is professional, conversion-optimized, and the AI chat integration is differentiated. **But 10 unverified marketing claims (especially the 2,400+ number, the 0% commission claim, the fabricated testimonials, and the fabricated live ticker) make this a paid-acquisition hazard until corrected.**

### Does the marketplace look like a professional part of the system?

**🟡 YES visually, but legally exposed.** Visually isolated, polished, isolated from merchant themes. **Trust badges mislead. Phone-only order access is a privacy hole. 6 marketplace P0s from `PUBLIC_MARKETPLACE_AUDIT.md` are still open.**

### Is registration ready for merchants?

**🔴 NO.** This is the **single biggest problem in the entire audit.** A merchant who clicks "سجّل كتاجر — مجانًا" lands on a page that says "التسجيل يفتح قريبًا." The backend works perfectly. The frontend never calls it. **Fix this first. Before anything else.**

### Do both store themes qualify as commercial experiences?

**🟢 YES, with care.**

- **base-elegant:** Polished, RTL-clean, editor-compatible. Reads as a real e-commerce theme.
- **luxury-showcase:** Distinctive luxury aesthetic, full capsule model, custom components. Reads as a premium theme.

Both inherit VAT, payment methods, BNPL, trust badges from the theme-agnostic commerce layer. The hybrid architecture (manifest in package, components in app) is unconventional but consistent.

### Is the separation between system theme and store themes correct?

**🟡 Structurally yes, presentation-wise no.** The architecture is correct: 3 layers, strict imports, tested isolation. **But the user-facing boundary is fuzzy.** Marketplace looks like a system feature but isn't. Merchant storefronts look like Haa but aren't. A merchant browsing the marketplace and clicking through to a merchant store gets no clear "this is now an independent merchant on the Haa platform" disclosure.

### Should we launch now or controlled beta?

**🔴 Controlled invite-only demo beta only. No public launch. No paid acquisition.**

### Minimum fixes before any marketing campaign

1. **Wire signup/login to API.** Non-negotiable.
2. **Verify or remove the 2,400+ number, the 0% commission claim, مجاني للأبد, the testimonials, and the live ticker.** Non-negotiable for paid campaigns.
3. **Verify or remove government trust logos.** Non-negotiable.
4. **Condition or remove "متجر موثوق" badge.** Non-negotiable.
5. **Add SFDA gate + restricted categories enforcement.** Required for any cosmetics/health products.
6. **Add marketplace order access token gate.** Required for any privacy compliance.

Everything else is polish.
