/**
 * @haa/theme-system/server — DASHBOARD-SAFE EXPORTS
 *
 * ============================================================
 * ✅ DASHBOARD-SAFE
 * ============================================================
 * This subpath exports only server-safe functions with ZERO
 * DOM side effects. Safe for import by any app.
 *
 * CRITICAL: This file must NEVER export:
 *   - applyStoreTheme / clearStoreTheme  (DOM mutation)
 *   - applyTheme / clearTheme            (DOM mutation)
 *   - useThemeConfig / fetchThemeConfig  (network + DOM)
 *   - loadTheme / setThemeApiBase        (network + DOM)
 * ============================================================
 */

export {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from './themeRegistry.js';

export {
  getDefaultThemeConfig,
  isSupportedThemeKey,
  mergeAndResolveThemeConfig,
  mergeThemeConfig,
  resolveActiveThemeConfig,
  resolveThemeKey,
  type ResolvedThemeConfig,
  type ThemeKey,
} from './activeThemeResolver.js';

export type {
  ThemeConfig,
  ThemeManifest,
  ThemeSupportedPage,
} from './types.js';

export { validateThemeConfig } from './validate.js';
export type { ValidationResult } from './validate.js';
