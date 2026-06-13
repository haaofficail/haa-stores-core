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
