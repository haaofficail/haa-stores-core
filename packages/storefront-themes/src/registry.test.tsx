import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerStorefrontTheme,
  getStorefrontThemeComponents,
  getStorefrontThemeManifest,
  getAllStorefrontThemeManifests,
  resolveStorefrontThemeKey,
  DEFAULT_STOREFRONT_THEME_KEY,
  _resetStorefrontThemeRegistry,
  registerThemeCapsule,
  getThemeCapsule,
  getAllThemeCapsules,
} from './registry';
import { baseElegantManifest } from './themes/base-elegant';
import { luxuryShowcaseCapsule } from './themes/luxury-showcase';
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

describe('theme capsule registry', () => {
  beforeEach(() => {
    _resetStorefrontThemeRegistry();
  });

  it('getThemeCapsule returns null when nothing registered', () => {
    expect(getThemeCapsule('luxury-showcase')).toBeNull();
  });

  it('registerThemeCapsule stores capsule', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const capsule = getThemeCapsule('luxury-showcase');
    expect(capsule).not.toBeNull();
    expect(capsule?.key).toBe('luxury-showcase');
    expect(capsule?.category).toBe('luxury');
    expect(capsule?.version).toBe('0.1.0');
  });

  it('luxury-showcase capsule has its own tokens', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const capsule = getThemeCapsule('luxury-showcase');
    expect(capsule?.tokens.colors?.bg).toBe('#FAF7F1');
    expect(capsule?.tokens.colors?.primary).toBe('#B88A3D');
    expect(capsule?.tokens.colors?.text).toBe('#2B2520');
  });

  it('luxury-showcase capsule has editorSchema with correct groups', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const capsule = getThemeCapsule('luxury-showcase');
    const schema = capsule?.editorSchema;
    expect(schema?.groups).toHaveLength(4);
    const groupIds = schema?.groups.map(g => g.id);
    expect(groupIds).toContain('hero');
    expect(groupIds).toContain('collections');
    expect(groupIds).toContain('productCard');
    expect(groupIds).toContain('footer');
  });

  it('luxury-showcase schema does not contain base-elegant fields', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const capsule = getThemeCapsule('luxury-showcase');
    const allKeys = capsule?.editorSchema.groups.flatMap(g => g.fields.map(f => f.key));
    expect(allKeys).not.toContain('colors.primary');
    expect(allKeys).not.toContain('font.family');
    expect(allKeys).not.toContain('layout.productCardColumns');
  });

  it('getThemeCapsule returns null for unknown key', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    expect(getThemeCapsule('nonexistent')).toBeNull();
  });

  it('getAllThemeCapsules returns all registered capsules', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const all = getAllThemeCapsules();
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe('luxury-showcase');
  });

  it('luxury-showcase capsule has preview metadata', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const capsule = getThemeCapsule('luxury-showcase');
    expect(capsule?.preview.descriptionAr).toBeTruthy();
    expect(capsule?.preview.sampleStoreType).toBe('perfume');
  });

  it('luxury-showcase capsule has capability flags', () => {
    registerThemeCapsule('luxury-showcase', luxuryShowcaseCapsule);
    const capsule = getThemeCapsule('luxury-showcase');
    expect(capsule?.capabilities.supportsHero).toBe(true);
    expect(capsule?.capabilities.supportsCollections).toBe(true);
    expect(capsule?.capabilities.supportsReviews).toBe(true);
  });
});
