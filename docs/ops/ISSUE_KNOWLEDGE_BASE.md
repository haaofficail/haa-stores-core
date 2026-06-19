# Issue Knowledge Base

> Root cause database for bugs and issues.
> Every fixed issue with a known root cause should be recorded here.

---

### ISSUE-0012: Fresh PostgreSQL Migration Fails Converting customers.total_spent

- **ID:** ISSUE-0012
- **Date:** 2026-06-20
- **Severity:** High (blocks clean CI databases and fresh deployments)
- **Area:** Database / Drizzle migrations / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** GitHub Actions Test job provisions PostgreSQL successfully, then `pnpm db:migrate` fails in migration 0010 with `column "total_spent" cannot be cast automatically to type numeric`.
- **Expected:** The full migration chain applies to a brand-new PostgreSQL 16 database.
- **Actual:** Migration 0010 used `ALTER COLUMN ... SET DATA TYPE numeric(14, 2)` without telling PostgreSQL how to cast the existing column type.
- **Root Cause:** The generated type-change SQL omitted an explicit `USING` expression and retained a default value whose old type PostgreSQL could not cast automatically. Existing developer databases had already passed this migration, so the defect only surfaced on a clean CI database.
- **Fix:** Migration 0010 now drops the old default, converts with `USING "total_spent"::numeric(14, 2)`, then restores a numeric default.
- **Prevention:** Added a regression assertion in `tests/migration-identifier-safety.test.ts`; CI now prepares a clean PostgreSQL database before the test suite.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0019: E2E Suite Targeted Apps That the Workflow Never Started

- **ID:** ISSUE-0019
- **Date:** 2026-06-20
- **Severity:** High (final CI gate)
- **Area:** E2E orchestration / UI selectors
- **Related Tasks:** TASK-0054
- **Symptoms:** Merchant and admin tests receive connection refused; critical storefront path times out waiting for the old add-to-cart label.
- **Root Cause:** Workflow started only API and storefront although the suite also covers ports 5173 and 5175. The critical path selected hidden carousel markup, and theme hydration could replace the visible product button between actionability checks and click.
- **Fix:** Start and readiness-check all four applications; select only visible product/button elements, wait for product-page network stability, and dispatch the click against the current visible button node.
- **Prevention:** CI contract coverage requires merchant/admin startup and readiness ports.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0018: E2E Servers Started Before Workspace Packages Were Built

- **ID:** ISSUE-0018
- **Date:** 2026-06-20
- **Severity:** High (only remaining PR check failure)
- **Area:** E2E / Monorepo build order / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** API cannot resolve `@haa/shared/dist/index.js`; storefront cannot resolve `@haa/theme-system`; readiness check times out.
- **Root Cause:** E2E installed dependencies and started source dev servers without compiling workspace packages whose package entries point to `dist`.
- **Fix:** E2E builds workspace packages in deterministic order before database setup and server startup.
- **Prevention:** CI contract test verifies package build precedes API startup.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0017: Test Setup Rewrote CI Database Name

- **ID:** ISSUE-0017
- **Date:** 2026-06-20
- **Severity:** High (tests run after successful seed but connect elsewhere)
- **Area:** Test environment / PostgreSQL / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** Bootstrap and seed succeed on `haa_test`, then DB-backed tests fail because database `haastores_test` does not exist.
- **Root Cause:** `tests/setup.ts` derives `haastores_test` from `DATABASE_URL` unless `TEST_DATABASE_URL` is explicitly set.
- **Fix:** Test and E2E jobs now set `TEST_DATABASE_URL` to the provisioned `haa_test` service database.
- **Prevention:** CI contract coverage requires the explicit test database variable.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0016: Seed Checkout Sessions Referenced Nonexistent Carts

- **ID:** ISSUE-0016
- **Date:** 2026-06-20
- **Severity:** High (blocks clean seed)
- **Area:** Database seed / Referential integrity
- **Related Tasks:** TASK-0054
- **Symptoms:** Clean seed fails on `checkout_sessions_cart_id_carts_id_fk`.
- **Root Cause:** Completed and abandoned checkout-session fixtures assigned random UUIDs to `cartId` without inserting matching `carts` rows.
- **Fix:** Seed now creates a real cart for each checkout-session fixture and uses the returned ID.
- **Prevention:** Seed regression coverage rejects random `cartId` values and requires cart creation.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0015: Fresh Seed Inserts Subscription Plans Twice

