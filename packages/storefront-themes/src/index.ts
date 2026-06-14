/**
 * @haa/storefront-themes — STOREFRONT-ONLY PACKAGE
 *
 * ============================================================
 * 🚨 DASHBOARD WARNING
 * ============================================================
 * This package is FOR STOREFRONT USE ONLY.
 *
 * It imports DOM-manipulation functions from @haa/theme-system
 * that write to document.documentElement, modify CSS variables,
 * and inject analytics scripts.
 *
 * DASHBOARDS MUST USE @haa/theme-system/server instead.
 * (accessible as @haa/storefront-themes/server for convenience)
 *
 * For dashboard visual identity: @haa/system-theme
 * For shared UI components: @haa/ui
 * ============================================================
 *
 * This is the canonical package for storefront theme management.
 * @haa/theme-system is the legacy name.
 */

// ─── TYPES (safe) ───
export {
  type ThemeCapabilities,
  type ThemeConfig,
  type ThemeDefinition,
  type ThemeManifest,
  type ThemePreview,
  type ThemeSettingsDefinition,
  type ThemeSupportedPage,
  type PublicThemeConfig,
} from '@haa/theme-system';

// ─── THEME DATA (safe) ───
export { THEMES, getThemeById } from '@haa/theme-system';

// ─── THEME REGISTRY (safe) ───
export {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from '@haa/theme-system';

// ─── DOM ISOLATION (🛑 STOREFRONT ONLY) ───
export { applyStoreTheme, clearStoreTheme, applyTheme, clearTheme } from '@haa/theme-system';

// ─── CONFIG RESOLUTION (safe) ───
export {
  getDefaultThemeConfig,
  isSupportedThemeKey,
  mergeAndResolveThemeConfig,
  mergeThemeConfig,
  resolveActiveThemeConfig,
  resolveThemeKey,
  type ResolvedThemeConfig,
  type ThemeKey,
} from '@haa/theme-system';

// ─── RUNTIME HOOKS (🛑 STOREFRONT ONLY) ───
export { useThemeConfig, fetchThemeConfig, loadTheme, setThemeApiBase } from '@haa/theme-system';

// ─── VALIDATION (safe) ───
export { validateThemeConfig } from '@haa/theme-system';
export type { ValidationResult } from '@haa/theme-system';

// ─── STOREFRONT-SPECIFIC TYPES (🛑 storefront only) ───
export type {
  StorefrontThemeComponents,
  StorefrontThemeManifest,
  StorefrontThemeRegistration,
  HomePageProps,
  ProductPageProps,
} from './types';

// ─── STOREFRONT REGISTRY (🛑 storefront only) ───
export {
  registerStorefrontTheme,
  registerThemeCapsule,
  getStorefrontThemeComponents,
  getStorefrontThemeManifest,
  getAllStorefrontThemeManifests,
  getThemeCapsule,
  getAllThemeCapsules,
  resolveStorefrontThemeKey,
  DEFAULT_STOREFRONT_THEME_KEY,
} from './registry';

// ─── THEME CAPSULE CONTRACT (safe) ───
export type {
  ThemeCapsule,
  ThemeTokens,
  ThemeEditorField,
  ThemeEditorGroup,
  ThemeEditorSchema,
  ThemeSpecificConfig,
  ThemeCapabilityFlags,
  ThemePreviewMeta,
  ThemeCapsuleCategory,
} from './contracts/theme-capsule';

// ─── BUILT-IN THEMES (safe — capsule + manifest data) ───
export { baseElegantManifest } from './themes/base-elegant';
export { luxuryShowcaseCapsule } from './themes/luxury-showcase';
