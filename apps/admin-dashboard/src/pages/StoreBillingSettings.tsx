// Admin: Store Billing Settings page.
//
// Phase 9 of the Configurable Platform Fee Policy work. Lists every store
// with its current policy and lets the admin change:
//   - platform fee mode / pct / fixed / enabled
//   - COD fee mode / pct / fixed / enabled
//   - changeReason (audit log)
//
// All updates record an `store_billing_settings_updated` audit entry.

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { StoreSelectorPanel } from '../components/ui/StoreSelectorPanel';

type Mode = 'none' | 'percentage' | 'fixed' | 'percentage_plus_fixed';

type RawSettings = {
  id: number;
  storeId: number;
  platformFeeMode: string;
  platformFeePct: string | null;
  platformFeeFixed: string | null;
  isPlatformFeeEnabled: boolean;
  codFeeMode: string;
  codFeePct: string | null;
  codFeeFixed: string | null;
  isCodFeeEnabled: boolean;
  effectiveFrom: string | null;
  updatedAt: string;
  updatedBy: number | null;
  changeReason: string | null;
  createdAt: string;
} | null;

const MODE_LABELS: Record<Mode, string> = {
  none: 'معفى — لا تُحتسب رسوم',
  percentage: 'نسبة مئوية من إجمالي الطلب',
  fixed: 'رسم ثابت لكل طلب',
  percentage_plus_fixed: 'نسبة + رسم ثابت',
};

function pctToDisplay(pct: number | null | undefined): string {
  if (pct == null) return '';
  return (pct * 100).toFixed(pct * 100 < 1 ? 2 : pct * 100 < 10 ? 1 : 0);
}
function pctFromDisplay(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n / 100;
}

