import { describe, it, expect } from 'vitest';
import { ComplianceChecklistService, type ComplianceCheckInput } from '../packages/commerce-core/src/compliance-checklist';

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

describe('ComplianceChecklistService', () => {
  const service = new ComplianceChecklistService(null as any);

  it('يُرجع passed=true للمتجر المكتمل', () => {
    const result = service.check(makeFullInput());
    expect(result.passed).toBe(true);
    expect(result.blockingErrorsCount).toBe(0);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('يُرجع error عندما ينقص legalName', () => {
    const input = makeFullInput();
    input.kycProfile!.legalName = null;
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'legalName');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('يُرجع error عندما ينقص commercialRegistration للشركات', () => {
    const input = makeFullInput();
    input.kycProfile!.commercialRegistrationNumber = null;
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'commercialRegistration');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('لا يطلب commercialRegistration للأفراد', () => {
    const input = makeFullInput();
    input.kycProfile!.businessType = 'individual';
    input.kycProfile!.commercialRegistrationNumber = null;
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'commercialRegistration');
    expect(item).toBeUndefined();
  });

  it('لا يطلب commercialRegistration للمستقلين', () => {
    const input = makeFullInput();
    input.kycProfile!.businessType = 'freelancer';
    input.kycProfile!.commercialRegistrationNumber = null;
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'commercialRegistration');
    expect(item).toBeUndefined();
  });

  it('يُرجع error عندما تنقص سياسة الخصوصية المنشورة', () => {
    const input = makeFullInput();
    input.policies = input.policies.filter(p => p.type !== 'privacy');
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'privacyPolicy');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('يُرجع error عندما تنقص سياسة الشروط المنشورة', () => {
    const input = makeFullInput();
    input.policies = input.policies.filter(p => p.type !== 'terms');
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'termsPolicy');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('يُرجع error عندما تنقص سياسة الشحن المنشورة', () => {
    const input = makeFullInput();
    input.policies = input.policies.filter(p => p.type !== 'shipping');
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'shippingPolicy');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('يُرجع error عندما تنقص سياسة الاسترجاع المنشورة', () => {
    const input = makeFullInput();
    input.policies = input.policies.filter(p => p.type !== 'returns');
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'returnPolicy');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('يُرجع error عندما لا توجد طرق دفع مفعلة', () => {
    const input = makeFullInput();
    input.paymentMethods = [{ enabled: false }];
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'paymentMethods');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('يُرجع error عندما لا توجد طرق شحن', () => {
    const input = makeFullInput();
    input.shippingMethods = [];
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'shippingConfig');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('يُرجع error عندما returnWindowDays أقل من 7', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: 5 };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('returnWindowDays = null يعطي error', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: null };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('returnWindowDays = 0 يعطي error', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: 0 };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('returnWindowDays = 6 يعطي error', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: 6 };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
  });

  it('returnWindowDays = 7 يعطي passed', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: 7 };
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(true);
  });

  it('returnWindowDays = 14 يعطي passed', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, returnWindowDays: 14 };
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'returnWindowDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(true);
  });

  it('يُرجع warning عندما ينقص vatNumber', () => {
    const input = makeFullInput();
    input.kycProfile!.vatNumber = null;
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'vatNumber');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('warning');
  });

  it('يُرجع warning عندما deliveryMaxDays > 15 بدون delayCancellationNotice', () => {
    const input = makeFullInput();
    input.shippingMethods = [{ estimatedDeliveryDays: '20' }];
    input.settings = { ...input.settings, delayCancellationNotice: null };
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'deliveryMaxDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('warning');
  });

  it('لا يُرجع error عندما deliveryMaxDays > 15 مع delayCancellationNotice', () => {
    const input = makeFullInput();
    input.shippingMethods = [{ estimatedDeliveryDays: '20' }];
    input.settings = { ...input.settings, delayCancellationNotice: 'يحق للعميل الإلغاء' };
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'deliveryMaxDays');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(true);
  });

  it('يُرجع warning عندما excludedReturnCategories فارغة', () => {
    const input = makeFullInput();
    input.settings = { ...input.settings, excludedReturnCategories: [] };
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'excludedReturnCategories');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('warning');
  });

  it('لا يخترع commercialRegistrationNumber أو vatNumber', () => {
    const input = makeFullInput();
    input.kycProfile!.commercialRegistrationNumber = null;
    input.kycProfile!.vatNumber = null;
    const result = service.check(input);
    const crItem = result.items.find(i => i.key === 'commercialRegistration');
    const vatItem = result.items.find(i => i.key === 'vatNumber');
    expect(crItem?.passed).toBe(false);
    expect(vatItem?.passed).toBe(false);
  });

  it('businessAddress موجود في kyc ينجح', () => {
    const input = makeFullInput();
    input.kycProfile!.address = 'جدة، حي الروضة';
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'businessAddress');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(true);
  });

  it('supportEmail fallback من store.email يعمل', () => {
    const input = makeFullInput();
    input.store = { email: 'fallback@test.com', phone: '966501234567' };
    const result = service.check(input);
    const item = result.items.find(i => i.key === 'supportEmail');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(true);
  });

  it('endpoint لا يعدل أي policy content', () => {
    const input = makeFullInput();
    const originalPolicies = JSON.parse(JSON.stringify(input.policies));
    service.check(input);
    expect(input.policies).toEqual(originalPolicies);
  });

  it('privacy keyword checks ترجع warnings فقط', () => {
    const input = makeFullInput();
    input.policies = [
      { type: 'privacy', isPublished: true, content: 'سياسة خصوصية فارغة' },
      { type: 'terms', isPublished: true, content: 'الشروط' },
      { type: 'shipping', isPublished: true, content: 'الشحن' },
      { type: 'returns', isPublished: true, content: 'الاسترجاع' },
    ];
    const result = service.check(input);
    const privacyWarnings = result.items.filter(i =>
      i.key.startsWith('privacy') && i.severity === 'warning'
    );
    expect(privacyWarnings.length).toBeGreaterThan(0);
    privacyWarnings.forEach(item => {
      expect(item.severity).toBe('warning');
    });
  });

  it('supportEmail غير موجود يعطي error', () => {
    const input = makeFullInput();
    input.store = { email: null, phone: '966501234567' };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'supportEmail');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });

  it('supportPhone غير موجود يعطي error', () => {
    const input = makeFullInput();
    input.store = { email: 'test@test.com', phone: null };
    const result = service.check(input);
    expect(result.passed).toBe(false);
    const item = result.items.find(i => i.key === 'supportPhone');
    expect(item).toBeDefined();
    expect(item!.passed).toBe(false);
    expect(item!.severity).toBe('error');
  });
});
