import { useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  adminApi,
  hasAdminPermission,
  type AdminStore,
  type Payout,
} from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { Icon } from '../components/ui/icon';
import {
  buildMerchantVerificationRecords,
  type MerchantBankAccountSource,
  type MerchantKycProfileSource,
  type MerchantTenantSource,
  type MerchantVerificationRecord,
  type PublishReadinessChecklistItem,
  type ReadinessChecklistStatus,
} from '../lib/merchantVerification';

type StoreScopedRow = Record<string, unknown>;

const VERIFICATION_LABEL: Record<MerchantVerificationRecord['verificationStatus'], string> = {
  not_started: 'لم يبدأ',
  incomplete: 'غير مكتمل',
  submitted: 'مقدم',
  under_review: 'قيد المراجعة',
  approved: 'موثق',
  rejected: 'مرفوض',
  changes_requested: 'تعديلات مطلوبة',
  suspended: 'معلق',
};

const PUBLISH_LABEL: Record<MerchantVerificationRecord['publishStatus'], string> = {
  not_ready: 'غير جاهز',
  ready_for_review: 'جاهز للمراجعة',
  approved_to_publish: 'مصرح بالنشر',
  published: 'منشور',
  blocked: 'محجوب',
};

const RISK_LABEL: Record<MerchantVerificationRecord['riskStatus'], string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  blocked: 'محجوبة',
};

const BANK_LABEL: Record<MerchantVerificationRecord['bank']['verificationStatus'], string> = {
  not_added: 'غير مضاف',
  pending_review: 'بانتظار المراجعة',
  verified: 'موثق',
  rejected: 'مرفوض',
  needs_reverification: 'إعادة توثيق',
};

const PAYOUT_LABEL: Record<MerchantVerificationRecord['payoutStatus'], string> = {
  not_configured: 'غير معد',
  pending_review: 'بانتظار المراجعة',
  verified: 'موثق',
  rejected: 'مرفوض',
  payouts_blocked: 'السحب محجوب',
};

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

function matchesTenantScope(row: StoreScopedRow, tenantId: number, storeIds: number[]): boolean {
  const rowTenantId = rowNumber(row, ['tenantId', 'tenant_id', 'merchantId', 'merchant_id']);
  if (rowTenantId === tenantId) return true;
  const rowStoreId = rowNumber(row, ['storeId', 'store_id', 'sellerStoreId', 'merchantStoreId']);
  return rowStoreId !== null && storeIds.includes(rowStoreId);
}

function sumMoney(rows: StoreScopedRow[], keys: string[]): number {
  return rows.reduce((total, row) => total + (rowNumber(row, keys) ?? 0), 0);
}

function formatMoney(value: number, currency = 'SAR'): string {
  return `${value.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
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

function statusClass(tone: 'good' | 'warn' | 'bad' | 'muted') {
  const map = {
    good: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    warn: 'bg-amber-50 text-amber-700 border-amber-100',
    bad: 'bg-red-50 text-red-700 border-red-100',
    muted: 'bg-gray-50 text-gray-600 border-gray-100',
  };
  return map[tone];
}

function riskTone(status: MerchantVerificationRecord['riskStatus']) {
  if (status === 'low') return 'good';
  if (status === 'medium') return 'warn';
  return 'bad';
}

function verificationTone(status: MerchantVerificationRecord['verificationStatus']) {
  if (status === 'approved') return 'good';
  if (status === 'submitted' || status === 'under_review') return 'warn';
  if (status === 'rejected' || status === 'suspended') return 'bad';
  return 'muted';
}

function checklistTone(status: ReadinessChecklistStatus) {
  if (status === 'passed') return 'good';
  if (status === 'warning') return 'warn';
  return 'bad';
}

function StatusBadge({ children, tone }: { children: ReactNode; tone: 'good' | 'warn' | 'bad' | 'muted' }) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold whitespace-nowrap ${statusClass(tone)}`}>
      {children}
    </span>
  );
}

