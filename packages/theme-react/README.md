# @haa/theme-react

> React bindings for the theme context. The provider is consumed by
> the storefront app (via `@haa/storefront-themes`) for runtime theme
> switching. It re-exports the most-used primitives from
> `@haa/theme-engine` so theme authors have a single import.

## What it provides

- `ThemeProvider` — React context for the active theme
- `useTheme()` — hook to read + update the active theme
- `STORAGE_KEY` — the localStorage key used to persist the user's choice
- Re-exports of the engine's validation, types, and registry helpers

## What it is NOT

- Not a theme implementation (use `@haa/storefront-themes` for actual themes)
- Not the dashboard theme provider (use `@haa/system-theme`)
- Not the engine itself (use `@haa/theme-engine` for the core contracts)