export default function StoreBillingSettings() {
  const [params, setParams] = useSearchParams();
  const initialStoreId = params.get('storeId') ? Number(params.get('storeId')) : null;
  const queryClient = useQueryClient();

  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialStoreId);

  // Editable form state
  const [platformMode, setPlatformMode] = useState<Mode>('percentage');
  const [platformPctDisplay, setPlatformPctDisplay] = useState<string>('2');
  const [platformFixed, setPlatformFixed] = useState<string>('0');
  const [platformEnabled, setPlatformEnabled] = useState<boolean>(true);
  const [codMode, setCodMode] = useState<Mode>('percentage');
  const [codPctDisplay, setCodPctDisplay] = useState<string>('2');
  const [codFixed, setCodFixed] = useState<string>('0');
  const [codEnabled, setCodEnabled] = useState<boolean>(true);
  const [changeReason, setChangeReason] = useState<string>('');

  const selectStore = (storeId: number) => {
    setSelectedId(storeId);
    setParams({ storeId: String(storeId) });
  };

  useEffect(() => {
    adminApi.getStores().then(setStores).catch(() => toast.error('فشل تحميل المتاجر'));
  }, []);

  const { data: settings, isPending: loading, isError: error, refetch } = useQuery({
    queryKey: [...queryKeys.storeBillingSettings, selectedId ?? null],
    queryFn: () => adminApi.getStoreBillingSettings(selectedId as number),
    enabled: !!selectedId,
  });

  const raw: RawSettings = settings?.settings ?? null;
  const effectiveLabel: string = settings?.effectivePolicyLabel ?? '';
  const effectiveCodLabel: string = settings?.effectiveCodPolicyLabel ?? '';

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [...queryKeys.storeBillingSettings, selectedId ?? null] });

  // Seed the editable form whenever fresh settings arrive.
  useEffect(() => {
    if (!settings) return;
    const platform = (settings.effectivePolicy.mode as Mode) ?? 'percentage';
    setPlatformMode(platform);
    setPlatformPctDisplay(pctToDisplay(settings.effectivePolicy.pct));
    setPlatformFixed(String(settings.effectivePolicy.fixed ?? 0));
    setPlatformEnabled(settings.effectivePolicy.enabled);
    const cod = (settings.effectiveCodPolicy.mode as Mode) ?? 'percentage';
    setCodMode(cod);
    setCodPctDisplay(pctToDisplay(settings.effectiveCodPolicy.pct));
    setCodFixed(String(settings.effectiveCodPolicy.fixed ?? 0));
    setCodEnabled(settings.effectiveCodPolicy.enabled);
    setChangeReason('');
  }, [settings]);

  // Surface load failures as a toast (parity with the previous manual fetch).
  useEffect(() => {
    if (error) toast.error('فشل تحميل الإعدادات');
  }, [error]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updateStoreBillingSettings(selectedId as number, {
        platformFeeMode: platformMode,
        platformFeePct: platformMode === 'percentage' || platformMode === 'percentage_plus_fixed' ? pctFromDisplay(platformPctDisplay) : null,
        platformFeeFixed: platformMode === 'fixed' || platformMode === 'percentage_plus_fixed' ? Number(platformFixed) : null,
        isPlatformFeeEnabled: platformEnabled,
        codFeeMode: codMode,
        codFeePct: codMode === 'percentage' || codMode === 'percentage_plus_fixed' ? pctFromDisplay(codPctDisplay) : null,
        codFeeFixed: codMode === 'fixed' || codMode === 'percentage_plus_fixed' ? Number(codFixed) : null,
        isCodFeeEnabled: codEnabled,
        changeReason: changeReason.trim(),
      }),
    onSuccess: () => {
      toast.success('تم تحديث إعدادات الرسوم');
      invalidate();
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : 'فشل التحديث';
      toast.error(message);
    },
  });

  const saving = saveMutation.isPending;

  const handleSave = () => {
    if (selectedId == null) return;
    if (!changeReason.trim()) {
      toast.error('سبب التعديل مطلوب للسجل');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-title2 font-bold text-gray-900 tracking-tight">إعدادات رسوم المتاجر</h1>
          <p className="text-sm text-gray-500 mt-1">
            اضبط سياسة رسوم المنصة لكل متجر. يتم تطبيقها على الطلبات الجديدة فقط — الطلبات القديمة تحتفظ بالرسوم المسجّلة وقت إنشائها.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StoreSelectorPanel stores={stores} selectedId={selectedId} onSelect={selectStore} />

        {/* Edit form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          {selectedId == null ? (
            <p className="text-sm text-gray-500 text-center py-12">اختر متجرًا من القائمة لعرض وتعديل إعدادات الرسوم.</p>
          ) : loading ? (
            <p className="text-sm text-gray-400 text-center py-12">...جاري التحميل</p>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-gray-500">فشل تحميل الإعدادات</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Read-only summary */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">رسوم المنصة الحالية</p>
                    <p className="font-medium">{effectiveLabel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">رسوم الدفع عند الاستلام</p>
                    <p className="font-medium">{effectiveCodLabel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">آخر تعديل</p>
                    <p className="font-medium">{raw?.updatedAt ? new Date(raw.updatedAt).toLocaleString('en-US') : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">معدَّل بواسطة</p>
                    <p className="font-medium">{raw?.updatedBy ? `User #${raw.updatedBy}` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">سبب آخر تعديل</p>
                    <p className="font-medium">{raw?.changeReason ?? '—'}</p>
                  </div>
                </div>
              </div>

              <section className="rounded-lg border border-gray-200 p-4">
                <h2 className="text-base font-bold text-gray-900">رسوم المنصة</h2>
                <p className="mt-1 text-xs text-gray-500">تطبق على الطلبات الجديدة وتُسجل في wallet entry منفصل وقت إنشاء الطلب.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وضع احتساب رسوم المنصة</label>
                    <select
                      value={platformMode}
                      onChange={(e) => setPlatformMode(e.target.value as Mode)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
                        <option key={m} value={m}>{MODE_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">مفعّلة؟</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input id="platform-enabled" type="checkbox" checked={platformEnabled} onChange={(e) => setPlatformEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      <label htmlFor="platform-enabled" className="text-sm text-gray-700">احتساب رسوم المنصة على الطلبات الجديدة</label>
                    </div>
                  </div>
                  {(platformMode === 'percentage' || platformMode === 'percentage_plus_fixed') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نسبة رسوم المنصة (%)</label>
                      <input
                        type="number" min="0" max="100" step="0.01"
                        value={platformPctDisplay}
                        onChange={(e) => setPlatformPctDisplay(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">مثال: 2 تعني 2% من إجمالي الطلب</p>
                    </div>
                  )}
                  {(platformMode === 'fixed' || platformMode === 'percentage_plus_fixed') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رسم المنصة الثابت (ر.س)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={platformFixed}
                        onChange={(e) => setPlatformFixed(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-gray-200 p-4">
                <h2 className="text-base font-bold text-gray-900">رسوم الدفع عند الاستلام</h2>
                <p className="mt-1 text-xs text-gray-500">مستقلة عن رسوم المنصة وتُستخدم فقط عند تحصيل طلب COD.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">وضع احتساب رسوم COD</label>
                    <select
                      value={codMode}
                      onChange={(e) => setCodMode(e.target.value as Mode)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {(Object.keys(MODE_LABELS) as Mode[]).map(m => (
                        <option key={m} value={m}>{MODE_LABELS[m]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">مفعّلة؟</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input id="cod-enabled" type="checkbox" checked={codEnabled} onChange={(e) => setCodEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                      <label htmlFor="cod-enabled" className="text-sm text-gray-700">احتساب رسوم الدفع عند الاستلام على طلبات COD الجديدة</label>
                    </div>
                  </div>
                  {(codMode === 'percentage' || codMode === 'percentage_plus_fixed') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">نسبة رسوم COD (%)</label>
                      <input
                        type="number" min="0" max="100" step="0.01"
                        value={codPctDisplay}
                        onChange={(e) => setCodPctDisplay(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">مثال: 2 تعني 2% من إجمالي طلب COD</p>
                    </div>
                  )}
                  {(codMode === 'fixed' || codMode === 'percentage_plus_fixed') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رسم COD الثابت (ر.س)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={codFixed}
                        onChange={(e) => setCodFixed(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  )}
                </div>
              </section>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سبب التعديل <span className="text-red-500">*</span></label>
                <input
                  type="text" maxLength={500}
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="مثال: ترقية الباقة — 2% ابتداءً من 2026-07-01"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">يُسجَّل في سجل التدقيق. لن يتم الحفظ بدون سبب.</p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !changeReason.trim()}
                  className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '...جاري الحفظ' : 'حفظ التغييرات'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
