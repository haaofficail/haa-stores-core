/**
 * @deprecated Use @haa/storefront-themes instead.
 * This package is a storefront-only theme management layer.
 * For system/dashboard themes, use @haa/system-theme.
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
} from './types';
export { THEMES, getThemeById } from './themes';
export {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from './themeRegistry';
export { applyStoreTheme, clearStoreTheme, applyTheme, clearTheme } from './isolation';
export {
  getDefaultThemeConfig,
  isSupportedThemeKey,
  mergeAndResolveThemeConfig,
  mergeThemeConfig,
  resolveActiveThemeConfig,
  resolveThemeKey,
  type ResolvedThemeConfig,
  type ThemeKey,
} from './activeThemeResolver';
export { useThemeConfig, fetchThemeConfig, loadTheme, setThemeApiBase } from './useThemeConfig';
export { validateThemeConfig } from './validate';
export type { ValidationResult } from './validate';
