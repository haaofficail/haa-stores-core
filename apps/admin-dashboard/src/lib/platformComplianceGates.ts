export type TenantCompliance = {
  id: number;
  name: string;
  slug: string;
  commercialRegistrationNumber: string | null;
  commercialRegistrationIssuedAt: string | null;
  vatNumber: string | null;
  vatRegisteredAt: string | null;
  ecommerceLicenseNumber: string | null;
  ecommerceLicenseIssuedAt: string | null;
  ecommerceLicenseExpiresAt: string | null;
  dpoEmail: string | null;
  dpoPhone: string | null;
  dpoAppointedAt: string | null;
  trademarkNumber: string | null;
  trademarkRegisteredAt: string | null;
  trademarkExpiresAt: string | null;
  asvLastScanAt: string | null;
  asvVendor: string | null;
  asvCertificateUrl: string | null;
  pentestLastScanAt: string | null;
  pentestVendor: string | null;
  pentestReportUrl: string | null;
  pentestPass: boolean | null;
  hostingRegion: string | null;
  hostingProvider: string | null;
  hostingKsaResidency: boolean;
  tabbyDpaSignedAt: string | null;
  tabbyDpaUrl: string | null;
  drPlanDocumentedAt: string | null;
  drLastTabletopAt: string | null;
  drNextTabletopAt: string | null;
};

export type PlatformComplianceGroup = 'registrations' | 'people' | 'security' | 'infrastructure';
export type PlatformComplianceStatus = 'complete' | 'missing' | 'stale' | 'expired' | 'needs_review';

export type PlatformComplianceItem = {
  code: 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8' | 'G9' | 'G10';
  titleAr: string;
  titleEn: string;
  group: PlatformComplianceGroup;
  description: string;
};

export type PlatformComplianceEvaluation = {
  status: PlatformComplianceStatus;
  valueLabel: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const PLATFORM_COMPLIANCE_ITEMS: PlatformComplianceItem[] = [
  { code: 'G1', titleAr: 'السجل التجاري', titleEn: 'Commercial Registration', group: 'registrations', description: 'شهادة تسجيل وزارة التجارة مع تاريخ إصدار قابل للمراجعة' },
  { code: 'G2', titleAr: 'ضريبة القيمة المضافة', titleEn: 'VAT Registration', group: 'registrations', description: 'شهادة تسجيل ضريبي من زاتكا وتاريخ التسجيل' },
  { code: 'G3', titleAr: 'رخصة التجارة الإلكترونية', titleEn: 'E-Commerce License', group: 'registrations', description: 'رخصة MoCI للتجارة الإلكترونية مع تاريخ انتهاء' },
  { code: 'G5', titleAr: 'العلامة التجارية', titleEn: 'Trademark Registration', group: 'registrations', description: 'شهادة SAIP لتسجيل العلامة مع تاريخ انتهاء' },
  { code: 'G4', titleAr: 'مسؤول حماية البيانات', titleEn: 'Data Protection Officer', group: 'people', description: 'المادة 22 من نظام حماية البيانات الشخصية: بريد وتاريخ تعيين' },
  { code: 'G6', titleAr: 'فحص PCI-DSS الربع سنوي', titleEn: 'PCI-DSS ASV Scan', group: 'security', description: 'فحص ASV حديث مع جهة الفحص وشهادة، لا يكفي الرابط وحده' },
  { code: 'G7', titleAr: 'اختبار الاختراق', titleEn: 'Penetration Test', group: 'security', description: 'اختبار سنوي بجهة اختبار ونتيجة اجتياز، لا يكفي رابط التقرير وحده' },
  { code: 'G9', titleAr: 'اتفاقية بيانات تابي', titleEn: 'Tabby DPA', group: 'security', description: 'عقد معالجة بيانات عابر للحدود مع تاريخ توقيع' },
  { code: 'G8', titleAr: 'قرار الاستضافة السعودية', titleEn: 'KSA Hosting Decision', group: 'infrastructure', description: 'سيادة البيانات: منطقة الاستضافة، المزود، وتأكيد الإقامة داخل السعودية' },
  { code: 'G10', titleAr: 'خطة التعافي من الكوارث', titleEn: 'Disaster Recovery Plan', group: 'infrastructure', description: 'خطة DR موثقة مع تمرين tabletop حديث أو مجدول' },
];

export const PLATFORM_GROUP_LABELS: Record<PlatformComplianceGroup, string> = {
  registrations: 'التسجيلات الحكومية',
  people: 'الأشخاص المعينون',
  security: 'الأمن والاختبارات',
  infrastructure: 'البنية التحتية',
};

export const PLATFORM_GROUP_ORDER: PlatformComplianceGroup[] = ['registrations', 'people', 'security', 'infrastructure'];

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isExpired(value: string | null | undefined, now: Date): boolean {
  const date = parseDate(value);
  return Boolean(date && date.getTime() < now.getTime());
}

function isOlderThan(value: string | null | undefined, days: number, now: Date): boolean {
  const date = parseDate(value);
  if (!date) return false;
  return now.getTime() - date.getTime() > days * DAY_MS;
}

function isWithin(value: string | null | undefined, days: number, now: Date): boolean {
  const date = parseDate(value);
  if (!date) return false;
  const diff = date.getTime() - now.getTime();
  return diff >= 0 && diff <= days * DAY_MS;
}

function formatDate(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: '2-digit' });
}

