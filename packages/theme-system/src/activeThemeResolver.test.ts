import { describe, expect, it } from 'vitest';
import {
  getDefaultThemeConfig,
  mergeAndResolveThemeConfig,
  resolveActiveThemeConfig,
  resolveThemeKey,
} from './activeThemeResolver';

describe('activeThemeResolver', () => {
  it('falls back to minimal when config is missing', () => {
    const config = resolveActiveThemeConfig();

    expect(config.preset).toBe('minimal');
    expect(config.themeKey).toBe('minimal');
    expect(config.colors.primary).toBe('#58a1e2');
  });

  it('uses themeKey as the canonical selector while preserving preset compatibility', () => {
    const config = resolveActiveThemeConfig({ preset: 'minimal', themeKey: 'night' });

    expect(config.preset).toBe('night');
    expect(config.themeKey).toBe('night');
    expect(config.font.family).toBe('Cairo');
  });

  it('falls back safely when the requested theme is unknown', () => {
    expect(resolveThemeKey({ preset: 'legacy-theme' })).toBe('minimal');
    expect(resolveActiveThemeConfig({ preset: 'legacy-theme' }).themeKey).toBe('minimal');
  });

  it('keeps legacy preset support', () => {
    const config = resolveActiveThemeConfig({ preset: 'royal' });

    expect(config.preset).toBe('royal');
    expect(config.themeKey).toBe('royal');
    expect(config.colors.primary).toBe('#b8860b');
  });

  it('uses manifest default config for themeKey support', () => {
    const config = resolveActiveThemeConfig({ themeKey: 'nature' });

    expect(config.preset).toBe('nature');
    expect(config.themeKey).toBe('nature');
    expect(config.font.family).toBe('Tajawal');
  });

  it('keeps merchant nested customizations when applying partial updates', () => {
    const current = resolveActiveThemeConfig({
      preset: 'royal',
      colors: { primary: '#123456' } as any,
      font: { family: 'Tajawal' } as any,
    });
    const updated = mergeAndResolveThemeConfig(current, {
      colors: { success: '#00ff00' } as any,
    });

    expect(updated.themeKey).toBe('royal');
    expect(updated.colors.primary).toBe('#123456');
    expect(updated.colors.success).toBe('#00ff00');
    expect(updated.font.family).toBe('Tajawal');
  });

  it('returns the same central default shape used by runtime fallback', () => {
    const config = getDefaultThemeConfig();

    expect(config.themeKey).toBe('minimal');
    expect(config.homepage.sectionOrder).toContain('banner');
  });
});