- **ID:** ISSUE-0015
- **Date:** 2026-06-20
- **Severity:** High (blocks CI after successful bootstrap)
- **Area:** Database seed / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** `pnpm db:bootstrap` succeeds, then `pnpm db:seed` fails on `subscription_plans_code_unique`.
- **Root Cause:** The seed creates plans near startup, then the fresh-tenant path inserted the same plan codes again.
- **Fix:** The fresh-tenant plan loop now looks up each unique code and reuses the existing row before inserting.
- **Prevention:** Added `tests/seed-subscription-plans-idempotency.test.ts`.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0014: Fresh-DB Hash Recorder Contained a Developer-Machine Absolute Path

- **ID:** ISSUE-0014
- **Date:** 2026-06-20
- **Severity:** High (bootstrap applies SQL but fails before recording hashes)
- **Area:** Database bootstrap / CI portability
- **Related Tasks:** TASK-0054
- **Symptoms:** `pnpm db:bootstrap` applied all 65 SQL migrations, then failed with `ERR_MODULE_NOT_FOUND` referencing `/Users/thwany/Desktop/haa-stores-core/node_modules/...`.
- **Root Cause:** `scripts/record-migration-hashes.mjs` imported `postgres` and located migration files through absolute paths from one developer machine.
- **Fix:** Use the normal `postgres` package import and derive repository paths from `import.meta.url`.
- **Prevention:** CI contract coverage rejects `/Users/` paths in the bootstrap helper.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0013: Clean CI Database Must Use the Documented Bootstrap Path

- **ID:** ISSUE-0013
- **Date:** 2026-06-20
- **Severity:** High (blocks Test and E2E jobs)
- **Area:** Database / Drizzle migrations / CI
- **Related Tasks:** TASK-0054
- **Symptoms:** After repairing the numeric cast, `drizzle-kit migrate` reached a later historical migration and failed because `store_settings.theme_config` already existed.
- **Root Cause:** The retained historical migration set includes intentional/idempotent repair overlap. The project already documents `pnpm db:bootstrap` as the supported clean-database path; CI incorrectly used raw `pnpm db:migrate`.
- **Fix:** CI Test and E2E jobs now use `pnpm db:bootstrap`, followed by seeding. The bootstrap applies SQL with repair overlap tolerated and records migration hashes for future normal migrate calls.
- **Prevention:** CI contract tests require the bootstrap command for clean test databases.
- **Status:** Fix pushed for GitHub runner verification.

### ISSUE-0010: Vite HMR Transient Errors Surfacing as DASH-001 P0 (INC-20260615-001..005)

- **ID:** ISSUE-0010
- **Date:** 2026-06-18
- **Severity:** Low (cosmetic dev-env noise; was misclassified as P0)
- **Area:** Merchant Dashboard / Dev environment / Error capture
- **Related Error Codes:** DASH-001
- **Related Tasks:** INC-20260615-001..005
- **Symptoms:** `pnpm ops:monitor` reported 5 P0 incidents on 2026-06-15 (15:27–15:54 UTC) for `apps/merchant-dashboard/src/pages/Login.tsx`:
  - INC-001 + INC-002: `useRef is not defined` (15:27 + 15:42)
  - INC-003: `tickerRef is not defined` (15:42)
  - INC-004 + INC-005: `Failed to fetch dynamically imported module: http://localhost:5173/src/pages/Login.tsx?t=<timestamp>` (15:53 + 15:54)
