import { useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Tenants() {
  const { t } = useTranslation();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminApi.getTenants();
      setTenants(data);
    } catch {
      setError(true);
      toast.error(t('tenants.loadError', 'فشل تحميل التجار'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleOpenDialog = (tenant?: any) => {
    if (tenant) {
      setEditId(tenant.id);
      setForm({ name: tenant.name, email: tenant.email, status: tenant.status });
    } else {
      setEditId(null);
      setForm({ name: '', email: '', status: 'active' });
    }
    setDialogOpen(true);
  };

  const saveTenant = async () => {
    if (!form.name || !form.email) {
      toast.error(t('tenants.fillRequired', 'يرجى ملء جميع الحقول المطلوبة'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error(t('tenants.invalidEmail', 'البريد الإلكتروني غير صالح'));
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await adminApi.updateTenant(editId, form);
        toast.success(t('tenants.updated', 'تم تحديث التاجر بنجاح'));
      } else {
        await adminApi.createTenant(form);
        toast.success(t('tenants.created', 'تم إضافة التاجر بنجاح'));
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || t('tenants.saveError', 'حدث خطأ أثناء الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  const deleteTenant = async (id: number) => {
    setConfirmDelete(id);
  };

  const confirmDeleteTenant = async () => {
    if (confirmDelete === null) return;
    try {
      await adminApi.deleteTenant(confirmDelete);
      toast.success(t('tenants.deleted', 'تم حذف التاجر بنجاح'));
      load();
    } catch (err: any) {
      toast.error(err.message || t('tenants.deleteError', 'فشل حذف التاجر'));
    } finally {
      setConfirmDelete(null);
    }
  };

  const toggleStatus = async (id: number, current: string) => {
    const newStatus = current === 'active' ? 'suspended' : 'active';
    try {
      await adminApi.updateTenantStatus(id, newStatus);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
      toast.success(newStatus === 'active' ? t('tenants.activated', 'تم تفعيل التاجر') : t('tenants.suspended', 'تم تعليق التاجر'));
    } catch {
      toast.error(t('tenants.statusUpdateError', 'فشل تحديث حالة التاجر'));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('tenants.title', 'التجار')}</h2>
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> {t('tenants.addTenant', 'إضافة تاجر')}
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-3">{t('tenants.loadError', 'فشل تحميل التجار')}</p>
            <button onClick={() => load()} className="text-sm text-blue-600 hover:text-blue-800 font-medium">{t('tenants.retry', 'إعادة المحاولة')}</button>
          </div>
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">{t('tenants.empty', 'لا يوجد تجار')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('tenants.name', 'الاسم')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('tenants.email', 'البريد')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('tenants.status', 'الحالة')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('tenants.actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-500">{t.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.status === 'active' ? t('tenants.active', 'نشط') : t('tenants.inactive', 'موقوف')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleStatus(t.id, t.status)} className="text-sm text-blue-600 hover:text-blue-800 transition-colors px-2 py-1">
                        {t.status === 'active' ? t('tenants.suspend', 'تعليق') : t('tenants.activate', 'تفعيل')}
                      </button>
                      <button onClick={() => handleOpenDialog(t)} className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1">{t('tenants.edit', 'تعديل')}</button>
                      <button onClick={() => setConfirmDelete(t.id)} className="text-sm text-red-600 hover:text-red-800 transition-colors px-2 py-1">{t('tenants.delete', 'حذف')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{t('tenants.confirmDeleteTitle', 'تأكيد الحذف')}</h3>
            <p className="text-sm text-gray-600">{t('tenants.confirmDeleteMessage', 'هل أنت متأكد من حذف هذا التاجر؟ لا يمكن التراجع عن هذا الإجراء.')}</p>
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={confirmDeleteTenant} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">{t('tenants.delete', 'حذف')}</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">{t('tenants.cancel', 'إلغاء')}</button>
            </div>
          </div>
        </div>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{editId ? t('tenants.editTitle', 'تعديل التاجر') : t('tenants.addTitle', 'إضافة تاجر جديد')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.name', 'الاسم')}</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.emailLabel', 'البريد الإلكتروني')}</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.status', 'الحالة')}</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">{t('tenants.active', 'نشط')}</option>
                  <option value="suspended">{t('tenants.inactive', 'موقوف')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={saveTenant} disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {saving ? t('tenants.saving', 'جاري الحفظ...') : t('tenants.save', 'حفظ')}
              </button>
              <button onClick={() => setDialogOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                {t('tenants.cancel', 'إلغاء')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}