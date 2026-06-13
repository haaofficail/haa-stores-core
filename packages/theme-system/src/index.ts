/**
 * @haa/theme-system — STOREFRONT-ONLY THEME LAYER
 *
 * ============================================================
 * 🚨 DASHBOARD WARNING
 * ============================================================
 * This package contains DOM-manipulation functions that write
 * to document.documentElement, inject analytics scripts, and
 * modify CSS variables globally.
 *
 * DASHBOARDS MUST use @haa/theme-system/server instead.
 *
 * For dashboard visual identity, use @haa/system-theme.
 * For UI components, use @haa/ui.
 * ============================================================
 *
 * @deprecated Use @haa/storefront-themes instead.
 * This package is a storefront-only theme management layer.
 * For system/dashboard themes, use @haa/system-theme.
 */

// ─── TYPES (safe — no side effects) ───
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

// ─── THEME DATA (safe — pure data, no DOM) ───
export { THEMES, getThemeById } from './themes';

// ─── THEME REGISTRY (safe — memory reads only) ───
export {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from './themeRegistry';

// ─── DOM ISOLATION (🛑 STOREFRONT ONLY — writes to DOM) ───
export {
  applyStoreTheme,
  clearStoreTheme,
  applyTheme,
  clearTheme,
} from './isolation';

// ─── CONFIG RESOLUTION (safe — pure logic, no DOM) ───
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

// ─── RUNTIME HOOKS (🛑 STOREFRONT ONLY — DOM, network side effects) ───
export {
  useThemeConfig,
  fetchThemeConfig,
  loadTheme,
  setThemeApiBase,
} from './useThemeConfig';

// ─── VALIDATION (safe — pure logic) ───
export { validateThemeConfig } from './validate';
export type { ValidationResult } from './validate';
