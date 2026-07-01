/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin: Settlement Readiness page.
// Lists all stores with their wallet_settlement_readiness status.
// Admin can open a modal to update the 4 readiness fields per store.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, hasAdminPermission, type AdminStore } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';

type SamaStatus = 'unconfirmed' | 'in_progress' | 'confirmed';

interface ReadinessData {
  storeId: number;
  safeguardedAccountConfigured: boolean;
  pspSettlementPartnerConfirmed: boolean;
  merchantOfRecordConfirmed: boolean;
  samaComplianceStatus: SamaStatus;
}

const SAMA_LABELS: Record<SamaStatus, string> = {
  unconfirmed: 'غير مؤكد',
  in_progress: 'قيد الاستكمال',
  confirmed: 'مؤكد',
};

const SAMA_STATUS_COLORS: Record<SamaStatus, string> = {
  unconfirmed: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-primary-100 text-primary-700',
  confirmed: 'bg-green-100 text-green-700',
};

function normalizeSamaStatus(value: unknown): SamaStatus {
  if (value === 'unconfirmed' || value === 'in_progress' || value === 'confirmed') return value;
  if (value === 'registered') return 'in_progress';
  if (value === 'licensed' || value === 'exempt') return 'confirmed';
  return 'unconfirmed';
}

function normalizeReadinessData(data: Partial<ReadinessData> & { storeId: number }): ReadinessData {
  return {
    storeId: data.storeId,
    safeguardedAccountConfigured: Boolean(data.safeguardedAccountConfigured),
    pspSettlementPartnerConfirmed: Boolean(data.pspSettlementPartnerConfirmed),
    merchantOfRecordConfirmed: Boolean(data.merchantOfRecordConfirmed),
    samaComplianceStatus: normalizeSamaStatus(data.samaComplianceStatus),
  };
}

function settlementBlockers(readiness: ReadinessData): Array<{ label: string; owner: string; action: string }> {
  const blockers: Array<{ label: string; owner: string; action: string }> = [];
  if (!readiness.safeguardedAccountConfigured) {
    blockers.push({
      label: 'الحساب المحمي غير مهيأ',
      owner: 'المالية',
      action: 'تأكيد الحساب المحمي قبل السماح بالسحب.',
    });
  }
  if (!readiness.pspSettlementPartnerConfirmed) {
    blockers.push({
      label: 'شريك PSP غير مؤكد',
      owner: 'الأدمن / المزود',
      action: 'افتح إعدادات الدفع وتأكد من شريك التسوية.',
    });
  }
  if (!readiness.merchantOfRecordConfirmed) {
    blockers.push({
      label: 'Merchant of Record غير محدد',
      owner: 'قانوني / المالية',
      action: 'وثق مسؤولية البيع قبل اعتماد التسوية.',
    });
  }
  if (readiness.samaComplianceStatus !== 'confirmed') {
    blockers.push({
      label: readiness.samaComplianceStatus === 'in_progress' ? 'امتثال ساما قيد الاستكمال' : 'امتثال ساما غير مؤكد',
      owner: 'الامتثال',
      action: 'لا تعتمد السحب حتى تصبح حالة ساما مؤكدة.',
    });
  }
  return blockers;
}

