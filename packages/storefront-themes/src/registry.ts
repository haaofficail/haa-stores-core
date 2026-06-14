import type { ThemeCapsule } from './contracts/theme-capsule';
import type { StorefrontThemeComponents, StorefrontThemeManifest, StorefrontThemeRegistration } from './types';

export const DEFAULT_STOREFRONT_THEME_KEY = 'base-elegant';

const _store = new Map<string, StorefrontThemeRegistration>();
const _capsuleStore = new Map<string, ThemeCapsule>();

export function registerStorefrontTheme(key: string, registration: StorefrontThemeRegistration): void {
  _store.set(key, registration);
}

export function registerThemeCapsule(key: string, capsule: ThemeCapsule): void {
  _capsuleStore.set(key, capsule);
}

export function getThemeCapsule(themeKey?: string | null): ThemeCapsule | null {
  if (!themeKey || typeof themeKey !== 'string') return _capsuleStore.get(DEFAULT_STOREFRONT_THEME_KEY) ?? null;
  return _capsuleStore.get(themeKey) ?? null;
}

export function getStorefrontThemeComponents(themeKey?: string | null): StorefrontThemeComponents | null {
  const key = resolveStorefrontThemeKey(themeKey);
  return _store.get(key)?.components ?? null;
}

export function getStorefrontThemeManifest(themeKey?: string | null): StorefrontThemeManifest | null {
  const key = resolveStorefrontThemeKey(themeKey);
  return _store.get(key)?.manifest ?? null;
}

export function getAllStorefrontThemeManifests(): StorefrontThemeManifest[] {
  return Array.from(_store.values()).map(r => r.manifest);
}

export function getAllThemeCapsules(): ThemeCapsule[] {
  return Array.from(_capsuleStore.values());
}

export function resolveStorefrontThemeKey(themeKey?: string | null): string {
  if (!themeKey || typeof themeKey !== 'string') return DEFAULT_STOREFRONT_THEME_KEY;
  if (_store.has(themeKey)) return themeKey;
  console.warn(`[ThemeRegistry] Unknown theme key "${themeKey}". Falling back to "${DEFAULT_STOREFRONT_THEME_KEY}".`);
  return DEFAULT_STOREFRONT_THEME_KEY;
}

/** @internal — for testing only */
export function _resetStorefrontThemeRegistry(): void {
  _store.clear();
  _capsuleStore.clear();
}
