# @haa/storefront-themes

HAA Storefront Themes — Customer-facing store themes.

## Purpose

This package manages **storefront themes** — the visual identity of customer-facing stores. Merchants choose from available themes (minimal, royal, night, nature) and customize them.

## What it contains

- **Theme types**: `ThemeConfig`, `ThemeDefinition`, `ThemeManifest`, `ThemeColors`, `SectionConfig`
- **Theme definitions**: 4 storefront themes (minimal, royal, night, nature)
- **Theme registry**: `getAllThemeManifests`, `getDefaultThemeKey`, `isKnownThemeKey`
- **Theme resolver**: `resolveActiveThemeConfig`, `mergeAndResolveThemeConfig`
- **Theme applier**: `applyStoreTheme()` — applies theme CSS variables to `#storefront-scope` ONLY
- **React hook**: `useThemeConfig()` — fetches and applies theme config
- **Theme validator**: `validateThemeConfig()` — validates theme configuration

## What it does NOT contain

- System dashboard theme (see `@haa/system-theme`)
- Admin tokens
- Dashboard provider
- Merchant dashboard styling

## Usage

```ts
import { useThemeConfig, applyStoreTheme, THEMES } from '@haa/storefront-themes';

// In a React component:
const themeConfig = useThemeConfig(slug);

// Or apply manually:
applyStoreTheme(themeConfig);
```

## Scope Isolation

`applyStoreTheme()` writes CSS variables ONLY to `#storefront-scope`. It never writes to `document.documentElement`. This prevents storefront themes from affecting the merchant dashboard.

## Migration

If you're using `@haa/theme-system`, switch to `@haa/storefront-themes`. The API is identical.

```diff
- import { useThemeConfig } from '@haa/theme-system';
+ import { useThemeConfig } from '@haa/storefront-themes';
```

`@haa/theme-system` remains available as a deprecated compatibility layer.

## Relationship to Other Packages

| Package | Purpose |
|---------|---------|
| `@haa/storefront-themes` | Storefront theme management (this package) |
| `@haa/system-theme` | Admin dashboard identity (`--haa-*` namespace) |
| `@haa/tokens` | Shared design primitives (colors, typography, spacing) |
| `@haa/ui` | Context-agnostic UI components |
