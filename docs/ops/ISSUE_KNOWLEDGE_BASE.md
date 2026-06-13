# Issue Knowledge Base

> Root cause database for bugs and issues.
> Every fixed issue with a known root cause should be recorded here.

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
