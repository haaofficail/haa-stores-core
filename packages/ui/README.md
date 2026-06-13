# @haa/ui

HAA UI — Context-agnostic design system components.

## Contract

`@haa/ui` components **do not own a theme identity**. They are purely presentational and rely on CSS variables provided by the wrapping application context.

### How it works

Components use CSS custom properties in their styles (inline or Tailwind classes). These variables are resolved by the enclosing theme context:

- **In merchant-dashboard**: Variables come from `@haa/system-theme` (`--haa-*` namespace), mapped via `tailwind.config.js`.
- **In storefront**: Variables come from `@haa/theme-system` storefront themes (`--surface-*`, `--text-*`, etc.), mapped via `tailwind.config.js`.

### Rules

1. `@haa/ui` MUST NOT import `@haa/system-theme` or `@haa/theme-system` directly.
2. `@haa/ui` MUST NOT define its own theme colors.
3. `@haa/ui` components declare CSS variable dependencies (e.g., `--color-primary-500`, `--surface-1`).
4. Each consuming app MUST provide these variables via its Tailwind config or CSS.

### Expected CSS Variables

Components expect these variable names (resolved by the app's Tailwind config):

| Category | Variables |
|----------|-----------|
| Surfaces | `--surface-1`, `--surface-2`, `--surface-3` |
| Text | `--text-primary`, `--text-secondary`, `--text-tertiary` |
| Border | `--border-default`, `--border-hover`, `--border-focus` |
| Primary | `--color-primary-50`, `--color-primary-100`, `--color-primary-500`, `--color-primary-600`, `--color-primary-700` |
| Semantic | `--color-success`, `--color-warning`, `--color-danger`, `--color-info` |
| Neutral | `--color-neutral-50` through `--color-neutral-950` |
| Typography | `--typography-*` (from `@haa/tokens`) |
| Spacing | `--spacing-*` (from `@haa/tokens`) |
| Radius | `--radius-*` (from `@haa/tokens`) |
| Shadows | `--shadow-*` (from `@haa/tokens`) |

### App Responsibility

Each app maps these generic variable names to its own namespace:

```js
// merchant-dashboard/tailwind.config.js
colors: {
  surface: { 1: 'var(--haa-surface-1)' },
  text: { primary: 'var(--haa-text-primary)' },
}

// storefront/tailwind.config.js
colors: {
  surface: { 1: 'var(--surface-1)' },
  text: { primary: 'var(--text-primary)' },
}
```

This way, `@haa/ui` components remain identical across both apps while rendering with the correct theme.
