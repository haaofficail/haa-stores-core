# @haa/system-theme

HAA System Theme — Admin Dashboard Identity.

## Purpose

This package provides the visual identity for the **merchant dashboard** and **admin dashboard**. It is:

- **Fixed** — one version, not customizable by merchants
- **Internal** — not sold, not part of the theme marketplace
- **Isolated** — uses `--haa-*` namespace, never conflicts with storefront themes

## Namespace

All CSS variables use the `--haa-*` prefix:

```
--haa-surface-1
--haa-surface-2
--haa-surface-3
--haa-text-primary
--haa-text-secondary
--haa-text-tertiary
--haa-border
--haa-border-strong
--haa-primary-500
--haa-success
--haa-warning
--haa-danger
--haa-radius-card
--haa-radius-button
--haa-shadow-card
```

## Usage

### 1. Import CSS

```css
/* In your app's index.css or main.tsx */
@import '@haa/system-theme/system-theme.css';
```

### 2. Wrap your app

```tsx
import { SystemThemeProvider } from '@haa/system-theme';

function App() {
  return (
    <SystemThemeProvider>
      <YourDashboard />
    </SystemThemeProvider>
  );
}
```

### 3. Use tokens in Tailwind

Map `--haa-*` variables in your `tailwind.config.js`:

```js
colors: {
  surface: { 1: 'var(--haa-surface-1)' },
  text: { primary: 'var(--haa-text-primary)' },
  border: { DEFAULT: 'var(--haa-border)' },
  primary: { 500: 'var(--haa-primary-500)' },
}
```

## Dark Mode

System theme dark mode is controlled by `data-haa-theme="dark"` on the wrapper element, NOT by `[data-theme="dark"]` on `document.documentElement`. This prevents conflicts with storefront theme dark mode.

## Contract

- **@haa/system-theme** provides `--haa-*` variables for dashboard UI
- **@haa/theme-system** provides storefront theme management (separate package)
- **@haa/ui** is context-agnostic — it uses CSS variables provided by the wrapping theme context
- System theme must NEVER read storefront theme variables
- Storefront theme must NEVER write to `--haa-*` variables
- Neither theme writes to `document.documentElement` for thematic variables