function combine(...parts: Array<string | null | undefined>): string {
  const clean = parts.map((part) => part?.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join(' · ') : 'غير مكتمل';
}

export function evaluatePlatformComplianceGate(
  item: PlatformComplianceItem,
  tenant: TenantCompliance,
  now: Date = new Date(),
): PlatformComplianceEvaluation {
  switch (item.code) {
    case 'G1': {
      if (!hasText(tenant.commercialRegistrationNumber)) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!parseDate(tenant.commercialRegistrationIssuedAt)) {
        return { status: 'needs_review', valueLabel: combine(tenant.commercialRegistrationNumber, 'تاريخ الإصدار مفقود') };
      }
      return { status: 'complete', valueLabel: combine(tenant.commercialRegistrationNumber, formatDate(tenant.commercialRegistrationIssuedAt)) };
    }
    case 'G2': {
      if (!hasText(tenant.vatNumber)) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!parseDate(tenant.vatRegisteredAt)) return { status: 'needs_review', valueLabel: combine(tenant.vatNumber, 'تاريخ التسجيل مفقود') };
      return { status: 'complete', valueLabel: combine(tenant.vatNumber, formatDate(tenant.vatRegisteredAt)) };
    }
    case 'G3': {
      if (!hasText(tenant.ecommerceLicenseNumber)) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (isExpired(tenant.ecommerceLicenseExpiresAt, now)) {
        return { status: 'expired', valueLabel: combine(tenant.ecommerceLicenseNumber, formatDate(tenant.ecommerceLicenseExpiresAt)) };
      }
      if (!parseDate(tenant.ecommerceLicenseIssuedAt) || !parseDate(tenant.ecommerceLicenseExpiresAt)) {
        return { status: 'needs_review', valueLabel: combine(tenant.ecommerceLicenseNumber, 'تواريخ الرخصة ناقصة') };
      }
      if (isWithin(tenant.ecommerceLicenseExpiresAt, 30, now)) {
        return { status: 'stale', valueLabel: combine(tenant.ecommerceLicenseNumber, `ينتهي ${formatDate(tenant.ecommerceLicenseExpiresAt)}`) };
      }
      return { status: 'complete', valueLabel: combine(tenant.ecommerceLicenseNumber, formatDate(tenant.ecommerceLicenseExpiresAt)) };
    }
    case 'G4': {
      if (!hasText(tenant.dpoEmail)) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!parseDate(tenant.dpoAppointedAt)) return { status: 'needs_review', valueLabel: combine(tenant.dpoEmail, 'تاريخ التعيين مفقود') };
      return { status: 'complete', valueLabel: combine(tenant.dpoEmail, formatDate(tenant.dpoAppointedAt)) };
    }
    case 'G5': {
      if (!hasText(tenant.trademarkNumber)) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (isExpired(tenant.trademarkExpiresAt, now)) {
        return { status: 'expired', valueLabel: combine(tenant.trademarkNumber, formatDate(tenant.trademarkExpiresAt)) };
      }
      if (!parseDate(tenant.trademarkRegisteredAt) || !parseDate(tenant.trademarkExpiresAt)) {
        return { status: 'needs_review', valueLabel: combine(tenant.trademarkNumber, 'تواريخ العلامة ناقصة') };
      }
      if (isWithin(tenant.trademarkExpiresAt, 30, now)) {
        return { status: 'stale', valueLabel: combine(tenant.trademarkNumber, `ينتهي ${formatDate(tenant.trademarkExpiresAt)}`) };
      }
      return { status: 'complete', valueLabel: combine(tenant.trademarkNumber, formatDate(tenant.trademarkExpiresAt)) };
    }
    case 'G6': {
      const hasAnyAsvEvidence = hasText(tenant.asvCertificateUrl) || hasText(tenant.asvVendor) || parseDate(tenant.asvLastScanAt);
      if (!hasAnyAsvEvidence) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!hasText(tenant.asvCertificateUrl) || !hasText(tenant.asvVendor) || !parseDate(tenant.asvLastScanAt)) {
        return { status: 'needs_review', valueLabel: combine(tenant.asvVendor, formatDate(tenant.asvLastScanAt), 'دليل ASV غير مكتمل') };
      }
      if (isOlderThan(tenant.asvLastScanAt, 90, now)) {
        return { status: 'stale', valueLabel: combine(tenant.asvVendor, `آخر فحص ${formatDate(tenant.asvLastScanAt)}`) };
      }
      return { status: 'complete', valueLabel: combine(tenant.asvVendor, formatDate(tenant.asvLastScanAt)) };
    }
    case 'G7': {
      const hasAnyPentestEvidence = hasText(tenant.pentestReportUrl) || hasText(tenant.pentestVendor) || parseDate(tenant.pentestLastScanAt) || tenant.pentestPass !== null;
      if (!hasAnyPentestEvidence) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!hasText(tenant.pentestReportUrl) || !hasText(tenant.pentestVendor) || !parseDate(tenant.pentestLastScanAt) || tenant.pentestPass !== true) {
        return { status: 'needs_review', valueLabel: combine(tenant.pentestVendor, formatDate(tenant.pentestLastScanAt), tenant.pentestPass === false ? 'لم يجتز' : 'نتيجة الاجتياز غير مثبتة') };
      }
      if (isOlderThan(tenant.pentestLastScanAt, 365, now)) {
        return { status: 'stale', valueLabel: combine(tenant.pentestVendor, `آخر اختبار ${formatDate(tenant.pentestLastScanAt)}`) };
      }
      return { status: 'complete', valueLabel: combine(tenant.pentestVendor, formatDate(tenant.pentestLastScanAt)) };
    }
    case 'G8': {
      const hasLocationEvidence = hasText(tenant.hostingRegion) || hasText(tenant.hostingProvider) || tenant.hostingKsaResidency === true;
      if (!hasLocationEvidence) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (tenant.hostingKsaResidency !== true || !hasText(tenant.hostingRegion) || !hasText(tenant.hostingProvider)) {
        return { status: 'needs_review', valueLabel: combine(tenant.hostingProvider, tenant.hostingRegion, tenant.hostingKsaResidency ? 'إقامة مؤكدة' : 'إقامة البيانات غير مؤكدة') };
      }
      return { status: 'complete', valueLabel: combine(tenant.hostingProvider, tenant.hostingRegion, 'إقامة داخل السعودية') };
    }
    case 'G9': {
      const hasAnyDpaEvidence = hasText(tenant.tabbyDpaUrl) || parseDate(tenant.tabbyDpaSignedAt);
      if (!hasAnyDpaEvidence) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!hasText(tenant.tabbyDpaUrl) || !parseDate(tenant.tabbyDpaSignedAt)) {
        return { status: 'needs_review', valueLabel: combine(formatDate(tenant.tabbyDpaSignedAt), 'عقد DPA غير مكتمل') };
      }
      return { status: 'complete', valueLabel: combine('موقع', formatDate(tenant.tabbyDpaSignedAt)) };
    }
    case 'G10': {
      const hasAnyDrEvidence = parseDate(tenant.drPlanDocumentedAt) || parseDate(tenant.drLastTabletopAt) || parseDate(tenant.drNextTabletopAt);
      if (!hasAnyDrEvidence) return { status: 'missing', valueLabel: 'غير مكتمل' };
      if (!parseDate(tenant.drPlanDocumentedAt) || !parseDate(tenant.drLastTabletopAt)) {
        return { status: 'needs_review', valueLabel: combine(formatDate(tenant.drPlanDocumentedAt), formatDate(tenant.drLastTabletopAt), 'أدلة DR ناقصة') };
      }
      if (isOlderThan(tenant.drLastTabletopAt, 365, now) || isExpired(tenant.drNextTabletopAt, now)) {
        return { status: 'stale', valueLabel: combine(`آخر تمرين ${formatDate(tenant.drLastTabletopAt)}`, `القادم ${formatDate(tenant.drNextTabletopAt)}`) };
      }
      return { status: 'complete', valueLabel: combine(`الخطة ${formatDate(tenant.drPlanDocumentedAt)}`, `آخر تمرين ${formatDate(tenant.drLastTabletopAt)}`) };
    }
  }
}

