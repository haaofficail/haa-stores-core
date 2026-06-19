import { describe, it, expect } from 'vitest';
import { THEMES, getThemeById } from './themes.js';
import type { ThemeColors } from './types.js';

describe('THEMES', () => {
  it('has exactly 5 themes', () => {
    expect(THEMES).toHaveLength(5);
  });

  it('every theme has unique id', () => {
    const ids = THEMES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every theme has nameAr', () => {
    for (const theme of THEMES) {
      expect(theme.nameAr).toBeTruthy();
    }
  });

  it('every theme has descriptionAr', () => {
    for (const theme of THEMES) {
      expect(theme.descriptionAr).toBeTruthy();
    }
  });

  it('every theme has a screenshotUrl', () => {
    for (const theme of THEMES) {
      expect(theme.screenshotUrl).toBeTruthy();
      expect(theme.screenshotUrl).toMatch(/^data:image\/svg/);
    }
  });

  it('every theme has preset matching its id', () => {
    for (const theme of THEMES) {
      expect(theme.config.preset).toBe(theme.id);
    }
  });

  it('every theme has all 12 color fields', () => {
    const keys: Array<keyof ThemeColors> = ['primary', 'surface1', 'surface2', 'surface3', 'textPrimary', 'textSecondary', 'textTertiary', 'border', 'borderHover', 'success', 'warning', 'error'];
    for (const theme of THEMES) {
      for (const key of keys) {
        expect(theme.config.colors[key]).toBeTruthy();
        expect(theme.config.colors[key]).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
    }
  });

  it('every theme has font fields', () => {
    for (const theme of THEMES) {
      expect(theme.config.font.family).toBeTruthy();
      expect(theme.config.font.url).toMatch(/^https:\/\/fonts\.googleapis/);
      expect(theme.config.font.headingsSize).toMatch(/^[\d.]+(px|rem|em)$/);
      expect(theme.config.font.bodySize).toMatch(/^[\d.]+(px|rem|em)$/);
    }
  });

  it('layout has required fields', () => {
    for (const theme of THEMES) {
      expect(theme.config.layout.productCardColumns).toBeGreaterThanOrEqual(2);
      expect(theme.config.layout.productCardColumns).toBeLessThanOrEqual(6);
      expect(['rounded', 'square']).toContain(theme.config.layout.productCardStyle);
      expect(['square', '4:3', '16:9']).toContain(theme.config.layout.imageAspectRatio);
    }
  });

  it('homepage has sectionOrder array', () => {
    for (const theme of THEMES) {
      expect(Array.isArray(theme.config.homepage.sectionOrder)).toBe(true);
      expect(theme.config.homepage.sectionOrder.length).toBeGreaterThan(0);
    }
  });

  it('header has announcementText', () => {
    for (const theme of THEMES) {
      expect(typeof theme.config.header.announcementText).toBe('string');
    }
  });

  it('every theme has categories', () => {
    for (const theme of THEMES) {
      expect(Array.isArray(theme.categories)).toBe(true);
      expect(theme.categories!.length).toBeGreaterThan(0);
    }
  });

  it('featured themes come first', () => {
    const featured = THEMES.filter(t => t.featured);
    const nonFeatured = THEMES.filter(t => !t.featured);
    expect(THEMES.indexOf(featured[0])).toBeLessThan(THEMES.indexOf(nonFeatured[0]));
  });

  it('getThemeById returns correct theme', () => {
    const theme = getThemeById('night');
    expect(theme).toBeDefined();
    expect(theme!.id).toBe('night');
    expect(theme!.nameAr).toBe('ليلي');
  });

  it('getThemeById returns undefined for unknown', () => {
    expect(getThemeById('nonexistent')).toBeUndefined();
  });

  it('minimal is the first theme', () => {
    expect(THEMES[0].id).toBe('minimal');
  });
});