- **Expected:** Either (a) real React/JS errors in production code, or (b) no errors at all.
- **Actual:** `apps/merchant-dashboard/src/pages/Login.tsx` (149 LOC) imports `useState, useEffect` from 'react' (correct). No `useRef` or `tickerRef` anywhere in the file. The reported `route` was `/login` (the Login page itself), not `/dashboard` as initially suspected. The dashboard was the **origin of the error report**, not the source of the error.
- **Root Cause:** Vite Fast Refresh transient — when a module is hot-replaced, React's HMR runtime can briefly hold a stale closure that references hooks (`useRef`) or local variables (`tickerRef`) from a previous module version. The error surfaces once, gets caught by `ErrorBoundary`, and disappears after the next reload. The error message itself is React telling us "this name is not defined in the current module scope", which is true _temporarily_ during HMR.
- **Why they were flagged as P0:** `pnpm ops:monitor` escalates any 3+ same-fingerprint as P0. Five near-identical events within 30 min tripped that threshold. The classification was correct by rule but the rule was overly aggressive for dev-only HMR noise.
- **Fix:**
  1. **ErrorBoundary hardening** (this session) — `apps/{merchant-dashboard,storefront,admin-dashboard}/src/.../ErrorBoundary.tsx` now adds:
     - `isPersistent` detection (same fingerprint ≥3 in 60s)
     - `componentFrame` from `info.componentStack` for better debugging
     - Persistent/transient user messaging in Arabic
     - "العودة للرئيسية" fallback link
  2. **Verification** — `pnpm typecheck` clean, ErrorBoundary code path covered by `tests/error-boundary-transient.test.ts` (new).
  3. **No production code change needed** — `Login.tsx` was never broken; the P0 flag was a false positive.
- **Prevention:**
  - Vite HMR transient errors will continue to fire during development. The new ErrorBoundary `isPersistent` flag distinguishes them from real production bugs.
  - For ops:monitor P0 classification, consider lowering the dev-env auto-escalation threshold OR adding a tag-based filter (`tags: ["hmr","dev-transient"]` is now reserved for future use).
  - Re-running `pnpm ops:monitor` on a clean dev session (no Vite HMR) should produce zero P0.
- **Regression Checklist Update:** See REGRESSION_CHECKLIST.md → Dynamic Error Capture → added "ErrorBoundary reports `isPersistent` and `componentFrame` for every caught error".
- **Status:** Resolved (2026-06-18) — dev-env noise properly classified; no production fix needed.

---

### ISSUE-0011: Missing `store_billing_settings` Row Causes 6 API-001 Fingerprints

- **ID:** ISSUE-0011
- **Date:** 2026-06-18
- **Severity:** Medium (dev data gap, not code bug)
- **Area:** Database / Seed / Wallet / Marketplace
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0053 (recommend)
- **Symptoms:** `pnpm ops:errors` reported 6 repeated fingerprints (≥3 occurrences each, total ~209 events) for `Failed_query:_select_..._platform_fee_mode..._cod_fee_mode...` on:
  - `/marketplace/categories` (48 events)
  - `/merchant/1/categories` (39)
  - `/merchant/1/reports/low-stock` (33)
  - `/marketplace/products` (36 + 12)
  - `/merchant/1/wallet/summary` (41)
- **Expected:** Every store should have a `store_billing_settings` row (1:1) so `StoreBillingSettingsService.getPlatformFeePolicy()` and `getCodFeePolicy()` return values, not throw.
- **Actual:** `pnpm db:seed` (`packages/db/src/seed/index.ts`) creates `tenants`, `users`, `stores`, `products`, `categories`, etc. but **does NOT insert a `store_billing_settings` row** for the demo stores. The `getPlatformFeePolicy` helper returns the `DEFAULT_PLATFORM_FEE_POLICY` when no row exists — so checkout does not break — but `getRawSettings()` and certain code paths call `select *` on the table and fail if the row is absent.
- **Root Cause:** Seed drift — `store_billing_settings` (migration 0050) was added later than the seed script was last updated. The seed was never extended to backfill the new table.
- **Fix:** Created `scripts/seed-billing-guards.ts` (this session) — idempotent script that:
  1. Reads every `storeId` from `stores` table
  2. For each storeId, checks if a `store_billing_settings` row exists
  3. If missing, inserts a default row (`mode: 'percentage'`, `pct: 2`, `enabled: true`)
  4. Logs progress + final summary
  5. Wired into `pnpm db:seed` as a final step (idempotent)
- **Verification:**
  - `pnpm tsx scripts/seed-billing-guards.ts` (or auto via `pnpm db:seed`) — every store now has a row.
  - `tests/seed-billing-guards.test.ts` (new) — source-grep test that asserts:
    1. Script file exists
    2. Script uses `onConflictDoNothing()` for idempotency
    3. Script iterates all stores
    4. Seed script calls/imports the guards script
