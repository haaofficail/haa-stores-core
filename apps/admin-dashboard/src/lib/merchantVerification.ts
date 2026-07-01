export type MerchantEntityType = 'establishment' | 'company' | 'freelance' | 'individual';

export type VerificationStatus =
  | 'not_started'
  | 'incomplete'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'suspended';

export type PublishStatus =
  | 'not_ready'
  | 'ready_for_review'
  | 'approved_to_publish'
  | 'published'
  | 'blocked';

export type PayoutStatus =
  | 'not_configured'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'payouts_blocked';

export type RiskStatus = 'low' | 'medium' | 'high' | 'blocked' | 'not_ready' | 'incomplete' | 'unknown';

export type BankVerificationStatus =
  | 'not_added'
  | 'pending_review'
  | 'verified'
  | 'rejected'
  | 'needs_reverification';

export type RegistryDocumentStatus =
  | 'not_added'
  | 'pending_review'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'needs_update';

export type ActivityMatchStatus = 'not_checked' | 'matched' | 'mismatch' | 'needs_review';

export type ReadinessChecklistStatus = 'passed' | 'blocked' | 'warning';
export type ReadinessChecklistAction = {
  adminLabel: string;
  adminHref: string | null;
  merchantInstruction: string;
};

export interface MerchantTenantSource {
  id: number;
  name?: string | null;
  slug?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  phoneVerified?: boolean | null;
  phoneVerifiedAt?: string | Date | null;
  phoneLastChangedAt?: string | Date | null;
  emailVerified?: boolean | null;
  emailVerifiedAt?: string | Date | null;
  lastOtpAttemptAt?: string | Date | null;
  lastOtpAttemptStatus?: string | null;
  internalNotes?: string | null;
  highRiskFlags?: string[] | null;
}

export interface MerchantStoreSource {
  id: number;
  tenantId?: number | null;
  name?: string | null;
  slug?: string | null;
  domain?: string | null;
  customDomain?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
  isActive?: boolean | null;
  publishStatus?: string | null;
  description?: string | null;
  policies?: Record<string, unknown> | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  phoneVerified?: boolean | null;
  phoneVerifiedAt?: string | Date | null;
  phoneLastChangedAt?: string | Date | null;
  emailVerified?: boolean | null;
  emailVerifiedAt?: string | Date | null;
  lastOtpAttemptAt?: string | Date | null;
  lastOtpAttemptStatus?: string | null;
  paymentConfigured?: boolean | null;
  paymentStatus?: string | null;
  shippingConfigured?: boolean | null;
  shippingStatus?: string | null;
  internalNotes?: string | null;
  highRiskFlags?: string[] | null;
}

export interface MerchantKycDocumentSource {
  id?: number | string | null;
  type?: string | null;
  filename?: string | null;
  fileUrl?: string | null;
  status?: string | null;
  uploadedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  rejectionReason?: string | null;
}

export interface MerchantKycProfileSource {
  id?: number | null;
  storeId?: number | null;
  tenantId?: number | null;
  businessType?: string | null;
  legalName?: string | null;
  commercialName?: string | null;
  commercialRegistrationNumber?: string | null;
  entityName?: string | null;
  unifiedNationalNumber?: string | null;
  issueDate?: string | Date | null;
  expiryDate?: string | Date | null;
  freelanceDocumentNumber?: string | null;
  holderName?: string | null;
  activity?: string | null;
  activityMatchStatus?: ActivityMatchStatus | string | null;
  status?: string | null;
  submittedAt?: string | Date | null;
  reviewedAt?: string | Date | null;
  reviewedBy?: number | string | null;
  rejectionReason?: string | null;
  documents?: MerchantKycDocumentSource[] | null;
  internalNotes?: string | null;
  highRiskFlags?: string[] | null;
  updatedAt?: string | Date | null;
  createdAt?: string | Date | null;
}

export interface MerchantBankAccountSource {
  id?: number | null;
  storeId?: number | null;
  bankName?: string | null;
  accountHolderName?: string | null;
  ibanLast4?: string | null;
  maskedIban?: string | null;
  status?: string | null;
  verificationStatus?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | Date | null;
  reviewedBy?: number | string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  isDefault?: boolean | null;
}

