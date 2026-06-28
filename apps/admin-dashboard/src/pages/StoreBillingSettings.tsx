// Admin: Store Billing Settings page.
//
// Phase 9 of the Configurable Platform Fee Policy work. Lists every store
// with its current policy and lets the admin change:
//   - mode (none / percentage / fixed / percentage_plus_fixed)
//   - pct (0..1, e.g. 0.02 = 2%)
//   - fixed (absolute amount in store currency)
//   - isPlatformFeeEnabled
//   - changeReason (audit log)
//
// All updates record an `store_billing_settings_updated` audit entry.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../lib/api';
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

  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialStoreId);
  const [raw, setRaw] = useState<RawSettings>(null);
  const [effectiveLabel, setEffectiveLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable form state
  const [mode, setMode] = useState<Mode>('percentage');
  const [pctDisplay, setPctDisplay] = useState<string>('2');
  const [fixed, setFixed] = useState<string>('0');
  const [enabled, setEnabled] = useState<boolean>(true);
  const [changeReason, setChangeReason] = useState<string>('');

  const selectStore = (storeId: number) => {
    setSelectedId(storeId);
    setParams({ storeId: String(storeId) });
  };

  useEffect(() => {
    adminApi.getStores().then(setStores).catch(() => toast.error('فشل تحميل المتاجر'));
  }, []);

  useEffect(() => {
    if (selectedId == null) {
      setRaw(null); setEffectiveLabel('');
      return;
    }
    setLoading(true);
    adminApi.getStoreBillingSettings(selectedId).then(res => {
      const r = res.settings;
      setRaw(r);
      setEffectiveLabel(res.effectivePolicyLabel);
      const m = (res.effectivePolicy.mode as Mode) ?? 'percentage';
      setMode(m);
      setPctDisplay(pctToDisplay(res.effectivePolicy.pct));
      setFixed(String(res.effectivePolicy.fixed ?? 0));
      setEnabled(res.effectivePolicy.enabled);
      setChangeReason('');
    }).catch((e) => toast.error(`فشل تحميل الإعدادات: ${e?.message ?? 'خطأ'}`))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleSave = async () => {
    if (selectedId == null) return;
    if (!changeReason.trim()) {
      toast.error('سبب التعديل مطلوب للسجل');
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.updateStoreBillingSettings(selectedId, {
        platformFeeMode: mode,
        platformFeePct: mode === 'percentage' || mode === 'percentage_plus_fixed' ? pctFromDisplay(pctDisplay) : null,
        platformFeeFixed: mode === 'fixed' || mode === 'percentage_plus_fixed' ? Number(fixed) : null,
        isPlatformFeeEnabled: enabled,
        changeReason: changeReason.trim(),
      });
      setRaw(res.settings);
      setEffectiveLabel(res.effectivePolicyLabel);
      toast.success('تم تحديث إعدادات الرسوم');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'فشل التحديث';
      toast.error(message);
    } finally {
      setSaving(false);
    }
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
          ) : (
            <div className="space-y-5">
              {/* Read-only summary */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">الحالة الحالية</p>
                    <p className="font-medium">{effectiveLabel || '—'}</p>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وضع الاحتساب</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as Mode)}
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
                    <input id="enabled" type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
                    <label htmlFor="enabled" className="text-sm text-gray-700">احتساب رسوم المنصة على الطلبات الجديدة</label>
                  </div>
                </div>
                {(mode === 'percentage' || mode === 'percentage_plus_fixed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">النسبة المئوية (%)</label>
                    <input
                      type="number" min="0" max="100" step="0.01"
                      value={pctDisplay}
                      onChange={(e) => setPctDisplay(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">مثال: 2 تعني 2% من إجمالي الطلب</p>
                  </div>
                )}
                {(mode === 'fixed' || mode === 'percentage_plus_fixed') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الرسم الثابت (ر.س)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={fixed}
                      onChange={(e) => setFixed(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}
              </div>

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
