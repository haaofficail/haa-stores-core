import type { StorefrontThemeComponents, StorefrontThemeManifest, StorefrontThemeRegistration } from './types';

export const DEFAULT_STOREFRONT_THEME_KEY = 'base-elegant';

const _store = new Map<string, StorefrontThemeRegistration>();

export function registerStorefrontTheme(key: string, registration: StorefrontThemeRegistration): void {
  _store.set(key, registration);
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

export function resolveStorefrontThemeKey(themeKey?: string | null): string {
  if (!themeKey || typeof themeKey !== 'string') return DEFAULT_STOREFRONT_THEME_KEY;
  if (_store.has(themeKey)) return themeKey;
  return DEFAULT_STOREFRONT_THEME_KEY;
}

/** @internal — for testing only */
export function _resetStorefrontThemeRegistry(): void {
  _store.clear();
}
