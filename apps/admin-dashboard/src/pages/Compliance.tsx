import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  adminApi,
  hasAdminPermission,
  type AdminKycReviewStatus,
  type AdminStorePaymentSetting,
  type Payout,
  type SettlementBatch,
} from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { Icon } from '../components/ui/icon';
import { useTableControls } from '../lib/useTableControls';
import {
  buildMerchantVerificationRecords,
  type BankVerificationStatus,
  type MerchantBankAccountSource,
  type MerchantEntityType,
  type MerchantKycProfileSource,
  type MerchantStoreSource,
  type MerchantTenantSource,
  type MerchantVerificationRecord,
  type PayoutStatus,
  type PublishReadinessChecklistItem,
  type PublishStatus,
  type RegistryDocumentStatus,
  type RiskStatus,
  type VerificationStatus,
} from '../lib/merchantVerification';

type VerificationDecisionMode = 'changes' | 'reject';
type BankDecisionMode = 'verify' | 'reject';
type MerchantFileTab = 'approval' | 'profile' | 'operations' | 'finance' | 'history' | 'notes';
type StageTone = 'complete' | 'warning' | 'blocked';
type StoreScopedRow = Record<string, unknown>;

const MERCHANT_FILE_TABS: Array<{ key: MerchantFileTab; label: string }> = [
  { key: 'approval', label: 'مراحل الاعتماد' },
  { key: 'profile', label: 'بيانات التاجر' },
  { key: 'operations', label: 'التفعيل والتشغيل' },
  { key: 'finance', label: 'المبيعات والمستخلصات' },
  { key: 'history', label: 'السجل والتعديلات' },
  { key: 'notes', label: 'الملاحظات' },
];

const ENTITY_LABEL: Record<MerchantEntityType, string> = {
  establishment: 'مؤسسة',
  company: 'شركة',
  freelance: 'عمل حر',
  individual: 'فرد',
};

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  not_started: 'لم يبدأ',
  incomplete: 'غير مكتمل',
  submitted: 'مقدم',
  under_review: 'قيد المراجعة',
  approved: 'موثق',
  rejected: 'مرفوض',
  changes_requested: 'تعديلات مطلوبة',
  suspended: 'معلق',
};

const PUBLISH_LABEL: Record<PublishStatus, string> = {
  not_ready: 'غير جاهز',
  ready_for_review: 'جاهز للمراجعة',
  approved_to_publish: 'مصرح بالنشر',
  published: 'منشور',
  blocked: 'محجوب',
};

const PAYOUT_LABEL: Record<PayoutStatus, string> = {
  not_configured: 'غير معد',
  pending_review: 'بانتظار المراجعة',
  verified: 'موثق',
  rejected: 'مرفوض',
  payouts_blocked: 'السحب محجوب',
};

const RISK_LABEL: Record<RiskStatus, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  blocked: 'محجوبة',
  not_ready: 'غير جاهز',
  incomplete: 'ناقص بيانات',
  unknown: 'غير مصنفة',
};

const BANK_LABEL: Record<BankVerificationStatus, string> = {
  not_added: 'غير مضاف',
  pending_review: 'بانتظار المراجعة',
  verified: 'موثق',
  rejected: 'مرفوض',
  needs_reverification: 'إعادة توثيق',
};

const REGISTRY_LABEL: Record<RegistryDocumentStatus, string> = {
  not_added: 'غير مضاف',
  pending_review: 'بانتظار المراجعة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  expired: 'منتهي',
  needs_update: 'يحتاج تحديث',
};

const STATUS_CLASS: Record<string, string> = {
  good: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  info: 'bg-sky-50 text-sky-700 border border-sky-100',
  warn: 'bg-amber-50 text-amber-700 border border-amber-100',
  bad: 'bg-red-50 text-red-700 border border-red-100',
  muted: 'bg-gray-50 text-gray-600 border border-gray-100',
};

function classForVerification(status: VerificationStatus): string {
  if (status === 'approved') return STATUS_CLASS.good;
  if (status === 'submitted' || status === 'under_review') return STATUS_CLASS.warn;
  if (status === 'rejected' || status === 'suspended') return STATUS_CLASS.bad;
  return STATUS_CLASS.muted;
}

function classForRisk(status: RiskStatus): string {
  if (status === 'low') return STATUS_CLASS.good;
  if (status === 'medium' || status === 'not_ready' || status === 'incomplete') return STATUS_CLASS.warn;
  if (status === 'unknown') return STATUS_CLASS.muted;
  return STATUS_CLASS.bad;
}

function classForRegistry(status: RegistryDocumentStatus): string {
  if (status === 'accepted') return STATUS_CLASS.good;
  if (status === 'pending_review' || status === 'needs_update') return STATUS_CLASS.warn;
  if (status === 'rejected' || status === 'expired') return STATUS_CLASS.bad;
  return STATUS_CLASS.muted;
}

function classForBank(status: BankVerificationStatus): string {
  if (status === 'verified') return STATUS_CLASS.good;
  if (status === 'pending_review' || status === 'needs_reverification') return STATUS_CLASS.warn;
  if (status === 'rejected') return STATUS_CLASS.bad;
  return STATUS_CLASS.muted;
}

function classForPayout(status: PayoutStatus): string {
  if (status === 'verified') return STATUS_CLASS.good;
  if (status === 'pending_review') return STATUS_CLASS.warn;
  if (status === 'rejected' || status === 'payouts_blocked') return STATUS_CLASS.bad;
  return STATUS_CLASS.muted;
}

function classForPublish(status: PublishStatus): string {
  if (status === 'published' || status === 'approved_to_publish') return STATUS_CLASS.good;
  if (status === 'ready_for_review') return STATUS_CLASS.warn;
  if (status === 'blocked') return STATUS_CLASS.bad;
  return STATUS_CLASS.muted;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return 'غير متوفر';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'غير متوفر';
  return new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function valueOrDash(value: unknown): string {
  if (value === null || value === undefined) return 'غير متوفر';
  const text = String(value).trim();
  return text.length > 0 ? text : 'غير متوفر';
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-semibold whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: 'Store' | 'ShieldCheck' | 'AlertTriangle' | 'X' | 'CheckSquare';
  tone: 'blue' | 'green' | 'amber' | 'red';
}) {
  const toneClass = {
    blue: 'bg-primary-50 text-primary-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  }[tone];

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-100 p-4 min-h-[112px] flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900 tabular-nums tracking-tight">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      </div>
      <span className={`h-11 w-11 rounded-xl inline-flex items-center justify-center ${toneClass}`}>
        <Icon name={icon} size="md" />
      </span>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
      <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium text-end break-words">{value}</span>
    </div>
  );
}

