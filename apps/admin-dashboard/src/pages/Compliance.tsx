import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../lib/api';
import { ErrorState } from '../components/ui/ErrorState';

type TenantCompliance = {
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

type ItemKey = keyof TenantCompliance;

interface ComplianceItem {
  key: ItemKey;
  code: string;
  titleAr: string;
  titleEn: string;
  group: 'registrations' | 'people' | 'security' | 'infrastructure';
  description: string;
}

const ITEMS: ComplianceItem[] = [
  { key: 'commercialRegistrationNumber', code: 'G1', titleAr: 'السجل التجاري', titleEn: 'Commercial Registration', group: 'registrations', description: 'شهادة تسجيل وزارة التجارة' },
  { key: 'vatNumber', code: 'G2', titleAr: 'ضريبة القيمة المضافة', titleEn: 'VAT Registration', group: 'registrations', description: 'شهادة تسجيل ضريبي من زاتكا' },
  { key: 'ecommerceLicenseNumber', code: 'G3', titleAr: 'رخصة التجارة الإلكترونية', titleEn: 'E-Commerce License', group: 'registrations', description: 'رخصة MoCI للتجارة الإلكترونية' },
  { key: 'trademarkNumber', code: 'G5', titleAr: 'العلامة التجارية', titleEn: 'Trademark Registration', group: 'registrations', description: 'شهادة SAIP لتسجيل العلامة' },
  { key: 'dpoEmail', code: 'G4', titleAr: 'مسؤول حماية البيانات', titleEn: 'Data Protection Officer', group: 'people', description: 'المادة 22 من نظام حماية البيانات الشخصية' },
  { key: 'asvCertificateUrl', code: 'G6', titleAr: 'فحص PCI-DSS الربع سنوي', titleEn: 'PCI-DSS ASV Scan', group: 'security', description: 'فحص ASV ربع سنوي معتمد' },
  { key: 'pentestReportUrl', code: 'G7', titleAr: 'اختبار الاختراق', titleEn: 'Penetration Test', group: 'security', description: 'اختبار CREST سنوي' },
  { key: 'tabbyDpaUrl', code: 'G9', titleAr: 'اتفاقية بيانات تابي', titleEn: 'Tabby DPA', group: 'security', description: 'عقد معالجة بيانات عابر للحدود' },
  { key: 'hostingRegion', code: 'G8', titleAr: 'قرار الاستضافة السعودية', titleEn: 'KSA Hosting Decision', group: 'infrastructure', description: 'سيادة البيانات واستضافتها' },
  { key: 'drPlanDocumentedAt', code: 'G10', titleAr: 'خطة التعافي من الكوارث', titleEn: 'Disaster Recovery Plan', group: 'infrastructure', description: 'خطة DR المطلوبة من NCA' },
];

const GROUP_LABELS: Record<ComplianceItem['group'], string> = {
  registrations: 'التسجيلات الحكومية',
  people: 'الأشخاص المعينون',
  security: 'الأمن والاختبارات',
  infrastructure: 'البنية التحتية',
};

const GROUP_ORDER: ComplianceItem['group'][] = ['registrations', 'people', 'security', 'infrastructure'];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  return true;
}

function isExpired(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function isExpiringSoon(dateStr: string | null, daysAhead = 30): boolean {
  if (!dateStr) return false;
  const expiry = new Date(dateStr);
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return diff > 0 && diff < daysAhead * 24 * 60 * 60 * 1000;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: '2-digit' });
}

type Status = 'done' | 'pending' | 'expired' | 'expiring';

const STATUS_CARD: Record<Status, string> = {
  done: 'bg-emerald-50 border border-emerald-100',
  pending: 'bg-gray-50 border border-gray-100',
  expired: 'bg-red-50 border border-red-100',
  expiring: 'bg-amber-50 border border-amber-100',
};

const STATUS_PILL: Record<Status, string> = {
  done: 'bg-emerald-600 text-white',
  pending: 'bg-gray-100 text-gray-500',
  expired: 'bg-red-600 text-white',
  expiring: 'bg-amber-500 text-white',
};

const STATUS_LABEL: Record<Status, string> = {
  done: '✓ مكتمل',
  pending: '○ معلق',
  expired: '⚠ منتهي',
  expiring: '⏰ ينتهي قريباً',
};

function getStatus(item: ComplianceItem, value: unknown): Status {
  const filled = isFilled(value);
  if (!filled) return 'pending';
  const isExpiry = item.key === 'ecommerceLicenseExpiresAt' || item.key === 'trademarkExpiresAt';
  if (isExpiry && isExpired(value as string | null)) return 'expired';
  if (isExpiry && isExpiringSoon(value as string | null)) return 'expiring';
  return 'done';
}