export interface BankVerificationView {
  id: number | null;
  bankName: string | null;
  accountHolderName: string | null;
  ibanLast4: string | null;
  maskedIban: string | null;
  verificationStatus: BankVerificationStatus;
  rejectionReason: string | null;
  reviewedAt: string | Date | null;
  reviewedBy: number | string | null;
}

export interface ContactVerificationView {
  phoneVerified: boolean;
  phoneVerifiedAt: string | Date | null;
  emailVerified: boolean;
  emailVerifiedAt: string | Date | null;
  lastOtpAttemptAt: string | Date | null;
  lastOtpAttemptStatus: string | null;
  phoneChangedAfterVerification: boolean;
}

export interface RegistryVerificationView {
  entityType: MerchantEntityType;
  status: RegistryDocumentStatus;
  activityMatchStatus: ActivityMatchStatus;
  commercialRegistrationNumber: string | null;
  entityName: string | null;
  unifiedNationalNumber: string | null;
  issueDate: string | Date | null;
  expiryDate: string | Date | null;
  freelanceDocumentNumber: string | null;
  holderName: string | null;
  activity: string | null;
  rejectionReason: string | null;
}

export interface PublishReadinessChecklistItem {
  key:
    | 'store_profile'
    | 'phone'
    | 'email'
    | 'registry'
    | 'bank'
    | 'payment'
    | 'shipping'
    | 'policies'
    | 'risk';
  label: string;
  status: ReadinessChecklistStatus;
  message: string;
  action: ReadinessChecklistAction;
}

export interface PublishReadinessInput {
  storeProfileComplete: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  registryStatus: RegistryDocumentStatus;
  bankStatus: BankVerificationStatus;
  bankRequired?: boolean;
  paymentConfigured: boolean;
  shippingConfigured: boolean;
  policiesPresent: boolean;
  highRiskFlags?: string[];
  phoneChangedAfterVerification?: boolean;
}

export interface PublishReadinessResult {
  allowed: boolean;
  blockingReasons: string[];
  warnings: string[];
  checklist: PublishReadinessChecklistItem[];
}

export interface MerchantVerificationRecord {
  id: string;
  storeId: number | null;
  tenantId: number | null;
  kycProfileId: number | null;
  storeName: string;
  storeLink: string;
  ownerName: string;
  entityType: MerchantEntityType;
  verificationStatus: VerificationStatus;
  publishStatus: PublishStatus;
  payoutStatus: PayoutStatus;
  riskStatus: RiskStatus;
  contact: ContactVerificationView;
  registry: RegistryVerificationView;
  bank: BankVerificationView;
  paymentStatus: 'not_configured' | 'configured' | 'active' | 'suspended' | 'invalid';
  shippingStatus: 'not_configured' | 'configured' | 'active' | 'suspended';
  policiesPresent: boolean;
  readiness: PublishReadinessResult;
  documents: MerchantKycDocumentSource[];
  reviewDecisions: Array<{
    status: string;
    reason: string | null;
    reviewedAt: string | Date | null;
    reviewedBy: number | string | null;
  }>;
  internalNotes: string | null;
  lastUpdated: string | Date | null;
}

export interface MerchantVerificationSources {
  tenants: MerchantTenantSource[];
  stores: MerchantStoreSource[];
  kycProfiles: MerchantKycProfileSource[];
  bankAccounts: MerchantBankAccountSource[];
}

