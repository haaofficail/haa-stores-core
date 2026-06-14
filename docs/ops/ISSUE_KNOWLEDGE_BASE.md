# Issue Knowledge Base

> Root cause database for bugs and issues.
> Every fixed issue with a known root cause should be recorded here.

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

*(No issues recorded yet)*

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
