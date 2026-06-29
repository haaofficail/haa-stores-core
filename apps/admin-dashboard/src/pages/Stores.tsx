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

type StoreStatusDialog = {
  id: number;
  name: string;
  currentIsActive: boolean;
  nextIsActive: boolean;
};

export default function Stores() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', domain: '', tenantId: '', isActive: 'true' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [statusDialog, setStatusDialog] = useState<StoreStatusDialog | null>(null);
  const [statusReason, setStatusReason] = useState('');

  const { data: stores = [], isPending: loading, isError: error, refetch } = useQuery<any[]>({
    queryKey: queryKeys.stores,
    queryFn: () => adminApi.getStores(),
  });

  const invalidateStores = () => queryClient.invalidateQueries({ queryKey: queryKeys.stores });

  const saveMutation = useMutation({
    mutationFn: () => {
      const tenantIdNum = Number(form.tenantId);
      const data = { ...form, tenantId: tenantIdNum, isActive: form.isActive === 'true' };
      return editId
        ? adminApi.updateStore(editId, { name: data.name, domain: data.domain, tenantId: data.tenantId })
        : adminApi.createStore(data);
    },
    onSuccess: () => {
      toast.success(editId ? t('stores.updated', 'تم تحديث المتجر بنجاح') : t('stores.created', 'تم إضافة المتجر بنجاح'));
      setDialogOpen(false);
      invalidateStores();
    },
    onError: (err: any) => toast.error(err?.message || t('stores.saveError', 'حدث خطأ أثناء الحفظ')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteStore(id),
    onSuccess: () => {
      toast.success(t('stores.deleted', 'تم حذف المتجر بنجاح'));
      invalidateStores();
    },
    onError: (err: any) => toast.error(err?.message || t('stores.deleteError', 'فشل حذف المتجر')),
    onSettled: () => setConfirmDeleteId(null),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: number; next: boolean; reason: string }) =>
      adminApi.updateStoreStatus(vars.id, vars.next, vars.reason),
    onSuccess: (_data, vars) => {
      toast.success(vars.next ? t('stores.activated', 'تم تفعيل المتجر') : t('stores.deactivated', 'تم تعطيل المتجر'));
      invalidateStores();
      closeStatusDialog();
    },
    onError: () => toast.error(t('stores.statusUpdateError', 'فشل تحديث حالة المتجر')),
  });

  const saving = saveMutation.isPending;

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

  const saveStore = () => {
    if (!form.name || !form.domain || !form.tenantId) {
      toast.error(t('stores.fillRequired', 'يرجى ملء جميع الحقول المطلوبة'));
      return;
    }
    const tenantIdNum = Number(form.tenantId);
    if (!Number.isInteger(tenantIdNum) || tenantIdNum <= 0) {
      toast.error(t('stores.invalidTenantId', 'معرّف التاجر (Tenant ID) يجب أن يكون رقمًا صحيحًا موجبًا'));
      return;
    }
    saveMutation.mutate();
  };

  const deleteStore = () => {
    if (confirmDeleteId === null) return;
    deleteMutation.mutate(confirmDeleteId);
  };

  const openStatusDialog = (store: any) => {
    const currentIsActive = Boolean(store.isActive);
    setStatusDialog({
      id: Number(store.id),
      name: String(store.name || ''),
      currentIsActive,
      nextIsActive: !currentIsActive,
    });
    setStatusReason('');
  };

  const closeStatusDialog = () => {
    setStatusDialog(null);
    setStatusReason('');
  };

  const submitStatusChange = () => {
    if (!statusDialog || !statusReason.trim()) return;
    statusMutation.mutate({ id: statusDialog.id, next: statusDialog.nextIsActive, reason: statusReason.trim() });
  };

  const controls = useTableControls<any>({
    rows: stores,
    searchFields: ['name', 'domain', 'tenantName'],
    initialSort: { key: 'name', dir: 'asc' },
    storageKey: 'stores',
  });
  const { query, setQuery } = controls;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">{t('stores.title', 'المتاجر')}</h2>
        <button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
        >
          <Icon name="Plus" size="xs" /> {t('stores.addStore', 'إضافة متجر')}
        </button>
      </div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('stores.search', 'بحث باسم المتجر أو النطاق...')}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton columns={['w-32', 'w-24', 'w-20', 'w-16', 'w-12']} />
        ) : error ? (
          <ErrorState message={t('stores.loadError', 'فشل تحميل المتاجر')} onRetry={() => refetch()} />
        ) : stores.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('stores.empty', 'لا توجد متاجر')}</p>
          </div>
        ) : controls.filteredCount === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('stores.noResults', 'لا توجد نتائج مطابقة')}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh sortKey="name" label={t('stores.name', 'الاسم')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="domain" label={t('stores.domain', 'النطاق')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="tenantName" label={t('stores.tenant', 'التاجر')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="isActive" label={t('stores.status', 'الحالة')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{t('stores.actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {controls.rows.map(s => (
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
                        <button onClick={() => openStatusDialog(s)} className="text-sm text-primary-600 hover:text-primary-700 transition-colors px-2 py-1">
                          {s.isActive ? t('stores.deactivate', 'تعطيل') : t('stores.activate', 'تفعيل')}
                        </button>
                        <button onClick={() => handleOpenDialog(s)} className="text-sm text-gray-600 hover:text-gray-900 transition-colors px-2 py-1">{t('stores.edit', 'تعديل')}</button>
                        <button onClick={() => setConfirmDeleteId(s.id)} className="text-sm text-red-600 hover:text-red-800 transition-colors px-2 py-1">{t('stores.delete', 'حذف')}</button>
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
              itemLabel={t('stores.itemLabel', 'متجر')}
            />
          </>
        )}
      </div>

      {confirmDeleteId !== null && (
        <AdminDialog
          title={t('stores.confirmDeleteTitle', 'تأكيد الحذف')}
          description={t('stores.confirmDeleteMessage', 'هل أنت متأكد من حذف هذا المتجر؟ لا يمكن التراجع عن هذا الإجراء.')}
          maxWidthClassName="max-w-sm"
          onClose={() => setConfirmDeleteId(null)}
        >
          <div className="flex gap-3 pt-4 border-t">
            <button onClick={deleteStore} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">{t('stores.delete', 'حذف')}</button>
            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">{t('stores.cancel', 'إلغاء')}</button>
          </div>
        </AdminDialog>
      )}

      {statusDialog && (
        <AdminDialog
          title={statusDialog.nextIsActive ? 'تأكيد تفعيل المتجر' : 'تأكيد تعطيل المتجر'}
          description={<span>المتجر: <span className="font-medium">{statusDialog.name || `#${statusDialog.id}`}</span></span>}
          onClose={closeStatusDialog}
        >
          <div className="rounded-lg bg-amber-50 text-amber-800 text-xs leading-5 p-3">
            تغيير حالة المتجر يؤثر مباشرة على وصول العملاء والطلبات. اكتب سببًا واضحًا قبل المتابعة.
          </div>
          <div>
            <label htmlFor="store-status-reason" className="block text-sm font-medium text-gray-700 mb-1">سبب القرار *</label>
            <textarea
              id="store-status-reason"
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              aria-label="سبب القرار *"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 h-28"
              placeholder={statusDialog.nextIsActive ? 'مثال: تمت معالجة سبب التعطيل والتحقق من جاهزية المتجر.' : 'مثال: مخالفة سياسة المنصة أو طلب امتثال مفتوح.'}
            />
          </div>
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={submitStatusChange}
              disabled={!statusReason.trim()}
              className={`flex-1 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                statusDialog.nextIsActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {statusDialog.nextIsActive ? 'تأكيد التفعيل' : 'تأكيد التعطيل'}
            </button>
            <button onClick={closeStatusDialog} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              {t('stores.cancel', 'إلغاء')}
            </button>
          </div>
        </AdminDialog>
      )}

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
              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stores.status', 'الحالة')}</label>
                  <select value={form.isActive} onChange={e => setForm({...form, isActive: e.target.value})} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="true">{t('stores.active', 'نشط')}</option>
                    <option value="false">{t('stores.inactive', 'موقوف')}</option>
                  </select>
                </div>
              )}
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
