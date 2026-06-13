import { eq } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { ComplianceCheckItem, ComplianceCheckResult, ComplianceSeverity } from '@haa/shared';

const BUSINESS_TYPES_REQUIRING_CR = ['establishment', 'company'];

const PRIVACY_KEYWORDS = {
  dataCollected: ['جمع البيانات', 'البيانات المجمعة', 'نجمع', 'نقوم بجمع', 'data collected', 'we collect'],
  purpose: ['الغرض', 'الأغراض', 'الاستخدام', 'Purpose', 'purpose', 'use of'],
  sharingWithProviders: ['مشاركة', 'مزودي الخدمة', 'الطرف الثالث', 'شركات الشحن', 'بوابات الدفع', 'sharing', 'third party', 'providers'],
  dataSubjectRights: ['الحقوق', 'الوصول', 'التصحيح', 'الحذف', 'الإتلاف', 'الرجوع', 'حقوق صاحب البيانات', 'rights', 'access', 'rectification', 'erasure'],
  contact: ['التواصل', 'البريد الإلكتروني', 'للتواصل', 'اتصل بنا', 'contact', 'email'],
};

function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw.toLowerCase()));
}

function makeItem(
  key: string,
  label: string,
  passed: boolean,
  required: boolean,
  source: ComplianceCheckItem['source'],
  severity: ComplianceSeverity,
  message: string,
): ComplianceCheckItem {
  return { key, label, passed, required, source, severity, message };
}

export interface ComplianceCheckInput {
  storeId: number;
  tenantId: number;
  kycProfile: {
    businessType: string;
    legalName: string | null;
    commercialRegistrationNumber: string | null;
    vatNumber: string | null;
    address: string | null;
  } | null;
  store: {
    email: string | null;
    phone: string | null;
  };
  policies: Array<{
    type: string;
    isPublished: boolean;
    content: string | null;
  }>;
  paymentMethods: Array<{
    enabled: boolean;
  }>;
  shippingMethods: Array<{
    estimatedDeliveryDays: string | null;
  }>;
  settings: {
    returnWindowDays: number | null;
    delayCancellationNotice: string | null;
    excludedReturnCategories: string[] | null;
  };
}

export class ComplianceChecklistService {
  constructor(private db: DbClient = createDbClient()) {}

  async gatherData(storeId: number, tenantId: number): Promise<ComplianceCheckInput> {
    const [kycProfile] = await this.db.select().from(s.kycProfiles)
      .where(eq(s.kycProfiles.storeId, storeId)).limit(1);

    const [store] = await this.db.select().from(s.stores)
      .where(eq(s.stores.id, storeId)).limit(1);

    const policies = await this.db.select().from(s.storePolicies)
      .where(eq(s.storePolicies.storeId, storeId));

    const paymentMethods = await this.db.select().from(s.merchantPaymentProviderSettings)
      .where(eq(s.merchantPaymentProviderSettings.storeId, storeId));

    const shippingMethods = await this.db.select().from(s.shippingMethods)
      .where(eq(s.shippingMethods.storeId, storeId));

    const [storeSettings] = await this.db.select().from(s.storeSettings)
      .where(eq(s.storeSettings.storeId, storeId)).limit(1);

    return {
      storeId,
      tenantId,
      kycProfile: kycProfile ? {
        businessType: kycProfile.businessType,
        legalName: kycProfile.legalName,
        commercialRegistrationNumber: kycProfile.commercialRegistrationNumber,
        vatNumber: kycProfile.vatNumber,
        address: kycProfile.address,
      } : null,
      store: {
        email: store?.email ?? null,
        phone: store?.phone ?? null,
      },
      policies: policies.map(p => ({
        type: p.type,
        isPublished: p.isPublished,
        content: p.content,
      })),
      paymentMethods: paymentMethods.map(pm => ({ enabled: pm.enabled })),
      shippingMethods: shippingMethods.map(sm => ({
        estimatedDeliveryDays: sm.estimatedDeliveryDays,
      })),
      settings: {
        returnWindowDays: null,
        delayCancellationNotice: storeSettings?.pickupInstructions ?? null,
        excludedReturnCategories: null,
      },
    };
  }