function present(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function asDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function latestDate(values: Array<string | Date | null | undefined>): string | Date | null {
  const dates = values.map(asDate).filter((date): date is Date => Boolean(date));
  if (dates.length === 0) return null;
  return new Date(Math.max(...dates.map((date) => date.getTime()))).toISOString();
}

function normalizeActivityMatchStatus(value: unknown): ActivityMatchStatus {
  if (value === 'matched' || value === 'mismatch' || value === 'needs_review') return value;
  return 'not_checked';
}

function normalizeRegistryStatus(value: unknown): RegistryDocumentStatus | null {
  if (
    value === 'not_added'
    || value === 'pending_review'
    || value === 'accepted'
    || value === 'rejected'
    || value === 'expired'
    || value === 'needs_update'
  ) {
    return value;
  }
  return null;
}

function checklistAction(
  key: PublishReadinessChecklistItem['key'],
  status: ReadinessChecklistStatus,
): ReadinessChecklistAction {
  const complete = status === 'passed';
  const actions: Record<PublishReadinessChecklistItem['key'], ReadinessChecklistAction> = {
    store_profile: complete
      ? {
          adminLabel: 'بيانات المتجر مكتملة',
          adminHref: '/stores',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على بيانات المتجر.',
        }
      : {
          adminLabel: 'افتح سجل المتجر',
          adminHref: '/stores',
          merchantInstruction: 'اطلب من التاجر إكمال اسم المتجر، الرابط، البريد، ورقم التواصل من إعدادات المتجر.',
        },
    phone: complete
      ? {
          adminLabel: 'الجوال موثق',
          adminHref: '/kyc',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على رقم الجوال.',
        }
      : {
          adminLabel: 'راجع ملف التحقق',
          adminHref: '/kyc',
          merchantInstruction: 'اطلب من التاجر توثيق رقم الجوال عبر OTP قبل السماح بالنشر أو المدفوعات.',
        },
    email: complete
      ? {
          adminLabel: 'البريد موثق',
          adminHref: '/kyc',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على البريد الإلكتروني.',
        }
      : {
          adminLabel: 'راجع ملف التحقق',
          adminHref: '/kyc',
          merchantInstruction: 'اطلب من التاجر توثيق البريد الإلكتروني قبل اعتماد التوثيق.',
        },
    registry: complete
      ? {
          adminLabel: 'الوثيقة مقبولة',
          adminHref: '/kyc',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على السجل أو الوثيقة.',
        }
      : {
          adminLabel: 'راجع السجل أو الوثيقة',
          adminHref: '/kyc',
          merchantInstruction: 'اطلب من التاجر رفع سجل تجاري أو وثيقة عمل حر صالحة ومطابقة لنشاط المتجر.',
        },
    bank: complete
      ? {
          adminLabel: 'الحساب البنكي موثق',
          adminHref: '/bank-accounts',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على الحساب البنكي.',
        }
      : status === 'warning'
        ? {
            adminLabel: 'البنك غير مطلوب حاليًا',
            adminHref: '/bank-accounts',
            merchantInstruction: 'وضح للتاجر أن السحب سيتطلب حسابًا بنكيًا موثقًا عند تفعيل سياسة السحب.',
          }
        : {
            adminLabel: 'راجع الحساب البنكي',
            adminHref: '/bank-accounts',
            merchantInstruction: 'اطلب من التاجر إضافة حساب بنكي باسم مطابق ثم راجعه من لوحة التوثيق.',
          },
    payment: complete
      ? {
          adminLabel: 'الدفع جاهز',
          adminHref: '/store-payment-settings',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على الدفع.',
        }
      : {
          adminLabel: 'افتح إعدادات الدفع',
          adminHref: '/store-payment-settings',
          merchantInstruction: 'فعّل أو اطلب من التاجر إكمال إعداد مزود الدفع قبل استقبال المدفوعات.',
        },
    shipping: complete
      ? {
          adminLabel: 'الشحن جاهز',
          adminHref: '/settlement-readiness',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على الشحن.',
        }
      : {
          adminLabel: 'راجع جاهزية الشحن',
          adminHref: '/settlement-readiness',
          merchantInstruction: 'اطلب من التاجر إكمال إعداد الشحن أو وضح سياسة الشحن اليدوي قبل النشر.',
        },
    policies: complete
      ? {
          adminLabel: 'السياسات موجودة',
          adminHref: '/stores',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على السياسات.',
        }
      : {
          adminLabel: 'راجع سياسات المتجر',
          adminHref: '/stores',
          merchantInstruction: 'اطلب من التاجر نشر سياسات الخصوصية، الشحن، الاسترجاع، والشروط قبل النشر.',
        },
    risk: complete
      ? {
          adminLabel: 'لا توجد أعلام عالية',
          adminHref: '/audit',
          merchantInstruction: 'لا يحتاج التاجر إجراءً الآن على المخاطر.',
        }
      : {
          adminLabel: 'راجع سجل التدقيق',
          adminHref: '/audit',
          merchantInstruction: 'اشرح للتاجر سبب التعليق الداخلي بعد مراجعة أعلام المخاطر العالية.',
        },
  };
  return actions[key];
}

export function normalizeEntityType(value: unknown): MerchantEntityType {
  const raw = String(value ?? '').toLowerCase();
  if (['company', 'corporation', 'llc', 'limited_company'].includes(raw)) return 'company';
  if (['establishment', 'institution', 'sole_establishment', 'commercial_establishment'].includes(raw)) return 'establishment';
  if (['freelance', 'freelancer', 'self_employed'].includes(raw)) return 'freelance';
  return 'individual';
}

export function normalizeVerificationStatus(value: unknown, hasProfile: boolean): VerificationStatus {
  if (value === 'approved') return 'approved';
  if (value === 'rejected') return 'rejected';
  if (value === 'submitted') return 'submitted';
  if (value === 'under_review') return 'under_review';
  if (value === 'changes_requested' || value === 'needs_more_info') return 'changes_requested';
  if (value === 'suspended') return 'suspended';
  if (value === 'incomplete' || value === 'draft') return 'incomplete';
  return hasProfile ? 'incomplete' : 'not_started';
}

export function normalizeBankVerificationStatus(account?: MerchantBankAccountSource | null): BankVerificationStatus {
  if (!account) return 'not_added';
  const status = String(account.verificationStatus ?? account.status ?? '').toLowerCase();
  if (status === 'verified' || status === 'approved') return 'verified';
  if (status === 'rejected') return 'rejected';
  if (status === 'needs_reverification' || status === 'requires_reverification') return 'needs_reverification';
  if (status === 'submitted' || status === 'pending' || status === 'pending_review' || status === 'under_review') {
    return 'pending_review';
  }
  return present(account.bankName) || present(account.accountHolderName) || present(account.ibanLast4)
    ? 'pending_review'
    : 'not_added';
}

export function toBankVerificationView(account?: MerchantBankAccountSource | null): BankVerificationView {
  const ibanLast4 = account?.ibanLast4 ? String(account.ibanLast4).slice(-4) : null;
  return {
    id: account?.id ?? null,
    bankName: account?.bankName ?? null,
    accountHolderName: account?.accountHolderName ?? null,
    ibanLast4,
    maskedIban: ibanLast4 ? `****${ibanLast4}` : null,
    verificationStatus: normalizeBankVerificationStatus(account),
    rejectionReason: account?.rejectionReason ?? null,
    reviewedAt: account?.reviewedAt ?? null,
    reviewedBy: account?.reviewedBy ?? null,
  };
}

export function evaluateContactVerification(source: {
  phoneVerified?: boolean | null;
  phoneVerifiedAt?: string | Date | null;
  phoneLastChangedAt?: string | Date | null;
  emailVerified?: boolean | null;
  emailVerifiedAt?: string | Date | null;
  lastOtpAttemptAt?: string | Date | null;
  lastOtpAttemptStatus?: string | null;
}): ContactVerificationView {
  const phoneVerifiedAt = source.phoneVerifiedAt ?? null;
  const phoneLastChangedAt = source.phoneLastChangedAt ?? null;
  const verifiedAtDate = asDate(phoneVerifiedAt);
  const changedAtDate = asDate(phoneLastChangedAt);

  return {
    phoneVerified: source.phoneVerified === true,
    phoneVerifiedAt,
    emailVerified: source.emailVerified === true,
    emailVerifiedAt: source.emailVerifiedAt ?? null,
    lastOtpAttemptAt: source.lastOtpAttemptAt ?? null,
    lastOtpAttemptStatus: source.lastOtpAttemptStatus ?? null,
    phoneChangedAfterVerification: Boolean(
      source.phoneVerified
      && verifiedAtDate
      && changedAtDate
      && changedAtDate.getTime() > verifiedAtDate.getTime(),
    ),
  };
}

export function evaluateRegistryVerification(
  profile: MerchantKycProfileSource | null | undefined,
  entityType: MerchantEntityType,
  now: Date = new Date(),
): RegistryVerificationView {
  const explicitStatus = normalizeRegistryStatus((profile as { registryStatus?: unknown } | null | undefined)?.registryStatus);
  const activityMatchStatus = normalizeActivityMatchStatus(profile?.activityMatchStatus);
  const expiryDate = profile?.expiryDate ?? null;
  const expiry = asDate(expiryDate);
  const status = normalizeVerificationStatus(profile?.status, Boolean(profile));
  const hasCompanyDocument = present(profile?.commercialRegistrationNumber);
  const hasFreelanceDocument = present(profile?.freelanceDocumentNumber);
  const isFreelance = entityType === 'freelance';
  const hasExpectedDocument = isFreelance ? hasFreelanceDocument : hasCompanyDocument;

  let registryStatus: RegistryDocumentStatus = explicitStatus ?? 'not_added';
  if (!explicitStatus) {
    if (!hasExpectedDocument) {
      registryStatus = 'not_added';
    } else if (expiry && expiry.getTime() < now.getTime()) {
      registryStatus = 'expired';
    } else if (status === 'approved') {
      registryStatus = activityMatchStatus === 'mismatch' ? 'needs_update' : 'accepted';
    } else if (status === 'rejected') {
      registryStatus = 'rejected';
    } else if (status === 'submitted' || status === 'under_review') {
      registryStatus = 'pending_review';
    } else {
      registryStatus = 'needs_update';
    }
  }

  return {
    entityType,
    status: registryStatus,
    activityMatchStatus,
    commercialRegistrationNumber: profile?.commercialRegistrationNumber ?? null,
    entityName: profile?.entityName ?? profile?.legalName ?? profile?.commercialName ?? null,
    unifiedNationalNumber: profile?.unifiedNationalNumber ?? null,
    issueDate: profile?.issueDate ?? null,
    expiryDate,
    freelanceDocumentNumber: profile?.freelanceDocumentNumber ?? null,
    holderName: profile?.holderName ?? profile?.legalName ?? null,
    activity: profile?.activity ?? null,
    rejectionReason: profile?.rejectionReason ?? null,
  };
}

export function calculatePublishReadiness(input: PublishReadinessInput): PublishReadinessResult {
  const bankRequired = input.bankRequired !== false;
  const highRiskFlags = input.highRiskFlags ?? [];
  const checklist: PublishReadinessChecklistItem[] = [];
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  const addItem = (item: PublishReadinessChecklistItem) => {
    checklist.push(item);
    if (item.status === 'blocked') blockingReasons.push(item.message);
    if (item.status === 'warning') warnings.push(item.message);
  };

  addItem(input.storeProfileComplete
    ? { key: 'store_profile', label: 'بيانات المتجر', status: 'passed', message: 'بيانات المتجر مكتملة.', action: checklistAction('store_profile', 'passed') }
    : { key: 'store_profile', label: 'بيانات المتجر', status: 'blocked', message: 'بيانات المتجر غير مكتملة.', action: checklistAction('store_profile', 'blocked') });

  addItem(input.phoneVerified
    ? { key: 'phone', label: 'توثيق الجوال', status: 'passed', message: 'رقم الجوال موثق.', action: checklistAction('phone', 'passed') }
    : { key: 'phone', label: 'توثيق الجوال', status: 'blocked', message: 'رقم الجوال غير موثق.', action: checklistAction('phone', 'blocked') });

  addItem(input.emailVerified
    ? { key: 'email', label: 'توثيق البريد', status: 'passed', message: 'البريد الإلكتروني موثق.', action: checklistAction('email', 'passed') }
    : { key: 'email', label: 'توثيق البريد', status: 'blocked', message: 'البريد الإلكتروني غير موثق.', action: checklistAction('email', 'blocked') });

  if (input.registryStatus === 'accepted') {
    addItem({ key: 'registry', label: 'السجل أو الوثيقة', status: 'passed', message: 'وثيقة الكيان مقبولة.', action: checklistAction('registry', 'passed') });
  } else if (input.registryStatus === 'pending_review') {
    addItem({ key: 'registry', label: 'السجل أو الوثيقة', status: 'warning', message: 'السجل التجاري أو وثيقة العمل الحر بانتظار قرار المراجع.', action: checklistAction('registry', 'warning') });
  } else {
    addItem({ key: 'registry', label: 'السجل أو الوثيقة', status: 'blocked', message: 'السجل التجاري أو وثيقة العمل الحر غير مقبولة.', action: checklistAction('registry', 'blocked') });
  }

  if (!bankRequired) {
    addItem({ key: 'bank', label: 'الحساب البنكي', status: 'warning', message: 'الحساب البنكي غير مطلوب حسب سياسة المنصة الحالية.', action: checklistAction('bank', 'warning') });
  } else if (input.bankStatus === 'verified') {
    addItem({ key: 'bank', label: 'الحساب البنكي', status: 'passed', message: 'الحساب البنكي موثق.', action: checklistAction('bank', 'passed') });
  } else {
    addItem({ key: 'bank', label: 'الحساب البنكي', status: 'blocked', message: 'الحساب البنكي غير موثق.', action: checklistAction('bank', 'blocked') });
  }

  addItem(input.paymentConfigured
    ? { key: 'payment', label: 'الدفع', status: 'passed', message: 'إعدادات الدفع جاهزة.', action: checklistAction('payment', 'passed') }
    : { key: 'payment', label: 'الدفع', status: 'blocked', message: 'إعدادات الدفع غير مكتملة.', action: checklistAction('payment', 'blocked') });

  addItem(input.shippingConfigured
    ? { key: 'shipping', label: 'الشحن', status: 'passed', message: 'إعدادات الشحن جاهزة.', action: checklistAction('shipping', 'passed') }
    : { key: 'shipping', label: 'الشحن', status: 'blocked', message: 'إعدادات الشحن غير مكتملة.', action: checklistAction('shipping', 'blocked') });

  addItem(input.policiesPresent
    ? { key: 'policies', label: 'سياسات المتجر', status: 'passed', message: 'سياسات المتجر موجودة.', action: checklistAction('policies', 'passed') }
    : { key: 'policies', label: 'سياسات المتجر', status: 'blocked', message: 'سياسات المتجر غير مكتملة.', action: checklistAction('policies', 'blocked') });

  addItem(highRiskFlags.length === 0
    ? { key: 'risk', label: 'المخاطر', status: 'passed', message: 'لا توجد أعلام عالية الخطورة.', action: checklistAction('risk', 'passed') }
    : { key: 'risk', label: 'المخاطر', status: 'blocked', message: 'توجد أعلام عالية الخطورة على المتجر.', action: checklistAction('risk', 'blocked') });

  if (input.phoneChangedAfterVerification) {
    warnings.push('تم تغيير رقم الجوال بعد التوثيق ويحتاج مراجعة.');
  }

  return {
    allowed: blockingReasons.length === 0,
    blockingReasons,
    warnings,
    checklist,
  };
}

function mapPublishStatus(source: unknown, readiness: PublishReadinessResult): PublishStatus {
  const raw = String(source ?? '').toLowerCase();
  if (raw === 'published') return 'published';
  if (raw === 'approved_to_publish') return 'approved_to_publish';
  if (raw === 'ready_for_review') return 'ready_for_review';
  if (raw === 'blocked' || raw === 'suspended') return 'blocked';
  return readiness.allowed ? 'ready_for_review' : 'not_ready';
}

function mapPayoutStatus(bankStatus: BankVerificationStatus): PayoutStatus {
  if (bankStatus === 'verified') return 'verified';
  if (bankStatus === 'pending_review') return 'pending_review';
  if (bankStatus === 'rejected') return 'rejected';
  if (bankStatus === 'needs_reverification') return 'payouts_blocked';
  return 'not_configured';
}

function mapPaymentStatus(value: unknown): MerchantVerificationRecord['paymentStatus'] {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'active') return 'active';
  if (raw === 'configured') return 'configured';
  if (raw === 'suspended') return 'suspended';
  if (raw === 'invalid') return 'invalid';
  return 'not_configured';
}

