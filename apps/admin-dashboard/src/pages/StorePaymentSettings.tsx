// Admin: Store Payment Settings page.
// Allows enabling/disabling payment gateways per store via
// merchantPaymentProviderSettings table.

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  adminApi,
  type AdminStorePaymentMode,
  type AdminStorePaymentSetting,
  type AdminStorePaymentStatus,
} from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { StoreSelectorPanel } from '../components/ui/StoreSelectorPanel';
import { toast } from 'sonner';

const PROVIDERS = ['moyasar', 'geidea', 'tabby', 'tamara'] as const;
type ProviderCode = typeof PROVIDERS[number];
type ProviderSetting = AdminStorePaymentSetting;

const PROVIDER_LABELS: Record<ProviderCode, string> = {
  moyasar: 'ميسر (Moyasar)',
  geidea: 'جيدة (Geidea)',
  tabby: 'تابي (Tabby)',
  tamara: 'تمارا (Tamara)',
};

type RowState = {
  enabled: boolean;
  mode: AdminStorePaymentMode;
  status: AdminStorePaymentStatus;
  saving: boolean;
};

type SavePaymentSettingsVars = {
  providerCode: ProviderCode;
  storeId: number;
  row: RowState;
};

function createInitialRows(): Record<ProviderCode, RowState> {
  const init = {} as Record<ProviderCode, RowState>;
  for (const p of PROVIDERS) {
    init[p] = { enabled: false, mode: 'test', status: 'not_configured', saving: false };
  }
  return init;
}

function normalizePaymentMode(value: string | undefined): AdminStorePaymentMode {
  return value === 'live' ? 'live' : 'test';
}

function normalizePaymentStatus(value: string | undefined): AdminStorePaymentStatus {
  if (
    value === 'active' ||
    value === 'suspended' ||
    value === 'not_configured' ||
    value === 'configured' ||
    value === 'invalid'
  ) {
    return value;
  }
  return 'not_configured';
}

function isProviderSetting(value: unknown): value is ProviderSetting {
  if (!value || typeof value !== 'object') return false;
  const setting = value as Partial<Record<keyof ProviderSetting, unknown>>;
  return (
    typeof setting.providerCode === 'string' &&
    typeof setting.enabled === 'boolean' &&
    typeof setting.mode === 'string' &&
    typeof setting.status === 'string' &&
    typeof setting.supportedPaymentMethod === 'string'
  );
}

function normalizeProviderSettings(data: unknown): ProviderSetting[] {
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return raw.filter(isProviderSetting).map(setting => ({
    ...setting,
    mode: normalizePaymentMode(setting.mode),
    status: normalizePaymentStatus(setting.status),
  }));
}

function rowsFromSettings(prev: Record<ProviderCode, RowState>, settings: ProviderSetting[]) {
  const next = { ...prev };
  for (const p of PROVIDERS) {
    const found = settings.find(s => s.providerCode === p);
    next[p] = {
      enabled: found?.enabled ?? false,
      mode: normalizePaymentMode(found?.mode),
      status: normalizePaymentStatus(found?.status),
      saving: false,
    };
  }
  return next;
}

