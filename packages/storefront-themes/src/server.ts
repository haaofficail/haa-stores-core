/**
 * @haa/storefront-themes/server — DASHBOARD-SAFE EXPORTS
 *
 * ============================================================
 * ✅ DASHBOARD-SAFE
 * ============================================================
 * This subpath exports ONLY server-safe functions:
 * - Types (no runtime)
 * - Theme registry reads (in-memory, no DOM)
 * - Config resolution (pure logic)
 * - Validation (pure logic)
 *
 * No DOM manipulation.
 * No analytics script injection.
 * No CSS variable mutation.
 * ============================================================
 *
 * Usage (dashboard):
 *   import { getAllThemeManifests } from '@haa/storefront-themes/server';
 */

export {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from '@haa/theme-system/server';

export {
  getDefaultThemeConfig,
  isSupportedThemeKey,
  mergeAndResolveThemeConfig,
  mergeThemeConfig,
  resolveActiveThemeConfig,
  resolveThemeKey,
  type ResolvedThemeConfig,
  type ThemeKey,
} from '@haa/theme-system/server';

export type {
  ThemeConfig,
  ThemeManifest,
  ThemeSupportedPage,
} from '@haa/theme-system/server';

export {
  validateThemeConfig,
  type ValidationResult,
} from '@haa/theme-system/server';

export type {
  StorefrontThemeComponents,
  StorefrontThemeManifest,
  StorefrontThemeRegistration,
  HomePageProps,
  ProductPageProps,
} from './types';

export {
  getAllStorefrontThemeManifests,
  resolveStorefrontThemeKey,
  DEFAULT_STOREFRONT_THEME_KEY,
  // DECISION-OS-009: re-exported here so dashboards can read the theme capsule
  // registry through the dashboard-safe subpath. The registry is a pure
  // in-memory Map read — no DOM, no analytics, no CSS variable mutation.
  getThemeCapsule,
} from './registry';

// Editor schema types — erased at compile time, no runtime surface; safe for
// dashboard theme-editor components that need to render field schemas.
export type { ThemeEditorField, ThemeEditorGroup, ThemeEditorSchema } from './contracts/theme-capsule';