function mapShippingStatus(value: unknown): MerchantVerificationRecord['shippingStatus'] {
  const raw = String(value ?? '').toLowerCase();
  if (raw === 'active') return 'active';
  if (raw === 'configured') return 'configured';
  if (raw === 'suspended') return 'suspended';
  return 'not_configured';
}

function hasRequiredPolicies(policies: MerchantStoreSource['policies']): boolean {
  if (!policies) return false;
  return ['privacy', 'returns', 'shipping', 'terms'].every((key) => present(policies[key]));
}

function computeRiskStatus(args: {
  readiness: PublishReadinessResult;
  verificationStatus: VerificationStatus;
  registryStatus: RegistryDocumentStatus;
  bankStatus: BankVerificationStatus;
  highRiskFlags: string[];
}): RiskStatus {
  if (args.verificationStatus === 'suspended' || args.highRiskFlags.length > 0) {
    return 'blocked';
  }
  if (args.registryStatus === 'rejected' || args.bankStatus === 'rejected') return 'high';
  if (args.verificationStatus === 'not_started') return 'unknown';
  if (args.verificationStatus === 'incomplete') return 'incomplete';
  if (!args.readiness.allowed) return 'not_ready';
  return args.readiness.warnings.length > 0 ? 'medium' : 'low';
}

