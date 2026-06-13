import { type ThemeConfig } from './types';
import { getAllThemeManifests, isKnownThemeKey } from './themeRegistry.js';

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;
const FONT_SIZE_RE = /^[\d.]+(px|rem|em|%)$/;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function checkHex(val: unknown, label: string): string | null {
  if (typeof val !== 'string' || !HEX_RE.test(val))
    return `${label}: يجب أن يكون لوناً صحيحاً (hex)`;
  return null;
}

function checkString(val: unknown, label: string): string | null {
  if (typeof val !== 'string') return `${label}: يجب أن يكون نصاً`;
  return null;
}

function checkBool(val: unknown, label: string): string | null {
  if (typeof val !== 'boolean') return `${label}: يجب أن يكون true/false`;
  return null;
}

function checkNumber(val: unknown, label: string, min?: number, max?: number): string | null {
  if (typeof val !== 'number' || isNaN(val)) return `${label}: يجب أن يكون رقماً`;
  if (min !== undefined && val < min) return `${label}: أقل قيمة ${min}`;
  if (max !== undefined && val > max) return `${label}: أكبر قيمة ${max}`;
  return null;
}

const DANGEROUS_CSS_PATTERNS = [
  { re: /<script[\s>]/i, msg: 'يحتوي على وسم Script' },
  { re: /javascript\s*:/i, msg: 'يحتوي على Javascript protocol' },
  { re: /on\w+\s*[=:]/, msg: 'يحتوي على معالج أحداث (event handler)' },
  { re: /expression\s*\(/i, msg: 'يحتوي على CSS expression' },
  { re: /@import\s+/i, msg: 'يحتوي على @import (يمنع تحميل موارد خارجية)' },
  { re: /url\s*\(/i, msg: 'يحتوي على url() (يمنع تحميل موارد خارجية)' },
  { re: /behavior\s*:/i, msg: 'يحتوي على behavior (IE-only, خطير)' },
  { re: /-moz-binding\s*:/i, msg: 'يحتوي على -moz-binding (قديم, خطير)' },
];

function checkCSS(css: unknown): string | null {
  if (typeof css !== 'string') return null;
  for (const { re, msg } of DANGEROUS_CSS_PATTERNS) {
    if (re.test(css)) return `CSS المخصص ${msg}`;
  }
  return null;
}

export function validateThemeConfig(config: Partial<ThemeConfig>): ValidationResult {
  const errors: string[] = [];

  const requestedThemeKey = config.themeKey ?? config.preset;
  if (requestedThemeKey !== undefined && !isKnownThemeKey(requestedThemeKey)) {
    errors.push('themeKey: ثيم غير معروف، سيتم استخدام الثيم الافتراضي');
  }

  const manifests = getAllThemeManifests();
  for (const manifest of manifests) {
    if (!manifest.supportsRTL) {
      errors.push(`manifest.${manifest.themeKey}.supportsRTL: يجب تحديد دعم RTL للثيمات الحالية`);
    }
    if (!manifest.supportedPages.length) {
      errors.push(`manifest.${manifest.themeKey}.supportedPages: يجب تحديد الصفحات المدعومة`);
    }
  }

  if (config.colors) {
    for (const [key, val] of Object.entries(config.colors)) {
      const err = checkHex(val, `colors.${key}`);
      if (err) errors.push(err);
    }
  }

  if (config.font) {
    const f = config.font;
    const fontNameErr = checkString(f.family, 'font.family');
    if (fontNameErr) errors.push(fontNameErr);
    if (f.url && typeof f.url === 'string' && !f.url.startsWith('https://fonts.googleapis.com')) {
      errors.push('font.url: يجب أن يكون رابط Google Fonts');
    }
    if (f.headingsSize && !FONT_SIZE_RE.test(f.headingsSize))
      errors.push('font.headingsSize: صيغة غير صحيحة (مثال: 1.5rem)');
    if (f.bodySize && !FONT_SIZE_RE.test(f.bodySize))
      errors.push('font.bodySize: صيغة غير صحيحة (مثال: 1rem)');
  }

  if (config.layout) {
    const l = config.layout;
    const colErr = checkNumber(l.productCardColumns, 'layout.productCardColumns', 2, 6);
    if (colErr) errors.push(colErr);
    if (l.productCardStyle && !['rounded', 'square'].includes(l.productCardStyle))
      errors.push('layout.productCardStyle: يجب أن يكون rounded أو square');
    if (l.imageAspectRatio && !['square', '4:3', '16:9'].includes(l.imageAspectRatio))
      errors.push('layout.imageAspectRatio: يجب أن يكون square, 4:3 أو 16:9');
    const catErr = checkNumber(l.categoryCardSize, 'layout.categoryCardSize', 1, 5);
    if (catErr) errors.push(catErr);
    const bools = ['showRating', 'showSalesCount', 'showStockBadge', 'showCategory', 'showDiscountBadge', 'showCountdown'] as const;
    for (const key of bools) {
      if (l[key] !== undefined) {
        const err = checkBool(l[key], `layout.${key}`);
        if (err) errors.push(err);
      }
    }
  }

  if (config.homepage) {
    const h = config.homepage;
    if ((h as any).sectionOrder !== undefined && !Array.isArray((h as any).sectionOrder)) {
      errors.push('homepage.sectionOrder: يجب أن يكون مصفوفة');
    }
    if (Array.isArray((h as any).sectionOrder)) {
      (h as any).sectionOrder.forEach((item: unknown, i: number) => {
        if (typeof item !== 'string') errors.push(`homepage.sectionOrder[${i}]: يجب أن يكون نصاً`);
      });
    }
    if (Array.isArray(h.sections)) {
      h.sections.forEach((s: any, i: number) => {
        if (typeof s.id !== 'string') errors.push(`homepage.sections[${i}].id: يجب أن يكون نصاً`);
        if (s.enabled !== undefined && typeof s.enabled !== 'boolean') errors.push(`homepage.sections[${i}].enabled: يجب أن يكون true/false`);
        if (s.title && typeof s.title !== 'string') errors.push(`homepage.sections[${i}].title: يجب أن يكون نصاً`);
      });
    }
  }

  if (config.header) {
    const h = config.header;
    const bools = ['showAnnouncementBar', 'stickyHeader', 'showSearch', 'showCart', 'showAccount'] as const;
    for (const key of bools) {
      if (h[key] !== undefined) {
        const err = checkBool(h[key], `header.${key}`);
        if (err) errors.push(err);
      }
    }
  }

  if (config.footer) {
    const f = config.footer;
    const bools = ['showPaymentLogos', 'showSocialLinks', 'showNewsletter'] as const;
    for (const key of bools) {
      if (f[key] !== undefined) {
        const err = checkBool(f[key], `footer.${key}`);
        if (err) errors.push(err);
      }
    }
  }

  if (config.socialLinks) {
    for (const [key, val] of Object.entries(config.socialLinks)) {
      if (val !== undefined && typeof val !== 'string')
        errors.push(`socialLinks.${key}: يجب أن يكون نصاً`);
    }
  }

  if (config.customCss !== undefined) {
    const cssErr = checkCSS(config.customCss);
    if (cssErr) errors.push(cssErr);
  }

  if (config.analytics) {
    const a = config.analytics;
    if (a.googleTagManagerId && typeof a.googleTagManagerId !== 'string')
      errors.push('analytics.googleTagManagerId: يجب أن يكون نصاً');
    if (a.googleAnalyticsId && typeof a.googleAnalyticsId !== 'string')
      errors.push('analytics.googleAnalyticsId: يجب أن يكون نصاً');
    if (a.facebookPixelId && typeof a.facebookPixelId !== 'string')
      errors.push('analytics.facebookPixelId: يجب أن يكون نصاً');
  }

  if (config.trustBadges) {
    const tb = config.trustBadges;
    const badgeKeys = ['businessPlatform', 'commercialRegistration', 'unifiedQr', 'maroof', 'saudiMade', 'vat'] as const;
    for (const key of badgeKeys) {
      const badge = tb[key];
      if (!badge || typeof badge !== 'object') {
        errors.push(`trustBadges.${key}: يجب أن يكون كائناً`);
        continue;
      }
      if (badge.enabled !== undefined) {
        const err = checkBool(badge.enabled, `trustBadges.${key}.enabled`);
        if (err) errors.push(err);
      }
      if (badge.acceptedTerms !== undefined) {
        const err = checkBool(badge.acceptedTerms, `trustBadges.${key}.acceptedTerms`);
        if (err) errors.push(err);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
