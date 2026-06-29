/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, hasAdminPermission } from '../lib/api';
import { toast } from 'sonner';
import { Icon } from '../components/ui/icon';

const UNLIMITED = -1;

function UnlimitedField({
  label,
  value,
  onChange,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  const isUnlimited = value === UNLIMITED;
  return (
    <div>
      <label className="block text-footnote font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isUnlimited}
            onChange={e => onChange(e.target.checked ? UNLIMITED : 0)}
            className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-footnote text-gray-600">غير محدود</span>
        </label>
        {!isUnlimited && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={value}
              onChange={e => onChange(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-footnote focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {unit && <span className="text-footnote text-gray-400 whitespace-nowrap">{unit}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl shadow-card">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Icon name="AlertCircle" size="md" className="text-red-400" />
      </div>
      <p className="text-callout font-medium text-gray-700 mb-1">تعذّر تحميل الباقات</p>
      <p className="text-footnote text-gray-400 mb-5">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-footnote font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

export default function Plans() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const canUpdatePlans = hasAdminPermission('plans.update');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.getPlans()
      .then(setPlans)
      .catch(() => { setError(true); toast.error(t('plans.loadError', 'فشل تحميل الباقات')); })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (plan: any) => {
    if (!canUpdatePlans) {
      toast.error('لا تملك صلاحية تحديث الباقات');
      return;
    }
    try {
      await adminApi.updatePlan(plan.id, { isActive: !plan.isActive });
      toast.success(plan.isActive ? t('plans.disabled', 'تم تعطيل الباقة') : t('plans.enabled', 'تم تفعيل الباقة'));
      load();
    } catch {
      toast.error(t('plans.toggleError', 'فشل تحديث حالة الباقة'));
    }
  };

  const openEdit = (plan: any) => {
    if (!canUpdatePlans) {
      toast.error('لا تملك صلاحية تحديث الباقات');
      return;
    }
    setEditId(plan.id);
    setEditForm({
      name: plan.name || '',
      description: plan.description || '',
      priceMonthly: plan.priceMonthly || '0',
      priceAnnual: plan.priceAnnual || '0',
      productLimit: plan.productLimit ?? UNLIMITED,
      staffLimit: plan.staffLimit ?? UNLIMITED,
      storageLimitMb: plan.storageLimitMb ?? UNLIMITED,
      orderLimit: plan.orderLimit ?? UNLIMITED,
      trialDays: plan.trialDays ?? 0,
    });
  };

  const closeEdit = () => {
    setEditId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editId || !editForm) return;
    if (!canUpdatePlans) {
      toast.error('لا تملك صلاحية تحديث الباقات');
      return;
    }
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

  const formatPrice = (price: string) =>
    Number(price) === 0 ? t('plans.free', 'مجاني') : `${price} ${t('plans.sar', 'ر.س')}`;

  const formatLimit = (val: number, unit = '') =>
    val === UNLIMITED || val === 0 ? 'غير محدود' : `${val}${unit ? ' ' + unit : ''}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">
          {t('plans.pageTitle', 'الباقات')}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-card p-6 space-y-4 animate-pulse">
              <div className="h-6 w-24 bg-gray-100 rounded" />
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-8 w-20 bg-gray-100 rounded" />
              <div className="space-y-2">
                <div className="h-4 w-28 bg-gray-100 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={t('plans.loadError', 'فشل تحميل الباقات')} onRetry={load} />
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl shadow-card">
          <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Icon name="Package" size="md" className="text-gray-300" />
          </div>
          <p className="text-callout font-medium text-gray-500">{t('plans.empty', 'لا توجد باقات')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-xl shadow-card p-6 border-2 transition-all ${
                p.isActive ? 'border-primary-100' : 'border-dashed border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className={`font-semibold text-callout tracking-tight ${p.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {p.name}
                </h3>
                <span
                  className={`text-caption2 font-semibold px-2 py-0.5 rounded-full ${
                    p.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {p.isActive ? 'نشط' : 'معطّل'}
                </span>
              </div>

              {p.description && (
                <p className={`text-footnote mb-4 leading-relaxed ${p.isActive ? 'text-gray-500' : 'text-gray-300'}`}>
                  {p.description}
                </p>
              )}

              <div className={`mb-1 ${p.isActive ? '' : 'opacity-40'}`}>
                <span className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">
                  {formatPrice(p.priceMonthly)}
                </span>
                <span className="text-caption1 text-gray-400 font-normal ms-1">/شهر</span>
              </div>
              <div className={`text-caption1 text-gray-400 mb-4 ${p.isActive ? '' : 'opacity-40'}`}>
                {formatPrice(p.priceAnnual)}/سنة
              </div>

              <div className={`space-y-1.5 text-footnote border-t border-gray-50 pt-4 ${p.isActive ? 'text-gray-600' : 'text-gray-300'}`}>
                <div className="flex justify-between">
                  <span>المنتجات</span>
                  <span className="font-medium tabular-nums">{formatLimit(p.productLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>الموظفون</span>
                  <span className="font-medium tabular-nums">{formatLimit(p.staffLimit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>التخزين</span>
                  <span className="font-medium tabular-nums">{formatLimit(p.storageLimitMb, 'MB')}</span>
                </div>
                {p.trialDays > 0 && (
                  <div className="flex justify-between">
                    <span>تجربة مجانية</span>
                    <span className="font-medium tabular-nums">{p.trialDays} يوم</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                <button
                  onClick={() => openEdit(p)}
                  disabled={!canUpdatePlans}
                  className="flex-1 px-3 py-1.5 text-footnote bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                >
                  تعديل
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  disabled={!canUpdatePlans}
                  className={`flex-1 px-3 py-1.5 text-footnote rounded-lg transition-colors font-medium ${
                    p.isActive
                      ? 'bg-gray-50 text-gray-500 hover:bg-red-50 hover:text-red-600'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                  } disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400`}
                >
                  {p.isActive ? 'تعطيل' : 'تفعيل'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editId && editForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <button
            type="button"
            aria-label="إغلاق"
            className="absolute inset-0 cursor-default"
            onClick={closeEdit}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-headline font-semibold text-gray-900">تعديل الباقة</h3>
              <button
                onClick={closeEdit}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="إغلاق"
              >
                <Icon name="X" size="xs" className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-footnote font-medium text-gray-700 mb-1.5">اسم الباقة</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-footnote focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-footnote font-medium text-gray-700 mb-1.5">الوصف</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-footnote focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-footnote font-medium text-gray-700 mb-1.5">السعر الشهري (ر.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.priceMonthly}
                    onChange={e => setEditForm({ ...editForm, priceMonthly: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-footnote focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-footnote font-medium text-gray-700 mb-1.5">السعر السنوي (ر.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.priceAnnual}
                    onChange={e => setEditForm({ ...editForm, priceAnnual: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-footnote focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <UnlimitedField
                  label="المنتجات"
                  value={editForm.productLimit}
                  onChange={v => setEditForm({ ...editForm, productLimit: v })}
                />
                <UnlimitedField
                  label="الموظفون"
                  value={editForm.staffLimit}
                  onChange={v => setEditForm({ ...editForm, staffLimit: v })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <UnlimitedField
                  label="التخزين"
                  value={editForm.storageLimitMb}
                  onChange={v => setEditForm({ ...editForm, storageLimitMb: v })}
                  unit="MB"
                />
                <UnlimitedField
                  label="الطلبات"
                  value={editForm.orderLimit}
                  onChange={v => setEditForm({ ...editForm, orderLimit: v })}
                />
              </div>

              <div>
                <label className="block text-footnote font-medium text-gray-700 mb-1.5">أيام التجربة المجانية</label>
                <input
                  type="number"
                  min={0}
                  value={editForm.trialDays}
                  onChange={e => setEditForm({ ...editForm, trialDays: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-footnote focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={saveEdit}
                disabled={saving || !canUpdatePlans}
                className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-lg text-footnote font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </button>
              <button
                onClick={closeEdit}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-footnote font-medium hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
