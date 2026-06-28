/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin: Store Payment Settings page.
// Allows enabling/disabling payment gateways per store via
// merchantPaymentProviderSettings table.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../lib/api';
const paymentSettingsApi = {
  getStorePaymentSettings: adminApi.getStorePaymentSettings,
  upsertStorePaymentSettings: adminApi.upsertStorePaymentSettings,
};
import { toast } from 'sonner';

const PROVIDERS = ['moyasar', 'geidea', 'tabby', 'tamara'] as const;
type ProviderCode = typeof PROVIDERS[number];

const PROVIDER_LABELS: Record<ProviderCode, string> = {
  moyasar: 'ميسر (Moyasar)',
  geidea: 'جيدة (Geidea)',
  tabby: 'تابي (Tabby)',
  tamara: 'تمارا (Tamara)',
};

type ProviderSetting = {
  providerCode: string;
  enabled: boolean;
  mode: string;
  status: string;
  supportedPaymentMethod: string;
};

type RowState = {
  enabled: boolean;
  mode: 'test' | 'live';
  status: string;
  saving: boolean;
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    suspended: 'bg-red-100 text-red-800',
    not_configured: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    active: 'نشط',
    suspended: 'موقوف',
    not_configured: 'غير مُهيَّأ',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function StorePaymentSettings() {
  const [params, setParams] = useSearchParams();
  const initialStoreId = params.get('storeId') ? Number(params.get('storeId')) : null;

  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialStoreId);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Record<ProviderCode, RowState>>(() => {
    const init = {} as Record<ProviderCode, RowState>;
    for (const p of PROVIDERS) {
      init[p] = { enabled: false, mode: 'test', status: 'not_configured', saving: false };
    }
    return init;
  });

  useEffect(() => {
    adminApi.getStores().then(setStores).catch(() => toast.error('فشل تحميل المتاجر'));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    setLoading(true);
    paymentSettingsApi.getStorePaymentSettings(selectedId)
      .then((data: any) => {
        const settings: ProviderSetting[] = Array.isArray(data) ? data : (data?.data ?? []);
        setRows(prev => {
          const next = { ...prev };
          for (const p of PROVIDERS) {
            const found = settings.find((s: any) => s.providerCode === p);
            next[p] = {
              enabled: found?.enabled ?? false,
              mode: (found?.mode ?? 'test') as 'test' | 'live',
              status: found?.status ?? 'not_configured',
              saving: false,
            };
          }
          return next;
        });
      })
      .catch(() => toast.error('فشل تحميل إعدادات البوابات'))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const handleSave = async (providerCode: ProviderCode) => {
    if (selectedId == null) return;
    setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], saving: true } }));
    try {
      const row = rows[providerCode];
      const result: any = await paymentSettingsApi.upsertStorePaymentSettings(selectedId, {
        providerCode,
        enabled: row.enabled,
        mode: row.mode,
        status: row.status,
        supportedPaymentMethod: 'card',
      });
      const updated = result?.data ?? result;
      setRows(prev => ({
        ...prev,
        [providerCode]: {
          enabled: updated.enabled,
          mode: updated.mode as 'test' | 'live',
          status: updated.status,
          saving: false,
        },
      }));
      toast.success(`تم حفظ إعدادات ${PROVIDER_LABELS[providerCode]}`);
    } catch (e: any) {
      toast.error(`فشل الحفظ: ${e?.message ?? 'خطأ غير معروف'}`);
      setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], saving: false } }));
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">بوابات الدفع</h1>
        <p className="text-sm text-gray-500 mt-1">
          فعّل أو عطّل بوابات الدفع لكل متجر واضبط وضع التشغيل (تجربة / مباشر).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Store list */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <p className="text-sm font-medium text-gray-700 px-2 py-1.5">المتاجر</p>
          <div className="space-y-1 max-h-[70vh] overflow-y-auto">
            {stores.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedId(s.id); setParams({ storeId: String(s.id) }); }}
                className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedId === s.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xs text-gray-400 font-mono ms-1">#{s.id}</span>
                {s.name}
              </button>
            ))}
            {stores.length === 0 && <p className="text-xs text-gray-400 px-2 py-3">لا توجد متاجر.</p>}
          </div>
        </div>

        {/* Settings table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          {selectedId == null ? (
            <p className="text-sm text-gray-500 text-center py-12">اختر متجرًا من القائمة لعرض بوابات الدفع.</p>
          ) : loading ? (
            <p className="text-sm text-gray-400 text-center py-12">...جاري التحميل</p>
          ) : (
            <div className="space-y-4">
              {PROVIDERS.map(providerCode => {
                const row = rows[providerCode];
                return (
                  <div key={providerCode} className="flex flex-wrap items-center gap-3 p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex-1 min-w-[140px]">
                      <p className="text-sm font-semibold text-gray-800">{PROVIDER_LABELS[providerCode]}</p>
                      <div className="mt-1">{statusBadge(row.status)}</div>
                    </div>

                    {/* Toggle enabled */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={e => setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], enabled: e.target.checked } }))}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">مفعّلة</span>
                    </label>

                    {/* Mode */}
                    <select
                      value={row.mode}
                      onChange={e => setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], mode: e.target.value as 'test' | 'live' } }))}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="test">تجربة</option>
                      <option value="live">مباشر</option>
                    </select>

                    {/* Status */}
                    <select
                      value={row.status}
                      onChange={e => setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], status: e.target.value } }))}
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="not_configured">غير مُهيَّأ</option>
                      <option value="active">نشط</option>
                      <option value="suspended">موقوف</option>
                    </select>

                    <button
                      onClick={() => handleSave(providerCode)}
                      disabled={row.saving}
                      className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {row.saving ? '...' : 'حفظ'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
