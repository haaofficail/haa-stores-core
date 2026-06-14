# UI Contract — CSS Variable Dependencies

> Phase 7.7 — Documented CSS variable contract for `@haa/ui`  
> All components reference generic CSS variables (no `--haa-*` or `--st-*` prefixes).  
> Each consumer app provides the correct variable values via loaded CSS + Tailwind config.

## How @haa/ui Resolves CSS Variables

`@haa/ui` components use inline styles with `var(--name)` — NOT Tailwind utility classes.
This means the component relies on the CSS variable being defined in scope at runtime.

```
@haa/ui component
  → reads var(--surface-1), var(--text-primary), etc.
  → resolves to whatever value is in scope (system or storefront)
  → apps control the value via their CSS imports + Tailwind mapping
```

## CSS Variable Inventory

### 1. Surface

| Variable | Used By |
|----------|---------|
| `--surface-1` | Card, ProductCard, QuantitySelector, Modal, Sheet, Switch |
| `--surface-2` | Button, Card (filled), OrderStatusBadge, ProductCard, SearchInput, StepIndicator, Input, Select, TextArea |

### 2. Text

| Variable | Used By |
|----------|---------|
| `--text-primary` | Every component — Badge, Button, Card, Input, Modal, Select, Text, TextArea, Toast, etc. |
| `--text-secondary` | EmptyState, OrderStatusBadge, Text |
| `--text-tertiary` | Breadcrumbs, Input, OrderStatusBadge, Price, ProductCard, TabBar, Text |
| `--text-inverse` | Text |
| `--text-on-color` | Button (primary), ProductCard (on-sale), StepIndicator (active) |

### 3. Color Primitives

| Variable | Used By |
|----------|---------|
| `--color-primary-500` | Breadcrumbs, Button, OrderStatusBadge, ProductCard, StepIndicator, Progress, Switch, TabBar |
| `--color-primary-600` | OrderStatusBadge |
| `--color-primary-subtle` | OrderStatusBadge |
| `--color-success` | Badge, OrderStatusBadge, StepIndicator, Progress, Toast |
| `--color-success-text` | Badge, Toast |
| `--color-success-subtle` | OrderStatusBadge |
| `--color-warning` | Badge, OrderStatusBadge, ProductCard, Progress, Toast |
| `--color-warning-text` | Badge, Toast |
| `--color-warning-subtle` | OrderStatusBadge |
| `--color-danger` | Badge, Button, OrderStatusBadge, Price, ProductCard, Input, Select, TextArea, Progress, Toast |
| `--color-danger-text` | Badge, Button, Toast |
| `--color-danger-subtle` | OrderStatusBadge, Price |
| `--color-info` | Badge, OrderStatusBadge, Toast |
| `--color-info-text` | Badge, Toast |
| `--color-info-subtle` | OrderStatusBadge |
| `--color-neutral-200` | Badge, Progress, Skeleton |
| `--color-neutral-300` | Sheet, Switch |

### 4. Typography

| Variable | Used By |
|----------|---------|
| `--typography-body-size` | Button, Input, Price, Select, TextArea |
| `--typography-callout-size` | Button, EmptyState, Input, Price, ProductCard, QuantitySelector, SearchInput, Toast |
| `--typography-footnote-size` | Badge, Breadcrumbs, Button, Input, Price, ProductCard, Select, TextArea |
| `--typography-caption1-size` | Input, Select, TabBar, TextArea |
| `--typography-caption2-size` | Badge |
| `--typography-title1-size` | Price |
| `--typography-title2-size` | Modal, Sheet |
| `--typography-title3-size` | EmptyState, NavigationBar, Price |
| `--typography-large-title-size` | NavigationBar |
| `--typography-*-size` | Text component — dynamically reads any variant |
| `--typography-*-font-weight` | Text component |
| `--typography-*-line-height` | Text component, NavigationBar |
| `--typography-*-letter-spacing` | Text component, NavigationBar |

### 5. Font

| Variable | Used By |
|----------|---------|
| `--font-sans` | Badge, Button, Card, Input, NavigationBar, OrderStatusBadge, QuantitySelector, SearchInput, Select, TabBar, Text, TextArea, Toast |

