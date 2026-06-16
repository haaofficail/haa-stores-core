# @haa/storefront-themes

> **STOREFRONT-ONLY PACKAGE.** This package is for the customer-facing
> storefront app. It must NOT be imported from the merchant-dashboard
> (admin) or platform-admin app — those have their own theme system
> (`@haa/system-theme` + `@haa/theme-engine`).

## What it is

The runtime + registry for customer-facing store themes. It owns:

- `ThemeRegistry` — discovers and loads theme definitions
- `server.ts` — server-side theme resolution
- `themes/` — the actual theme implementations (luxury-showcase, etc.)
- `contracts/` — TypeScript contracts that every storefront theme must satisfy

## What it is NOT

- Not a React context provider (use `@haa/theme-react` for that)
- Not the admin dashboard theme (use `@haa/system-theme`)
- Not the core engine (use `@haa/theme-engine` for the validation/types/registry primitives)

## Migration from @haa/theme-system

`@haa/theme-system` is the **legacy** package, replaced by this one.
It is still imported by a few call-sites (see `docs/ops/THEME_RATIONALIZATION.md`
for the migration plan).

| Old (`@haa/theme-system`) | New (`@haa/storefront-themes`) |
|---|---|
| `themeRegistry.register(theme)` | `registry.register(theme)` |
| `activeThemeResolver(...)` | `resolveActiveTheme(...)` |
| `isolation.ts` | moved into registry runtime |

If you find yourself importing `@haa/theme-system` in new code, **stop
and use `@haa/storefront-themes` instead.**
