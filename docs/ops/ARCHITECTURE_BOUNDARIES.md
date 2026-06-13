# Architecture Boundaries

> Defines the strict separation between layers. No crossing without documented architectural reason.

---

## Layer Responsibilities

### `apps/api`
- **Responsibility:** Backend API only
- **Must NOT:** Import any frontend app (storefront, merchant-dashboard, admin-dashboard)
- **May import:** Any `packages/*`

### `apps/admin-dashboard`
- **Responsibility:** Platform-wide administration (manage merchants, system config)
- **Must NOT:** Import from `apps/storefront`, `apps/merchant-dashboard`, or theme packages
- **May import:** `packages/shared`, `packages/ui`

### `apps/merchant-dashboard`
- **Responsibility:** Merchant store management (orders, products, settings, reports)
- **Must NOT:** Import from `apps/storefront`, `apps/admin-dashboard`, or theme packages
- **May import:** `packages/shared`, `packages/ui`

### `apps/storefront`
- **Responsibility:** Public customer-facing store
- **Must NOT:** Import from `apps/merchant-dashboard`, `apps/admin-dashboard`
- **May import:** `packages/shared`, `packages/ui`, theme packages

### `packages/shared`
- **Responsibility:** Shared types, schemas, utilities
- **Must NOT:** Import from any app or packages that depend on it (circular dependency)
- **May import:** External libraries only

### `packages/db`
- **Responsibility:** Database schema, migrations, seeds
- **Must NOT:** Import from apps or business-logic packages
- **May import:** `packages/shared` (for types)

### Theme Packages (`packages/theme-*`, `packages/storefront-themes`)
- **Responsibility:** Storefront theming engine and themes
- **Must NOT:** Be imported by `apps/merchant-dashboard` or `apps/admin-dashboard` from their **main entry** (`@haa/theme-system` or `@haa/storefront-themes`)
- **Dashboard-safe subpath:** `@haa/theme-system/server` or `@haa/storefront-themes/server` (server-safe functions only — no DOM)
- **May import (storefront only):** The full entry point
- **May import (dashboard only):** The `/server` subpath

### Theme Package Export Safety

| Package Entry | DOM Safe | Analytics Safe | CSS Safe | Who Can Import |
|--------------|----------|---------------|----------|----------------|
| `@haa/theme-system` | ❌ — exports `applyTheme()`, `clearTheme()`, `applyStoreTheme()` | ❌ — exports `loadTheme()` which injects GTM/GA/FB scripts | ❌ — writes to `document.documentElement` and `#storefront-scope` | Storefront only |
| `@haa/theme-system/server` | ✅ — pure logic only | ✅ — no network/script injection | ✅ — no CSS mutation | Any app (dashboard safe) |
| `@haa/storefront-themes` | ❌ — same as `@haa/theme-system` | ❌ — re-exports all dangerous functions | ❌ — same as `@haa/theme-system` | Storefront only |
| `@haa/storefront-themes/server` | ✅ — server-safe re-exports only | ✅ — no dangerous re-exports | ✅ — no CSS mutation | Any app (dashboard safe) |
| `@haa/theme-react` | ⚠️ — sets `data-theme` on `<html>` for light/dark mode | ✅ — no network/script injection | ⚠️ — sets `colorScheme` on `<html>` | Dashboard (light/dark mode), Storefront |
| `@haa/system-theme` | ✅ — scoped to `.haa-system-theme`, uses `--haa-*` namespace | ✅ — no network/script injection | ✅ — CSS is scoped, no global leakage | Dashboard only |
| `@haa/theme-engine` | ✅ — pure TypeScript, no DOM, no React | ✅ — no side effects | ✅ — no CSS | Any app |
| `@haa/tokens` | ✅ — CSS only, no JS | ✅ — no JS at all | ⚠️ — CSS variables global on `:root` | Any app (must verify variable namespaces) |
| `@haa/ui` | ⚠️ — contains `ThemeProvider` that writes to `<html>` | ✅ — no network/script injection | ⚠️ — `ThemeProvider` sets `data-theme` | Dashboard, Storefront |
| `@haa/shared` | ✅ — backend deps (AWS SDK), no DOM | ✅ | ✅ | Any app (backend only for AWS deps) |

### Business Logic Packages
- `packages/commerce-core`, `packages/shipping-core`, `packages/wallet-core`, etc.
- **Responsibility:** Isolated business logic
- **Must NOT:** Import from apps or theme packages
- **May import:** `packages/shared`, `packages/db`

---

## Cross-Layer Change Rule

Any change that crosses more than one layer must document:

1. **Why** is this cross-layer change necessary?
2. **Which files** are being changed in each layer?
3. **What testing** covers the integration points?
4. **What is the rollback risk** if this change needs to be reverted?

---

## Examples of Boundary Violations

| Violation | Why It's Wrong |
|-----------|---------------|
| Merchant dashboard imports storefront ProductCard | Breaks separation; theme changes affect dashboard |
| Theme CSS leaks to dashboard global styles | Dashboard layout breaks from storefront changes |
| API imports a UI component | Server-side code should not depend on UI |
| Storefront imports dashboard API client | Wrong API layer; creates coupling |
| Permission check only in UI, not API | Security gap — API must enforce independently |