- **Prevention:**
  - Every new `store_*` table added by future migration MUST be backfilled by `seed-billing-guards.ts` (or a sibling guards script) or the seed script directly. Add this as a checklist item in `REGRESSION_CHECKLIST.md` → Database section.
  - Consider a `scripts/verify-seed-coverage.ts` that asserts every store has a row in every per-store table.
- **Regression Checklist Update:** Added "Every per-store table has a seed guards script" under Database.
- **Status:** Fixed (2026-06-18) — seed gap closed, 209 historical events archived.

---

### ISSUE-0009: Demo Support KB Table Missing After Migration Drift

- **ID:** ISSUE-0009
- **Date:** 2026-06-14
- **Severity:** Medium
- **Area:** Storefront support / Database / Demo operations
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0023
- **Symptoms:** `pnpm ops:monitor` repeatedly recommended RCA for `/s/demo-perfumes/support/kb` with fingerprint `API-001::unknown::/s/demo-perfumes/support/kb::Failed_query:_select_"id",_"store_id",_"title",_"slug",_"con`.
- **Expected:** Demo support KB route should return an empty published-articles payload when no articles exist.
- **Actual:** The API returned 500 because `knowledge_base_articles` was absent in the local database.
- **Root Cause:** Local migration state drift: the historical migration containing `knowledge_base_articles` was recorded as applied, but the table was missing.
- **Fix:** Added idempotent repair migration `0039_repair_support_kb_articles.sql`, ran `pnpm db:migrate`, verified the table and route, then archived stale support-error events.
- **Prevention:** For support/data features, verify critical tables exist after migration-state repair and rerun `pnpm ops:monitor` before closing.
- **Regression Checklist Update:** Demo/support monitoring checks should include `/s/demo-perfumes/support/kb` returning 200.
- **Status:** Fixed

---

### ISSUE-0006: Marketing Events Insert Failure

- **ID:** ISSUE-0006
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Storefront analytics / API / Data
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0018
- **Symptoms:** `pnpm ops:errors` reports repeated fingerprint `API-001::unknown::/s/haa-demo/events::Failed_query:_insert_into_"marketing_events"_...` 3 times.
- **Expected:** Storefront tracking events should be accepted or safely ignored without repeated API-001 failures.
- **Actual:** Local support error analysis shows repeated failed inserts into `marketing_events`.
- **Root Cause:** Unknown. Needs focused RCA; likely candidates are local migration drift, schema mismatch, or event payload mismatch.
- **Fix:** Pending.
- **Prevention:** Keep marketing event schema, migrations, seed/test DB, and tracker payloads aligned.
- **Regression Checklist Update:** Pending after fix.
- **Status:** Open

---

### ISSUE-0004: Local Dev Port Map Drift

- **ID:** ISSUE-0004
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Local runtime / Monitoring
- **Related Error Codes:** DASH-001, SYS-003
- **Related Tasks:** TASK-0016
- **Symptoms:** Browser reports `ERR_CONNECTION_REFUSED` for localhost when dev servers are stopped. Monitoring/synthetic checks can also report misleading storefront/dashboard availability because their port map did not match Vite configs.
- **Expected:** API runs on `3000`, merchant dashboard on `5173`, storefront on `5174`, and admin dashboard on `5175`. Health and synthetic scripts must check those exact services on those exact ports.
- **Actual:** Vite could choose another port if the preferred port was occupied, and monitoring scripts checked storefront on `5173` and merchant dashboard on `5174`.
- **Root Cause:** Port ownership was not enforced with `strictPort`, and monitoring scripts had stale/reversed hardcoded URLs.
- **Fix:** Added `strictPort: true` to all dashboard/storefront Vite configs and corrected `monitor-health.mjs` plus `synthetic-checks.mjs` to use the canonical local port map.
- **Prevention:** Any future local app port change must update `.env`, the app Vite config, `monitor-health.mjs`, `synthetic-checks.mjs`, and `CURRENT_STATE.md` together.
- **Regression Checklist Update:** Added local port governance checks.
- **Status:** Fixed

---

### ISSUE-0007: Support Ticket Token Was Exposed in Newly-Created URLs

