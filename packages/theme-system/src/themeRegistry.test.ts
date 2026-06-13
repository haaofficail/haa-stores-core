import { describe, expect, it } from 'vitest';
import {
  getAllThemeManifests,
  getDefaultThemeKey,
  getDefaultThemeManifest,
  getThemeDefaultConfig,
  getThemeManifest,
  isKnownThemeKey,
  normalizeThemeKey,
} from './themeRegistry';
import { validateThemeConfig } from './validate';

const THEME_KEYS = ['minimal', 'royal', 'night', 'nature', 'luxury-showcase'];

describe('themeRegistry', () => {
  it('has manifests for all registered themes', () => {
    for (const key of THEME_KEYS) {
      const manifest = getThemeManifest(key);

      expect(manifest?.themeKey).toBe(key);
      expect(manifest?.defaultConfig.preset).toBe(key);
      expect(manifest?.defaultConfig.themeKey).toBe(key);
    }
  });

  it('getAllThemeManifests returns exactly the current five themes', () => {
    const manifests = getAllThemeManifests();

    expect(manifests.map((manifest) => manifest.themeKey)).toEqual(THEME_KEYS);
  });

  it('normalizes unknown theme keys to the default theme', () => {
    expect(getDefaultThemeKey()).toBe('minimal');
    expect(normalizeThemeKey('unknown-theme')).toBe('minimal');
    expect(getThemeManifest('unknown-theme')?.themeKey).toBe('minimal');
  });

  it('knows supported theme keys only', () => {
    expect(isKnownThemeKey('night')).toBe(true);
    expect(isKnownThemeKey('legacy')).toBe(false);
  });

  it('default manifest is stable and supports RTL', () => {
    const manifest = getDefaultThemeManifest();

    expect(manifest.themeKey).toBe('minimal');
    expect(manifest.status).toBe('stable');
    expect(manifest.supportsRTL).toBe(true);
    expect(manifest.supportedPages).toContain('checkout');
  });

  it('every manifest has valid default config and required metadata', () => {
    for (const manifest of getAllThemeManifests()) {
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(manifest.supportsRTL).toBe(true);
      expect(manifest.supportedPages.length).toBeGreaterThan(0);
      expect(manifest.preview.thumbnailUrl).toMatch(/^data:image\/svg/);
      expect(validateThemeConfig(manifest.defaultConfig).valid).toBe(true);
    }
  });

  it('returns cloned default configs', () => {
    const first = getThemeDefaultConfig('royal');
    const second = getThemeDefaultConfig('royal');

    first.colors.primary = '#000000';
    expect(second.colors.primary).toBe('#b8860b');
  });
});
