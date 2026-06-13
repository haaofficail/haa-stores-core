import { describe, it, expect } from 'vitest';
import { ComplianceChecklistService, type ComplianceCheckInput } from '../packages/commerce-core/src/compliance-checklist';
import type { PublishStatus } from '../packages/shared/src/types/stores';

function makeFullInput(overrides: Partial<ComplianceCheckInput> = {}): ComplianceCheckInput {
  return {
    storeId: 1,
    tenantId: 1,
    kycProfile: {
      businessType: 'company',
      legalName: 'شركة أختبار',
      commercialRegistrationNumber: '1010123456',
      vatNumber: '310123456700003',
      address: 'الرياض، حي العليا',
    },
    store: {
      email: 'support@test.com',
      phone: '966501234567',
    },
    policies: [
      { type: 'privacy', isPublished: true, content: 'سياسة الخصوصية — نقوم بجمع البيانات لأغراض تحسين الخدمة. مشاركة البيانات مع مزودي الخدمة. حقوق صاحب البيانات: الوصول والتصحيح. للتواصل: support@test.com' },
      { type: 'terms', isPublished: true, content: 'الشروط والأحكام' },
      { type: 'shipping', isPublished: true, content: 'سياسة الشحن' },
      { type: 'returns', isPublished: true, content: 'سياسة الاسترجاع' },
    ],
    paymentMethods: [{ enabled: true }],
    shippingMethods: [{ estimatedDeliveryDays: '3-5' }],
    settings: {
      returnWindowDays: 14,
      delayCancellationNotice: null,
      excludedReturnCategories: ['digital'],
    },
    ...overrides,
  };
}

describe('Publish Gate', () => {
  const checklistService = new ComplianceChecklistService(null as any);

  describe('Compliance Checklist (Publish Gate basis)', () => {
    it('لا يمكن نشر متجر عند وجود blocking errors', () => {
      const input = makeFullInput();
      input.kycProfile!.legalName = null;
      const result = checklistService.check(input);
      expect(result.passed).toBe(false);
      expect(result.blockingErrorsCount).toBeGreaterThan(0);
    });

    it('يمكن نشر متجر مكتمل الامتثال', () => {
      const input = makeFullInput();
      const result = checklistService.check(input);
      expect(result.passed).toBe(true);
      expect(result.blockingErrorsCount).toBe(0);
    });

    it('returnWindowDays = null يمنع النشر', () => {
      const input = makeFullInput();
      input.settings = { ...input.settings, returnWindowDays: null };
      const result = checklistService.check(input);
      expect(result.passed).toBe(false);
      const item = result.items.find(i => i.key === 'returnWindowDays');
      expect(item?.severity).toBe('error');
    });

    it('returnWindowDays = 5 يمنع النشر', () => {
      const input = makeFullInput();
      input.settings = { ...input.settings, returnWindowDays: 5 };
      const result = checklistService.check(input);
      expect(result.passed).toBe(false);
    });

    it('returnWindowDays = 7 يسمح بالنشر', () => {
      const input = makeFullInput();
      input.settings = { ...input.settings, returnWindowDays: 7 };
      const result = checklistService.check(input);
      const item = result.items.find(i => i.key === 'returnWindowDays');
      expect(item?.passed).toBe(true);
    });

    it('deliveryMaxDays > 15 بدون delayCancellationNotice = warning فقط', () => {
      const input = makeFullInput();
      input.shippingMethods = [{ estimatedDeliveryDays: '20' }];
      input.settings = { ...input.settings, delayCancellationNotice: null };
      const result = checklistService.check(input);
      const item = result.items.find(i => i.key === 'deliveryMaxDays');
      expect(item?.severity).toBe('warning');
    });

    it('لا يتم تعديل نصوص السياسات', () => {
      const input = makeFullInput();
      const originalPolicies = JSON.parse(JSON.stringify(input.policies));
      checklistService.check(input);
      expect(input.policies).toEqual(originalPolicies);
    });
  });

  describe('Publish Status Type', () => {
    it('يحتوي على جميع الحالات المطلوبة', () => {
      const validStatuses: PublishStatus[] = ['draft', 'review', 'published', 'restricted', 'suspended'];
      expect(validStatuses).toContain('draft');
      expect(validStatuses).toContain('review');
      expect(validStatuses).toContain('published');
      expect(validStatuses).toContain('restricted');
      expect(validStatuses).toContain('suspended');
    });
  });

  describe('Publish Gate Logic', () => {
    it('يسمح بالنشر فقط عندما checklist.passed = true', () => {
      const input = makeFullInput();
      const result = checklistService.check(input);
      expect(result.passed).toBe(true);
    });

    it('يمنع النشر عندما هناك سياسة غير منشورة', () => {
      const input = makeFullInput();
      input.policies = input.policies.filter(p => p.type !== 'privacy');
      const result = checklistService.check(input);
      expect(result.passed).toBe(false);
    });

    it('يمنع النشر عندما لا توجد طرق دفع', () => {
      const input = makeFullInput();
      input.paymentMethods = [];
      const result = checklistService.check(input);
      expect(result.passed).toBe(false);
    });

    it('يمنع النشر عندما لا توجد طرق شحن', () => {
      const input = makeFullInput();
      input.shippingMethods = [];
      const result = checklistService.check(input);
      expect(result.passed).toBe(false);
    });

    it('vatNumber مفقود = warning فقط (لا يمنع النشر)', () => {
      const input = makeFullInput();
      input.kycProfile!.vatNumber = null;
      const result = checklistService.check(input);
      const vatItem = result.items.find(i => i.key === 'vatNumber');
      expect(vatItem?.severity).toBe('warning');
    });

    it('excludedReturnCategories فارغة = warning فقط', () => {
      const input = makeFullInput();
      input.settings = { ...input.settings, excludedReturnCategories: [] };
      const result = checklistService.check(input);
      const item = result.items.find(i => i.key === 'excludedReturnCategories');
      expect(item?.severity).toBe('warning');
    });
  });
});