function Metric({ label, value, hint, icon, tone }: {
  label: string;
  value: ReactNode;
  hint: string;
  icon: 'Users' | 'Store' | 'AlertTriangle' | 'CreditCard' | 'Landmark' | 'CheckSquare';
  tone: 'good' | 'warn' | 'bad' | 'muted';
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 min-h-[116px] flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <div className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
        <p className="mt-1 text-xs text-gray-400">{hint}</p>
      </div>
      <span className={`h-10 w-10 rounded-xl inline-flex items-center justify-center ${statusClass(tone)}`}>
        <Icon name={icon} size="md" />
      </span>
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="rounded-xl bg-white border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900 text-end break-words">{value}</span>
    </div>
  );
}

function storeAwareHref(item: PublishReadinessChecklistItem, record: MerchantVerificationRecord) {
  const href = item.action.adminHref;
  if (!href) return null;
  if (record.storeId && ['/store-payment-settings', '/settlement-readiness', '/store-billing'].includes(href)) {
    return `${href}?storeId=${record.storeId}`;
  }
  return href;
}

function nextActionLabel(item: PublishReadinessChecklistItem) {
  if (item.status === 'passed') return 'مكتمل';
  if (item.status === 'warning') return item.action.adminLabel;
  return item.action.adminLabel;
}