  check(input: ComplianceCheckInput): ComplianceCheckResult {
    const items: ComplianceCheckItem[] = [];

    // ── REQUIRED CHECKS (blocking errors) ──────────────

    // 1. legalName
    items.push(makeItem(
      'legalName',
      'الاسم القانوني',
      !!input.kycProfile?.legalName,
      true,
      'kyc',
      'error',
      'يجب إدخال الاسم القانوني قبل النشر',
    ));

    // 2. commercialRegistration (only for establishment/company)
    const needsCr = input.kycProfile
      ? BUSINESS_TYPES_REQUIRING_CR.includes(input.kycProfile.businessType)
      : false;
    if (needsCr) {
      items.push(makeItem(
        'commercialRegistration',
        'السجل التجاري',
        !!input.kycProfile?.commercialRegistrationNumber,
        true,
        'kyc',
        'error',
        'يجب إدخال رقم السجل التجاري قبل النشر',
      ));
    }

    // 3. supportEmail (fallback to store.email)
    const supportEmail = input.store.email;
    items.push(makeItem(
      'supportEmail',
      'بريد الدعم',
      !!supportEmail,
      true,
      'store',
      'error',
      'يجب إدخال بريد الدعم قبل النشر',
    ));

    // 4. supportPhone (fallback to store.phone)
    const supportPhone = input.store.phone;
    items.push(makeItem(
      'supportPhone',
      'هاتف الدعم',
      !!supportPhone,
      true,
      'store',
      'error',
      'يجب إدخال هاتف الدعم قبل النشر',
    ));

    // 5. businessAddress (kycProfile.address OR store fallback)
    const hasAddress = !!(input.kycProfile?.address);
    items.push(makeItem(
      'businessAddress',
      'العنوان التجاري',
      hasAddress,
      true,
      'kyc',
      'error',
      'يجب إدخال العنوان التجاري قبل النشر',
    ));

    // 6. privacyPolicy published
    const privacyPublished = input.policies.some(p => p.type === 'privacy' && p.isPublished);
    items.push(makeItem(
      'privacyPolicy',
      'سياسة الخصوصية',
      privacyPublished,
      true,
      'policies',
      'error',
      'يجب نشر سياسة الخصوصية قبل النشر',
    ));

    // 7. termsPolicy published
    const termsPublished = input.policies.some(p => p.type === 'terms' && p.isPublished);
    items.push(makeItem(
      'termsPolicy',
      'الشروط والأحكام',
      termsPublished,
      true,
      'policies',
      'error',
      'يجب نشر الشروط والأحكام قبل النشر',
    ));

    // 8. shippingPolicy published
    const shippingPublished = input.policies.some(p => p.type === 'shipping' && p.isPublished);
    items.push(makeItem(
      'shippingPolicy',
      'سياسة الشحن',
      shippingPublished,
      true,
      'policies',
      'error',
      'يجب نشر سياسة الشحن قبل النشر',
    ));

    // 9. returnPolicy published
    const returnPublished = input.policies.some(p => p.type === 'returns' && p.isPublished);
    items.push(makeItem(
      'returnPolicy',
      'سياسة الاسترجاع',
      returnPublished,
      true,
      'policies',
      'error',
      'يجب نشر سياسة الاسترجاع قبل النشر',
    ));

    // 10. paymentMethods enabled
    const hasEnabledPayment = input.paymentMethods.some(pm => pm.enabled);
    items.push(makeItem(
      'paymentMethods',
      'طرق الدفع',
      hasEnabledPayment,
      true,
      'payment',
      'error',
      'يجب تفعيل طريقة دفع واحدة على الأقل',
    ));

    // 11. shippingMethods configured
    const hasShipping = input.shippingMethods.length > 0;
    items.push(makeItem(
      'shippingConfig',
      'إعدادات الشحن',
      hasShipping,
      true,
      'shipping',
      'error',
      'يجب إعداد طريقة شحن واحدة على الأقل',
    ));

    // 12. returnWindowDays (must be >= 7, null = error)
    const returnWindowOk = input.settings.returnWindowDays !== null
      && input.settings.returnWindowDays >= 7;
    items.push(makeItem(
      'returnWindowDays',
      'مدة الاسترجاع',
      returnWindowOk,
      true,
      'settings',
      'error',
      'يجب تحديد مدة استرجاع 7 أيام على الأقل وفق نظام التجارة الإلكترونية',
    ));

    // ── WARNING CHECKS (non-blocking) ──────────────────

    // 13. vatNumber
    items.push(makeItem(
      'vatNumber',
      'الرقم الضريبي',
      !!input.kycProfile?.vatNumber,
      false,
      'kyc',
      'warning',
      'يُنصح بإدخال الرقم الضريبي ل_compliance كامل',
    ));

    // 14. deliveryMaxDays > 15 without delayCancellationNotice
    const maxDeliveryDays = input.shippingMethods
      .map(sm => parseInt(sm.estimatedDeliveryDays || '0', 10))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => b - a)[0] || 0;

