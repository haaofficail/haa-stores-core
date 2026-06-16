# Theme Package Rationalization Plan

> **Owner:** Quality Pass 5, Item 3
> **Status:** In Progress (tracking + plan recorded; migration is multi-step)
> **Related Test:** `tests/theme-rationalization.test.ts`

---

## Why this exists

The project has **5 theme-related packages** (plus `theme-web`, the
Next.js consumer). Some of them overlap in purpose. Overlapping packages
make it hard to know which one to import, slow down onboarding, and
create subtle bugs when a fix lands in one but not the other.

## The 5 packages (and their roles)

| Package | Role | Status |
|---|---|---|
| `@haa/theme-engine` | Core: contracts, validation, registry primitives | ✅ Keep |
| `@haa/theme-react` | React bindings + re-exports for theme authors | ✅ Keep |
| `@haa/system-theme` | Dashboard identity (CSS tokens + OS theme provider) | ✅ Keep |
| `@haa/storefront-themes` | Storefront theme registry + runtime | ✅ Keep (replaces `theme-system`) |
| `@haa/theme-system` | Legacy: server-side registry + isolation | ⚠️ **DEPRECATED — pending removal** |

## The deprecation target: `@haa/theme-system`

`@haa/storefront-themes`'s own description states:

> "HAA Storefront Themes — Customer-facing store themes.
> **Replaces @haa/theme-system.**"

So the rationalization is clear: **`@haa/theme-system` is the legacy
package, and `@haa/storefront-themes` is its successor.** The migration
isn't done yet because `@haa/theme-system` is still imported from 8
places (see "Migration steps" below).

## What `@haa/theme-system` exports today

| Export | Replacement in `@haa/storefront-themes` |
|---|---|
| `themeRegistry` | `registry` (instance of `ThemeRegistry` from `@haa/theme-engine`) |
| `activeThemeResolver` | `resolveActiveTheme` |
| `isolation` (DOM/CSS-var manipulation) | moved into the registry runtime |
| `themes` (registry) | `registry` |

## Migration steps (sequential, low-risk per step)

Each step is a small commit that:
- Adds a re-export shim in `@haa/storefront-themes` if needed
- Updates one call-site to use the new import
- Removes the now-unused import
- Runs the test suite to confirm no regression

### Step 1 — Identify all 8 call-sites

Run:

```bash
rg "@haa/theme-system" apps/ packages/ -g "*.{ts,tsx,json}" -l
```

Result (as of 2026-06-15):

- `apps/api/package.json` (dependency)
- `apps/api/src/routes/settings.ts`
- `apps/api/src/routes/storefront/support.ts`
- `apps/api/src/routes/storefront/store-info.ts`
- `apps/storefront/package.json` (dependency)
- `apps/merchant-dashboard/package.json` (dependency)
- `apps/merchant-dashboard/src/pages/ThemeEditor.tsx`
- `apps/merchant-dashboard/src/pages/ThemeStore.tsx`

### Step 2 — Verify the API surface is fully covered

Open each of the 8 call-sites and confirm the new import path is
available in `@haa/storefront-themes`. If a name doesn't exist, add a
re-export shim (NOT a full re-implementation).

### Step 3 — Migrate one app at a time

Recommended order (least risk first):

1. `apps/api` (the API doesn't render themes — it just resolves metadata)
2. `apps/merchant-dashboard` (the dashboard mostly uses `@haa/system-theme`,
   so this is probably a small change)
3. `apps/storefront` (the biggest consumer — last so we have the most
   confidence in the shim coverage)

### Step 4 — Remove the package

After all 8 call-sites are migrated:

1. Delete `packages/theme-system/`
2. Remove `@haa/theme-system` from all `package.json` dependencies
3. Run `pnpm install`
4. Run the full test suite
5. Delete this file

## What's blocking the migration now

- **Coordination cost** — touching 8 files across 3 apps in one commit
  is risky. Sequential small commits are safer.
- **No regression pressure** — nothing in the codebase actively fails
  without this migration. It can wait for a session that has the
  bandwidth to do the 8-step migration.
- **Test coverage** — the rationalization test is in place
  (`tests/theme-rationalization.test.ts`) so a future contributor can
  see the plan and resume work.

## How the test enforces this

`tests/theme-rationalization.test.ts` asserts:

1. All theme packages have a `package.json` with a name
2. The rationalization plan (`docs/ops/THEME_RATIONALIZATION.md`) exists
3. `@haa/theme-engine` is a pure-TS package (no `react` or `next` dep)
4. **No new theme package is created** (hard ceiling: 6)
5. The legacy package is flagged as deprecated
6. `@haa/storefront-themes`'s description explicitly mentions
   `@haa/theme-system` as the package it replaces
7. Each theme package has a README

The test fails loudly if anyone adds a 7th theme package without
updating the rationalization plan — which is the regression we want to
prevent.
