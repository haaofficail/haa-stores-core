/* eslint-disable @typescript-eslint/no-explicit-any */
// Admin: Settlement Readiness page.
// Lists all stores with their wallet_settlement_readiness status.
// Admin can open a modal to update the 4 readiness fields per store.

import { useEffect, useState } from 'react';
import { adminApi, type AdminStore } from '../lib/api';
import { toast } from 'sonner';

type SamaStatus = 'unconfirmed' | 'registered' | 'licensed' | 'exempt';

interface ReadinessData {
  storeId: number;
  safeguardedAccountConfigured: boolean;
  pspSettlementPartnerConfirmed: boolean;
  merchantOfRecordConfirmed: boolean;
  samaComplianceStatus: SamaStatus;
}

const SAMA_LABELS: Record<SamaStatus, string> = {
  unconfirmed: 'غير مؤكد',
  registered: 'مسجّل',
  licensed: 'مرخّص',
  exempt: 'معفى',
};

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {ok ? 'مكتمل' : 'ناقص'}
    </span>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm">
      {message}
    </div>
  );
}

export default function SettlementReadiness() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [readinessMap, setReadinessMap] = useState<Record<number, ReadinessData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedStore, setSelectedStore] = useState<AdminStore | null>(null);
  const [form, setForm] = useState<ReadinessData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const storeList = await adminApi.getStores();
        setStores(storeList);
        // Fetch readiness for all stores in parallel
        const results = await Promise.allSettled(
          storeList.map(s => adminApi.getSettlementReadiness(s.id))
        );
        const map: Record<number, ReadinessData> = {};
        storeList.forEach((s, i) => {
          const r = results[i];
          if (r.status === 'fulfilled') {
            map[s.id] = r.value as unknown as ReadinessData;
          } else {
            map[s.id] = {
              storeId: s.id,
              safeguardedAccountConfigured: false,
              pspSettlementPartnerConfirmed: false,
              merchantOfRecordConfirmed: false,
              samaComplianceStatus: 'unconfirmed',
            };
          }
        });
        setReadinessMap(map);
      } catch (err: any) {
        setError(err?.message || 'فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openModal = (store: AdminStore) => {
    const current = readinessMap[store.id] ?? {
      storeId: store.id,
      safeguardedAccountConfigured: false,
      pspSettlementPartnerConfirmed: false,
      merchantOfRecordConfirmed: false,
      samaComplianceStatus: 'unconfirmed' as SamaStatus,
    };
    setSelectedStore(store);
    setForm({ ...current });
  };

  const closeModal = () => {
    setSelectedStore(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!selectedStore || !form) return;
    setSaving(true);
    try {
      const result = await adminApi.updateSettlementReadiness(selectedStore.id, {
        safeguardedAccountConfigured: form.safeguardedAccountConfigured,
        pspSettlementPartnerConfirmed: form.pspSettlementPartnerConfirmed,
        merchantOfRecordConfirmed: form.merchantOfRecordConfirmed,
        samaComplianceStatus: form.samaComplianceStatus,
      });
      setReadinessMap(prev => ({
        ...prev,
        [selectedStore.id]: result as unknown as ReadinessData,
      }));
      toast.success('تم حفظ جاهزية التسوية');
      closeModal();
    } catch (err: any) {
      toast.error(err?.message || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

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

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">جاهزية التسوية</h2>
        <p className="text-sm text-gray-500 mt-1">إدارة حالة جاهزية التسوية المالية لكل متجر</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-start px-4 py-3 font-medium text-gray-600">المتجر</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">حساب أمان</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">شريك PSP</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">MoR</th>
              <th className="text-start px-4 py-3 font-medium text-gray-600">امتثال ساما</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {stores.map(store => {
              const r = readinessMap[store.id];
              return (
                <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{store.name}</td>
                  <td className="px-4 py-3"><StatusBadge ok={r?.safeguardedAccountConfigured ?? false} /></td>
                  <td className="px-4 py-3"><StatusBadge ok={r?.pspSettlementPartnerConfirmed ?? false} /></td>
                  <td className="px-4 py-3"><StatusBadge ok={r?.merchantOfRecordConfirmed ?? false} /></td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      r?.samaComplianceStatus === 'licensed' ? 'bg-green-100 text-green-700' :
                      r?.samaComplianceStatus === 'registered' ? 'bg-primary-100 text-primary-700' :
                      r?.samaComplianceStatus === 'exempt' ? 'bg-gray-100 text-gray-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {SAMA_LABELS[r?.samaComplianceStatus ?? 'unconfirmed']}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(store)}
                      className="text-primary-600 hover:text-primary-800 font-medium text-xs px-3 py-1 rounded-lg border border-primary-200 hover:bg-primary-50 transition-colors"
                    >
                      تفاصيل
                    </button>
                  </td>
                </tr>
              );
            })}
            {stores.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">لا توجد متاجر</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedStore && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-gray-900">جاهزية التسوية — {selectedStore.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">عدّل الحقول ثم احفظ</p>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.safeguardedAccountConfigured}
                  onChange={e => setForm(f => f ? { ...f, safeguardedAccountConfigured: e.target.checked } : f)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">تم تهيئة الحساب المحمي (Safeguarded Account)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pspSettlementPartnerConfirmed}
                  onChange={e => setForm(f => f ? { ...f, pspSettlementPartnerConfirmed: e.target.checked } : f)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">تم تأكيد شريك PSP للتسوية</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.merchantOfRecordConfirmed}
                  onChange={e => setForm(f => f ? { ...f, merchantOfRecordConfirmed: e.target.checked } : f)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">تم تأكيد Merchant of Record</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">حالة امتثال ساما</label>
                <select
                  value={form.samaComplianceStatus}
                  onChange={e => setForm(f => f ? { ...f, samaComplianceStatus: e.target.value as SamaStatus } : f)}
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