function settlementDecision(readiness: ReadinessData) {
  const blockers = settlementBlockers(readiness);
  const ready = blockers.length === 0;
  return {
    ready,
    blockers,
    decisionLabel: ready ? 'جاهز للتسوية' : 'غير جاهز',
    withdrawalLabel: ready ? 'مسموح' : 'محظور',
    decisionClass: ready
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-red-50 text-red-700 border-red-100',
    withdrawalClass: ready
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-amber-50 text-amber-700 border-amber-100',
    ownerLabel: ready ? 'لا إجراء' : Array.from(new Set(blockers.map(blocker => blocker.owner))).join(' / '),
  };
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg hover:bg-red-100 transition-colors"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

export default function SettlementReadiness() {
  const queryClient = useQueryClient();
  const canUpdateSettlementReadiness = hasAdminPermission('wallet.payout.approve');

  // Modal state
  const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
  const [form, setForm] = useState<ReadinessData | null>(null);

  const {
    data,
    isPending: loading,
    isError: error,
    refetch,
  } = useQuery<{ stores: AdminStore[]; readinessMap: Record<number, ReadinessData> }>({
    queryKey: queryKeys.settlementReadiness,
    queryFn: async () => {
      const storeList = await adminApi.getStores();
      // Fetch readiness for all stores in parallel
      const results = await Promise.allSettled(
        storeList.map(s => adminApi.getSettlementReadiness(s.id))
      );
      const map: Record<number, ReadinessData> = {};
      storeList.forEach((s, i) => {
        const r = results[i];
        if (r.status === 'fulfilled') {
          map[s.id] = normalizeReadinessData(r.value as Partial<ReadinessData> & { storeId: number });
        } else {
          map[s.id] = normalizeReadinessData({
            storeId: s.id,
            safeguardedAccountConfigured: false,
            pspSettlementPartnerConfirmed: false,
            merchantOfRecordConfirmed: false,
            samaComplianceStatus: 'unconfirmed',
          });
        }
      });
      return { stores: storeList, readinessMap: map };
    },
  });

  const stores = data?.stores ?? [];
  const readinessMap = data?.readinessMap ?? {};

  const saveMutation = useMutation({
    mutationFn: (vars: { storeId: number; payload: Omit<ReadinessData, 'storeId'> }) =>
      adminApi.updateSettlementReadiness(vars.storeId, vars.payload),
    onSuccess: () => {
      toast.success('تم حفظ جاهزية التسوية');
      closeModal();
      queryClient.invalidateQueries({ queryKey: queryKeys.settlementReadiness });
    },
    onError: (err: any) => toast.error(err?.message || 'فشل الحفظ'),
  });

  const saving = saveMutation.isPending;

  const openModal = (store: AdminStore) => {
    const current = readinessMap[store.id] ?? normalizeReadinessData({
      storeId: store.id,
      safeguardedAccountConfigured: false,
      pspSettlementPartnerConfirmed: false,
      merchantOfRecordConfirmed: false,
      samaComplianceStatus: 'unconfirmed' as SamaStatus,
    });
    setSelectedStore(store);
    setForm(normalizeReadinessData(current));
  };

  const closeModal = () => {
    setSelectedStore(null);
    setForm(null);
  };

  const handleSave = () => {
    if (!selectedStore || !form) return;
    if (!canUpdateSettlementReadiness) {
      toast.error('لا تملك صلاحية تعديل جاهزية التسوية');
      return;
    }
    saveMutation.mutate({
      storeId: selectedStore.id,
      payload: {
        safeguardedAccountConfigured: form.safeguardedAccountConfigured,
        pspSettlementPartnerConfirmed: form.pspSettlementPartnerConfirmed,
        merchantOfRecordConfirmed: form.merchantOfRecordConfirmed,
        samaComplianceStatus: form.samaComplianceStatus,
      },
    });
  };

  // Hooks must run on every render (Rules of Hooks): keep useTableControls
  // above the loading/error early returns.
  const controls = useTableControls<any>({
    rows: stores,
    searchFields: ['name', 'id'],
    initialSort: { key: 'name', dir: 'asc' },
    storageKey: 'settlementReadiness',
  });
  const { query, setQuery } = controls;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse" />
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message="فشل تحميل البيانات" onRetry={() => refetch()} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">جاهزية التسوية</h2>
        <p className="text-sm text-gray-500 mt-1">قرار مالي لكل متجر: هل السحب مسموح، ما الموانع، ومن المسؤول عن الإغلاق.</p>
      </div>

      <div>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="بحث باسم المتجر..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {stores.length === 0 ? (
          <div className="p-12 text-center text-gray-400">لا توجد متاجر</div>
        ) : controls.filteredCount === 0 ? (
          <div className="p-12 text-center text-gray-400">لا توجد نتائج مطابقة</div>
        ) : (
          <>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <SortableTh sortKey="name" label="المتجر" sort={controls.sort} onToggle={controls.toggleSort} />
              <th className="text-start px-4 py-3 font-medium text-gray-600">القرار المالي</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">السحب</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">الموانع</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">المسؤول</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">امتثال ساما</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {controls.rows.map(store => {
              const r = readinessMap[store.id] ?? normalizeReadinessData({
                storeId: store.id,
                safeguardedAccountConfigured: false,
                pspSettlementPartnerConfirmed: false,
                merchantOfRecordConfirmed: false,
                samaComplianceStatus: 'unconfirmed',
              });
              const samaStatus = normalizeSamaStatus(r?.samaComplianceStatus);
              const decision = settlementDecision(r);
              return (
                <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{store.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${decision.decisionClass}`}>
                      {decision.decisionLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded border px-2 py-1 text-xs font-semibold ${decision.withdrawalClass}`}>
                      {decision.withdrawalLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {decision.blockers.length === 0 ? 'لا توجد موانع' : `${decision.blockers.length} موانع`}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{decision.ownerLabel}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${SAMA_STATUS_COLORS[samaStatus]}`}>
                      {SAMA_LABELS[samaStatus]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(store)}
                      className="text-primary-600 hover:text-primary-800 font-medium text-xs px-3 py-1 rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                    >
                      {canUpdateSettlementReadiness ? 'مراجعة' : 'تفاصيل'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      </div>

      {/* Modal */}
      {selectedStore && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">جاهزية التسوية — {selectedStore.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {canUpdateSettlementReadiness ? 'عدّل الحقول ثم احفظ' : 'عرض فقط — يتطلب التعديل صلاحية اعتماد الصرف'}
              </p>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              {settlementDecision(form).ready ? (
                <p className="text-sm font-semibold text-emerald-700">قرار التسوية: جاهز، ولا توجد موانع ظاهرة.</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-red-700">قرار التسوية: غير جاهز. السحب محظور حتى إغلاق الموانع.</p>
                  <ul className="space-y-1 text-xs leading-5 text-gray-600">
                    {settlementDecision(form).blockers.map(blocker => (
                      <li key={blocker.label}>
                        <span className="font-semibold text-gray-800">{blocker.label}</span>
                        {' — '}
                        يمنع السحب — المسؤول: {blocker.owner}. الإجراء التالي: {blocker.action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.safeguardedAccountConfigured}
                  onChange={e => setForm(f => f ? { ...f, safeguardedAccountConfigured: e.target.checked } : f)}
                  disabled={!canUpdateSettlementReadiness || saving}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">تم تهيئة الحساب المحمي (Safeguarded Account)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pspSettlementPartnerConfirmed}
                  onChange={e => setForm(f => f ? { ...f, pspSettlementPartnerConfirmed: e.target.checked } : f)}
                  disabled={!canUpdateSettlementReadiness || saving}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">تم تأكيد شريك PSP للتسوية</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.merchantOfRecordConfirmed}
                  onChange={e => setForm(f => f ? { ...f, merchantOfRecordConfirmed: e.target.checked } : f)}
                  disabled={!canUpdateSettlementReadiness || saving}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">تم تأكيد Merchant of Record</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حالة امتثال ساما</label>
                <select
                  value={form.samaComplianceStatus}
                  onChange={e => setForm(f => f ? { ...f, samaComplianceStatus: e.target.value as SamaStatus } : f)}
                  disabled={!canUpdateSettlementReadiness || saving}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {(Object.keys(SAMA_LABELS) as SamaStatus[]).map(k => (
                    <option key={k} value={k}>{SAMA_LABELS[k]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              {canUpdateSettlementReadiness && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
