import { describe, it, expect, beforeEach } from 'vitest';
import { applyTheme, clearTheme, applyStoreTheme, clearStoreTheme, getDefaultThemeConfig } from './isolation';

const MOCK_CONFIG = {
  preset: 'test',
  colors: { primary: '#ff0000', surface1: '#ffffff', surface2: '#f0f0f0', surface3: '#e0e0e0', textPrimary: '#000000', textSecondary: '#666666', textTertiary: '#999999', border: '#cccccc', borderHover: '#aaaaaa', success: '#00ff00', warning: '#ffaa00', error: '#ff0000' },
  font: { family: 'Test Font', url: 'https://fonts.googleapis.com/css2?family=Test:wght@400&display=swap', headingsSize: '2rem', bodySize: '1rem' },
  layout: { productCardColumns: 4, productCardStyle: 'rounded', imageAspectRatio: 'square', showRating: true, showSalesCount: true, showStockBadge: true, showCategory: true, showDiscountBadge: true },
  homepage: { showBanner: true, showCategories: true, showBestSellers: true, showNewArrivals: true, showTodayDeals: true, showTrustBadges: true, showMarketingBanner: true, showFeaturedProducts: true, sectionOrder: ['banner'] },
  header: { showAnnouncementBar: true, announcementText: 'Test', stickyHeader: true, showSearch: true, showCart: true, showAccount: true },
  footer: { showPaymentLogos: true, showSocialLinks: true, showNewsletter: true, companyDescription: '' },
  socialLinks: { instagram: '', twitter: '', tiktok: '', snapchat: '', whatsapp: '' },
  customCss: '.test { color: red; }',
  analytics: { googleTagManagerId: '', googleAnalyticsId: '', facebookPixelId: '' },
};

