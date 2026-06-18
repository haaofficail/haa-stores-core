/**
 * Icon standards — T3.4.
 *
 * AGENTS.md §9.2 + design plan T3.4: standardize icon sizes across all apps.
 *
 * ## Rules (binding for all 3 apps)
 *
 * 1. **Always use the `Icon` wrapper** from `@/components/ui/icon` (storefront)
 *    or `@haa/ui` (shared). Never pass raw `className="h-X w-X"` to lucide icons.
 *
 * 2. **Size tokens** (use these `size` prop values):
 *    - `3xs` (10px) — inline badge
 *    - `2xs` (12px) — tiny inline icon
 *    - `xs` (16px) — metadata (price, count)
 *    - `sm` (18px) — small button
 *    - `md` (20px) — button
 *    - `default` (24px) — default UI (most common)
 *    - `lg` (32px) — feature/trust
 *    - `xl` (48px) — empty state
 *    - `2xl` (64px) — illustration
 *
 * 3. **Directional icons** (arrows, chevrons) MUST be RTL-aware via the
 *    `Icon` wrapper or explicit `rtl:rotate-180` / `rtl:scale-x-[-1]` classes.
 *
 * 4. **Clickable icon-only** (button-as-icon): min 44×44px hit area.
 *
 * 5. **Decorative icons**: pass `aria-hidden="true"`.
 *
 * ## Examples
 *
 * ```tsx
 * // Good — uses Icon wrapper with token size
 * import { Icon } from '@/components/ui/icon';
 * import { ChevronRight } from 'lucide-react';
 *
 * <Icon icon={ChevronRight} size="default" className="text-primary-600" />
 *
 * // Bad — raw lucide with hardcoded size
 * <ChevronRight className="h-6 w-6 text-primary-600" />
 * ```
 *
 * ## Enforcement
 *
 * This package exports a lint config snippet you can add to your ESLint
 * setup to warn when developers use raw lucide icons instead of the Icon wrapper.
 * See `./icon-lint-snippet.ts`.
 */

export const ICON_STANDARDS_VERSION = '1.0' as const;