- **ID:** ISSUE-0007
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Storefront / Support / Security
- **Related Error Codes:** None
- **Related Tasks:** TASK-0018, SEC-006
- **Symptoms:** Customer support ticket links included `?accessToken=...`, exposing the ticket access secret to browser history, referrers, and logs.
- **Expected:** Ticket access token should be transmitted in an HTTP header (`X-Support-Access-Token` or `Authorization: Bearer`) and should not be embedded in newly-generated URLs.
- **Actual:** Storefront created ticket URLs with `accessToken` in the query string and the API only read ticket tokens from query/body.
- **Root Cause:** Original support flow optimized for shareable direct links and did not treat the ticket access token as a secret transport value.
- **Fix:** Storefront now stores the token locally/prints it as an access code, creates clean ticket URLs, and sends the token via `X-Support-Access-Token`. API endpoints accept header or bearer token, with temporary legacy query/body compatibility for old links.
- **Prevention:** Regression test blocks creating new `?accessToken=` ticket links and verifies header-based API client usage.
- **Regression Checklist Update:** Security Baseline includes "Support ticket auth uses header, not query param."
- **Status:** Fixed

### ISSUE-0006: Marketplace Migration State Drift and After-Sales Scope Conflict

- **ID:** ISSUE-0006
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Database / Marketplace / Operations
- **Related Error Codes:** None
- **Related Tasks:** TASK-0018
- **Symptoms:** Drizzle migration journal did not match the SQL migration files present in the repo, and marketplace after-sales artifacts existed despite the product boundary that merchants own procedures after checkout.
- **Expected:** `pnpm db:migrate` should run cleanly from project state, marketplace migrations should include only product opt-in/governance/order attribution, and no marketplace after-sales table should be part of the platform marketplace scope.
- **Actual:** Migration metadata lagged behind actual migration files, and after-sales schema/migration artifacts conflicted with the final marketplace responsibility model.
- **Root Cause:** Several feature passes added or adjusted migrations without reconciling Drizzle journal metadata and without removing earlier after-sales prototype files after the product decision changed.
- **Fix:** Rebuilt the Drizzle journal to match actual retained SQL files, synchronized local Drizzle migration records, confirmed `pnpm db:migrate` succeeds, and removed marketplace after-sales schema/migration artifacts.
- **Prevention:** Run `pnpm db:migrate` as part of marketplace/data work verification and reject marketplace-owned shipping/returns/dispute tables unless a new decision is documented.
- **Regression Checklist Update:** Added database and marketplace checks for Drizzle migration success and no marketplace after-sales table.
- **Status:** Fixed

### ISSUE-0008: Historical Marketing Events Insert Fingerprint After Migration Drift

- **ID:** ISSUE-0008
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Marketing / Database / Monitoring
- **Related Error Codes:** API-001
- **Related Tasks:** TASK-0019
- **Symptoms:** `pnpm ops:errors` reported a repeated fingerprint for `/s/haa-demo/events` inserting into `marketing_events`.
- **Expected:** Marketing event ingestion should find the `marketing_events` table and not generate repeated API-001 fingerprints.
- **Actual:** Active support-error events showed 13 repeated insert failures for `marketing_events`, and direct DB inspection showed the marketing tables were absent.
- **Root Cause:** The local Drizzle migration state was out of sync: the old migration that should have created marketing tables was recorded as applied while the actual tables were missing.
- **Fix:** Added idempotent repair migration `0037_repair_marketing_tables.sql`, verified `pnpm db:migrate`, confirmed `marketing_events`, `marketing_sessions`, and `product_performance_daily` exist, and verified `/s/haa-demo/events` returns `201`.
- **Prevention:** Run `pnpm db:migrate` after adding marketing/data migrations and keep migration journal entries aligned with retained SQL files.
- **Regression Checklist Update:** Database section now requires `pnpm db:migrate` and journal/file alignment checks.
- **Status:** Fixed — historical events archived under `storage/archive/`

---

## Issue Template

- **ID:** ISSUE-XXXX
- **Date:**
- **Severity:** Critical / High / Medium / Low
- **Area:**
- **Related Error Codes:**
- **Related Tasks:**
- **Symptoms:**
- **Expected:**
- **Actual:**
- **Root Cause:**
- **Fix:**
- **Prevention:**
- **Regression Checklist Update:**
- **Status:** Open / Fixed / Won't Fix / Duplicate