### 6. Spacing

| Variable | Used By |
|----------|---------|
| `--spacing-1` | Badge, Breadcrumbs, Button, Price, ProductCard, EmptyState, Input, Select, TabBar, TextArea, Toast |
| `--spacing-2` | Badge, Button, Divider, EmptyState, Grid, Input, ProductCard, QuantitySelector, SearchInput, Select, Stack, StepIndicator, TextArea, Toast |
| `--spacing-3` | Badge, Button, Card, Divider, Input, Modal, ProductCard, Select, Sheet, TextArea, Toast |
| `--spacing-4` | Breadcrumbs, Button, Container, Card, NavigationBar, Toast |
| `--spacing-5` | Button, Card, Input, Modal, SearchInput, Sheet, StepIndicator |
| `--spacing-6` | EmptyState |

### 7. Border

| Variable | Used By |
|----------|---------|
| `--border-default` | Button, Card, Divider, Input, NavigationBar, ProductCard, QuantitySelector, SearchInput, Select, TabBar, TextArea |
| `--border-width-1` | Input, Select, TextArea |
| `--border-width-2` | Input, Select, TextArea |

### 8. Radius

| Variable | Used By |
|----------|---------|
| `--radius-sm` | Skeleton, Toast |
| `--radius-md` | Card, Input, QuantitySelector, SearchInput, Select, TextArea |
| `--radius-lg` | ProductCard, Toast |
| `--radius-xl` | Modal, Sheet |
| `--radius-pill` | Badge, OrderStatusBadge, Price, ProductCard |
| `--radius-ios-btn` | Button (iOS) |
| `--radius-mac-btn` | Button (macOS) |

### 9. Animation/Easing

| Variable | Used By |
|----------|---------|
| `--ease-spring-snappy` | Button, Input, ProductCard, QuantitySelector, SearchInput, Select, Switch, TabBar, TextArea, Toast |
| `--ease-spring-smooth` | Modal, Progress, Sheet |
| `--duration-fast` | Button, Input, ProductCard, QuantitySelector, SearchInput, Select, Switch, TabBar, TextArea |
| `--duration-normal` | Progress |

### 10. Z-Index

| Variable | Used By |
|----------|---------|
| `--z-base` | Elevation (internal) |
| `--z-dropdown` | Elevation (internal) |
| `--z-sticky` | Elevation (internal) |
| `--z-overlay` | Elevation, Sheet |
| `--z-modal` | Elevation, Modal |
| `--z-toast` | Elevation, Toast |
| `--z-tooltip` | Elevation |

### 11. Shadow

| Variable | Used By |
|----------|---------|
| `--shadow-sm` | Elevation (level 1) |
| `--shadow-md` | Elevation (level 2) |
| `--shadow-lg` | Elevation (level 3) |
| `--shadow-xl` | Elevation (level 4+) |

### 12. Backdrop

| Variable | Used By |
|----------|---------|
| `--backdrop-color` | Modal, Sheet |
| `--backdrop-opacity` | Modal |
| `--backdrop-blur` | Modal |

### 13. Other

| Variable | Used By |
|----------|---------|
| `--safe-top` | NavigationBar |
| `--safe-bottom` | TabBar, Toast |
| `--touch-target-min` | Button, TabBar |
| `--container-max-width` | Container |

## Provider Mapping Per App

All base CSS variable values come from `@haa/tokens/output/css/index.css` (loaded by every app):

```
@haa/tokens/output/css/
  00-reset.css            ← box-sizing, margin reset
  01-colors.css           ← --color-*, --color-neutral-*
  02-typography.css       ← --typography-*
  03-spacing.css          ← --spacing-*
  04-radius.css           ← --radius-*
  05-shadows.css          ← --shadow-*
  06-borders.css          ← --border-*, --border-width-*
  07-opacity.css          ← --opacity-*
  08-easing.css           ← --ease-*
  09-z-index.css          ← --z-*
  10-gradients.css        ← --gradient-*
  11-materials.css        ← --material-*
  12-safe-areas.css       ← --safe-*
  13-accessibility.css    ← --a11y-*, --touch-target-min
  14-storefront-tokens.css ← storefront-specific (--product-*, --card-*)
  index.css               ← imports ALL of the above
```