export function summarizeTenantCompliance(tenant: TenantCompliance, now: Date = new Date()) {
  const evaluations = PLATFORM_COMPLIANCE_ITEMS.map((item) => evaluatePlatformComplianceGate(item, tenant, now));
  const completeSlots = evaluations.filter((evaluation) => evaluation.status === 'complete').length;
  const issueCount = evaluations.filter((evaluation) => ['expired', 'stale', 'needs_review'].includes(evaluation.status)).length;

  return {
    totalSlots: PLATFORM_COMPLIANCE_ITEMS.length,
    completeSlots,
    issueCount,
    percent: Math.round((completeSlots / PLATFORM_COMPLIANCE_ITEMS.length) * 100),
  };
}

export function summarizePlatformCompliance(tenants: TenantCompliance[], now: Date = new Date()) {
  const evaluations = tenants.flatMap((tenant) => PLATFORM_COMPLIANCE_ITEMS.map((item) => evaluatePlatformComplianceGate(item, tenant, now)));
  const totalSlots = tenants.length * PLATFORM_COMPLIANCE_ITEMS.length;
  const completeSlots = evaluations.filter((evaluation) => evaluation.status === 'complete').length;
  const expiredCount = evaluations.filter((evaluation) => evaluation.status === 'expired').length;
  const staleCount = evaluations.filter((evaluation) => evaluation.status === 'stale').length;
  const needsReviewCount = evaluations.filter((evaluation) => evaluation.status === 'needs_review').length;

  return {
    totalSlots,
    completeSlots,
    expiredCount,
    staleCount,
    needsReviewCount,
    issueCount: expiredCount + staleCount + needsReviewCount,
    overallPct: totalSlots > 0 ? Math.round((completeSlots / totalSlots) * 100) : 0,
  };
}