function chooseDefaultBank(accounts: MerchantBankAccountSource[]): MerchantBankAccountSource | null {
  if (accounts.length === 0) return null;
  return accounts.find((account) => account.isDefault) ?? accounts[0] ?? null;
}

export function buildMerchantVerificationRecords(
  sources: MerchantVerificationSources,
  now: Date = new Date(),
): MerchantVerificationRecord[] {
  const tenantById = new Map(sources.tenants.map((tenant) => [tenant.id, tenant]));
  const profilesByStore = new Map<number, MerchantKycProfileSource>();
  for (const profile of sources.kycProfiles) {
    if (typeof profile.storeId === 'number') profilesByStore.set(profile.storeId, profile);
  }

  const bankAccountsByStore = new Map<number, MerchantBankAccountSource[]>();
  for (const account of sources.bankAccounts) {
    if (typeof account.storeId !== 'number') continue;
    const list = bankAccountsByStore.get(account.storeId) ?? [];
    list.push(account);
    bankAccountsByStore.set(account.storeId, list);
  }

  const stores: MerchantStoreSource[] = sources.stores.length > 0
    ? sources.stores
    : sources.tenants.map<MerchantStoreSource>((tenant) => ({
      id: tenant.id,
      tenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      phone: tenant.phone,
      status: tenant.status,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      phoneVerified: tenant.phoneVerified,
      phoneVerifiedAt: tenant.phoneVerifiedAt,
      phoneLastChangedAt: tenant.phoneLastChangedAt,
      emailVerified: tenant.emailVerified,
      emailVerifiedAt: tenant.emailVerifiedAt,
      lastOtpAttemptAt: tenant.lastOtpAttemptAt,
      lastOtpAttemptStatus: tenant.lastOtpAttemptStatus,
      internalNotes: tenant.internalNotes,
      highRiskFlags: tenant.highRiskFlags,
    }));

  return stores.map((store) => {
    const tenant = typeof store.tenantId === 'number' ? tenantById.get(store.tenantId) : undefined;
    const profile = profilesByStore.get(store.id) ?? null;
    const bank = chooseDefaultBank(bankAccountsByStore.get(store.id) ?? []);
    const entityType = normalizeEntityType(profile?.businessType);
    const verificationStatus = normalizeVerificationStatus(profile?.status, Boolean(profile));
    const registry = evaluateRegistryVerification(profile, entityType, now);
    const bankView = toBankVerificationView(bank);
    const contact = evaluateContactVerification({
      phoneVerified: store.phoneVerified ?? tenant?.phoneVerified,
      phoneVerifiedAt: store.phoneVerifiedAt ?? tenant?.phoneVerifiedAt,
      phoneLastChangedAt: store.phoneLastChangedAt ?? tenant?.phoneLastChangedAt,
      emailVerified: store.emailVerified ?? tenant?.emailVerified,
      emailVerifiedAt: store.emailVerifiedAt ?? tenant?.emailVerifiedAt,
      lastOtpAttemptAt: store.lastOtpAttemptAt ?? tenant?.lastOtpAttemptAt,
      lastOtpAttemptStatus: store.lastOtpAttemptStatus ?? tenant?.lastOtpAttemptStatus,
    });
    const paymentStatus = mapPaymentStatus(store.paymentStatus);
    const shippingStatus = mapShippingStatus(store.shippingStatus);
    const highRiskFlags = [
      ...(store.highRiskFlags ?? []),
      ...(tenant?.highRiskFlags ?? []),
      ...(profile?.highRiskFlags ?? []),
      ...(store.status === 'suspended' || tenant?.status === 'suspended' ? ['suspended'] : []),
      ...(store.isActive === false ? ['inactive_store'] : []),
    ];
    const readiness = calculatePublishReadiness({
      storeProfileComplete: present(store.name) && present(store.slug) && present(store.email ?? tenant?.email) && present(store.phone ?? tenant?.phone),
      phoneVerified: contact.phoneVerified,
      emailVerified: contact.emailVerified,
      registryStatus: registry.status,
      bankStatus: bankView.verificationStatus,
      paymentConfigured: paymentStatus === 'active' || paymentStatus === 'configured',
      shippingConfigured: shippingStatus === 'active' || shippingStatus === 'configured',
      policiesPresent: hasRequiredPolicies(store.policies),
      highRiskFlags,
      phoneChangedAfterVerification: contact.phoneChangedAfterVerification,
    });

    const storeLink = store.customDomain
      ? `https://${store.customDomain}`
      : store.domain
        ? `https://${store.domain}`
        : `/${store.slug ?? tenant?.slug ?? store.id}`;

    return {
      id: `store-${store.id}`,
      storeId: store.id,
      tenantId: store.tenantId ?? tenant?.id ?? null,
      kycProfileId: profile?.id ?? null,
      storeName: store.name ?? tenant?.name ?? `Store ${store.id}`,
      storeLink,
      ownerName: profile?.legalName ?? profile?.commercialName ?? tenant?.name ?? 'غير متوفر',
      entityType,
      verificationStatus,
      publishStatus: mapPublishStatus(store.publishStatus, readiness),
      payoutStatus: mapPayoutStatus(bankView.verificationStatus),
      riskStatus: computeRiskStatus({
        readiness,
        verificationStatus,
        registryStatus: registry.status,
        bankStatus: bankView.verificationStatus,
        highRiskFlags,
      }),
      contact,
      registry,
      bank: bankView,
      paymentStatus,
      shippingStatus,
      policiesPresent: hasRequiredPolicies(store.policies),
      readiness,
      documents: profile?.documents ?? [],
      reviewDecisions: profile?.reviewedAt || profile?.status
        ? [{
          status: String(profile?.status ?? verificationStatus),
          reason: profile?.rejectionReason ?? null,
          reviewedAt: profile?.reviewedAt ?? null,
          reviewedBy: profile?.reviewedBy ?? null,
        }]
        : [],
      internalNotes: profile?.internalNotes ?? store.internalNotes ?? tenant?.internalNotes ?? null,
      lastUpdated: latestDate([
        store.updatedAt,
        tenant?.updatedAt,
        profile?.updatedAt,
        bank?.updatedAt,
        store.createdAt,
      ]),
    };
  });
}
