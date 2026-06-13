import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';

export default function Plans() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi.getPlans()
      .then(setPlans)
      .catch(() => { setError(true); toast.error(t('plans.loadError', 'فشل تحميل الباقات')); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (plan: any) => {
    try {
      await adminApi.updatePlan(plan.id, { isActive: !plan.isActive });
      toast.success(plan.isActive ? t('plans.disabled', 'تم تعطيل الباقة') : t('plans.enabled', 'تم تفعيل الباقة'));
      load();
    } catch {
      toast.error(t('plans.toggleError', 'فشل تحديث حالة الباقة'));
    }
  };

  const openEdit = (plan: any) => {
    setEditId(plan.id);
    setEditForm({
      name: plan.name || '',
      description: plan.description || '',
      priceMonthly: plan.priceMonthly || '0',
      priceAnnual: plan.priceAnnual || '0',
      productLimit: plan.productLimit ?? -1,
      staffLimit: plan.staffLimit ?? -1,
      storageLimitMb: plan.storageLimitMb ?? -1,
      orderLimit: plan.orderLimit ?? -1,
      trialDays: plan.trialDays ?? 0,
    });
  };

  const saveEdit = async () => {
    if (!editId || !editForm) return;
    setSaving(true);
    try {
      await adminApi.updatePlan(editId, {
        name: editForm.name,
        description: editForm.description || null,
        priceMonthly: Number(editForm.priceMonthly),
        priceAnnual: Number(editForm.priceAnnual),
        productLimit: Number(editForm.productLimit),
        staffLimit: Number(editForm.staffLimit),
        storageLimitMb: Number(editForm.storageLimitMb),
        orderLimit: Number(editForm.orderLimit),
        trialDays: Number(editForm.trialDays),
      });
      toast.success(t('plans.updateSuccess', 'تم تحديث الباقة بنجاح'));
      setEditId(null);
      setEditForm(null);
      load();
    } catch {
      toast.error(t('plans.updateError', 'فشل تحديث الباقة'));
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: string) => Number(price) === 0 ? t('plans.free', 'مجاني') : `${price} ${t('plans.sar', 'ر.س')}`;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('plans.pageTitle', 'الباقات')}</h2>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-sm">
          <p className="text-sm text-gray-500 mb-3">{t('plans.loadError', 'فشل تحميل الباقات')}</p>
          <button
            onClick={() => load()}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('common.retry', 'إعادة المحاولة')}
          </button>
        </div>
      ) : plans.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl shadow-sm">
          <p className="text-sm text-gray-500">{t('plans.empty', 'لا توجد باقات')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => (
            <div key={p.id} className={`bg-white rounded-xl shadow-sm p-6 ${p.isActive ? 'border-2 border-blue-200' : 'opacity-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-lg text-gray-900">{p.name}</h3>
                <button
                  onClick={() => toggleActive(p)}
                  className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    p.isActive
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.isActive ? t('plans.active', 'نشط') : t('plans.inactive', 'غير نشط')}
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{p.description || ''}</p>
              <div className="text-2xl font-bold mb-1 text-gray-900">{formatPrice(p.priceMonthly)}<span className="text-sm text-gray-400 font-normal">{t('plans.perMonth', '/شهر')}</span></div>
              <div className="text-sm text-gray-400 mb-4">{formatPrice(p.priceAnnual)}{t('plans.perYear', '/سنة')}</div>
              <div className="space-y-2 text-sm text-gray-600">
                {p.productLimit > 0 && <div>{t('plans.productsWithLimit', 'المنتجات: {{count}}', { count: p.productLimit })}</div>}
                {p.productLimit === 0 && <div>{t('plans.productsUnlimitedAll', 'المنتجات: ∞')}</div>}
                {p.productLimit === -1 && <div>{t('plans.productsUnlimited', 'المنتجات: غير محدود')}</div>}
                {p.staffLimit > 0 && <div>{t('plans.staffWithLimit', 'الموظفين: {{count}}', { count: p.staffLimit })}</div>}
                {p.staffLimit === -1 && <div>{t('plans.staffUnlimited', 'الموظفين: غير محدود')}</div>}
                {p.storageLimitMb > 0 && <div>{t('plans.storageWithLimit', 'التخزين: {{count}}MB', { count: p.storageLimitMb })}</div>}
                {p.storageLimitMb === -1 && <div>{t('plans.storageUnlimited', 'التخزين: غير محدود')}</div>}
                {p.trialDays > 0 && <div>{t('plans.trialDays', 'تجربة مجانية: {{count}} يوم', { count: p.trialDays })}</div>}
              </div>
              <div className="mt-4 pt-4 border-t flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {t('plans.edit', 'تعديل')}
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer ${
                    p.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {p.isActive ? t('plans.disable', 'تعطيل') : t('plans.enable', 'تفعيل')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editId && editForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setEditId(null); setEditForm(null); }}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">{t('plans.editTitle', 'تعديل الباقة')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.name', 'اسم الباقة')}</label>
                <input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.description', 'الوصف')}</label>
                <input type="text" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.monthlyPrice', 'السعر الشهري')}</label>
                  <input type="number" value={editForm.priceMonthly} onChange={e => setEditForm({ ...editForm, priceMonthly: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.annualPrice', 'السعر السنوي')}</label>
                  <input type="number" value={editForm.priceAnnual} onChange={e => setEditForm({ ...editForm, priceAnnual: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.productLimit', 'حد المنتجات (-1 = غير محدود)')}</label>
                  <input type="number" value={editForm.productLimit} onChange={e => setEditForm({ ...editForm, productLimit: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.staffLimit', 'حد الموظفين (-1 = غير محدود)')}</label>
                  <input type="number" value={editForm.staffLimit} onChange={e => setEditForm({ ...editForm, staffLimit: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.storageLimit', 'التخزين (MB) (-1 = غير محدود)')}</label>
                  <input type="number" value={editForm.storageLimitMb} onChange={e => setEditForm({ ...editForm, storageLimitMb: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.orderLimit', 'حد الطلبات (-1 = غير محدود)')}</label>
                  <input type="number" value={editForm.orderLimit} onChange={e => setEditForm({ ...editForm, orderLimit: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('plans.trialDays', 'أيام التجربة المجانية')}</label>
                <input type="number" value={editForm.trialDays} onChange={e => setEditForm({ ...editForm, trialDays: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? t('plans.saving', 'جاري الحفظ...') : t('plans.save', 'حفظ التغييرات')}
              </button>
              <button
                onClick={() => { setEditId(null); setEditForm(null); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel', 'إلغاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
