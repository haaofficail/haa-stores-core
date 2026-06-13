import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerStorefrontTheme,
  getStorefrontThemeComponents,
  getStorefrontThemeManifest,
  getAllStorefrontThemeManifests,
  resolveStorefrontThemeKey,
  DEFAULT_STOREFRONT_THEME_KEY,
  _resetStorefrontThemeRegistry,
} from './registry';
import { baseElegantManifest } from './themes/base-elegant';
import type { StorefrontThemeRegistration } from './types';

const DUMMY_COMPONENTS = {
  HomePage: () => null,
  ProductPage: () => null,
  ProductCard: () => null,
  Header: () => null,
  Footer: () => null,
};

const BASE_REGISTRATION: StorefrontThemeRegistration = {
  manifest: baseElegantManifest,
  components: DUMMY_COMPONENTS,
};

describe('storefront theme registry', () => {
  beforeEach(() => {
    _resetStorefrontThemeRegistry();
  });

  it('returns null for theme components when nothing is registered', () => {
    expect(getStorefrontThemeComponents('base-elegant')).toBeNull();
  });

  it('returns null for manifest when nothing is registered', () => {
    expect(getStorefrontThemeManifest('base-elegant')).toBeNull();
  });

  it('resolves undefined to default key', () => {
    expect(resolveStorefrontThemeKey(undefined)).toBe(DEFAULT_STOREFRONT_THEME_KEY);
  });

  it('resolves null to default key', () => {
    expect(resolveStorefrontThemeKey(null)).toBe(DEFAULT_STOREFRONT_THEME_KEY);
  });

  it('resolves empty string to default key', () => {
    expect(resolveStorefrontThemeKey('')).toBe(DEFAULT_STOREFRONT_THEME_KEY);
  });

  it('resolves unknown theme key to default key', () => {
    expect(resolveStorefrontThemeKey('unknown-theme')).toBe(DEFAULT_STOREFRONT_THEME_KEY);
  });

  it('resolves "base-elegant" to itself after registration', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    expect(resolveStorefrontThemeKey('base-elegant')).toBe('base-elegant');
  });

  it('returns base-elegant components after registration', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    const components = getStorefrontThemeComponents('base-elegant');
    expect(components).not.toBeNull();
    expect(components?.Header).toBe(DUMMY_COMPONENTS.Header);
    expect(components?.Footer).toBe(DUMMY_COMPONENTS.Footer);
    expect(components?.HomePage).toBe(DUMMY_COMPONENTS.HomePage);
    expect(components?.ProductPage).toBe(DUMMY_COMPONENTS.ProductPage);
    expect(components?.ProductCard).toBe(DUMMY_COMPONENTS.ProductCard);
  });

  it('falls back to base-elegant for unknown key after registration', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    const components = getStorefrontThemeComponents('royal');
    expect(components).not.toBeNull();
    expect(components?.Header).toBe(DUMMY_COMPONENTS.Header);
  });

  it('falls back to base-elegant for null after registration', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    const components = getStorefrontThemeComponents(null);
    expect(components).not.toBeNull();
    expect(components?.Header).toBe(DUMMY_COMPONENTS.Header);
  });

  it('returns base-elegant manifest after registration', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    const manifest = getStorefrontThemeManifest('base-elegant');
    expect(manifest).not.toBeNull();
    expect(manifest?.id).toBe('base-elegant');
    expect(manifest?.name).toBe('Base Elegant');
  });

  it('getAllStorefrontThemeManifests returns all registered manifests', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    const otherManifest = { ...baseElegantManifest, id: 'other', name: 'Other' };
    registerStorefrontTheme('other', { manifest: otherManifest, components: DUMMY_COMPONENTS });
    const all = getAllStorefrontThemeManifests();
    expect(all).toHaveLength(2);
    expect(all.map(m => m.id)).toContain('base-elegant');
    expect(all.map(m => m.id)).toContain('other');
  });

  it('registering a new theme does not break base-elegant fallback', () => {
    registerStorefrontTheme('base-elegant', BASE_REGISTRATION);
    const luxuryComponents = {
      ...DUMMY_COMPONENTS,
      Header: () => <header>Luxury Header</header>,
    };
    registerStorefrontTheme('luxury', { manifest: { ...baseElegantManifest, id: 'luxury' }, components: luxuryComponents });
    const fromBase = getStorefrontThemeComponents('base-elegant');
    expect(fromBase?.Header).toBe(DUMMY_COMPONENTS.Header);
    const fromLuxury = getStorefrontThemeComponents('luxury');
    expect(fromLuxury?.Header).not.toBe(DUMMY_COMPONENTS.Header);
  });
});
