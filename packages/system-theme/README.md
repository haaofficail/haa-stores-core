# @haa/system-theme

> **DASHBOARD-ONLY PACKAGE.** This package is for the merchant-dashboard
> and platform-admin apps. It must NOT be imported from the storefront
> (use `@haa/storefront-themes` for customer-facing theming).

## What it is

The dashboard identity layer. It owns:

- CSS tokens in the `--haa-*` namespace (light + dark)
- `SystemThemeProvider` — React provider that injects tokens + handles
  the OS-level `prefers-color-scheme` switch
- TypeScript token definitions for type-safe consumption

## What it is NOT

- Not a customer-facing storefront theme (use `@haa/storefront-themes`)
- Not a theme authoring engine (use `@haa/theme-engine` for contracts/validation)
- Not a React theme context (use `@haa/theme-react` for the merchant
  theme switcher in the storefront)

## Relationship to other theme packages

```
+---------------------+
|  @haa/theme-engine  |  ← contracts, validation, registry primitives (core)
+---------------------+
        ▲          ▲
        │          │
+---------------------+    +---------------------+
| @haa/theme-react    |    | @haa/system-theme   |
| (React context for  |    | (CSS tokens +       |
|  merchant switcher) |    |  OS theme provider) |
+---------------------+    +---------------------+
        ▲                          ▲
        └──── @haa/storefront-themes (uses both)
```

The dashboard apps consume `@haa/system-theme` directly. The storefront
uses `@haa/storefront-themes` (which itself depends on `theme-engine`).