function StoreLink({ record }: { record: MerchantVerificationRecord }) {
  const isExternal = record.storeLink.startsWith('http');
  if (isExternal) {
    return (
      <a href={record.storeLink} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">
        {record.storeLink.replace(/^https?:\/\//, '')}
      </a>
    );
  }
  return <span className="text-xs text-gray-500 font-mono">{record.storeLink}</span>;
}

function matchesMerchantSearch(record: MerchantVerificationRecord, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [
    record.storeName,
    record.storeLink,
    record.ownerName,
    ENTITY_LABEL[record.entityType],
    record.bank.bankName,
    record.bank.accountHolderName,
    record.bank.ibanLast4,
  ].some((value) => String(value ?? '').toLowerCase().includes(term));
}

function suggestedChangeReason(record: MerchantVerificationRecord): string {
  const reasons = record.readiness.blockingReasons.length > 0
    ? record.readiness.blockingReasons
    : record.readiness.checklist
      .filter((item) => item.status !== 'passed')
      .map((item) => item.message);
  return reasons.length > 0
    ? reasons.map((reason) => `- ${reason}`).join('\n')
    : 'يرجى إكمال المتطلبات الموضحة في قائمة جاهزية النشر.';
}

function reviewBlockedMessage(record: MerchantVerificationRecord | null, canReviewVerification: boolean): string {
  if (!canReviewVerification) return 'حسابك الحالي لا يملك صلاحية مراجعة التوثيق.';
  if (!record?.kycProfileId) return 'لا يوجد ملف توثيق مقدم لهذا المتجر بعد.';
  if (record.verificationStatus !== 'submitted' && record.verificationStatus !== 'under_review') {
    return 'يمكن إصدار القرار فقط عندما تكون حالة التوثيق مقدم أو قيد المراجعة.';
  }
  if (!record.readiness.allowed) return 'لا يمكن الاعتماد قبل إغلاق موانع الجاهزية. استخدم طلب التعديلات لإرسال المطلوب للتاجر.';
  return 'جاهز لاعتماد التوثيق.';
}

function canActOnBank(status: BankVerificationStatus): boolean {
  return status === 'pending_review' || status === 'needs_reverification' || status === 'rejected';
}

function merchantFilePath(record: MerchantVerificationRecord): string {
  return `/compliance/${record.id}`;
}

function storeAwareHref(href: string | null, record: MerchantVerificationRecord): string | null {
  if (!href) return null;
  if (!record.storeId) return href;
  if (href === '/store-payment-settings' || href === '/settlement-readiness' || href === '/store-billing') {
    return `${href}?storeId=${record.storeId}`;
  }
  return href;
}

function statusTone(status: 'passed' | 'blocked' | 'warning'): StageTone {
  if (status === 'passed') return 'complete';
  return status === 'warning' ? 'warning' : 'blocked';
}

function stageClass(tone: StageTone): string {
  if (tone === 'complete') return 'border-emerald-100 bg-emerald-50 text-emerald-800';
  if (tone === 'warning') return 'border-amber-100 bg-amber-50 text-amber-800';
  return 'border-red-100 bg-red-50 text-red-800';
}

function stageLabel(tone: StageTone): string {
  if (tone === 'complete') return 'مكتمل';
  if (tone === 'warning') return 'تنبيه';
  return 'مانع';
}

function approvalStages(record: MerchantVerificationRecord) {
  const checklist = new Map(record.readiness.checklist.map((item) => [item.key, item]));
  const stageFromChecklist = (key: PublishReadinessChecklistItem['key']) => {
    const item = checklist.get(key);
    return item
      ? {
          title: item.label,
          tone: statusTone(item.status),
          message: item.message,
          actionLabel: item.action.adminLabel,
          actionHref: item.action.adminHref,
          merchantInstruction: item.action.merchantInstruction,
        }
      : null;
  };

  return [
    stageFromChecklist('store_profile'),
    stageFromChecklist('phone'),
    stageFromChecklist('email'),
    stageFromChecklist('registry'),
    stageFromChecklist('bank'),
    stageFromChecklist('payment'),
    stageFromChecklist('shipping'),
    stageFromChecklist('policies'),
    stageFromChecklist('risk'),
    {
      title: 'قرار النشر',
      tone: record.readiness.allowed ? 'complete' as const : 'blocked' as const,
      message: record.readiness.allowed ? 'كل موانع النشر مغلقة.' : 'لا يسمح بالنشر قبل إغلاق الموانع.',
      actionLabel: record.readiness.allowed ? 'جاهز لقرار المراجع' : 'راجع الموانع',
      actionHref: null,
      merchantInstruction: record.readiness.allowed
        ? 'لا يحتاج التاجر إجراءً إضافيًا قبل قرار المراجع.'
        : 'يعالج التاجر البنود المانعة ثم يعيد التقديم للمراجعة.',
    },
  ].filter((stage): stage is NonNullable<typeof stage> => Boolean(stage));
}

function asRecord(value: unknown): StoreScopedRow {
  return value && typeof value === 'object' ? value as StoreScopedRow : {};
}

function rowNumber(row: StoreScopedRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function rowString(row: StoreScopedRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function matchesStoreScope(value: unknown, record: MerchantVerificationRecord): boolean {
  const row = asRecord(value);
  const storeId = rowNumber(row, ['storeId', 'store_id', 'sellerStoreId', 'merchantStoreId']);
  const tenantId = rowNumber(row, ['tenantId', 'tenant_id', 'merchantId', 'merchant_id']);
  if (record.storeId && storeId === record.storeId) return true;
  if (record.tenantId && tenantId === record.tenantId) return true;
  const storeName = rowString(row, ['storeName', 'merchantName', 'sellerName', 'store_name']);
  return Boolean(storeName && storeName.trim() === record.storeName.trim());
}

function filterStoreRows<T>(rows: T[] | undefined, record: MerchantVerificationRecord): T[] {
  return (rows ?? []).filter((row) => matchesStoreScope(row, record));
}

function sumMoney(rows: unknown[], keys: string[]): number {
  return rows.reduce<number>((total, item) => total + (rowNumber(asRecord(item), keys) ?? 0), 0);
}

function formatMoney(value: number, currency = 'SAR'): string {
  return `${value.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function latestRows<T>(rows: T[], limit = 5): T[] {
  return [...rows]
    .sort((a, b) => {
      const aDate = new Date(rowString(asRecord(a), ['createdAt', 'updatedAt', 'requestedAt', 'paidAt', 'reconciledAt']) ?? 0).getTime();
      const bDate = new Date(rowString(asRecord(b), ['createdAt', 'updatedAt', 'requestedAt', 'paidAt', 'reconciledAt']) ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, limit);
}

function MiniStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-4 min-h-[92px]">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <div className="mt-2 text-xl font-bold text-gray-900 tabular-nums">{value}</div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function activityMatchLabel(status: MerchantVerificationRecord['registry']['activityMatchStatus']): string {
  if (status === 'matched') return 'مطابق';
  if (status === 'mismatch') return 'غير مطابق';
  return 'غير مفحوص';
}

function bankReviewHint(record: MerchantVerificationRecord, bankActionable: boolean): string {
  if (!record.bank.id) return 'لا يوجد حساب بنكي مضاف لهذا المتجر.';
  if (bankActionable) return 'راجع الاسم وآخر 4 أرقام فقط، ثم وثق أو ارفض مع سبب واضح.';
  if (record.bank.verificationStatus === 'verified') return 'الحساب موثق حاليًا.';
  return 'الحالة الحالية لا تقبل قرارًا من هذه الصفحة.';
}

function StoreDetailsSection({ record }: { record: MerchantVerificationRecord }) {
  return (
    <DetailSection title="بيانات المتجر">
      <Field label="اسم المتجر" value={record.storeName} />
      <Field label="رابط المتجر" value={<StoreLink record={record} />} />
      <Field label="حالة النشر" value={<StatusBadge label={PUBLISH_LABEL[record.publishStatus]} className={classForPublish(record.publishStatus)} />} />
      <Field label="آخر تحديث" value={formatDate(record.lastUpdated)} />
    </DetailSection>
  );
}

function OwnerDetailsSection({ record }: { record: MerchantVerificationRecord }) {
  return (
    <DetailSection title="بيانات المالك">
      <Field label="اسم المالك" value={record.ownerName} />
      <Field label="نوع الكيان" value={ENTITY_LABEL[record.entityType]} />
      <Field label="مستوى المخاطر" value={<StatusBadge label={RISK_LABEL[record.riskStatus]} className={classForRisk(record.riskStatus)} />} />
    </DetailSection>
  );
}

function ContactVerificationSection({ record }: { record: MerchantVerificationRecord }) {
  return (
    <DetailSection title="توثيق الجوال والبريد">
      <Field label="الجوال" value={<StatusBadge label={record.contact.phoneVerified ? 'موثق' : 'غير موثق'} className={record.contact.phoneVerified ? STATUS_CLASS.good : STATUS_CLASS.bad} />} />
      <Field label="وقت توثيق الجوال" value={formatDate(record.contact.phoneVerifiedAt)} />
      <Field label="البريد" value={<StatusBadge label={record.contact.emailVerified ? 'موثق' : 'غير موثق'} className={record.contact.emailVerified ? STATUS_CLASS.good : STATUS_CLASS.bad} />} />
      <Field label="وقت توثيق البريد" value={formatDate(record.contact.emailVerifiedAt)} />
      <Field label="آخر محاولة OTP" value={formatDate(record.contact.lastOtpAttemptAt)} />
      <Field label="حالة آخر محاولة" value={valueOrDash(record.contact.lastOtpAttemptStatus)} />
      {record.contact.phoneChangedAfterVerification && (
        <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
          تم تغيير رقم الجوال بعد التوثيق.
        </div>
      )}
    </DetailSection>
  );
}

function RegistrySection({ record }: { record: MerchantVerificationRecord }) {
  return (
    <DetailSection title={record.entityType === 'freelance' ? 'وثيقة العمل الحر' : 'السجل التجاري'}>
      {record.entityType === 'freelance' ? (
        <>
          <Field label="رقم الوثيقة" value={valueOrDash(record.registry.freelanceDocumentNumber)} />
          <Field label="اسم حامل الوثيقة" value={valueOrDash(record.registry.holderName)} />
          <Field label="النشاط" value={valueOrDash(record.registry.activity)} />
          <Field label="تاريخ الانتهاء" value={formatDate(record.registry.expiryDate)} />
        </>
      ) : (
        <>
          <Field label="رقم السجل" value={valueOrDash(record.registry.commercialRegistrationNumber)} />
          <Field label="اسم الكيان" value={valueOrDash(record.registry.entityName)} />
          <Field label="الرقم الوطني الموحد" value={valueOrDash(record.registry.unifiedNationalNumber)} />
          <Field label="تاريخ الإصدار" value={formatDate(record.registry.issueDate)} />
          <Field label="تاريخ الانتهاء" value={formatDate(record.registry.expiryDate)} />
        </>
      )}
      <Field label="الحالة" value={<StatusBadge label={REGISTRY_LABEL[record.registry.status]} className={classForRegistry(record.registry.status)} />} />
      <Field label="مطابقة النشاط" value={activityMatchLabel(record.registry.activityMatchStatus)} />
    </DetailSection>
  );
}

function UploadedDocumentsSection({ record }: { record: MerchantVerificationRecord }) {
  return (
    <DetailSection title="المستندات المرفوعة">
      {record.documents.length > 0 ? (
        <div className="space-y-2">
          {record.documents.map((document, index) => (
            <div key={document.id ?? `${document.type}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="FileText" size="xs" className="text-gray-400" />
                <span className="text-sm text-gray-700 truncate">{document.filename ?? document.type ?? 'مستند'}</span>
              </div>
              {document.fileUrl ? (
                <a href={document.fileUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary-600 hover:underline">عرض</a>
              ) : (
                <span className="text-xs text-gray-400">غير متاح</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">لا توجد مستندات مرفوعة</p>
      )}
    </DetailSection>
  );
}

function ReviewDecisionsSection({ record, title = 'سجل قرارات المراجعة' }: { record: MerchantVerificationRecord; title?: string }) {
  return (
    <DetailSection title={title}>
      {record.reviewDecisions.length > 0 ? (
        <div className="space-y-2">
          {record.reviewDecisions.map((decision, index) => (
            <div key={`${decision.status}-${index}`} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">{valueOrDash(decision.status)}</span>
                <span className="text-xs text-gray-400">{formatDate(decision.reviewedAt)}</span>
              </div>
              {decision.reason && <p className="mt-1 text-xs text-gray-500">{decision.reason}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">لا توجد قرارات مراجعة بعد</p>
      )}
    </DetailSection>
  );
}

type BankReviewSectionProps = {
  record: MerchantVerificationRecord;
  bankActionable: boolean;
  canReviewBank: boolean;
  bankReviewPending: boolean;
  bankDecisionMode: BankDecisionMode | null;
  bankReviewReason: string;
  showHint?: boolean;
  onOpenBankDecision: (mode: BankDecisionMode) => void;
  onBankReviewReasonChange: (value: string) => void;
  onSubmitBankDecision: (status: 'verified' | 'rejected') => void;
};

function BankReviewSection({
  record,
  bankActionable,
  canReviewBank,
  bankReviewPending,
  bankDecisionMode,
  bankReviewReason,
  showHint = false,
  onOpenBankDecision,
  onBankReviewReasonChange,
  onSubmitBankDecision,
}: BankReviewSectionProps) {
  return (
    <DetailSection title="الحساب البنكي">
      <Field label="اسم البنك" value={valueOrDash(record.bank.bankName)} />
      <Field label="صاحب الحساب" value={valueOrDash(record.bank.accountHolderName)} />
      <Field label="IBAN آخر 4" value={record.bank.ibanLast4 ? `****${record.bank.ibanLast4}` : 'غير متوفر'} />
      <Field label="الحالة" value={<StatusBadge label={BANK_LABEL[record.bank.verificationStatus]} className={classForBank(record.bank.verificationStatus)} />} />
      <Field label="سبب الرفض" value={valueOrDash(record.bank.rejectionReason)} />
      <Field label="وقت المراجعة" value={formatDate(record.bank.reviewedAt)} />
      <Field label="المراجع" value={valueOrDash(record.bank.reviewedBy)} />
      <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">قرار الحساب البنكي</p>
          {showHint && <p className="text-xs text-gray-500 mt-1 leading-5">{bankReviewHint(record, bankActionable)}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenBankDecision('verify')}
            disabled={!bankActionable || bankReviewPending}
            className="h-10 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
          >
            توثيق البنك
          </button>
          <button
            type="button"
            onClick={() => onOpenBankDecision('reject')}
            disabled={!record.bank.id || !canReviewBank || record.bank.verificationStatus === 'rejected' || bankReviewPending}
            className="h-10 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
          >
            رفض البنك
          </button>
        </div>
        {bankDecisionMode && (
          <div className={`rounded-xl border p-3 space-y-2 ${bankDecisionMode === 'verify' ? 'border-emerald-100 bg-emerald-50' : 'border-red-100 bg-red-50'}`}>
            <label htmlFor="merchant-bank-review-reason" className={`text-xs font-semibold ${bankDecisionMode === 'verify' ? 'text-emerald-900' : 'text-red-800'}`}>
              {bankDecisionMode === 'verify' ? 'سبب توثيق البنك' : 'سبب رفض البنك'}
            </label>
            <textarea
              id="merchant-bank-review-reason"
              value={bankReviewReason}
              onChange={(event) => onBankReviewReasonChange(event.target.value)}
              className={`w-full min-h-[88px] rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${bankDecisionMode === 'verify' ? 'border-emerald-200 focus:ring-emerald-500' : 'border-red-200 focus:ring-red-500'}`}
              placeholder={bankDecisionMode === 'verify' ? 'مثال: الاسم مطابق وآخر 4 أرقام مطابقة للمستند.' : 'مثال: اسم صاحب الحساب لا يطابق السجل التجاري.'}
            />
            <button
              type="button"
              onClick={() => onSubmitBankDecision(bankDecisionMode === 'verify' ? 'verified' : 'rejected')}
              disabled={bankReviewReason.trim().length < 3 || bankReviewPending}
              className={`h-10 w-full rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-colors ${bankDecisionMode === 'verify' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {bankDecisionMode === 'verify' ? 'تأكيد توثيق البنك' : 'تأكيد رفض البنك'}
            </button>
          </div>
        )}
      </div>
    </DetailSection>
  );
}

type MerchantProfileSectionsProps = BankReviewSectionProps & {
  showBankHint?: boolean;
};

function MerchantProfileSections({ showBankHint = false, ...bankProps }: MerchantProfileSectionsProps) {
  return (
    <>
      <StoreDetailsSection record={bankProps.record} />
      <OwnerDetailsSection record={bankProps.record} />
      <ContactVerificationSection record={bankProps.record} />
      <RegistrySection record={bankProps.record} />
      <BankReviewSection {...bankProps} showHint={showBankHint} />
      <UploadedDocumentsSection record={bankProps.record} />
    </>
  );
}

type VerificationReviewPanelProps = {
  record: MerchantVerificationRecord;
  canReviewVerification: boolean;
  canApproveSelected: boolean;
  canRequestChanges: boolean;
  reviewPending: boolean;
  decisionMode: VerificationDecisionMode | null;
  decisionReason: string;
  compact?: boolean;
  onApprove: () => void;
  onOpenDecision: (mode: VerificationDecisionMode) => void;
  onDecisionReasonChange: (value: string) => void;
  submitDecision: (status: Exclude<AdminKycReviewStatus, 'approved'>) => void;
};

function VerificationReviewPanel({
  record,
  canReviewVerification,
  canApproveSelected,
  canRequestChanges,
  reviewPending,
  decisionMode,
  decisionReason,
  compact = false,
  onApprove,
  onOpenDecision,
  onDecisionReasonChange,
  submitDecision,
}: VerificationReviewPanelProps) {
  return (
    <section className={compact ? 'rounded-xl border border-gray-100 bg-white p-3 space-y-3' : 'rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-4'}>
      <div>
        <h3 className="text-sm font-bold text-gray-900">قرار مراجعة التوثيق</h3>
        <p className="text-xs text-gray-500 mt-1 leading-5">{reviewBlockedMessage(record, canReviewVerification)}</p>
      </div>
      <div className={compact ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
        <button
          type="button"
          onClick={onApprove}
          disabled={!canApproveSelected || reviewPending}
          className={`${compact ? 'h-11' : 'h-11 w-full'} rounded-lg bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors`}
        >
          اعتماد التوثيق
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onOpenDecision('changes')}
            disabled={!canRequestChanges || reviewPending}
            className="h-11 rounded-lg border border-amber-200 text-amber-800 text-sm font-semibold hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 transition-colors"
          >
            طلب تعديلات
          </button>
          <button
            type="button"
            onClick={() => onOpenDecision('reject')}
            disabled={!canRequestChanges || reviewPending}
            className="h-11 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
          >
            رفض التوثيق
          </button>
        </div>
      </div>
      {decisionMode && (
        <div className={`rounded-xl border p-3 space-y-2 ${decisionMode === 'changes' ? 'border-amber-100 bg-amber-50' : 'border-red-100 bg-red-50'}`}>
          <label htmlFor="merchant-verification-decision-reason" className={`text-xs font-semibold ${decisionMode === 'changes' ? 'text-amber-900' : 'text-red-800'}`}>
            {decisionMode === 'changes' ? 'التعديلات المطلوبة للتاجر' : 'سبب الرفض النهائي'}
          </label>
          <textarea
            id="merchant-verification-decision-reason"
            value={decisionReason}
            onChange={(event) => onDecisionReasonChange(event.target.value)}
            className={`w-full min-h-[112px] rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${decisionMode === 'changes' ? 'border-amber-200 focus:ring-amber-500' : 'border-red-200 focus:ring-red-500'}`}
            placeholder={decisionMode === 'changes' ? 'اكتب قائمة التعديلات المطلوبة قبل إعادة التقديم.' : 'اكتب سببًا واضحًا للرفض النهائي.'}
          />
          <button
            type="button"
            onClick={() => submitDecision(decisionMode === 'changes' ? 'needs_more_info' : 'rejected')}
            disabled={decisionReason.trim().length < 3 || reviewPending}
            className={`h-10 w-full rounded-lg text-white text-sm font-semibold disabled:opacity-40 transition-colors ${decisionMode === 'changes' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {decisionMode === 'changes' ? 'إرسال طلب التعديلات' : 'تأكيد الرفض'}
          </button>
        </div>
      )}
    </section>
  );
}

export default function Compliance() {
  const { recordId } = useParams<{ recordId?: string }>();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | VerificationStatus>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | RiskStatus>('all');
  const [entityFilter, setEntityFilter] = useState<'all' | MerchantEntityType>('all');
  const [activeTab, setActiveTab] = useState<MerchantFileTab>('approval');
  const [decisionMode, setDecisionMode] = useState<VerificationDecisionMode | null>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [bankDecisionMode, setBankDecisionMode] = useState<BankDecisionMode | null>(null);
  const [bankReviewReason, setBankReviewReason] = useState('');
  const isMerchantFile = Boolean(recordId);

  const canReadStores = hasAdminPermission('stores.read');
  const canReadKyc = hasAdminPermission('kyc.read');
  const canReadBankAccounts = hasAdminPermission('kyc.read') || hasAdminPermission('merchant.bank_accounts.view');
  const canReviewVerification = hasAdminPermission('kyc.review');
  const canReviewBank = hasAdminPermission('kyc.review') || hasAdminPermission('merchant.bank_accounts.verify_for_payout');
  const canReadPayments = hasAdminPermission('payments.read');
  const canReadFinance = hasAdminPermission('wallet.payout.view_all');
  const canReadAudit = hasAdminPermission('audit.read');
  const canReadMarketplace = hasAdminPermission('marketplace.read');

  const tenantsQuery = useQuery<MerchantTenantSource[]>({
    queryKey: queryKeys.compliance,
    queryFn: () => adminApi.getTenants() as unknown as Promise<MerchantTenantSource[]>,
  });

  const storesQuery = useQuery<MerchantStoreSource[]>({
    queryKey: queryKeys.stores,
    queryFn: () => adminApi.getStores() as unknown as Promise<MerchantStoreSource[]>,
    enabled: canReadStores,
  });

  const kycQuery = useQuery<MerchantKycProfileSource[]>({
    queryKey: queryKeys.kycProfiles,
    queryFn: () => adminApi.getKycProfiles() as unknown as Promise<MerchantKycProfileSource[]>,
    enabled: canReadKyc,
  });

  const bankQuery = useQuery<MerchantBankAccountSource[]>({
    queryKey: queryKeys.bankAccounts,
    queryFn: () => adminApi.getBankAccounts() as unknown as Promise<MerchantBankAccountSource[]>,
    enabled: canReadBankAccounts,
  });

  const reviewMutation = useMutation({
    mutationFn: (vars: { id: number; status: AdminKycReviewStatus; rejectionReason?: string }) =>
      adminApi.reviewKyc(vars.id, vars.status, vars.rejectionReason),
    onSuccess: (_data, vars) => {
      const message = vars.status === 'approved'
        ? 'تم اعتماد التوثيق'
        : vars.status === 'needs_more_info'
          ? 'تم إرسال طلب التعديلات'
          : 'تم رفض التوثيق';
      toast.success(message);
      setDecisionMode(null);
      setDecisionReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.kycProfiles });
      queryClient.invalidateQueries({ queryKey: queryKeys.compliance });
    },
    onError: () => toast.error('فشل تحديث قرار التوثيق'),
  });

  const bankReviewMutation = useMutation({
    mutationFn: (vars: { id: number; status: 'verified' | 'rejected'; reason: string }) =>
      adminApi.reviewBankAccount(vars.id, vars.status, vars.reason),
    onSuccess: (_data, vars) => {
      toast.success(vars.status === 'verified' ? 'تم توثيق الحساب البنكي' : 'تم رفض الحساب البنكي');
      setBankDecisionMode(null);
      setBankReviewReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.bankAccounts });
    },
    onError: () => toast.error('فشل تحديث حالة الحساب البنكي'),
  });

  const records = useMemo(() => buildMerchantVerificationRecords({
    tenants: tenantsQuery.data ?? [],
    stores: storesQuery.data ?? [],
    kycProfiles: kycQuery.data ?? [],
    bankAccounts: bankQuery.data ?? [],
  }), [bankQuery.data, kycQuery.data, storesQuery.data, tenantsQuery.data]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (statusFilter !== 'all' && record.verificationStatus !== statusFilter) return false;
    if (riskFilter !== 'all' && record.riskStatus !== riskFilter) return false;
    if (entityFilter !== 'all' && record.entityType !== entityFilter) return false;
    return true;
  }), [entityFilter, records, riskFilter, statusFilter]);

  const controls = useTableControls<MerchantVerificationRecord>({
    rows: filteredRecords,
    filterFn: matchesMerchantSearch,
    initialSort: { key: 'lastUpdated', dir: 'desc' },
    storageKey: 'merchantVerification',
  });

  const metricRecords = useMemo(() => (
    controls.query.trim()
      ? filteredRecords.filter((record) => matchesMerchantSearch(record, controls.query))
      : filteredRecords
  ), [controls.query, filteredRecords]);

  const selectedRecord = useMemo(() => (
    recordId ? records.find((record) => record.id === recordId) ?? null : null
  ), [recordId, records]);

  const paymentsQuery = useQuery<StoreScopedRow[]>({
    queryKey: [...queryKeys.payments, 'merchantFile', selectedRecord?.storeId ?? selectedRecord?.tenantId ?? null],
    queryFn: () => adminApi.getPayments({ storeId: selectedRecord!.storeId! }) as Promise<StoreScopedRow[]>,
    enabled: isMerchantFile && canReadPayments && Boolean(selectedRecord?.storeId),
  });

  const settlementBatchesQuery = useQuery<SettlementBatch[]>({
    queryKey: [...queryKeys.settlementBatches, 'merchantFile', selectedRecord?.storeId ?? null],
    queryFn: () => adminApi.getSettlementBatches(selectedRecord?.storeId ?? undefined),
    enabled: isMerchantFile && canReadFinance && Boolean(selectedRecord?.storeId),
  });

  const payoutsQuery = useQuery<Payout[]>({
    queryKey: [...queryKeys.settlementBatches, 'merchantFilePayouts', selectedRecord?.storeId ?? selectedRecord?.tenantId ?? null],
    queryFn: () => adminApi.listPayouts(),
    enabled: isMerchantFile && canReadFinance && Boolean(selectedRecord),
  });

  const marketplaceOrdersQuery = useQuery<StoreScopedRow[]>({
    queryKey: [...queryKeys.marketplaceOrders, 'merchantFile', selectedRecord?.storeId ?? selectedRecord?.tenantId ?? null],
    queryFn: async () => (await adminApi.getMarketplaceOrders({ page: 1, limit: 50 })).data as StoreScopedRow[],
    enabled: isMerchantFile && canReadMarketplace && Boolean(selectedRecord),
  });

  const auditQuery = useQuery<StoreScopedRow[]>({
    queryKey: [...queryKeys.auditLogs, 'merchantFile', selectedRecord?.storeId ?? selectedRecord?.tenantId ?? null],
    queryFn: () => adminApi.getAuditLogs() as Promise<StoreScopedRow[]>,
    enabled: isMerchantFile && canReadAudit && Boolean(selectedRecord),
  });

  const storePaymentSettingsQuery = useQuery<AdminStorePaymentSetting[]>({
    queryKey: [...queryKeys.storePaymentSettings, selectedRecord?.storeId ?? null, 'merchantFile'],
    queryFn: () => adminApi.getStorePaymentSettings(selectedRecord!.storeId!),
    enabled: isMerchantFile && canReadStores && Boolean(selectedRecord?.storeId),
  });

  const settlementReadinessQuery = useQuery<StoreScopedRow>({
    queryKey: [...queryKeys.settlementReadiness, selectedRecord?.storeId ?? null, 'merchantFile'],
    queryFn: () => adminApi.getSettlementReadiness(selectedRecord!.storeId!) as Promise<StoreScopedRow>,
    enabled: isMerchantFile && canReadFinance && Boolean(selectedRecord?.storeId),
  });

  const scopedPayments = selectedRecord ? filterStoreRows(paymentsQuery.data, selectedRecord) : [];
  const scopedPayouts = selectedRecord ? filterStoreRows(payoutsQuery.data, selectedRecord) : [];
  const scopedMarketplaceOrders = selectedRecord ? filterStoreRows(marketplaceOrdersQuery.data, selectedRecord) : [];
  const scopedAuditLogs = selectedRecord ? filterStoreRows(auditQuery.data, selectedRecord) : [];
  const scopedSettlementBatches = settlementBatchesQuery.data ?? [];
  const grossSales = sumMoney(scopedPayments, ['amount', 'grossAmount', 'total', 'paidAmount'])
    || sumMoney(scopedMarketplaceOrders, ['total', 'amount', 'grandTotal']);
  const payoutTotal = sumMoney(scopedPayouts, ['amount', 'netAmount', 'merchantPayable']);

  const loading = tenantsQuery.isPending
    || (canReadStores && storesQuery.isPending)
    || (canReadKyc && kycQuery.isPending)
    || (canReadBankAccounts && bankQuery.isPending);
  const error = tenantsQuery.isError
    || (canReadStores && storesQuery.isError)
    || (canReadKyc && kycQuery.isError)
    || (canReadBankAccounts && bankQuery.isError);

  const total = records.length;
  const visibleTotal = metricRecords.length;
  const approved = metricRecords.filter((record) => record.verificationStatus === 'approved').length;
  const pending = metricRecords.filter((record) => record.verificationStatus === 'submitted' || record.verificationStatus === 'under_review').length;
  const rejected = metricRecords.filter((record) => record.verificationStatus === 'rejected').length;
  const actualRisk = metricRecords.filter((record) => record.riskStatus === 'high' || record.riskStatus === 'blocked').length;

  const approveSelected = () => {
    if (!selectedRecord?.kycProfileId || !canReviewVerification || !selectedRecord.readiness.allowed) return;
    reviewMutation.mutate({ id: selectedRecord.kycProfileId, status: 'approved' });
  };

  const submitDecision = (status: Exclude<AdminKycReviewStatus, 'approved'>) => {
    if (!selectedRecord?.kycProfileId || !canReviewVerification || decisionReason.trim().length < 3) return;
    reviewMutation.mutate({
      id: selectedRecord.kycProfileId,
      status,
      rejectionReason: decisionReason.trim(),
    });
  };

  const openDecision = (mode: VerificationDecisionMode) => {
    if (!selectedRecord) return;
    setDecisionMode((current) => (current === mode ? null : mode));
    setDecisionReason(mode === 'changes' ? suggestedChangeReason(selectedRecord) : '');
    setBankDecisionMode(null);
    setBankReviewReason('');
  };

  const openBankDecision = (mode: BankDecisionMode) => {
    setBankDecisionMode((current) => (current === mode ? null : mode));
    setBankReviewReason('');
    setDecisionMode(null);
    setDecisionReason('');
  };

  const submitBankDecision = (status: 'verified' | 'rejected') => {
    if (!selectedRecord?.bank.id || !canReviewBank || bankReviewReason.trim().length < 3) return;
    bankReviewMutation.mutate({
      id: selectedRecord.bank.id,
      status,
      reason: bankReviewReason.trim(),
    });
  };

  const selectedReviewable = Boolean(
    selectedRecord?.kycProfileId
    && (selectedRecord.verificationStatus === 'submitted' || selectedRecord.verificationStatus === 'under_review')
  );
  const canApproveSelected = Boolean(canReviewVerification && selectedReviewable && selectedRecord?.readiness.allowed);
  const canRequestChanges = Boolean(canReviewVerification && selectedReviewable);
  const bankActionable = Boolean(selectedRecord?.bank.id && canReviewBank && canActOnBank(selectedRecord.bank.verificationStatus));

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-10 w-56 rounded-xl bg-gray-200 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-28 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
        <AdminTableSkeleton columns={['w-48', 'w-32', 'w-28', 'w-28', 'w-28']} rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="فشل تحميل بيانات توثيق المتاجر"
        onRetry={() => {
          tenantsQuery.refetch();
          if (canReadStores) storesQuery.refetch();
          if (canReadKyc) kycQuery.refetch();
          if (canReadBankAccounts) bankQuery.refetch();
        }}
      />
    );
  }

  if (isMerchantFile) {
    if (!selectedRecord) {
      return (
        <div className="space-y-4">
          <Link to="/compliance" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800">
            <Icon name="ChevronRight" size="xs" />
            العودة إلى قائمة التجار
          </Link>
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
            <p className="text-sm font-semibold text-gray-900">ملف التاجر غير موجود</p>
            <p className="mt-2 text-sm text-gray-500">قد يكون الرابط قديمًا أو أن الفلاتر المحلية لم تعد تحتوي هذا المتجر.</p>
          </div>
        </div>
      );
    }

    const stages = approvalStages(selectedRecord);
    const passedStages = stages.filter((stage) => stage.tone === 'complete').length;
    const readinessPercent = Math.round((passedStages / Math.max(1, stages.length)) * 100);
    const latestPayments = latestRows(scopedPayments, 5);
    const latestOrders = latestRows(scopedMarketplaceOrders, 5);
    const latestPayouts = latestRows(scopedPayouts, 5);
    const latestAudit = latestRows(scopedAuditLogs, 6);
    const paymentSettings = storePaymentSettingsQuery.data ?? [];
    const settlementReadiness = settlementReadinessQuery.data ?? {};

    return (
      <div className="space-y-6">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-gray-400">
              <Link to="/" className="hover:text-primary-600">الرئيسية</Link>
              <span className="mx-2">/</span>
              <Link to="/compliance" className="hover:text-primary-600">توثيق المتاجر</Link>
              <span className="mx-2">/</span>
              <span>{selectedRecord.storeName}</span>
            </div>
            <Link
              to="/compliance"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Icon name="ChevronRight" size="xs" />
              قائمة التجار
            </Link>
          </div>

          <section className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 lg:p-6 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-title1 font-bold text-gray-900 tracking-tight">{selectedRecord.storeName}</h1>
                  <StatusBadge label={VERIFICATION_LABEL[selectedRecord.verificationStatus]} className={classForVerification(selectedRecord.verificationStatus)} />
                  <StatusBadge label={PUBLISH_LABEL[selectedRecord.publishStatus]} className={classForPublish(selectedRecord.publishStatus)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                  <span>المالك: <strong className="text-gray-900">{selectedRecord.ownerName}</strong></span>
                  <span>نوع الكيان: <strong className="text-gray-900">{ENTITY_LABEL[selectedRecord.entityType]}</strong></span>
                  <span>Store ID: <strong className="text-gray-900 tabular-nums">{selectedRecord.storeId ?? 'غير متوفر'}</strong></span>
                  <StoreLink record={selectedRecord} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-2 min-w-[260px]">
                <StatusBadge label={`المخاطر: ${RISK_LABEL[selectedRecord.riskStatus]}`} className={classForRisk(selectedRecord.riskStatus)} />
                <StatusBadge label={`البنك: ${BANK_LABEL[selectedRecord.bank.verificationStatus]}`} className={classForBank(selectedRecord.bank.verificationStatus)} />
                <StatusBadge label={`السجل: ${REGISTRY_LABEL[selectedRecord.registry.status]}`} className={classForRegistry(selectedRecord.registry.status)} />
                <StatusBadge label={`السحب: ${PAYOUT_LABEL[selectedRecord.payoutStatus]}`} className={classForPayout(selectedRecord.payoutStatus)} />
              </div>
            </div>
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 flex flex-wrap gap-2">
              <Link to={`/stores?storeId=${selectedRecord.storeId ?? ''}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                <Icon name="Store" size="xs" />
                بيانات المتجر
              </Link>
              <Link to="/kyc" className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                <Icon name="ShieldCheck" size="xs" />
                ملفات التوثيق
              </Link>
              <Link to="/bank-accounts" className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                <Icon name="Building2" size="xs" />
                الحسابات البنكية
              </Link>
              {selectedRecord.storeId && (
                <>
                  <Link to={`/store-payment-settings?storeId=${selectedRecord.storeId}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                    <Icon name="CreditCard" size="xs" />
                    إعدادات الدفع
                  </Link>
                  <Link to={`/settlement-readiness?storeId=${selectedRecord.storeId}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-white border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                    <Icon name="CheckSquare" size="xs" />
                    جاهزية التسوية
                  </Link>
                </>
              )}
            </div>
          </section>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <MiniStat label="اكتمال الاعتماد" value={`${readinessPercent}%`} hint={`${passedStages} من ${stages.length} مرحلة`} />
          <MiniStat label="موانع النشر" value={selectedRecord.readiness.blockingReasons.length} hint={selectedRecord.readiness.allowed ? 'لا توجد موانع' : 'تحتاج إجراء'} />
          <MiniStat label="المبيعات/المدفوعات" value={formatMoney(grossSales)} hint={`${scopedPayments.length + scopedMarketplaceOrders.length} سجل`} />
          <MiniStat label="المستخلصات" value={formatMoney(payoutTotal)} hint={`${scopedPayouts.length} طلب`} />
          <MiniStat label="التسويات" value={scopedSettlementBatches.length} hint="دفعات مرتبطة بالمتجر" />
        </div>

        <section className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">مراحل اعتماد التاجر</h2>
              <p className="text-sm text-gray-500 mt-1">كل مرحلة أمام المراجع مع سبب المنع والإجراء المطلوب.</p>
            </div>
            <StatusBadge
              label={selectedRecord.readiness.allowed ? 'جاهز لقرار النشر' : 'غير جاهز للنشر'}
              className={selectedRecord.readiness.allowed ? STATUS_CLASS.good : STATUS_CLASS.bad}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            {stages.map((stage) => {
              const href = storeAwareHref(stage.actionHref, selectedRecord);
              return (
                <article key={stage.title} className={`rounded-xl border p-3 min-h-[150px] flex flex-col justify-between ${stageClass(stage.tone)}`}>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold">{stage.title}</h3>
                      <span className="text-xs font-bold">{stageLabel(stage.tone)}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 opacity-90">{stage.message}</p>
                  </div>
                  <div className="mt-3 space-y-2">
                    {href ? (
                      <Link to={href} className="inline-flex h-8 items-center gap-1 rounded-lg bg-white/80 px-2 text-xs font-bold text-gray-900 hover:bg-white">
                        <Icon name="Eye" size="xs" />
                        {stage.actionLabel}
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-8 items-center rounded-lg bg-white/60 px-2 text-xs font-bold text-gray-900">
                        {stage.actionLabel}
                      </span>
                    )}
                    <p className="text-xs leading-5 opacity-90">للتاجر: {stage.merchantInstruction}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <nav className="rounded-xl bg-white border border-gray-100 shadow-sm p-2 flex flex-wrap gap-2" aria-label="أقسام ملف التاجر">
          {MERCHANT_FILE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'approval' && (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
            <DetailSection title="موانع وتوصيات الجاهزية">
              {selectedRecord.readiness.blockingReasons.length > 0 ? (
                <ul className="space-y-2">
                  {selectedRecord.readiness.blockingReasons.map((reason) => (
                    <li key={reason} className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-800">{reason}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-700 font-semibold">لا توجد موانع جاهزية حالية.</p>
              )}
              {selectedRecord.readiness.warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedRecord.readiness.warnings.map((warning) => (
                    <div key={warning} className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-800">{warning}</div>
                  ))}
                </div>
              )}
            </DetailSection>

            <VerificationReviewPanel
              record={selectedRecord}
              canReviewVerification={canReviewVerification}
              canApproveSelected={canApproveSelected}
              canRequestChanges={canRequestChanges}
              reviewPending={reviewMutation.isPending}
              decisionMode={decisionMode}
              decisionReason={decisionReason}
              onApprove={approveSelected}
              onOpenDecision={openDecision}
              onDecisionReasonChange={setDecisionReason}
              submitDecision={submitDecision}
            />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <MerchantProfileSections
              record={selectedRecord}
              bankActionable={bankActionable}
              canReviewBank={canReviewBank}
              bankReviewPending={bankReviewMutation.isPending}
              bankDecisionMode={bankDecisionMode}
              bankReviewReason={bankReviewReason}
              onOpenBankDecision={openBankDecision}
              onBankReviewReasonChange={setBankReviewReason}
              onSubmitBankDecision={submitBankDecision}
            />
          </div>
        )}

        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <DetailSection title="جاهزية الدفع">
              <Field label="الحالة" value={selectedRecord.paymentStatus === 'active' || selectedRecord.paymentStatus === 'configured' ? 'جاهز' : 'غير معد'} />
              <Field label="مزودات الدفع" value={storePaymentSettingsQuery.isPending ? 'جاري التحميل' : `${paymentSettings.length} مزود`} />
              {paymentSettings.length > 0 && (
                <div className="mt-3 space-y-2">
                  {paymentSettings.map((setting) => (
                    <div key={setting.id} className="rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-gray-900">{setting.displayNameAr ?? setting.providerCode}</span>
                      <StatusBadge label={setting.status} className={setting.enabled ? STATUS_CLASS.good : STATUS_CLASS.muted} />
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
            <DetailSection title="جاهزية الشحن وسياسات المتجر">
              <Field label="الشحن" value={selectedRecord.shippingStatus === 'active' || selectedRecord.shippingStatus === 'configured' ? 'جاهز' : 'غير معد'} />
              <Field label="السياسات المطلوبة" value={selectedRecord.policiesPresent ? 'موجودة' : 'غير مكتملة'} />
              <Field label="جاهزية السحب" value={<StatusBadge label={PAYOUT_LABEL[selectedRecord.payoutStatus]} className={classForPayout(selectedRecord.payoutStatus)} />} />
            </DetailSection>
            <DetailSection title="جاهزية النشر">
              <Field label="حالة النشر" value={<StatusBadge label={PUBLISH_LABEL[selectedRecord.publishStatus]} className={classForPublish(selectedRecord.publishStatus)} />} />
              <Field label="قرار الجاهزية" value={selectedRecord.readiness.allowed ? 'مسموح بعد الاعتماد' : `${selectedRecord.readiness.blockingReasons.length} مانع قبل النشر`} />
              {selectedRecord.readiness.blockingReasons.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedRecord.readiness.blockingReasons.slice(0, 5).map((reason) => (
                    <div key={reason} className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs font-semibold text-red-700">
                      {reason}
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
            <DetailSection title="جاهزية التسوية">
              {settlementReadinessQuery.isPending ? (
                <p className="text-sm text-gray-400">جاري تحميل جاهزية التسوية</p>
              ) : Object.keys(settlementReadiness).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(settlementReadiness).slice(0, 8).map(([key, value]) => (
                    <Field key={key} label={key} value={valueOrDash(value)} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">لا توجد بيانات جاهزية تسوية لهذا المتجر.</p>
              )}
            </DetailSection>
            <DetailSection title="روابط تشغيلية">
              <div className="flex flex-wrap gap-2">
                {selectedRecord.storeId && (
                  <>
                    <Link to={`/store-payment-settings?storeId=${selectedRecord.storeId}`} className="h-10 inline-flex items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">إعدادات الدفع</Link>
                    <Link to={`/settlement-readiness?storeId=${selectedRecord.storeId}`} className="h-10 inline-flex items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">جاهزية التسوية</Link>
                    <Link to={`/store-billing?storeId=${selectedRecord.storeId}`} className="h-10 inline-flex items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">رسوم المتجر</Link>
                  </>
                )}
                <Link to="/audit" className="h-10 inline-flex items-center rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">سجل التدقيق</Link>
              </div>
            </DetailSection>
          </div>
        )}

        {activeTab === 'finance' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MiniStat label="إجمالي المبيعات/المدفوعات" value={formatMoney(grossSales)} hint={`${scopedPayments.length + scopedMarketplaceOrders.length} سجل`} />
              <MiniStat label="إجمالي المستخلصات" value={formatMoney(payoutTotal)} hint={`${scopedPayouts.length} طلب`} />
              <MiniStat label="دفعات التسوية" value={scopedSettlementBatches.length} hint="دفعات مرتبطة بالمتجر" />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <DetailSection title="آخر المدفوعات والمبيعات">
                {paymentsQuery.isPending || marketplaceOrdersQuery.isPending ? (
                  <p className="text-sm text-gray-400">جاري تحميل المبيعات</p>
                ) : latestPayments.length === 0 && latestOrders.length === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد مبيعات أو مدفوعات مرتبطة بالمتجر في النطاق المتاح.</p>
                ) : (
                  <div className="space-y-2">
                    {[...latestPayments, ...latestOrders].slice(0, 6).map((row, index) => {
                      const item = asRecord(row);
                      return (
                        <div key={`${rowString(item, ['id', 'orderId', 'reference']) ?? index}`} className="rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-gray-900">{rowString(item, ['orderNumber', 'reference', 'id']) ?? `#${index + 1}`}</span>
                          <span className="text-gray-500">{formatMoney(rowNumber(item, ['amount', 'total', 'grossAmount']) ?? 0, rowString(item, ['currency']) ?? 'SAR')}</span>
                          <span className="text-xs text-gray-400">{rowString(item, ['status', 'paymentStatus']) ?? 'غير محدد'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </DetailSection>
              <DetailSection title="المستخلصات وطلبات السحب">
                {payoutsQuery.isPending ? (
                  <p className="text-sm text-gray-400">جاري تحميل المستخلصات</p>
                ) : latestPayouts.length === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد طلبات سحب مرتبطة بهذا المتجر.</p>
                ) : (
                  <div className="space-y-2">
                    {latestPayouts.map((payout) => (
                      <Link key={payout.id} to={`/payments/settlements/${payout.id}?manual=1`} className="rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 text-sm hover:bg-gray-100">
                        <span className="font-semibold text-gray-900">{payout.reference}</span>
                        <span className="text-gray-500">{payout.amount} {payout.currency}</span>
                        <span className="text-xs text-gray-400">{payout.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </DetailSection>
              <DetailSection title="دفعات التسوية">
                {settlementBatchesQuery.isPending ? (
                  <p className="text-sm text-gray-400">جاري تحميل التسويات</p>
                ) : scopedSettlementBatches.length === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد دفعات تسوية مرتبطة بهذا المتجر.</p>
                ) : (
                  <div className="space-y-2">
                    {latestRows(scopedSettlementBatches, 5).map((batch) => (
                      <Link key={batch.id} to={`/payments/settlements/${batch.id}`} className="rounded-lg bg-gray-50 px-3 py-2 flex items-center justify-between gap-3 text-sm hover:bg-gray-100">
                        <span className="font-semibold text-gray-900">{batch.providerBatchId ?? `#${batch.id}`}</span>
                        <span className="text-gray-500">{batch.merchantPayable} {batch.currency}</span>
                        <span className="text-xs text-gray-400">{batch.status}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </DetailSection>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ReviewDecisionsSection record={selectedRecord} title="سجل قرارات المراجعة والتعديلات" />
            <DetailSection title="سجل التدقيق والتعديلات">
              {auditQuery.isPending ? (
                <p className="text-sm text-gray-400">جاري تحميل سجل التدقيق</p>
              ) : latestAudit.length === 0 ? (
                <p className="text-sm text-gray-400">لا توجد أحداث تدقيق مرتبطة في النطاق المتاح.</p>
              ) : (
                <div className="space-y-2">
                  {latestAudit.map((row, index) => {
                    const item = asRecord(row);
                    return (
                      <div key={`${rowString(item, ['id', 'eventId']) ?? index}`} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-gray-900">{rowString(item, ['action', 'eventType', 'type']) ?? 'حدث'}</span>
                          <span className="text-xs text-gray-400">{formatDate(rowString(item, ['createdAt', 'timestamp']))}</span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{rowString(item, ['entityType', 'actorEmail', 'ipAddress']) ?? 'غير متوفر'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </DetailSection>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <DetailSection title="ملاحظات داخلية للأدمن">
              <p className="text-sm text-gray-600 leading-6">{valueOrDash(selectedRecord.internalNotes)}</p>
            </DetailSection>
            <DetailSection title="ملخص حالة التاجر">
              <Field label="التوثيق" value={VERIFICATION_LABEL[selectedRecord.verificationStatus]} />
              <Field label="النشر" value={PUBLISH_LABEL[selectedRecord.publishStatus]} />
              <Field label="المخاطر" value={RISK_LABEL[selectedRecord.riskStatus]} />
              <Field label="السحب" value={PAYOUT_LABEL[selectedRecord.payoutStatus]} />
              <Field label="آخر تحديث" value={formatDate(selectedRecord.lastUpdated)} />
            </DetailSection>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2">
        <div className="text-xs text-gray-400">
          <Link to="/" className="hover:text-primary-600">الرئيسية</Link>
          <span className="mx-2">/</span>
          <span>توثيق المتاجر</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h1 className="text-title1 font-bold text-gray-900 tracking-tight">توثيق المتاجر</h1>
            <p className="text-sm text-gray-500 mt-1">مراجعة بيانات المتاجر قبل السماح بالنشر واستقبال المدفوعات والسحب.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="rounded-lg bg-white border border-gray-100 px-3 py-2">صلاحية التوثيق: {canReviewVerification ? 'مفعلة' : 'قراءة فقط'}</span>
            <span className="rounded-lg bg-white border border-gray-100 px-3 py-2">مراجعة البنك: {canReviewBank ? 'مفعلة' : 'قراءة فقط'}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard label="المتاجر المعروضة" value={visibleTotal} hint={visibleTotal === total ? 'كل السجلات' : `من أصل ${total}`} icon="Store" tone="blue" />
        <MetricCard label="موثقة" value={approved} hint={visibleTotal ? `${Math.round((approved / visibleTotal) * 100)}% من المعروض` : 'لا توجد سجلات'} icon="ShieldCheck" tone="green" />
        <MetricCard label="بانتظار المراجعة" value={pending} hint="مقدمة أو قيد المراجعة" icon="CheckSquare" tone="amber" />
        <MetricCard label="مرفوضة" value={rejected} hint="تحتاج قرارًا أو إعادة تقديم" icon="X" tone="red" />
        <MetricCard label="مخاطر فعلية" value={actualRisk} hint="أعلام خطر أو رفض بنكي/وثائقي" icon="AlertTriangle" tone="red" />
      </div>

      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
          <p className="text-sm text-gray-500">
            لا توجد متاجر لعرضها. راجع <Link to="/stores" className="text-primary-600 hover:underline">صفحة المتاجر</Link>.
          </p>
        </div>
      ) : (
        <div>
          <section className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | VerificationStatus)}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">كل حالات التوثيق</option>
                  {Object.entries(VERIFICATION_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select
                  value={entityFilter}
                  onChange={(event) => setEntityFilter(event.target.value as 'all' | MerchantEntityType)}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">كل أنواع الكيان</option>
                  {Object.entries(ENTITY_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as 'all' | RiskStatus)}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">كل مستويات المخاطر</option>
                  {Object.entries(RISK_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <input
                type="search"
                value={controls.query}
                onChange={(event) => controls.setQuery(event.target.value)}
                placeholder="بحث باسم المتجر أو المالك أو آخر 4 أرقام..."
                className="h-11 w-full xl:max-w-sm rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {controls.filteredCount === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm text-gray-400">لا توجد نتائج مطابقة</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1180px] text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <SortableTh sortKey="storeName" label="المتجر" sort={controls.sort} onToggle={controls.toggleSort} />
                        <SortableTh sortKey="ownerName" label="المالك" sort={controls.sort} onToggle={controls.toggleSort} />
                        <SortableTh sortKey="entityType" label="نوع الكيان" sort={controls.sort} onToggle={controls.toggleSort} />
                        <SortableTh sortKey="verificationStatus" label="حالة التوثيق" sort={controls.sort} onToggle={controls.toggleSort} />
                        <th className="px-4 py-3 text-start font-medium text-gray-500">الجوال</th>
                        <th className="px-4 py-3 text-start font-medium text-gray-500">السجل / الوثيقة</th>
                        <th className="px-4 py-3 text-start font-medium text-gray-500">البنك</th>
                        <th className="px-4 py-3 text-start font-medium text-gray-500">الدفع</th>
                        <th className="px-4 py-3 text-start font-medium text-gray-500">الشحن</th>
                        <th className="px-4 py-3 text-start font-medium text-gray-500">السحب</th>
                        <SortableTh sortKey="riskStatus" label="المخاطر" sort={controls.sort} onToggle={controls.toggleSort} />
                        <SortableTh sortKey="lastUpdated" label="آخر تحديث" sort={controls.sort} onToggle={controls.toggleSort} />
                        <th className="px-4 py-3 text-start font-medium text-gray-500">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {controls.rows.map((record) => (
                        <tr
                          key={record.id}
                          className="border-t hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <span className="mt-0.5 h-8 w-8 rounded-lg bg-primary-50 text-primary-700 inline-flex items-center justify-center">
                                <Icon name="Store" size="xs" />
                              </span>
                              <div>
                                <Link
                                  to={merchantFilePath(record)}
                                  className="font-semibold text-gray-900 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-sm"
                                >
                                  {record.storeName}
                                </Link>
                                <StoreLink record={record} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-gray-900">{record.ownerName}</div>
                            <div className="text-xs text-gray-400">#{record.storeId ?? record.tenantId ?? '-'}</div>
                          </td>
                          <td className="px-4 py-3 align-top text-gray-600">{ENTITY_LABEL[record.entityType]}</td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge label={VERIFICATION_LABEL[record.verificationStatus]} className={classForVerification(record.verificationStatus)} />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              label={record.contact.phoneVerified ? 'موثق' : 'غير موثق'}
                              className={record.contact.phoneVerified ? STATUS_CLASS.good : STATUS_CLASS.bad}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge label={REGISTRY_LABEL[record.registry.status]} className={classForRegistry(record.registry.status)} />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge label={BANK_LABEL[record.bank.verificationStatus]} className={classForBank(record.bank.verificationStatus)} />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              label={record.paymentStatus === 'active' || record.paymentStatus === 'configured' ? 'جاهز' : 'غير معد'}
                              className={record.paymentStatus === 'active' || record.paymentStatus === 'configured' ? STATUS_CLASS.good : STATUS_CLASS.warn}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge
                              label={record.shippingStatus === 'active' || record.shippingStatus === 'configured' ? 'جاهز' : 'غير معد'}
                              className={record.shippingStatus === 'active' || record.shippingStatus === 'configured' ? STATUS_CLASS.good : STATUS_CLASS.warn}
                            />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge label={PAYOUT_LABEL[record.payoutStatus]} className={classForPayout(record.payoutStatus)} />
                          </td>
                          <td className="px-4 py-3 align-top">
                            <StatusBadge label={RISK_LABEL[record.riskStatus]} className={classForRisk(record.riskStatus)} />
                          </td>
                          <td className="px-4 py-3 align-top text-gray-500 whitespace-nowrap">{formatDate(record.lastUpdated)}</td>
                          <td className="px-4 py-3 align-top">
                            <Link
                              to={merchantFilePath(record)}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
                            >
                              <Icon name="Eye" size="xs" />
                              مراجعة
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePager
                  page={controls.page}
                  totalPages={controls.totalPages}
                  startIndex={controls.startIndex}
                  endIndex={controls.endIndex}
                  filteredCount={controls.filteredCount}
                  onPageChange={controls.setPage}
                  itemLabel="متجر"
                />
              </>
            )}
          </section>

          {selectedRecord && (
            <aside className="space-y-4 2xl:sticky 2xl:top-4 self-start">
              <section className="rounded-xl bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-400">تفاصيل المتجر</p>
                    <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedRecord.storeName}</h2>
                    <StoreLink record={selectedRecord} />
                  </div>
                  <StatusBadge label={VERIFICATION_LABEL[selectedRecord.verificationStatus]} className={classForVerification(selectedRecord.verificationStatus)} />
                </div>

                <div className="p-4 space-y-3">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">جاهزية النشر</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedRecord.readiness.allowed ? 'مسموح بالنشر بعد اعتماد المراجع' : `${selectedRecord.readiness.blockingReasons.length} عائق قبل النشر`}
                        </p>
                      </div>
                      <StatusBadge label={PUBLISH_LABEL[selectedRecord.publishStatus]} className={classForPublish(selectedRecord.publishStatus)} />
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedRecord.readiness.checklist.map((item) => (
                        <div key={item.key} className="rounded-lg bg-white border border-gray-100 px-3 py-2">
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-gray-700 font-semibold">{item.label}</span>
                            <span className={
                              item.status === 'passed'
                                ? 'text-emerald-700 font-semibold'
                                : item.status === 'warning'
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-red-700 font-semibold'
                            }>
                              {item.status === 'passed' ? 'مكتمل' : item.status === 'warning' ? 'تنبيه' : 'مانع'}
                            </span>
                          </div>
                          {item.status !== 'passed' && (
                            <div className="mt-2 space-y-2 text-xs">
                              <p className="text-gray-500 leading-5">{item.message}</p>
                              <div className="flex flex-wrap items-center gap-2">
                                {item.action.adminHref ? (
                                  <Link
                                    to={item.action.adminHref}
                                    className="inline-flex h-8 items-center gap-1 rounded-md bg-gray-900 px-2.5 text-white font-semibold hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                                  >
                                    <Icon name="Eye" size="xs" />
                                    {item.action.adminLabel}
                                  </Link>
                                ) : (
                                  <span className="inline-flex min-h-8 items-center rounded-md bg-gray-100 px-2.5 text-gray-700 font-semibold">
                                    {item.action.adminLabel}
                                  </span>
                                )}
                              </div>
                              <p className="rounded-md bg-primary-50 px-2.5 py-2 text-primary-700 leading-5">
                                للتاجر: {item.action.merchantInstruction}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <VerificationReviewPanel
                    record={selectedRecord}
                    canReviewVerification={canReviewVerification}
                    canApproveSelected={canApproveSelected}
                    canRequestChanges={canRequestChanges}
                    reviewPending={reviewMutation.isPending}
                    decisionMode={decisionMode}
                    decisionReason={decisionReason}
                    compact
                    onApprove={approveSelected}
                    onOpenDecision={openDecision}
                    onDecisionReasonChange={setDecisionReason}
                    submitDecision={submitDecision}
                  />
                </div>
              </section>

              <MerchantProfileSections
                record={selectedRecord}
                bankActionable={bankActionable}
                canReviewBank={canReviewBank}
                bankReviewPending={bankReviewMutation.isPending}
                bankDecisionMode={bankDecisionMode}
                bankReviewReason={bankReviewReason}
                showBankHint
                onOpenBankDecision={openBankDecision}
                onBankReviewReasonChange={setBankReviewReason}
                onSubmitBankDecision={submitBankDecision}
              />

              <DetailSection title="جاهزية الدفع">
                <Field label="الحالة" value={selectedRecord.paymentStatus === 'active' || selectedRecord.paymentStatus === 'configured' ? 'جاهز' : 'غير معد'} />
              </DetailSection>

              <DetailSection title="جاهزية الشحن">
                <Field label="الحالة" value={selectedRecord.shippingStatus === 'active' || selectedRecord.shippingStatus === 'configured' ? 'جاهز' : 'غير معد'} />
              </DetailSection>

              <DetailSection title="سياسات المتجر">
                <Field label="السياسات المطلوبة" value={selectedRecord.policiesPresent ? 'موجودة' : 'غير مكتملة'} />
              </DetailSection>

              <ReviewDecisionsSection record={selectedRecord} />

              <DetailSection title="ملاحظات داخلية للأدمن">
                <p className="text-sm text-gray-600 leading-6">{valueOrDash(selectedRecord.internalNotes)}</p>
              </DetailSection>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
