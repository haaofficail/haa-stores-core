import { describe, it, expect } from 'vitest';
import {
  PLATFORM_TERMS, PLATFORM_PRIVACY, PLATFORM_DATA_PROCESSING,
  PLATFORM_PROHIBITED_PRODUCTS, PLATFORM_TAKEDOWN,
  ALL_PLATFORM_LEGAL_DOCUMENTS, getPlatformLegalBySlug, getPlatformLegalById,
  type LegalDocument,
} from '../packages/shared/src/legal/platform-legal';

describe('Platform Legal Documents', () => {
  describe('Documents exist and are complete', () => {
    it('يحتوي على 5 وثائق قانونية', () => {
      expect(ALL_PLATFORM_LEGAL_DOCUMENTS).toHaveLength(5);
    });

    it('كل وثيقة تحتوي id و slug و title و version و effectiveDate و lastUpdated', () => {
      for (const doc of ALL_PLATFORM_LEGAL_DOCUMENTS) {
        expect(doc.id).toBeTruthy();
        expect(doc.slug).toBeTruthy();
        expect(doc.title).toBeTruthy();
        expect(doc.version).toBeTruthy();
        expect(doc.effectiveDate).toBeTruthy();
        expect(doc.lastUpdated).toBeTruthy();
        expect(doc.sections.length).toBeGreaterThan(0);
      }
    });

    it('شروط استخدام المنصة موجودة وصحيحة', () => {
      expect(PLATFORM_TERMS.slug).toBe('terms');
      expect(PLATFORM_TERMS.version).toBe('1.0.0');
      expect(PLATFORM_TERMS.sections.length).toBeGreaterThanOrEqual(5);
    });

    it('سياسة الخصوصية موجودة وصحيحة', () => {
      expect(PLATFORM_PRIVACY.slug).toBe('privacy');
      expect(PLATFORM_PRIVACY.version).toBe('1.0.0');
      expect(PLATFORM_PRIVACY.sections.length).toBeGreaterThanOrEqual(8);
    });

    it('اتفاقية معالجة البيانات موجودة وصحيحة', () => {
      expect(PLATFORM_DATA_PROCESSING.slug).toBe('data-processing');
      expect(PLATFORM_DATA_PROCESSING.version).toBe('1.0.0');
      expect(PLATFORM_DATA_PROCESSING.sections.length).toBeGreaterThanOrEqual(5);
    });

    it('سياسة المنتجات المحظورة موجودة وصحيحة', () => {
      expect(PLATFORM_PROHIBITED_PRODUCTS.slug).toBe('prohibited-products');
      expect(PLATFORM_PROHIBITED_PRODUCTS.version).toBe('1.0.0');
      expect(PLATFORM_PROHIBITED_PRODUCTS.sections.length).toBeGreaterThanOrEqual(4);
    });

    it('سياسة البلاغات والإزالة موجودة وصحيحة', () => {
      expect(PLATFORM_TAKEDOWN.slug).toBe('takedown');
      expect(PLATFORM_TAKEDOWN.version).toBe('1.0.0');
      expect(PLATFORM_TAKEDOWN.sections.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('getPlatformLegalBySlug()', () => {
    it('يعيد الوثيقة الصحيحة حسب slug', () => {
      expect(getPlatformLegalBySlug('terms')).toBe(PLATFORM_TERMS);
      expect(getPlatformLegalBySlug('privacy')).toBe(PLATFORM_PRIVACY);
      expect(getPlatformLegalBySlug('data-processing')).toBe(PLATFORM_DATA_PROCESSING);
      expect(getPlatformLegalBySlug('prohibited-products')).toBe(PLATFORM_PROHIBITED_PRODUCTS);
      expect(getPlatformLegalBySlug('takedown')).toBe(PLATFORM_TAKEDOWN);
    });

    it('يع undefined لـ slug غير موجود', () => {
      expect(getPlatformLegalBySlug('nonexistent')).toBeUndefined();
    });
  });

  describe('getPlatformLegalById()', () => {
    it('يعيد الوثيقة الصحيحة حسب id', () => {
      expect(getPlatformLegalById('platform_terms')).toBe(PLATFORM_TERMS);
      expect(getPlatformLegalById('platform_privacy')).toBe(PLATFORM_PRIVACY);
      expect(getPlatformLegalById('platform_dpa')).toBe(PLATFORM_DATA_PROCESSING);
      expect(getPlatformLegalById('platform_prohibited')).toBe(PLATFORM_PROHIBITED_PRODUCTS);
      expect(getPlatformLegalById('platform_takedown')).toBe(PLATFORM_TAKEDOWN);
    });

    it('يع undefined لـ id غير موجود', () => {
      expect(getPlatformLegalById('nonexistent')).toBeUndefined();
    });
  });

  describe('Content requirements', () => {
    it('شروط الاستخدام توضح أن المنصة ليست بائعًا', () => {
      const termsText = PLATFORM_TERMS.sections.map(s => s.content).join(' ');
      expect(termsText).toContain('لا تُعد بائعًا');
    });

    it('شروط الاستخدام توضح مسؤولية التاجر', () => {
      const termsText = PLATFORM_TERMS.sections.map(s => s.content).join(' ');
      expect(termsText).toContain('التاجر مسؤول');
    });

    it('شروط الاستخدام تذكر حق التعليق والتقييد', () => {
      const termsText = PLATFORM_TERMS.sections.map(s => s.content).join(' ');
      expect(termsText).toContain('تعليق');
    });

    it('سياسة الخصوصية تغطي بيانات التاجر', () => {
      const privacyText = PLATFORM_PRIVACY.sections.map(s => s.title + ' ' + s.content).join(' ');
      expect(privacyText).toContain('بيانات التاجر');
    });

    it('سياسة الخصوصية تذكر حقوق صاحب البيانات', () => {
      const privacyText = PLATFORM_PRIVACY.sections.map(s => s.content).join(' ');
      expect(privacyText).toContain('الوصول');
      expect(privacyText).toContain('حذف');
    });

    it('سياسة الخصوصية تذكر مدة الاحتفاظ', () => {
      const privacyText = PLATFORM_PRIVACY.sections.map(s => s.content).join(' ');
      expect(privacyText).toContain('5 سنوات');
    });

    it('اتفاقية المعالجة توضح دور المنصة كمعالج بيانات', () => {
      const dpaText = PLATFORM_DATA_PROCESSING.sections.map(s => s.content).join(' ');
      expect(dpaText).toContain('معالج البيانات');
    });

    it('اتفاقية المعالجة توضح دور التاجر كمسؤول عن مشروعية الجمع', () => {
      const dpaText = PLATFORM_DATA_PROCESSING.sections.map(s => s.content).join(' ');
      expect(dpaText).toContain('مسؤول عن مشروعية');
    });

    it('اتفاقية المعالجة تذكر البلاغات الأمنية', () => {
      const dpaText = PLATFORM_DATA_PROCESSING.sections.map(s => s.title + ' ' + s.content).join(' ');
      expect(dpaText).toContain('خرق أمني');
    });

    it('سياسة المنتجات المحظورة تذكر المنتجات المقلدة', () => {
      const prohibitedText = PLATFORM_PROHIBITED_PRODUCTS.sections.map(s => s.content).join(' ');
      expect(prohibitedText).toContain('المقلدة');
    });

    it('سياسة المنتجات المحظورة تذكر الأدوية غير المرخصة', () => {
      const prohibitedText = PLATFORM_PROHIBITED_PRODUCTS.sections.map(s => s.content).join(' ');
      expect(prohibitedText).toContain('الأدوية');
    });

    it('سياسة البلاغات تذكر حق التاجر في الرد', () => {
      const takedownText = PLATFORM_TAKEDOWN.sections.map(s => s.title + ' ' + s.content).join(' ');
      expect(takedownText).toContain('للتاجر حق');
    });

    it('سياسة البلاغات تذكر التسجيل في Audit Logs', () => {
      const takedownText = PLATFORM_TAKEDOWN.sections.map(s => s.content).join(' ');
      expect(takedownText).toContain('سجل التدقيق');
    });
  });

  describe('No absolute claims', () => {
    it('لا توجد عبارات "نضمن" بدون قيود', () => {
      for (const doc of ALL_PLATFORM_LEGAL_DOCUMENTS) {
        const fullText = doc.sections.map(s => s.content).join(' ');
        const guaranteeMatches = fullText.match(/نضمن[^.]*\./g);
        if (guaranteeMatches) {
          for (const match of guaranteeMatches) {
            expect(match).toContain('إلا');
          }
        }
      }
    });
  });

  describe('No fake data', () => {
    it('لا تحتوي أرقام سجل تجاري وهمية', () => {
      for (const doc of ALL_PLATFORM_LEGAL_DOCUMENTS) {
        const fullText = doc.sections.map(s => s.content).join(' ');
        expect(fullText).not.toMatch(/10\d{8}/);
      }
    });

    it('لا تحتوي أرقام ضريبية وهمية', () => {
      for (const doc of ALL_PLATFORM_LEGAL_DOCUMENTS) {
        const fullText = doc.sections.map(s => s.content).join(' ');
        expect(fullText).not.toMatch(/3\d{14}3/);
      }
    });
  });

  describe('Integration safety', () => {
    it('لا تعدل سياسات التاجر الحالية', () => {
      const merchantPolicyTypes = ['privacy', 'terms', 'shipping', 'returns', 'about'];
      const platformDocIds = ALL_PLATFORM_LEGAL_DOCUMENTS.map(d => d.id);
      for (const type of merchantPolicyTypes) {
        expect(platformDocIds).not.toContain(type);
      }
    });

    it('لا تنفيذ Merchant Acknowledgement', () => {
      const fullText = ALL_PLATFORM_LEGAL_DOCUMENTS.map(d => d.sections.map(s => s.content).join(' ')).join(' ');
      expect(fullText).not.toContain('Merchant Acknowledgement');
      expect(fullText).not.toContain('إقرار التاجر');
    });

    it('الصفحات مستقلة عن الثيمات', () => {
      for (const doc of ALL_PLATFORM_LEGAL_DOCUMENTS) {
        expect(doc.id).not.toContain('theme');
        expect(doc.slug).not.toContain('theme');
      }
    });
  });
});