export default function Compliance() {
  const [tenants, setTenants] = useState<TenantCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    adminApi.getTenants()
      .then((data: unknown) => { setTenants(data as TenantCompliance[]); })
      .catch((err: unknown) => { setError(err instanceof Error ? err.message : 'فشل تحميل البيانات'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Aggregate stats
  const totalSlots = tenants.length * ITEMS.length;
  let filledSlots = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  for (const t of tenants) {
    for (const item of ITEMS) {
      const v = t[item.key];
      if (isFilled(v)) filledSlots++;
      const isExpiry = item.key === 'ecommerceLicenseExpiresAt' || item.key === 'trademarkExpiresAt';
      if (isExpiry) {
        if (isExpired(v as string | null)) expiredCount++;
        else if (isExpiringSoon(v as string | null)) expiringSoonCount++;
      }
    }
  }
  const overallPct = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;
  const pctColor = overallPct >= 80 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-title2 font-bold text-gray-900 tracking-tight">الامتثال</h1>
        <p className="text-footnote text-gray-400 mt-1">بنود G1-G10 — مصدر البيانات: جدول التجار (migration 0061)</p>
      </div>

      {/* Summary bar */}
      {!loading && !error && tenants.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{tenants.length}</div>
            <div className="text-footnote text-gray-400 mt-1">تاجر</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold tabular-nums tracking-tight ${pctColor}`}>{overallPct}%</div>
            <div className="text-footnote text-gray-400 mt-1">مستوى الامتثال</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{filledSlots}<span className="text-sm font-normal text-gray-400">/{totalSlots}</span></div>
            <div className="text-footnote text-gray-400 mt-1">بند مكتمل</div>
          </div>
          <div className="text-center">
            {expiredCount > 0 ? (
              <>
                <div className="text-2xl font-bold text-red-600 tabular-nums tracking-tight">{expiredCount}</div>
                <div className="text-footnote text-red-400 mt-1">شهادات منتهية</div>
              </>
            ) : expiringSoonCount > 0 ? (
              <>
                <div className="text-2xl font-bold text-amber-600 tabular-nums tracking-tight">{expiringSoonCount}</div>
                <div className="text-footnote text-amber-400 mt-1">تنتهي خلال 30 يوم</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-600 tabular-nums tracking-tight">✓</div>
                <div className="text-footnote text-emerald-500 mt-1">لا تنبيهات</div>
              </>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 w-full bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-dashed border-gray-200">
          <p className="text-callout text-gray-500">
            لا توجد بيانات. أضف تاجراً أولاً من{' '}
            <Link to="/tenants" className="text-primary-600 hover:underline">صفحة التجار</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {tenants.map((tenant) => {
            let tenantFilled = 0;
            for (const item of ITEMS) {
              if (isFilled(tenant[item.key])) tenantFilled++;
            }
            const tenantPct = Math.round((tenantFilled / ITEMS.length) * 100);
            const tenantPctColor = tenantPct >= 80 ? 'text-emerald-600' : tenantPct >= 50 ? 'text-amber-600' : 'text-red-600';

            return (
              <div key={tenant.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Tenant header */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                  <div>
                    <h2 className="text-callout font-semibold text-gray-900">{tenant.name}</h2>
                    <p className="text-footnote text-gray-400 font-mono mt-0.5">/{tenant.slug}</p>
                  </div>
                  <div className="text-end">
                    <div className={`text-xl font-bold tabular-nums tracking-tight ${tenantPctColor}`}>{tenantPct}%</div>
                    <div className="text-caption1 text-gray-400">{tenantFilled} من {ITEMS.length} بند</div>
                  </div>
                </div>

                {/* Groups */}
                <div className="px-5 py-4 space-y-5">
                  {GROUP_ORDER.map((group) => {
                    const groupItems = ITEMS.filter(i => i.group === group);
                    return (
                      <div key={group}>
                        <p className="text-caption1 font-semibold text-gray-400 uppercase tracking-wider mb-3">{GROUP_LABELS[group]}</p>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                          {groupItems.map((item) => {
                            const value = tenant[item.key];
                            const status = getStatus(item, value);
                            return (
                              <div key={item.key} className={`rounded-xl p-3.5 flex flex-col gap-2 ${STATUS_CARD[status]}`}>
                                <div className="flex items-start gap-2 flex-wrap">
                                  <span className="inline-flex items-center justify-center h-5 px-1.5 bg-gray-900 text-white rounded text-xs font-mono font-semibold flex-shrink-0">
                                    {item.code}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-gray-900 leading-tight">{item.titleAr}</div>
                                    <div className="text-xs text-gray-400">{item.titleEn}</div>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_PILL[status]}`}>
                                    {STATUS_LABEL[status]}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {status !== 'pending' ? (
                                    typeof value === 'boolean'
                                      ? (value ? 'نعم' : 'لا')
                                      : <span className="font-mono">{formatDate(value as string | null)}</span>
                                  ) : (
                                    <span className="text-gray-400">غير مكتمل</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 border-t border-black/5 pt-1.5">{item.description}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
