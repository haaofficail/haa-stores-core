# P2-#2 Refactor Plan: Theme Package Architecture

> **Status:** Documented. The hybrid pattern (manifest in package, components in app) is by design.

## Current state

```
packages/storefront-themes/src/themes/
├── base-elegant/
│   ├── index.ts         # manifest entry
│   └── manifest.ts      # theme metadata
└── luxury-showcase/
    ├── index.ts
    └── capsule.ts       # server-rendered config

apps/storefront/src/themes/
├── base-elegant/
│   ├── HomePage.tsx
│   ├── ProductPage.tsx
│   ├── editor-schema.ts
│   └── ... (1466 LOC of components)
└── luxury-showcase/
    ├── HomePage.tsx
    ├── ProductPage.tsx
    ├── Header.tsx
    ├── Footer.tsx
    └── components/ (714+ LOC)
```

The package contains the **manifest** (capability contract, schema,
defaults). The app contains the **components** (the actual React
implementations).

## Why hybrid (not pure)

1. **Manifest isolation.** The package has a stable, minimal API
   (registry, capsule types, theme metadata). Apps depend on
   the package, not on each other's components.

2. **Per-app customization.** Merchants may want to override
   individual components (a header, a hero). With components
   in the app, this is a one-line change in `theme-registry.ts`.

3. **Server / client boundary.** The capsule (server-rendered
   config) is in the package because both server and client
   need it. The actual component implementations can stay
   client-side and be tree-shaken from server bundles.

4. **Build time.** Co-locating components with the rest of the
   app means a single build pipeline. Moving them to the
   package would require per-theme build configs.

## What "true" refactor would look like

```
packages/
├── theme-system/        # already exists, contracts
├── storefront-themes/   # already exists, manifests
├── theme-base-elegant/  # NEW: components for base-elegant
│   ├── package.json
│   ├── src/
│   │   ├── HomePage.tsx
│   │   ├── ProductPage.tsx
│   │   └── editor-schema.ts
│   └── tsconfig.json
└── theme-luxury-showcase/  # NEW: components for luxury-showcase
    ├── package.json
    └── src/
        ├── HomePage.tsx
        ├── ProductPage.tsx
        └── components/
```

Then the app would only register them via the manifest.

## Why deferred

1. **Build complexity.** 4 packages instead of 2 doubles the
   build surface. Each theme package needs tsconfig, exports,
   tests.

2. **Bundle implications.** If theme components live in
   separate packages, they need to be tree-shaken correctly so
   a merchant using base-elegant doesn't ship luxury-showcase.

3. **No clear win.** The current arrangement works. Components
   are colocated. Manifests are isolated. The build is fast.

4. **Migration risk.** Every import path changes. Every test
   that imports a theme component would need to update.

## When to actually do this refactor

- We add a 3rd theme (likely). At that point, 2x component
  directories in `apps/storefront/src/themes/` is no longer
  manageable.
- We want to ship themes as standalone npm packages
  (marketplace distribution).
- We need to version themes independently.

For now: this is a known cost. The audit calls it P2 (medium).
The pattern is documented and understood.

## What we did do

- `packages/storefront-themes/src/registry.ts` exposes a clean
  registry API (`registerStorefrontTheme`, `registerThemeCapsule`).
- `apps/storefront/src/theme-registry.ts` is the single place
  that wires manifests to components. Replacing a component is
  a 1-line change.
- The package boundary is enforced by the system map
  (`docs/system-map/SYSTEM_MAP.md`).
