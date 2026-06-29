/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { Icon } from '../components/ui/icon';
import { useTranslation } from 'react-i18next';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { AdminDialog } from '../components/ui/AdminDialog';
import { ErrorState } from '../components/ui/ErrorState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';
import { downloadRowsAsCsv } from '../lib/downloadRowsAsCsv';

type TenantStatusDialog = {
  id: number;
  name: string;
  currentStatus: string;
  nextStatus: 'active' | 'suspended';
};

export default function Tenants() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', status: 'active' });
  const [statusDialog, setStatusDialog] = useState<TenantStatusDialog | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const { data: tenants = [], isPending: loading, isError: error, refetch } = useQuery<any[]>({
    queryKey: queryKeys.tenants,
    queryFn: () => adminApi.getTenants(),
  });

  const invalidateTenants = () => queryClient.invalidateQueries({ queryKey: queryKeys.tenants });

  const saveMutation = useMutation({
    mutationFn: () =>
      editId
        ? adminApi.updateTenant(editId, { name: form.name, email: form.email })
        : adminApi.createTenant(form),
    onSuccess: () => {
      toast.success(editId ? t('tenants.updated', 'تم تحديث التاجر بنجاح') : t('tenants.created', 'تم إضافة التاجر بنجاح'));
      setDialogOpen(false);
      invalidateTenants();
    },
    onError: (err: any) => toast.error(err?.message || t('tenants.saveError', 'حدث خطأ أثناء الحفظ')),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: number; next: 'active' | 'suspended'; reason: string }) =>
      adminApi.updateTenantStatus(vars.id, vars.next, vars.reason),
    onSuccess: (_data, vars) => {
      toast.success(vars.next === 'active' ? t('tenants.activated', 'تم تفعيل التاجر') : t('tenants.suspended', 'تم تعليق التاجر'));
      invalidateTenants();
      closeStatusDialog();
    },
    onError: () => toast.error(t('tenants.statusUpdateError', 'فشل تحديث حالة التاجر')),
  });

  const saving = saveMutation.isPending;

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

  const saveTenant = () => {
    if (!form.name || !form.email) {
      toast.error(t('tenants.fillRequired', 'يرجى ملء جميع الحقول المطلوبة'));
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      toast.error(t('tenants.invalidEmail', 'البريد الإلكتروني غير صالح'));
      return;
    }
    saveMutation.mutate();
  };

  const openStatusDialog = (tenant: any) => {
    const currentStatus = String(tenant.status || 'active');
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setStatusDialog({
      id: Number(tenant.id),
      name: String(tenant.name || ''),
      currentStatus,
      nextStatus,
    });
    setStatusReason('');
  };

  const closeStatusDialog = () => {
    setStatusDialog(null);
    setStatusReason('');
  };

  const submitStatusChange = () => {
    if (!statusDialog || !statusReason.trim()) return;
    statusMutation.mutate({ id: statusDialog.id, next: statusDialog.nextStatus, reason: statusReason.trim() });
  };

  const controls = useTableControls<any>({
    rows: tenants,
    searchFields: ['name', 'email'],
    initialSort: { key: 'name', dir: 'asc' },
    storageKey: 'tenants',
  });
  const { query, setQuery } = controls;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">{t('tenants.title', 'التجار')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadRowsAsCsv(tenants, 'tenants.csv')}
            className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            تصدير CSV
          </button>
          <button
            onClick={() => handleOpenDialog()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Icon name="Plus" size="xs" /> {t('tenants.addTenant', 'إضافة تاجر')}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('tenants.search', 'بحث باسم التاجر أو البريد...')}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton />
        ) : error ? (
          <ErrorState message={t('tenants.loadError', 'فشل تحميل التجار')} onRetry={() => refetch()} />
        ) : tenants.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('tenants.empty', 'لا يوجد تجار')}</p>
          </div>
        ) : controls.filteredCount === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('tenants.noResults', 'لا توجد نتائج مطابقة')}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh sortKey="name" label={t('tenants.name', 'الاسم')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="email" label={t('tenants.email', 'البريد')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="status" label={t('tenants.status', 'الحالة')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{t('tenants.actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {controls.rows.map(tenant => (
                  <tr key={tenant.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-4 py-3 text-gray-500">{tenant.email || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tenant.status === 'active' ? t('tenants.active', 'نشط') : t('tenants.inactive', 'موقوف')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openStatusDialog(tenant)} className="text-sm text-primary-600 hover:text-primary-700 transition-colors px-2 py-1">
                          {tenant.status === 'active' ? t('tenants.suspend', 'تعليق') : t('tenants.activate', 'تفعيل')}
                        </button>
                        <button onClick={() => handleOpenDialog(tenant)} className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1">{t('tenants.edit', 'تعديل')}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager
              page={controls.page}
              totalPages={controls.totalPages}
              startIndex={controls.startIndex}
              endIndex={controls.endIndex}
              filteredCount={controls.filteredCount}
              onPageChange={controls.setPage}
              itemLabel={t('tenants.itemLabel', 'تاجر')}
            />
          </>
        )}
      </div>

      {statusDialog && (
        <AdminDialog
          title={statusDialog.nextStatus === 'suspended' ? 'تأكيد تعليق التاجر' : 'تأكيد تفعيل التاجر'}
          description={<span>التاجر: <span className="font-medium">{statusDialog.name || `#${statusDialog.id}`}</span></span>}
          onClose={closeStatusDialog}
        >
          <div className="rounded-lg bg-amber-50 text-amber-800 text-xs leading-5 p-3">
            تغيير حالة التاجر يؤثر على كل متاجره وعملياته. اكتب سببًا واضحًا قبل المتابعة.
          </div>
          <div>
            <label htmlFor="tenant-status-reason" className="block text-sm font-medium text-gray-700 mb-1">سبب القرار *</label>
            <textarea
              id="tenant-status-reason"
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              aria-label="سبب القرار *"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 h-28"
              placeholder={statusDialog.nextStatus === 'suspended' ? 'مثال: مخالفة شروط المنصة أو طلب امتثال مفتوح.' : 'مثال: تمت معالجة سبب التعليق والتحقق من جاهزية الحساب.'}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={submitStatusChange}
              disabled={!statusReason.trim()}
              className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                statusDialog.nextStatus === 'suspended' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {statusDialog.nextStatus === 'suspended' ? 'تأكيد التعليق' : 'تأكيد التفعيل'}
            </button>
            <button onClick={closeStatusDialog} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              {t('tenants.cancel', 'إلغاء')}
            </button>
          </div>
        </AdminDialog>
      )}

      {dialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-900">{editId ? t('tenants.editTitle', 'تعديل التاجر') : t('tenants.addTitle', 'إضافة تاجر جديد')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.name', 'الاسم')}</label>
                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.emailLabel', 'البريد الإلكتروني')}</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('tenants.status', 'الحالة')}</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="active">{t('tenants.active', 'نشط')}</option>
                    <option value="suspended">{t('tenants.inactive', 'موقوف')}</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <button onClick={saveTenant} disabled={saving} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors">
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