function replaceProviderSettingInCache(current: unknown, providerCode: ProviderCode, updated: ProviderSetting) {
  const settings = normalizeProviderSettings(current);
  const next = settings.some(setting => setting.providerCode === providerCode)
    ? settings.map(setting => setting.providerCode === providerCode ? updated : setting)
    : [...settings, updated];

  if (current && typeof current === 'object' && Array.isArray((current as { data?: unknown }).data)) {
    return { ...current, data: next };
  }

  return next;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    configured: 'bg-emerald-100 text-emerald-800',
    invalid: 'bg-amber-100 text-amber-800',
    suspended: 'bg-red-100 text-red-800',
    not_configured: 'bg-gray-100 text-gray-600',
  };
  const labels: Record<string, string> = {
    active: 'نشط',
    configured: 'مهيأ',
    invalid: 'غير صالح',
    suspended: 'موقوف',
    not_configured: 'غير مُهيَّأ',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function isProviderConfigured(row: RowState): boolean {
  return row.status === 'configured' || row.status === 'active';
}

function paymentDecision(row: RowState) {
  const configured = isProviderConfigured(row);
  const enabled = configured && row.enabled;
  if (!configured) {
    if (row.enabled) {
      return {
        readinessLabel: 'مفعلة في البيانات وغير جاهزة',
        readinessClass: 'bg-amber-50 text-amber-700 border-amber-100',
        blocker: row.status === 'invalid'
          ? 'الاعتمادات غير صالحة رغم أن التفعيل المخزن true. عند الحفظ سيُرسل enabled=false حتى لا تظهر البوابة كمتاحة.'
          : 'التفعيل المخزن true، لكن الحالة الحالية تمنع اعتبار البوابة جاهزة أو متاحة للعملاء.',
        enabledLabel: 'مفعلة مخزنة',
      };
    }
    return {
      readinessLabel: 'غير جاهزة',
      readinessClass: 'bg-red-50 text-red-700 border-red-100',
      blocker: row.status === 'invalid'
        ? 'الاعتمادات غير صالحة. أصلح المفاتيح قبل تفعيل البوابة.'
        : 'مفاتيح أو إعدادات المزود غير مكتملة، لذلك لا يمكن اعتبارها مفعلة.',
      enabledLabel: 'غير قابلة للتفعيل',
    };
  }
  if (!enabled) {
    return {
      readinessLabel: 'مهيأة وغير مفعلة',
      readinessClass: 'bg-amber-50 text-amber-700 border-amber-100',
      blocker: 'الإعداد موجود، لكن استقبال المدفوعات عبر هذه البوابة غير مفعل.',
      enabledLabel: 'غير مفعلة',
    };
  }
  return {
    readinessLabel: row.mode === 'live' ? 'جاهزة للتشغيل المباشر' : 'جاهزة في وضع التجربة',
    readinessClass: row.mode === 'live'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-sky-50 text-sky-700 border-sky-100',
    blocker: row.mode === 'live'
      ? 'لا تحفظ وضع live إلا بعد تأكيد المفاتيح والتسوية من المزود.'
      : 'وضع التجربة مناسب للاختبار فقط، وليس إشارة إطلاق إنتاجي.',
    enabledLabel: 'مفعلة',
  };
}

export default function StorePaymentSettings() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const initialStoreId = params.get('storeId') ? Number(params.get('storeId')) : null;

  const [stores, setStores] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialStoreId);
  const [rows, setRows] = useState<Record<ProviderCode, RowState>>(createInitialRows);
  const seededStoreIdRef = useRef<number | null>(null);
  const settingsQueryKey = [...queryKeys.storePaymentSettings, selectedId ?? null];

  const selectStore = (storeId: number) => {
    setSelectedId(storeId);
    setParams({ storeId: String(storeId) });
  };

  const { data: settingsData, isPending: loading, isError: error, refetch } = useQuery({
    queryKey: settingsQueryKey,
    queryFn: () => adminApi.getStorePaymentSettings(selectedId as number),
    enabled: !!selectedId,
  });

  useEffect(() => {
    adminApi.getStores().then(setStores).catch(() => toast.error('فشل تحميل المتاجر'));
  }, []);

  // Seed editable rows once per selected store. Mutations update the query cache
  // separately, but local unsaved edits in sibling provider rows stay local.
  useEffect(() => {
    if (settingsData === undefined || selectedId == null || seededStoreIdRef.current === selectedId) return;
    const settings = normalizeProviderSettings(settingsData);
    setRows(prev => rowsFromSettings(prev, settings));
    seededStoreIdRef.current = selectedId;
  }, [selectedId, settingsData]);

  // Surface load failures via toast (parity with the previous catch handler).
  useEffect(() => {
    if (error) toast.error('فشل تحميل إعدادات البوابات');
  }, [error]);

  const saveMutation = useMutation<ProviderSetting, Error, SavePaymentSettingsVars>({
    mutationFn: ({ storeId, row, providerCode }: SavePaymentSettingsVars) => {
      const safeEnabled = row.enabled && isProviderConfigured(row);
      return adminApi.upsertStorePaymentSettings(storeId, {
        providerCode,
        enabled: safeEnabled,
        mode: row.mode,
        status: row.status,
        supportedPaymentMethod: 'card',
      });
    },
    onSuccess: (updated, { providerCode, storeId }) => {
      queryClient.setQueryData([...queryKeys.storePaymentSettings, storeId], (current: unknown) =>
        replaceProviderSettingInCache(current, providerCode, updated),
      );
      // Patch ONLY the saved provider's row from the server response. The cache
      // is also updated so remounts inside the query stale window see the saved
      // value without refetching or discarding unsaved edits in other rows.
      setRows(prev => ({
        ...prev,
        [providerCode]: {
          enabled: updated.enabled,
          mode: normalizePaymentMode(updated.mode),
          status: updated.status,
          saving: false,
        },
      }));
      toast.success(`تم حفظ إعدادات ${PROVIDER_LABELS[providerCode]}`);
    },
    onError: (error, { providerCode }) => {
      toast.error(`فشل الحفظ: ${error.message || 'خطأ غير معروف'}`);
      setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], saving: false } }));
    },
  });

  const handleSave = (providerCode: ProviderCode) => {
    if (selectedId == null) return;
    const row = rows[providerCode];
    setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], saving: true } }));
    saveMutation.mutate({ providerCode, storeId: selectedId, row });
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
        <StoreSelectorPanel stores={stores} selectedId={selectedId} onSelect={selectStore} />

        {/* Settings table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          {selectedId == null ? (
            <p className="text-sm text-gray-500 text-center py-12">اختر متجرًا من القائمة لعرض بوابات الدفع.</p>
          ) : loading ? (
            <p className="text-sm text-gray-400 text-center py-12">...جاري التحميل</p>
          ) : error ? (
            <div className="text-center py-12 space-y-3">
              <p className="text-sm text-gray-500">فشل تحميل إعدادات البوابات</p>
              <button
                onClick={() => refetch()}
                className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              >
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {PROVIDERS.map(providerCode => {
                const row = rows[providerCode];
                const decision = paymentDecision(row);
                const canToggleEnabled = isProviderConfigured(row);
                const toggleClass = canToggleEnabled
                  ? 'cursor-pointer'
                  : row.enabled
                    ? 'cursor-not-allowed'
                    : 'cursor-not-allowed opacity-60';
                return (
                  <div key={providerCode} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="flex-1 min-w-[160px]">
                      <p className="text-sm font-semibold text-gray-800">{PROVIDER_LABELS[providerCode]}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {statusBadge(row.status)}
                          <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${decision.readinessClass}`}>
                            {decision.readinessLabel}
                          </span>
                        </div>
                      </div>

                      {/* Toggle enabled */}
                      <label className={`flex items-center gap-2 ${toggleClass}`}>
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          disabled={!canToggleEnabled}
                          onChange={e => setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], enabled: e.target.checked } }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">التفعيل: {decision.enabledLabel}</span>
                      </label>

                      {/* Mode */}
                      <select
                        value={row.mode}
                        onChange={e => setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], mode: normalizePaymentMode(e.target.value) } }))}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="test">تجربة</option>
                        <option value="live">مباشر</option>
                      </select>

                      {/* Status */}
                      <select
                        value={row.status}
                        onChange={e => setRows(prev => ({ ...prev, [providerCode]: { ...prev[providerCode], status: normalizePaymentStatus(e.target.value) } }))}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {row.status === 'configured' ? <option value="configured">مهيأ</option> : null}
                        {row.status === 'invalid' ? <option value="invalid">غير صالح</option> : null}
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
                    <p className="mt-3 text-xs leading-5 text-gray-500">{decision.blocker}</p>
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
