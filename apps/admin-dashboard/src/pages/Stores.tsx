import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Stores() {
  const { t } = useTranslation();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', domain: '', tenantId: '', isActive: 'true' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminApi.getStores();
      setStores(data);
    } catch {
      setError(true);
      toast.error(t('stores.loadError', 'فشل تحميل المتاجر'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const handleOpenDialog = (store?: any) => {
    if (store) {
      setEditId(store.id);
      setForm({ name: store.name, domain: store.domain, tenantId: String(store.tenantId), isActive: String(store.isActive) });
    } else {
      setEditId(null);
      setForm({ name: '', domain: '', tenantId: '', isActive: 'true' });
    }
    setDialogOpen(true);
  };

  const saveStore = async () => {
    if (!form.name || !form.domain || !form.tenantId) {
      toast.error(t('stores.fillRequired', 'يرجى ملء جميع الحقول المطلوبة'));
      return;
    }
    const tenantIdNum = Number(form.tenantId);
    if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
      toast.error(t('stores.invalidTenantId', 'معرّف التاجر (Tenant ID) يجب أن يكون رقمًا صحيحًا موجبًا'));
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, tenantId: tenantIdNum, isActive: form.isActive === 'true' };
      if (editId) {
        await adminApi.updateStore(editId, data);
        toast.success(t('stores.updated', 'تم تحديث المتجر بنجاح'));
      } else {
        await adminApi.createStore(data);
        toast.success(t('stores.created', 'تم إضافة المتجر بنجاح'));
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || t('stores.saveError', 'حدث خطأ أثناء الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = async (id: number) => {
    if (!window.confirm(t('stores.confirmDelete', 'هل أنت متأكد من حذف هذا المتجر؟'))) return;
    try {
      await adminApi.deleteStore(id);
      toast.success(t('stores.deleted', 'تم حذف المتجر بنجاح'));
      load();
    } catch (err: any) {
      toast.error(err.message || t('stores.deleteError', 'فشل حذف المتجر'));
    }
  };

  const toggleStatus = async (id: number, current: boolean) => {
    try {
      await adminApi.updateStoreStatus(id, !current);
      setStores(prev => prev.map(s => s.id === id ? { ...s, isActive: !current } : s));
      toast.success(current ? t('stores.deactivated', 'تم تعطيل المتجر') : t('stores.activated', 'تم تفعيل المتجر'));
    } catch {
      toast.error(t('stores.statusUpdateError', 'فشل تحديث حالة المتجر'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('stores.title', 'المتاجر')}</h2>
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('stores.addStore', 'إضافة متجر')}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-3">{t('stores.loadError', 'فشل تحميل المتاجر')}</p>
            <button onClick={() => load()} className="text-sm text-primary-600 hover:text-primary-700 font-medium">{t('stores.retry', 'إعادة المحاولة')}</button>
          </div>
        ) : stores.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">{t('stores.empty', 'لا توجد متاجر')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('stores.name', 'الاسم')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('stores.domain', 'النطاق')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('stores.tenant', 'التاجر')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('stores.status', 'الحالة')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('stores.actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {stores.map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-500">{s.domain || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{s.tenantName || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.isActive ? t('stores.active', 'نشط') : t('stores.inactive', 'موقوف')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStatus(s.id, s.isActive)} className="text-sm text-primary-600 hover:text-primary-700 transition-colors px-2 py-1">
                        {s.isActive ? t('stores.deactivate', 'تعطيل') : t('stores.activate', 'تفعيل')}
                      </button>
                      <button onClick={() => handleOpenDialog(s)} className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1">{t('stores.edit', 'تعديل')}</button>
                      <button onClick={() => deleteStore(s.id)} className="text-sm text-red-600 hover:text-red-800 transition-colors px-2 py-1">{t('stores.delete', 'حذف')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{editId ? t('stores.editTitle', 'تعديل المتجر') : t('stores.addTitle', 'إضافة متجر جديد')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.storeNameLabel', 'اسم المتجر')}</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.domainLabel', 'النطاق (Domain)')}</label>
                <input type="text" value={form.domain} onChange={e => setForm({...form, domain: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.tenantIdLabel', 'معرّف التاجر (Tenant ID)')}</label>
                <input type="number" value={form.tenantId} onChange={e => setForm({...form, tenantId: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.status', 'الحالة')}</label>
                <select value={form.isActive} onChange={e => setForm({...form, isActive: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="true">{t('stores.active', 'نشط')}</option>
                  <option value="false">{t('stores.inactive', 'موقوف')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={saveStore} disabled={saving} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
                {saving ? t('stores.saving', 'جاري الحفظ...') : t('stores.save', 'حفظ')}
              </button>
              <button onClick={() => setDialogOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                {t('stores.cancel', 'إلغاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}