function latestRows<T extends StoreScopedRow>(rows: T[], limit = 5): T[] {
  return [...rows]
    .sort((a, b) => {
      const aDate = new Date(rowString(a, ['createdAt', 'updatedAt', 'requestedAt', 'paidAt', 'reconciledAt']) ?? 0).getTime();
      const bDate = new Date(rowString(b, ['createdAt', 'updatedAt', 'requestedAt', 'paidAt', 'reconciledAt']) ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, limit);
}

export default function TenantDossier() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const numericTenantId = Number(tenantId);
  const canReadStores = hasAdminPermission('stores.read');
  const canReadKyc = hasAdminPermission('kyc.read');
  const canReadBankAccounts = hasAdminPermission('kyc.read') || hasAdminPermission('merchant.bank_accounts.view');
  const canReadPayments = hasAdminPermission('payments.read');
  const canReadFinance = hasAdminPermission('wallet.payout.view_all');
  const canReadAudit = hasAdminPermission('audit.read');

  const tenantsQuery = useQuery<MerchantTenantSource[]>({
    queryKey: queryKeys.tenants,
    queryFn: () => adminApi.getTenants() as unknown as Promise<MerchantTenantSource[]>,
  });

  const storesQuery = useQuery<AdminStore[]>({
    queryKey: queryKeys.stores,
    queryFn: () => adminApi.getStores(),
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

  const paymentsQuery = useQuery<StoreScopedRow[]>({
    queryKey: [...queryKeys.payments, 'tenantDossier', numericTenantId],
    queryFn: () => adminApi.getPayments() as Promise<StoreScopedRow[]>,
    enabled: canReadPayments && Number.isFinite(numericTenantId),
  });

  const payoutsQuery = useQuery<Payout[]>({
    queryKey: [...queryKeys.settlementBatches, 'tenantDossierPayouts', numericTenantId],
    queryFn: () => adminApi.listPayouts(),
    enabled: canReadFinance && Number.isFinite(numericTenantId),
  });

  const auditQuery = useQuery<StoreScopedRow[]>({
    queryKey: [...queryKeys.auditLogs, 'tenantDossier', numericTenantId],
    queryFn: () => adminApi.getAuditLogs() as Promise<StoreScopedRow[]>,
    enabled: canReadAudit && Number.isFinite(numericTenantId),
  });

  const tenant = useMemo(() => (
    tenantsQuery.data?.find((item) => item.id === numericTenantId) ?? null
  ), [numericTenantId, tenantsQuery.data]);

  const storesForTenant = useMemo(() => (
    (storesQuery.data ?? []).filter((store) => store.tenantId === numericTenantId)
  ), [numericTenantId, storesQuery.data]);

  const storeIds = useMemo(() => storesForTenant.map((store) => store.id), [storesForTenant]);

  const settlementQueries = useQueries({
    queries: storeIds.map((storeId) => ({
      queryKey: [...queryKeys.settlementBatches, 'tenantDossier', storeId],
      queryFn: () => adminApi.getSettlementBatches(storeId),
      enabled: canReadFinance,
    })),
  });

  const records = useMemo(() => buildMerchantVerificationRecords({
    tenants: tenant ? [tenant] : [],
    stores: storesForTenant,
    kycProfiles: kycQuery.data ?? [],
    bankAccounts: bankQuery.data ?? [],
  }), [bankQuery.data, kycQuery.data, storesForTenant, tenant]);

  const tenantPayments = useMemo(() => (
    (paymentsQuery.data ?? []).filter((row) => matchesTenantScope(row, numericTenantId, storeIds))
  ), [numericTenantId, paymentsQuery.data, storeIds]);

  const tenantPayouts = useMemo(() => (
    (payoutsQuery.data ?? []).filter((row) => matchesTenantScope(row as unknown as StoreScopedRow, numericTenantId, storeIds))
  ), [numericTenantId, payoutsQuery.data, storeIds]);

  const tenantAuditLogs = useMemo(() => (
    (auditQuery.data ?? []).filter((row) => matchesTenantScope(row, numericTenantId, storeIds))
  ), [auditQuery.data, numericTenantId, storeIds]);

  const settlementBatches = useMemo(() => (
    settlementQueries.flatMap((query) => query.data ?? [])
  ), [settlementQueries]);

  const blockingItems = useMemo(() => (
    records.flatMap((record) => record.readiness.checklist
      .filter((item) => item.status !== 'passed')
      .map((item) => ({ record, item })))
  ), [records]);

  const verifiedBanks = records.filter((record) => record.bank.verificationStatus === 'verified').length;
  const readyToPublish = records.filter((record) => record.readiness.allowed).length;
  const grossSales = sumMoney(tenantPayments, ['amount', 'grossAmount', 'total', 'paidAmount']);
  const payoutTotal = sumMoney(tenantPayouts.map((payout) => payout as unknown as StoreScopedRow), ['amount', 'netAmount', 'merchantPayable']);
  const loading = tenantsQuery.isPending
    || (canReadStores && storesQuery.isPending)
    || (canReadKyc && kycQuery.isPending)
    || (canReadBankAccounts && bankQuery.isPending);
  const error = tenantsQuery.isError
    || (canReadStores && storesQuery.isError)
    || (canReadKyc && kycQuery.isError)
    || (canReadBankAccounts && bankQuery.isError);

  if (!Number.isFinite(numericTenantId) || numericTenantId <= 0) {
    return <ErrorState message="رابط ملف التاجر غير صالح" />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-52 bg-gray-200 rounded-xl animate-pulse" />
        <AdminTableSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState message="فشل تحميل ملف التاجر التشغيلي" onRetry={() => window.location.reload()} />;
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <Icon name="AlertCircle" size="md" className="text-red-400" />
        </div>
        <p className="text-callout font-medium text-gray-700 mb-1">لم يتم العثور على التاجر</p>
        <p className="text-footnote text-gray-400 mb-5">قد يكون الرابط قديمًا أو أن التاجر غير موجود في البيانات الحالية.</p>
        <Link to="/tenants" className="px-4 py-2 text-footnote font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
          العودة إلى قائمة التجار
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/tenants" className="hover:text-primary-700">التجار</Link>
            <Icon name="ChevronLeft" size="2xs" className="text-gray-300" />
            <span>ملف التاجر</span>
          </div>
          <h1 className="mt-2 text-title2 font-bold tracking-tight text-gray-900">{tenant.name || `تاجر #${tenant.id}`}</h1>
          <p className="mt-1 text-sm text-gray-500">ملف تشغيلي موحد للتوثيق، البنك، الدفع، التسوية، السحب، الصلاحيات، وسجل القرارات.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/stores" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Icon name="Store" size="xs" />
            المتاجر
          </Link>
          <Link to="/compliance" className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700">
            <Icon name="CheckSquare" size="xs" />
            توثيق المتاجر
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="المتاجر" value={records.length} hint="كل المتاجر التابعة للتاجر" icon="Store" tone="muted" />
        <Metric label="جاهزة للنشر" value={`${readyToPublish}/${records.length}`} hint="حسب checklist التوثيق والتشغيل" icon="CheckSquare" tone={readyToPublish === records.length && records.length > 0 ? 'good' : 'warn'} />
        <Metric label="موانع القرار" value={blockingItems.length} hint="بنود تمنع أو تحذر قبل الاعتماد" icon="AlertTriangle" tone={blockingItems.length > 0 ? 'bad' : 'good'} />
        <Metric label="البنوك الموثقة" value={`${verifiedBanks}/${records.length}`} hint="لا يتم عرض IBAN كامل" icon="Landmark" tone={verifiedBanks === records.length && records.length > 0 ? 'good' : 'warn'} />
        <Metric label="إجمالي مدفوعات مرصودة" value={formatMoney(grossSales)} hint="قراءة فقط من المدفوعات" icon="CreditCard" tone="muted" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Section title="مركز القرار والإجراء التالي">
          {records.length === 0 ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
              لا توجد متاجر مرتبطة بهذا التاجر. الإجراء التالي: أنشئ متجرًا أو اربط متجرًا قائمًا قبل أي توثيق أو دفع أو تسوية.
            </div>
          ) : blockingItems.length === 0 ? (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              لا توجد موانع ظاهرة من ملف التاجر. لا يزال اعتماد النشر أو السحب قرارًا مستقلًا يجب أن يمر من صفحة التوثيق أو التسوية المختصة.
            </div>
          ) : (
            <div className="space-y-3">
              {blockingItems.slice(0, 8).map(({ record, item }) => {
                const href = storeAwareHref(item, record);
                return (
                  <div key={`${record.id}-${item.key}`} className="rounded-xl border border-gray-100 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge tone={checklistTone(item.status)}>{item.status === 'warning' ? 'تنبيه' : 'مانع'}</StatusBadge>
                          <span className="text-sm font-semibold text-gray-900">{record.storeName}</span>
                          <span className="text-xs text-gray-400">{item.label}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">{item.message}</p>
                        <p className="mt-1 text-xs text-gray-500">{item.action.merchantInstruction}</p>
                      </div>
                      {href ? (
                        <Link to={href} className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                          {nextActionLabel(item)}
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">{nextActionLabel(item)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {blockingItems.length > 8 && (
                <p className="text-xs text-gray-500">يوجد {blockingItems.length - 8} مانع/تنبيه إضافي. افتح ملفات المتاجر أدناه للتفاصيل.</p>
              )}
            </div>
          )}
        </Section>

        <Section title="بيانات التاجر">
          <div className="divide-y divide-gray-100">
            <Field label="الاسم" value={tenant.name || 'غير متوفر'} />
            <Field label="البريد" value={tenant.email || 'غير متوفر'} />
            <Field label="الجوال" value={tenant.phone || 'غير متوفر'} />
            <Field label="الحالة" value={<StatusBadge tone={tenant.status === 'active' ? 'good' : 'bad'}>{tenant.status === 'active' ? 'نشط' : valueOrDash(tenant.status)}</StatusBadge>} />
            <Field label="آخر تحديث" value={formatDate(tenant.updatedAt ?? tenant.createdAt)} />
          </div>
        </Section>
      </div>

      <Section title="رحلات المتاجر التابعة">
        {records.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد متاجر لعرض رحلة التوثيق والتشغيل.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-3 py-3 text-start font-semibold">المتجر</th>
                  <th className="px-3 py-3 text-start font-semibold">التوثيق</th>
                  <th className="px-3 py-3 text-start font-semibold">البنك</th>
                  <th className="px-3 py-3 text-start font-semibold">الدفع</th>
                  <th className="px-3 py-3 text-start font-semibold">السحب</th>
                  <th className="px-3 py-3 text-start font-semibold">النشر</th>
                  <th className="px-3 py-3 text-start font-semibold">المخاطر</th>
                  <th className="px-3 py-3 text-start font-semibold">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t border-gray-100">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-gray-900">{record.storeName}</div>
                      <div className="text-xs text-gray-500 font-mono">{record.storeLink}</div>
                    </td>
                    <td className="px-3 py-3"><StatusBadge tone={verificationTone(record.verificationStatus)}>{VERIFICATION_LABEL[record.verificationStatus]}</StatusBadge></td>
                    <td className="px-3 py-3"><StatusBadge tone={record.bank.verificationStatus === 'verified' ? 'good' : record.bank.verificationStatus === 'rejected' ? 'bad' : 'warn'}>{BANK_LABEL[record.bank.verificationStatus]}</StatusBadge></td>
                    <td className="px-3 py-3">{record.paymentStatus === 'active' || record.paymentStatus === 'configured' ? 'جاهز' : 'غير معد'}</td>
                    <td className="px-3 py-3"><StatusBadge tone={record.payoutStatus === 'verified' ? 'good' : record.payoutStatus === 'rejected' || record.payoutStatus === 'payouts_blocked' ? 'bad' : 'warn'}>{PAYOUT_LABEL[record.payoutStatus]}</StatusBadge></td>
                    <td className="px-3 py-3"><StatusBadge tone={record.readiness.allowed ? 'good' : 'bad'}>{PUBLISH_LABEL[record.publishStatus]}</StatusBadge></td>
                    <td className="px-3 py-3"><StatusBadge tone={riskTone(record.riskStatus)}>{RISK_LABEL[record.riskStatus]}</StatusBadge></td>
                    <td className="px-3 py-3">
                      <Link to={`/compliance/${record.id}`} className="inline-flex items-center rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800">
                        فتح ملف المتجر
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-4 xl:grid-cols-3">
        <Section title="المبيعات والمستخلصات">
          <div className="space-y-3">
            <Field label="مدفوعات مرصودة" value={tenantPayments.length} />
            <Field label="إجمالي المدفوعات" value={formatMoney(grossSales)} />
            <Field label="طلبات سحب" value={tenantPayouts.length} />
            <Field label="إجمالي السحوبات" value={formatMoney(payoutTotal)} />
            <Field label="دفعات تسوية" value={settlementBatches.length} />
            <Link to="/finance/settlement-inbox" className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              فتح صندوق التسويات
            </Link>
          </div>
        </Section>

        <Section title="آخر طلبات السحب">
          {tenantPayouts.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد طلبات سحب مرتبطة بهذا التاجر.</p>
          ) : (
            <div className="space-y-3">
              {latestRows(tenantPayouts.map((payout) => payout as unknown as StoreScopedRow), 4).map((payout) => (
                <div key={String(payout.id)} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-900">{valueOrDash(payout.reference)}</span>
                    <span className="text-sm tabular-nums text-gray-700">{formatMoney(rowNumber(payout, ['amount']) ?? 0, rowString(payout, ['currency']) ?? 'SAR')}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{valueOrDash(payout.status)} · {formatDate(rowString(payout, ['requestedAt', 'createdAt']))}</div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="سجل التدقيق والتعديلات">
          {tenantAuditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">لا توجد أحداث تدقيق ظاهرة لهذا التاجر في البيانات الحالية.</p>
          ) : (
            <div className="space-y-3">
              {latestRows(tenantAuditLogs, 5).map((event, index) => (
                <div key={`${rowString(event, ['id']) ?? index}`} className="rounded-lg border border-gray-100 p-3">
                  <div className="text-sm font-semibold text-gray-900">{valueOrDash(rowString(event, ['action', 'eventType']))}</div>
                  <div className="mt-1 text-xs text-gray-500">{formatDate(rowString(event, ['createdAt', 'updatedAt']))}</div>
                </div>
              ))}
              <Link to="/audit" className="inline-flex w-full items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                فتح سجل التدقيق
              </Link>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