---

## Open Issues

_(No issues recorded yet)_

## Fixed Issues

### ISSUE-0005: LiveRadar JSX Structure Broke Merchant Dashboard Typecheck

- **ID:** ISSUE-0005
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Merchant Dashboard / Live Radar
- **Related Error Codes:** None
- **Related Tasks:** TASK-0015
- **Symptoms:** `pnpm typecheck` and ESLint failed on `apps/merchant-dashboard/src/pages/LiveRadar.tsx` with parser errors around the end of the component.
- **Expected:** LiveRadar compiles cleanly and does not block full monorepo verification.
- **Actual:** `HistoryCard` was missing its closing function brace, a redundant JSX fragment was left open, and Select setters were passed directly to string-valued handlers.
- **Root Cause:** Incremental JSX edits left mismatched component structure and narrow union state setters incompatible with the generic Select callback signature.
- **Fix:** Closed `HistoryCard`, removed the redundant fragment, balanced the root JSX container, imported Select components, and wrapped Select handlers with explicit union casts.
- **Prevention:** Run targeted typecheck/ESLint immediately after adding nested helper components or Select controls.
- **Regression Checklist Update:** Covered by marketplace verification gates and full typecheck/ESLint.
- **Status:** Fixed

### ISSUE-0004: Marketing Types Self-Import Broke Shared Package Exports

- **ID:** ISSUE-0004
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Shared types / Marketing
- **Related Error Codes:** None
- **Related Tasks:** TASK-0015
- **Symptoms:** Full monorepo typecheck failed in `packages/shared/src/types/marketing.ts` with missing exports and circular definitions.
- **Expected:** Marketing analytics/live-radar types are concrete exports from shared.
- **Actual:** The file imported `LiveOverview`, `LivePages`, and related types from itself via `./marketing.js`, creating a broken self-import and leaving required exports unresolved.
- **Root Cause:** A generated/merged type file attempted to re-import its own exports instead of defining them locally.
- **Fix:** Replaced the self-import with concrete exported constants and type/interface definitions for marketing events, sessions, performance metrics, live radar, geo, funnel, alerts, and heartbeat payloads. Aligned `MARKETING_EVENT_TYPES` with the tested taxonomy (`view_product`, `search`, campaign/share events, cancellation/refund events).
- **Prevention:** Shared type files must not import from their own compiled module path; add explicit exported definitions or import from a different source module.
- **Regression Checklist Update:** Covered by full shared package typecheck and monorepo typecheck.
- **Status:** Fixed

### ISSUE-0003: Storefront Theme Hydration Flicker (Flash of Wrong Theme)

- **ID:** ISSUE-0003
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Storefront / Theme loading
- **Related Error Codes:** THEME-003
- **Related Tasks:** TASK-0008
- **Symptoms:** Opening a storefront shows base-elegant theme (or previous theme) for one frame, then switches to the correct theme (e.g., luxury-showcase). Visual flash on every navigation.
- **Expected:** Storefront shows only the correct theme or a neutral skeleton while loading. Never shows a different theme momentarily.
- **Actual:** `Layout.tsx` rendered themed content (Header/Footer/Outlet) immediately with `resolveStorefrontThemeKey(null)` → `'base-elegant'` before the async `useThemeConfig(slug)` resolved. After 1 frame, the real theme arrived, causing a swap → flash.
- **Root Cause:** `Layout.tsx` called `resolveStorefrontThemeKey(null)` on first render (before API response), which returned `DEFAULT_STOREFRONT_THEME_KEY = 'base-elegant'`. Themed components rendered with the wrong key for one frame, then re-rendered with the correct key when `useThemeConfig` resolved.
- **Fix:**
  1. Added `useEffect` + state guard in `Layout.tsx`: do not render themed content until `themeConfig` is non-null
  2. While loading, render a neutral `ThemeLoadingSkeleton` that uses only Tailwind built-in colors (`bg-gray-100`, `bg-gray-200`) — zero theme CSS variables
  3. Added 8-second fallback timeout: if theme fails to load, render with default fallback (`resolveStorefrontThemeKey(null)`)
  4. CSS vars are applied synchronously via `loadTheme()` → `applyStoreTheme()` before `setConfig()`, so by the time React re-renders, the correct colors are already in the DOM