    const deliveryWarning = maxDeliveryDays > 15 && !input.settings.delayCancellationNotice;
    items.push(makeItem(
      'deliveryMaxDays',
      'مدة التسليم القصوى',
      !deliveryWarning,
      false,
      'shipping',
      'warning',
      'يجب توضيح حق العميل في الإلغاء عند تأخر التسليم لأكثر من 15 يومًا وفق نظام التجارة الإلكترونية',
    ));

    // 15. excludedReturnCategories
    items.push(makeItem(
      'excludedReturnCategories',
      'فئات الاسترجاع المستثناة',
      !!(input.settings.excludedReturnCategories && input.settings.excludedReturnCategories.length > 0),
      false,
      'settings',
      'warning',
      'يُنصح بتحديد فئات المنتجات المستثناة من الاسترجاع',
    ));

    // 16-20. Privacy policy sub-checks (warnings only)
    const privacyPolicy = input.policies.find(p => p.type === 'privacy');
    const privacyContent = privacyPolicy?.content || '';

    items.push(makeItem(
      'privacyDataCollected',
      'ذكر جمع البيانات في السياسة',
      matchesAnyKeyword(privacyContent, PRIVACY_KEYWORDS.dataCollected),
      false,
      'policies',
      'warning',
      'يُنصح بذكر البيانات المجمعة في سياسة الخصوصية وفق متطلبات هيئة حماية البيانات الشخصية',
    ));

    items.push(makeItem(
      'privacyPurpose',
      'ذكر أغراض الاستخدام',
      matchesAnyKeyword(privacyContent, PRIVACY_KEYWORDS.purpose),
      false,
      'policies',
      'warning',
      'يُنصح بذكر أغراض استخدام البيانات في سياسة الخصوصية',
    ));

    items.push(makeItem(
      'privacyDataSharing',
      'مشاركة البيانات مع مزودي الخدمة',
      matchesAnyKeyword(privacyContent, PRIVACY_KEYWORDS.sharingWithProviders),
      false,
      'policies',
      'warning',
      'يُنصح بذكر مشاركة البيانات مع مزودي الخدمة (بوابات الدفع، شركات الشحن) في سياسة الخصوصية',
    ));

    items.push(makeItem(
      'privacyDataSubjectRights',
      'حقوق صاحب البيانات',
      matchesAnyKeyword(privacyContent, PRIVACY_KEYWORDS.dataSubjectRights),
      false,
      'policies',
      'warning',
      'يُنصح بذكر حقوق صاحب البيانات (الوصول، التصحيح، الحذف) وفق نظام حماية البيانات الشخصية',
    ));

    items.push(makeItem(
      'privacyContactEmail',
      'وسيلة التواصل في سياسة الخصوصية',
      matchesAnyKeyword(privacyContent, PRIVACY_KEYWORDS.contact),
      false,
      'policies',
      'warning',
      'يُنصح بإضافة وسيلة تواصل في سياسة الخصوصية لتمكين صاحب البيانات من ممارسة حقوقه',
    ));

    // ── AGGREGATE ──────────────────────────────────────
    const blockingErrorsCount = items.filter(i => i.severity === 'error' && !i.passed).length;
    const warningsCount = items.filter(i => i.severity === 'warning' && !i.passed).length;
    const passed = blockingErrorsCount === 0;

    return {
      passed,
      items,
      blockingErrorsCount,
      warningsCount,
      checkedAt: new Date().toISOString(),
    };
  }

  async run(storeId: number, tenantId: number): Promise<ComplianceCheckResult> {
    const input = await this.gatherData(storeId, tenantId);
    return this.check(input);
  }
}