### merchant-dashboard / admin-dashboard (System Theme)

```
Imports:
  @haa/tokens/output/css/index.css    ← base --color-*, --spacing-*, etc.
  @haa/system-theme/system-theme.css  ← --haa-* vars scoped in .haa-system-theme

Propagation:
  @haa/ui reads var(--surface-1), var(--text-primary), etc.
  → These are defined globally in themes-light.css (from @haa/tokens)
  → .haa-system-theme overrides surface/text to match system identity
  → Tailwind classes (bg-surface-1, text-text-primary) resolve to --haa-* within scope

Tailwind mapping:
  surface-1: var(--haa-surface-1)    ← used by dashboard custom layouts
  text-primary: var(--haa-text-primary)
  primary-500: var(--haa-primary-500)
  danger: var(--haa-danger)
  etc.
```

### storefront (Storefront Theme)

```
Imports:
  @haa/tokens/output/css/index.css      ← base --color-*, --spacing-*, etc.
  @haa/storefront-themes (via isolation) ← --surface-*, --text-*, --color-* in #storefront-scope

Propagation:
  @haa/ui reads var(--surface-1), var(--text-primary), etc.
  → These are overridden in #storefront-scope by applyStoreTheme()
  → Tailwind classes resolve within #storefront-scope

Tailwind mapping:
  surface-1: var(--surface-1)           ← same generic name, different scope
  text-primary: var(--text-primary)
  primary-500: var(--color-primary-500)
  danger: var(--color-danger)
  etc.
```

## Compliance Checklist

| Category | Variable | @haa/tokens provides | System (--haa-*) | Storefront (--st-*) |
|----------|----------|---------------------|-------------------|---------------------|
| Surface | `--surface-1` | ✅ (themes-light.css) | `--haa-surface-1` | `--surface-1` (scoped) |
| Surface | `--surface-2` | ✅ (themes-light.css) | `--haa-surface-2` | `--surface-2` (scoped) |
| Text | `--text-primary` | ✅ (themes-light.css) | `--haa-text-primary` | `--text-primary` (scoped) |
| Text | `--text-secondary` | ✅ | `--haa-text-secondary` | `--text-secondary` |
| Colors | `--color-primary-500` | ✅ (01-colors.css) | `--haa-primary-500` | `--color-primary-500` |
| Colors | `--color-danger` | ✅ (01-colors.css) | `--haa-danger` | `--color-danger` |
| Typography | `--font-sans` | ✅ (02-typography.css) | `var(--font-sans)` | `var(--font-sans)` |
| Spacing | `--spacing-1` | ✅ (03-spacing.css) | `var(--spacing-1)` | `var(--spacing-1)` |
| Border | `--border-default` | ✅ (06-borders.css) | `--haa-border` | `--border-default` |
| Radius | `--radius-md` | ✅ (04-radius.css) | `var(--radius-md)` | `var(--radius-md)` |
| Easing | `--ease-spring-snappy` | ✅ (08-easing.css) | `var(--ease-spring-snappy)` | `var(--ease-spring-snappy)` |
| Z-index | `--z-modal` | ✅ (09-z-index.css) | `var(--z-modal)` | `var(--z-modal)` |
| Backdrop | `--backdrop-color` | ❌ | `--haa-backdrop-color` | (defined in themes) |

**Note on semantic colors**: `@haa/ui` uses the generic names (`--color-danger`, `--color-success`, etc.) from `01-colors.css`. Both system apps (via `@haa/tokens`) and storefront (via its scoped CSS) define these. System apps additionally define `--haa-danger`, `--haa-success`, etc. for their own Tailwind classes.

## Verification

All apps must provide every CSS variable that `@haa/ui` reads. The authoritative source is `@haa/tokens/output/css/index.css`. To verify:

```ts
// Test: all variables resolve to a defined value
const vars = ['--surface-1', '--text-primary', '--color-primary-500', '--font-sans', /* ... */]
vars.forEach(v => {
  const val = getComputedStyle(document.documentElement).getPropertyValue(v)
  if (!val) console.warn(`Missing: ${v}`)
})
```