- **Prevention:**
  - Storefront must NEVER render themed components before `themeConfig` is resolved
  - `resolveStorefrontThemeKey(null)` is only safe for fallback after failure, not for initial render
  - Any new page component added to storefront must be rendered inside `<Outlet />` (already inside Layout guard) or have its own loading guard
- **Regression Checklist Update:**
  - Added "No themed content rendered before themeConfig resolves"
  - Added "Skeleton uses only neutral Tailwind colors (no theme CSS vars)"
  - Added "Fallback timeout exists for theme loading failure"
- **Status:** Fixed

### ISSUE-0001: Storefront Theme Leakage via @haa/theme-system Main Entry

- **ID:** ISSUE-0001
- **Date:** 2026-06-13
- **Severity:** High
- **Area:** Theme isolation / Package boundaries
- **Related Error Codes:** THEME-001, THEME-002
- **Related Tasks:** TASK-0007
- **Symptoms:** Merchant-dashboard imported from `@haa/theme-system` which bundles DOM-manipulation functions (`applyTheme`, `applyStoreTheme`, `clearTheme`, `loadTheme`) and analytics script injection (GTM, GA, Facebook Pixel). Any code path could accidentally call these and leak storefront theme CSS variables to the global scope.
- **Expected:** Merchant-dashboard should only import server-safe functions (registry reads, validation, config resolution) without bundling DOM code.
- **Actual:** Imports from `@haa/theme-system` (main entry) resolved to `src/index.ts` which exports all DOM functions.
- **Root Cause:** `@haa/theme-system` package has a `/server` subpath export for server-safe functions, but:
  1. The server export pointed to `dist/` (built output) instead of `src/` — no build existed, so TypeScript resolved to the `.d.ts` but failed on runtime
  2. `validateThemeConfig` was missing from server exports
  3. Merchant-dashboard was importing from the main entry instead of the server subpath
- **Fix:**
  1. Added `validateThemeConfig` and `ValidationResult` to `@haa/theme-system/src/server.ts`
  2. Fixed `@haa/theme-system/package.json` server export to point to `src/server.ts`
  3. Changed `ThemeStore.tsx` and `ThemeEditor.tsx` imports from `@haa/theme-system` to `@haa/theme-system/server`

### ISSUE-0002: Luxury-Showcase Theme Injects Global !important Body Style

- **ID:** ISSUE-0002
- **Date:** 2026-06-13
- **Severity:** Medium
- **Area:** Storefront theme / CSS scoping
- **Related Error Codes:** THEME-002
- **Related Tasks:** TASK-0007
- **Symptoms:** `luxury-showcase/Header.tsx` injected `<style>{'body, html { background-color: #faf8f6 !important; }'}</style>` which bypasses `#storefront-scope` and applies globally. If this theme is loaded in the same browser session, it could affect other pages.
- **Expected:** Theme styles should be scoped to `#storefront-scope`. No `!important` on global selectors.
- **Actual:** Hardcoded `!important` style on `body, html` with hex color, not CSS variable.
- **Root Cause:** Developer convenience — the background color was set directly on body to prevent white flash, without considering scoping.
- **Fix:** Removed the `<style>` block entirely. Background color is already inherited from `#storefront-scope` which has `background-color: var(--surface-1)` set via CSS variables from the theme config.
- **Prevention:** Storefront theme components must never use `body, html, :root, *` selectors with `!important`. Use `#storefront-scope` or `data-storefront-theme` attribute for scoping.
- **Regression Checklist Update:** Added "No global !important body/html styles in any storefront theme component"
- **Status:** Fixed

## Prevention Notes

- When fixing an issue, always identify root cause before implementing fix
- Update REGRESSION_CHECKLIST.md if the issue can regress
- If the issue reveals a process gap, update the relevant docs/ops/ file
- Search `storage/support-error-events.ndjson` by fingerprint to find all occurrences of the same issue
- Use the correlationId in the event to find linked frontend ↔ backend errors
- For P0 issues, create an incident in INCIDENTS.md referencing the eventId
