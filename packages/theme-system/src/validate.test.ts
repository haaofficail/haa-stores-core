import { describe, it, expect } from 'vitest';
import { validateThemeConfig } from './validate';
import type { ThemeConfig } from './types';

const validConfig: Partial<ThemeConfig> = {
  colors: {
    primary: '#2563eb', surface1: '#ffffff', surface2: '#f8f9fa', surface3: '#f1f3f5',
    textPrimary: '#1a1a1a', textSecondary: '#6b7280', textTertiary: '#9ca3af',
    border: '#e5e7eb', borderHover: '#d1d5db', success: '#10b981', warning: '#f59e0b', error: '#ef4444',
  },
  font: {
    family: 'IBM Plex Sans Arabic',
    url: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap',
    headingsSize: '1.5rem', bodySize: '1rem',
  },
  layout: {
    productCardColumns: 4, productCardStyle: 'rounded', imageAspectRatio: 'square',
    showRating: true, showSalesCount: true, showStockBadge: true, showCategory: true, showDiscountBadge: true,
    showCountdown: true, categoryCardSize: 3,
  },
};

describe('validateThemeConfig', () => {
  it('passes valid config', () => {
    const result = validateThemeConfig(validConfig);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts known preset and themeKey', () => {
    expect(validateThemeConfig({ preset: 'minimal' }).valid).toBe(true);
    expect(validateThemeConfig({ themeKey: 'night' }).valid).toBe(true);
  });

  it('rejects unknown preset and themeKey', () => {
    expect(validateThemeConfig({ preset: 'old-theme' }).valid).toBe(false);
    expect(validateThemeConfig({ themeKey: 'old-theme' }).valid).toBe(false);
  });

  it('rejects invalid hex color', () => {
    const result = validateThemeConfig({ colors: { ...validConfig.colors, primary: 'red' } });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('colors.primary');
  });

  it('rejects missing hash hex', () => {
    const result = validateThemeConfig({ colors: { ...validConfig.colors, surface1: 'ffffff' } });
    expect(result.valid).toBe(false);
  });

  it('rejects short hex', () => {
    const result = validateThemeConfig({ colors: { ...validConfig.colors, primary: '#ff' } });
    expect(result.valid).toBe(false);
  });

  it('accepts hex with alpha', () => {
    const result = validateThemeConfig({ colors: { ...validConfig.colors, primary: '#2563eb80' } });
    expect(result.valid).toBe(true);
  });

  it('rejects non-string color value', () => {
    const result = validateThemeConfig({ colors: { ...validConfig.colors, primary: 123 as any } });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid font family type', () => {
    const result = validateThemeConfig({ font: { family: 123 as any, url: '', headingsSize: '1rem', bodySize: '0.875rem' } });
    expect(result.valid).toBe(false);
  });

  it('rejects non-Google Fonts URL', () => {
    const result = validateThemeConfig({ font: { ...validConfig.font, url: 'https://evil.com/font.css' } });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('font.url');
  });

  it('accepts empty font URL', () => {
    const result = validateThemeConfig({ font: { ...validConfig.font!, url: undefined } as Partial<ThemeConfig>['font'] });
    expect(result.valid).toBe(true);
  });

  it('rejects font size without unit', () => {
    const result = validateThemeConfig({ font: { ...validConfig.font, headingsSize: '20' } });
    expect(result.valid).toBe(false);
  });

  it('rejects font size with invalid unit', () => {
    const result = validateThemeConfig({ font: { ...validConfig.font, bodySize: '20px' } });
    expect(result.valid).toBe(true); // px is valid
  });

  it('rejects columns below 2', () => {
    const result = validateThemeConfig({ layout: { ...validConfig.layout, productCardColumns: 1 } });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('layout.productCardColumns');
  });

  it('rejects columns above 6', () => {
    const result = validateThemeConfig({ layout: { ...validConfig.layout, productCardColumns: 10 } });
    expect(result.valid).toBe(false);
  });

  it('accepts valid column counts (2-6)', () => {
    for (const n of [2, 3, 4, 5, 6]) {
      const result = validateThemeConfig({ layout: { ...validConfig.layout, productCardColumns: n } });
      expect(result.valid).toBe(true);
    }
  });

  it('rejects invalid card style', () => {
    const result = validateThemeConfig({ layout: { ...validConfig.layout, productCardStyle: 'hexagonal' } });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid image ratio', () => {
    const result = validateThemeConfig({ layout: { ...validConfig.layout, imageAspectRatio: '21:9' } });
    expect(result.valid).toBe(false);
  });

  it('rejects non-boolean toggle in layout', () => {
    const result = validateThemeConfig({ layout: { ...validConfig.layout, showRating: 'yes' as any } });
    expect(result.valid).toBe(false);
  });

  it('detects dangerous CSS (script tag)', () => {
    const result = validateThemeConfig({ customCss: '<script>alert(1)</script>' });
    expect(result.valid).toBe(false);
  });

  it('detects dangerous CSS (javascript:)', () => {
    const result = validateThemeConfig({ customCss: 'a { background: url(javascript:alert(1)) }' });
    expect(result.valid).toBe(false);
  });

  it('detects dangerous CSS (onclick)', () => {
    const result = validateThemeConfig({ customCss: 'div { onclick: alert(1) }' });
    expect(result.valid).toBe(false);
  });

  it('allows safe custom CSS', () => {
    const result = validateThemeConfig({ customCss: '.my-class { color: red; background: blue; }' });
    expect(result.valid).toBe(true);
  });

  it('rejects non-string social link', () => {
    const result = validateThemeConfig({ socialLinks: { instagram: 123 as any } as Partial<ThemeConfig>['socialLinks'] });
    expect(result.valid).toBe(false);
  });

  it('allows empty config (partial update)', () => {
    const result = validateThemeConfig({});
    expect(result.valid).toBe(true);
  });

  it('rejects invalid GTM ID type', () => {
    const result = validateThemeConfig({ analytics: { googleTagManagerId: 123 as any } as Partial<ThemeConfig>['analytics'] });
    expect(result.valid).toBe(false);
  });

  it('rejects non-array sectionOrder', () => {
    const result = validateThemeConfig({ homepage: { sectionOrder: 'banner' as any } as Partial<ThemeConfig>['homepage'] });
    expect(result.valid).toBe(false);
  });

  it('handles full ThemeConfig pass', () => {
    const full = {
      ...validConfig,
      homepage: { showBanner: true, showCategories: true, showBestSellers: false, showNewArrivals: true, showTodayDeals: true, showTrustBadges: true, showMarketingBanner: true, showFeaturedProducts: true, sectionOrder: ['banner', 'trust'] },
      header: { showAnnouncementBar: true, announcementText: 'مرحباً', stickyHeader: true, showSearch: true, showCart: true, showAccount: true },
      footer: { showPaymentLogos: true, showSocialLinks: true, showNewsletter: false, companyDescription: '' },
      socialLinks: { instagram: '', twitter: '', tiktok: '', snapchat: '', whatsapp: '' },
      customCss: '',
      analytics: { googleTagManagerId: '', googleAnalyticsId: '', facebookPixelId: '' },
      trustBadges: {
        businessPlatform: { enabled: false, verificationNumber: '', verificationUrl: '', acceptedTerms: false },
        commercialRegistration: { enabled: false, crNumber: '', verificationUrl: '', acceptedTerms: false },
        unifiedQr: { enabled: false, qrImageUrl: '', qrTargetUrl: '', acceptedTerms: false },
        maroof: { enabled: false, maroofNumber: '', verificationUrl: '', acceptedTerms: false, legacy: true as const },
        saudiMade: { enabled: false, membershipNumber: '', verificationUrl: '', acceptedTerms: false, officialAssetUrl: '', memberConfirmed: false },
        vat: { enabled: false, vatNumber: '', verificationUrl: '', acceptedTerms: false },
      },
    };
    expect(validateThemeConfig(full).valid).toBe(true);
  });
});
