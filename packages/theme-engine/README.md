# @haa/theme-engine

The HAA Theme Engine — a typed, validated, sandboxed infrastructure for
storefront themes.

This package provides the **foundation** for the HAA Theme Library.
It is **infrastructure only** — no theme is included here. The first
theme (Pure Commerce) will be added in PR 2.

## Status

**PR 1 — Foundation only.** No themes. No renderer. No UI. No integration
with the storefront or dashboard.

What's in this package:

- TypeScript contracts (types)
- Zod schemas (runtime validation)
- Validation utilities
- `ThemeRegistry` (in-memory catalog)
- Sandbox rules (forbidden APIs + allowed props)

What's **not** in this package (later PRs):

- Theme files (PR 2 — Pure Commerce)
- `ThemeRenderer` and section registry (PR 3)
- Storefront integration (PR 4)
- Dashboard Theme Library UI (PR 5)
- API endpoints (PR 6)
- Database schema (PR 7)

## Local-only

This package, like the rest of the repo, runs **locally only**.
There is no deployment, no staging, no production. The
`No Deploy Policy` is active.

## Why contracts?

A storefront theme is not just styles. It's a contract between three
parties:

1. **The merchant** — needs to install, activate, and customize themes.
2. **The storefront** — needs to render pages from theme definitions.
3. **The platform** — needs to enforce what a theme may and may not do.

This package defines the contract surface. Every other PR builds
on it.

## What a theme IS (and IS NOT)

A theme is a **theme product** in the HAA Theme Library — not a fork
of the storefront. It contains:

- A `ThemeExperienceContract` (the public-facing description)
- A `ThemeTokens` (colors, typography, spacing, etc.)
- A set of `PageTemplate` definitions (which sections appear on which pages)

A theme is **NOT** allowed to:

- Touch cart, checkout, payment, or order logic
- Call any HTTP API directly
- Use `localStorage`, `sessionStorage`, or `document.cookie`
- Inject arbitrary HTML or scripts
- Modify `window.location`
- Use `eval` or `Function`

These restrictions are enforced by the sandbox (see
`src/sandbox/forbidden.ts` and `src/sandbox/allowed.ts`).

## Public API

```ts
import {
  // Types
  type ThemeDefinition,
  type ThemeExperienceContract,
  type ThemeTokens,
  type PageTemplate,
  type SectionInstance,

  // Validation
  validateThemeContract,
  validateTokens,
  validatePageTemplate,
  validateSection,

  // Registry
  ThemeRegistry,

  // Sandbox
  THEME_FORBIDDEN_NAMES,
  ALLOWED_SECTION_PROPS,
  isAllowedSectionProp,
  validateSectionPropsAllowlist,
  containsForbiddenName,
  validatePropValue,
} from '@haa/theme-engine'
```

## Contracts at a glance

### `ThemeExperienceContract`

The public-facing description of a theme. Includes:

- `key` (unique slug, kebab-case)
- `name` and `nameAr`
- `category` (`minimal`, `luxury`, `marketplace`, `restaurant`, `perfume`, `events`, `custom`)
- `priceType` (`free`, `premium`, `one-time`)
- `supportedPages` (subset of `home`, `product`, `category`, `cart`, `checkout`, `account`, `track`, `about`, `contact`)
- `supportsRTL`, `supportsDarkMode`, `supportsI18n`
- `customization` (which Tweaks are allowed)
- `defaults` (default values for the customizations)
- `previewImages`, `tags`, `version`, `author`, `updatedAt`

### `ThemeTokens`

The visual values a theme defines. Includes:

- `colors` (bg, surface, surface2, ink, ink2, ink3, line, lineStrong, accent, onAccent)
- `fonts` (pair, display, body, arabic)
- `typography` (h1, h2, h3, body, caption, eyebrow)
- `spacing` (xs, sm, md, lg, xl, xxl)
- `radius` (sm, md, lg, xl)
- `shadows` (sm, md, lg)
- `motion` (default, drawer, modal)

### `PageTemplate`

For each supported page:

- `page` (the page identifier)
- `layout` (`1col`, `2col-sidebar-left`, `2col-sidebar-right`, `split-50-50`)
- `density` (`compact`, `regular`, `comfy`)
- `sections` (ordered list of section instances)

### `SectionInstance`

A single section on a page:

- `component` (one of the registered section IDs)
- `props` (primitive props only — no callbacks, no refs)
- `visible` (whether the section renders)
- `order` (optional ordering hint)

## Sandbox

The sandbox is split into two parts:

### `THEME_FORBIDDEN_NAMES`

Names that must never appear in a theme's prop values or
identifiers. Examples: `fetch`, `localStorage`, `cartApi`, `eval`.

```ts
containsForbiddenName('fetch("/api")') // → 'fetch'
containsForbiddenName('Hello world')  // → null
containsForbiddenName('fetched')      // → null (not a match)
```

### `ALLOWED_SECTION_PROPS`

The strict allowlist of prop names each section accepts. Themes
cannot pass arbitrary props. This prevents themes from sneaking
in callbacks or references to data they shouldn't have.

```ts
isAllowedSectionProp('Hero', 'title')     // → true
isAllowedSectionProp('Hero', 'onClick')   // → false
```

## Tests

```bash
pnpm --filter @haa/theme-engine test
```

Tests cover:

- Contract validation (Zod)
- Validation utilities
- `ThemeRegistry` registration, lookup, ordering, manifest
- Sandbox: forbidden detection (including partial-match avoidance)
- Sandbox: prop allowlist

## Directory layout

```
packages/theme-engine/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── src/
│   ├── types/
│   │   ├── tokens.ts
│   │   ├── section.ts
│   │   ├── page.ts
│   │   ├── theme.ts
│   │   ├── registry.ts
│   │   └── index.ts
│   ├── contracts/
│   │   ├── tokens.ts
│   │   ├── section.ts
│   │   ├── page.ts
│   │   ├── theme.ts
│   │   ├── registry.ts
│   │   └── index.ts
│   ├── validation/
│   │   ├── validateTokens.ts
│   │   ├── validateSection.ts
│   │   ├── validatePageTemplate.ts
│   │   ├── validateTheme.ts
│   │   └── index.ts
│   ├── registry/
│   │   ├── ThemeRegistry.ts
│   │   └── index.ts
│   ├── sandbox/
│   │   ├── forbidden.ts
│   │   ├── allowed.ts
│   │   └── index.ts
│   └── index.ts
└── tests/
    ├── contracts.test.ts
    ├── validation.test.ts
    ├── registry.test.ts
    └── sandbox.test.ts
```

## Future

PRs in order:

1. ✅ PR 1 — Foundation (this PR)
2. ⏳ PR 2 — Pure Commerce Theme Product
3. ⏳ PR 3 — Theme Renderer + Section Registry
4. ⏳ PR 4 — Storefront Integration
5. ⏳ PR 5 — Dashboard Theme Library UI
6. ⏳ PR 6 — API Endpoints
7. ⏳ PR 7 — Database Schema

All local-only. No deploy.