describe('isolation', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<head></head><body><div id="theme-scope"></div></body>';
  });

  describe('getDefaultThemeConfig', () => {
    it('returns a complete config', () => {
      const config = getDefaultThemeConfig();
      expect(config.preset).toBe('minimal');
      expect(config.colors.primary).toBe('#56a1e3');
      expect(config.font.family).toBe('IBM Plex Sans Arabic');
      expect(config.layout.productCardColumns).toBe(4);
    });
  });

  describe('applyTheme', () => {
    it('sets CSS variables on root', () => {
      applyTheme(MOCK_CONFIG);
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--surface-1')).toBe('#ffffff');
    });

    it('sets CSS variables on #theme-scope', () => {
      applyTheme(MOCK_CONFIG);
      const scope = document.getElementById('theme-scope');
      expect(scope!.style.getPropertyValue('--primary')).toBe('#ff0000');
    });

    it('sets color aliases', () => {
      applyTheme(MOCK_CONFIG);
      expect(document.documentElement.style.getPropertyValue('--color-primary-500')).toBe('#ff0000');
    });

    it('sets primary theme aliases and scale', () => {
      applyTheme(MOCK_CONFIG);
      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--theme-primary-hover')).toBe('#e00000');
      expect(document.documentElement.style.getPropertyValue('--theme-primary-soft')).toBe('#ffebeb');
      expect(document.documentElement.style.getPropertyValue('--theme-primary-foreground')).toBe('#ffffff');
      expect(document.documentElement.style.getPropertyValue('--color-primary-50')).toBe('#fff0f0');
      expect(document.documentElement.style.getPropertyValue('--color-primary-100')).toBe('#ffdbdb');
      expect(document.documentElement.style.getPropertyValue('--color-primary-600')).toBe('#e00000');
      expect(document.documentElement.style.getPropertyValue('--color-primary-700')).toBe('#c20000');
    });

    it('sets status theme aliases', () => {
      applyTheme(MOCK_CONFIG);
      expect(document.documentElement.style.getPropertyValue('--theme-success')).toBe('#00ff00');
      expect(document.documentElement.style.getPropertyValue('--theme-success-soft')).toBe('#e6ffe6');
      expect(document.documentElement.style.getPropertyValue('--theme-success-foreground')).toBe('#ffffff');
      expect(document.documentElement.style.getPropertyValue('--color-success')).toBe('#00ff00');
      expect(document.documentElement.style.getPropertyValue('--theme-warning')).toBe('#ffaa00');
      expect(document.documentElement.style.getPropertyValue('--theme-warning-soft')).toBe('#fff7e6');
      expect(document.documentElement.style.getPropertyValue('--color-warning')).toBe('#ffaa00');
      expect(document.documentElement.style.getPropertyValue('--theme-error')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--theme-error-soft')).toBe('#ffe6e6');
      expect(document.documentElement.style.getPropertyValue('--color-error')).toBe('#ff0000');
    });

    it('falls back safely for invalid status colors', () => {
      applyTheme({
        ...MOCK_CONFIG,
        colors: { ...MOCK_CONFIG.colors, success: 'bad', warning: 'nope', error: 'wat' },
      });
      expect(document.documentElement.style.getPropertyValue('--theme-success')).toBe('#10b981');
      expect(document.documentElement.style.getPropertyValue('--color-success')).toBe('#10b981');
      expect(document.documentElement.style.getPropertyValue('--theme-warning')).toBe('#f59e0b');
      expect(document.documentElement.style.getPropertyValue('--color-warning')).toBe('#f59e0b');
      expect(document.documentElement.style.getPropertyValue('--theme-error')).toBe('#ef4444');
      expect(document.documentElement.style.getPropertyValue('--color-error')).toBe('#ef4444');
    });

    it('does not throw when status colors are missing', () => {
      const { success, warning, error, ...colors } = MOCK_CONFIG.colors;
      expect(() => applyTheme({ ...MOCK_CONFIG, colors } as any)).not.toThrow();
      expect(document.documentElement.style.getPropertyValue('--theme-success')).toBe('#10b981');
      expect(document.documentElement.style.getPropertyValue('--theme-warning')).toBe('#f59e0b');
      expect(document.documentElement.style.getPropertyValue('--theme-error')).toBe('#ef4444');
    });

    it('falls back safely for invalid primary hex', () => {
      applyTheme({ ...MOCK_CONFIG, colors: { ...MOCK_CONFIG.colors, primary: 'not-a-color' } });
      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#56a1e3');
      expect(document.documentElement.style.getPropertyValue('--color-primary-500')).toBe('#56a1e3');
      expect(document.documentElement.style.getPropertyValue('--color-primary-600')).toBe('#4c8ec8');
    });

    it('does not throw when primary is missing', () => {
      const { primary, ...colors } = MOCK_CONFIG.colors;
      expect(() => applyTheme({ ...MOCK_CONFIG, colors } as any)).not.toThrow();
      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('#56a1e3');
    });

    it('adds font link element', () => {
      applyTheme(MOCK_CONFIG);
      const link = document.querySelector('link[data-theme-font]');
      expect(link).toBeTruthy();
      expect(link!.getAttribute('href')).toBe(MOCK_CONFIG.font.url);
    });

    it('injects custom CSS', () => {
      applyTheme(MOCK_CONFIG);
      const style = document.getElementById('haa-custom-css');
      expect(style).toBeTruthy();
      expect(style!.textContent).toContain('.test');
      expect(style!.textContent).toContain('@layer theme-custom');
    });

    it('removes previous custom CSS on re-apply', () => {
      applyTheme(MOCK_CONFIG);
      applyTheme({ ...MOCK_CONFIG, customCss: '.new { color: blue; }' });
      const oldStyle = document.getElementById('haa-custom-css');
      expect(oldStyle!.textContent).not.toContain('.test');
      expect(oldStyle!.textContent).toContain('.new');
    });
  });

  describe('clearTheme', () => {
    it('removes all CSS variables from root', () => {
      applyTheme(MOCK_CONFIG);
      clearTheme();
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--theme-primary')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--color-primary-600')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--theme-success')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--color-success')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--surface-1')).toBe('');
    });

    it('removes CSS variables from scope', () => {
      applyTheme(MOCK_CONFIG);
      clearTheme();
      const scope = document.getElementById('theme-scope');
      expect(scope!.style.getPropertyValue('--primary')).toBe('');
    });

    it('removes font link', () => {
      applyTheme(MOCK_CONFIG);
      clearTheme();
      expect(document.querySelector('link[data-theme-font]')).toBeNull();
    });

    it('removes custom CSS', () => {
      applyTheme(MOCK_CONFIG);
      clearTheme();
      expect(document.getElementById('haa-custom-css')).toBeNull();
    });

    it('does not throw when no theme applied', () => {
      expect(() => clearTheme()).not.toThrow();
    });
  });

  describe('applyStoreTheme (scoped)', () => {
    beforeEach(() => {
      document.documentElement.innerHTML = '<head></head><body><div id="storefront-scope"></div></body>';
    });

    it('does NOT write CSS variables to document.documentElement', () => {
      applyStoreTheme(MOCK_CONFIG);
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--surface-1')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--text-primary')).toBe('');
      expect(document.documentElement.style.getPropertyValue('--color-primary-500')).toBe('');
    });

    it('writes CSS variables to #storefront-scope ONLY', () => {
      applyStoreTheme(MOCK_CONFIG);
      const scope = document.getElementById('storefront-scope');
      expect(scope!.style.getPropertyValue('--primary')).toBe('#ff0000');
      expect(scope!.style.getPropertyValue('--surface-1')).toBe('#ffffff');
      expect(scope!.style.getPropertyValue('--text-primary')).toBe('#000000');
      expect(scope!.style.getPropertyValue('--color-primary-500')).toBe('#ff0000');
      expect(scope!.style.getPropertyValue('--color-success')).toBe('#00ff00');
    });

    it('writes to custom target element when provided', () => {
      const customScope = document.createElement('div');
      customScope.id = 'custom-scope';
      document.body.appendChild(customScope);
      applyStoreTheme(MOCK_CONFIG, customScope);
      expect(customScope.style.getPropertyValue('--primary')).toBe('#ff0000');
      expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    });

    it('does not throw when scope element is missing', () => {
      document.documentElement.innerHTML = '<head></head><body></body>';
      expect(() => applyStoreTheme(MOCK_CONFIG)).not.toThrow();
    });

    it('clears previous theme before applying new one', () => {
      applyStoreTheme(MOCK_CONFIG);
      const newConfig = { ...MOCK_CONFIG, colors: { ...MOCK_CONFIG.colors, primary: '#00ff00', surface1: '#000000' } };
      applyStoreTheme(newConfig);
      const scope = document.getElementById('storefront-scope');
      expect(scope!.style.getPropertyValue('--primary')).toBe('#00ff00');
      expect(scope!.style.getPropertyValue('--surface-1')).toBe('#000000');
    });
  });

  describe('clearStoreTheme (scoped)', () => {
    beforeEach(() => {
      document.documentElement.innerHTML = '<head></head><body><div id="storefront-scope"></div></body>';
    });

    it('removes CSS variables from storefront scope ONLY', () => {
      applyStoreTheme(MOCK_CONFIG);
      clearStoreTheme();
      const scope = document.getElementById('storefront-scope');
      expect(scope!.style.getPropertyValue('--primary')).toBe('');
      expect(scope!.style.getPropertyValue('--surface-1')).toBe('');
    });

    it('does NOT touch document.documentElement variables', () => {
      document.documentElement.style.setProperty('--surface-1', '#ffffff');
      applyStoreTheme(MOCK_CONFIG);
      clearStoreTheme();
      expect(document.documentElement.style.getPropertyValue('--surface-1')).toBe('#ffffff');
    });

    it('removes font link', () => {
      applyStoreTheme(MOCK_CONFIG);
      clearStoreTheme();
      expect(document.querySelector('link[data-theme-font]')).toBeNull();
    });

    it('removes custom CSS', () => {
      applyStoreTheme(MOCK_CONFIG);
      clearStoreTheme();
      expect(document.getElementById('haa-custom-css')).toBeNull();
    });

    it('does not throw when no theme applied', () => {
      expect(() => clearStoreTheme()).not.toThrow();
    });
  });
});
