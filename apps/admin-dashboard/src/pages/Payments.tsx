 
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, hasAdminPermission, type AdminPayment } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';
import { downloadBlob } from '../lib/downloadRowsAsCsv';

export default function Payments() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const canExportPayments = hasAdminPermission('wallet.payout.export');
  const { data: payments = [], isPending: loading, isError: error, refetch } = useQuery<AdminPayment[]>({
    queryKey: queryKeys.payments,
    queryFn: () => adminApi.getPayments(),
  });

  useEffect(() => {
    if (error) toast.error(t('payments.loadError', 'فشل تحميل المدفوعات'));
  }, [error, t]);

  const controls = useTableControls<AdminPayment>({
    rows: payments,
    searchFields: ['id', 'status', 'method'],
    initialSort: { key: 'createdAt', dir: 'desc' },
    storageKey: 'payments',
  });
  const { query, setQuery } = controls;

  const exportCsv = async () => {
    if (!canExportPayments) {
      toast.error('لا تملك صلاحية تصدير المدفوعات');
      return;
    }
    if (controls.filteredCount === 0 || exporting) return;
    setExporting(true);
    try {
      const blob = await adminApi.exportPaymentsCsv({ q: query.trim() || undefined });
      downloadBlob(blob, 'payments.csv');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر تصدير المدفوعات');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">{t('payments.pageTitle', 'المدفوعات')}</h2>
        <button
          onClick={exportCsv}
          disabled={!canExportPayments || controls.filteredCount === 0 || exporting}
          title={canExportPayments ? undefined : 'لا تملك صلاحية تصدير المدفوعات'}
          className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
        </button>
      </div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('payments.search', 'بحث برقم الطلب أو الحالة أو طريقة الدفع...')}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton columns={['w-16', 'w-24', 'w-20', 'w-16', 'w-24']} />
        ) : error ? (
          <ErrorState message={t('payments.loadError', 'فشل تحميل المدفوعات')} onRetry={() => refetch()} />
        ) : payments.length === 0 ? (
          <AdminEmptyState
            icon="CreditCard"
            title={t('payments.empty', 'لا توجد مدفوعات')}
            description="قد يعني ذلك عدم وجود طلبات مدفوعة مكتملة، أو أن بوابات الدفع ما زالت في وضع تجربة أو غير مهيأة."
            meaning="الإجراء التالي: راجع إعدادات الدفع وجاهزية التسوية قبل اعتبار المتجر جاهزًا ماليًا."
            actions={[
              { label: 'فتح إعدادات الدفع', href: '/store-payment-settings' },
              { label: 'فتح جاهزية التسوية', href: '/settlement-readiness' },
            ]}
          />
        ) : controls.filteredCount === 0 ? (
          <AdminEmptyState
            icon="AlertCircle"
            title={t('payments.noResults', 'لا توجد نتائج مطابقة')}
            description="غيّر البحث أو راجع النطاق قبل تصدير CSV أو اتخاذ قرار مالي."
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh sortKey="id" label={t('payments.id', 'المعرف')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="amount" label={t('payments.amount', 'المبلغ')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="method" label={t('payments.method', 'الطريقة')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="status" label={t('payments.status', 'الحالة')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="createdAt" label={t('payments.date', 'التاريخ')} sort={controls.sort} onToggle={controls.toggleSort} />
                </tr>
              </thead>
              <tbody>
                {controls.rows.map(p => (
                  <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-900">#{p.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.amount} {p.currency || 'SAR'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {p.method || '-'}
                      {String(p.method || '').toLowerCase().includes('fake') && (
                        <span className="ms-2 inline-flex rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          مزود وهمي — بيئة تجربة
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        p.status === 'completed' || p.status === 'paid' ? 'bg-green-100 text-green-700' :
                        p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        p.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('ar-SA') : '-'}</td>
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
              itemLabel={t('payments.itemLabel', 'عملية')}
            />
          </>
        )}
      </div>
    </div>
  );
}
