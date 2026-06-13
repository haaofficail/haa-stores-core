/**
 * @haa/storefront-themes
 *
 * HAA Storefront Themes — Customer-facing store themes.
 *
 * This is the canonical package for storefront theme management.
 * It re-exports all functionality from @haa/theme-system.
 *
 * @deprecated @haa/theme-system is the legacy name.
 * Use @haa/storefront-themes for all new code.
 */

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

export { THEMES, getThemeById } from '@haa/theme-system';

export {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from '@haa/theme-system';

export { applyStoreTheme, clearStoreTheme, applyTheme, clearTheme } from '@haa/theme-system';

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

export { useThemeConfig, fetchThemeConfig, loadTheme, setThemeApiBase } from '@haa/theme-system';

export { validateThemeConfig } from '@haa/theme-system';
export type { ValidationResult } from '@haa/theme-system';

export type {
  StorefrontThemeComponents,
  StorefrontThemeManifest,
  StorefrontThemeRegistration,
  HomePageProps,
  ProductPageProps,
} from './types';

export {
  registerStorefrontTheme,
  getStorefrontThemeComponents,
  getStorefrontThemeManifest,
  getAllStorefrontThemeManifests,
  resolveStorefrontThemeKey,
  DEFAULT_STOREFRONT_THEME_KEY,
} from './registry';

export { baseElegantManifest } from './themes/base-elegant';
