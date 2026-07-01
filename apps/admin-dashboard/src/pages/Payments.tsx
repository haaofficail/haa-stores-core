
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi, hasAdminPermission } from '../lib/api';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { TablePager } from '../components/ui/TablePager';
import { downloadBlob } from '../lib/downloadRowsAsCsv';

const PAGE_SIZE = 50;

// P1-9 audit fix: this page used to fetch a hard-capped 200-row snapshot
// once and paginate/search it entirely client-side (useTableControls) —
// so a platform with more than 200 payments silently only ever showed
// its most recent 200, with no indicator more existed. Now mirrors the
// real server-side page/limit/total contract already used by
// SupportGateway.tsx: every page change and search keystroke re-queries
// the server, which returns an accurate total across ALL payments.
export default function Payments() {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const canExportPayments = hasAdminPermission('wallet.payout.export');

  const paymentsQuery = useQuery({
    queryKey: ['admin-payments', query, page],
    queryFn: () => adminApi.getPayments({ q: query.trim() || undefined, page, limit: PAGE_SIZE }),
  });

  useEffect(() => {
    if (paymentsQuery.isError) toast.error(t('payments.loadError', 'فشل تحميل المدفوعات'));
  }, [paymentsQuery.isError, t]);

  const result = paymentsQuery.data;
  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = total === 0 ? 0 : Math.min(total, page * PAGE_SIZE);

  const exportCsv = async () => {
    if (!canExportPayments) {
      toast.error('لا تملك صلاحية تصدير المدفوعات');
      return;
    }
    if (total === 0 || exporting) return;
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
          disabled={!canExportPayments || total === 0 || exporting}
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
          onChange={e => { setQuery(e.target.value); setPage(1); }}
          placeholder={t('payments.search', 'بحث برقم الطلب أو الحالة أو طريقة الدفع...')}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {paymentsQuery.isPending ? (
          <AdminTableSkeleton columns={['w-16', 'w-24', 'w-20', 'w-16', 'w-24']} />
        ) : paymentsQuery.isError ? (
          <ErrorState message={t('payments.loadError', 'فشل تحميل المدفوعات')} onRetry={() => paymentsQuery.refetch()} />
        ) : rows.length === 0 && !query.trim() ? (
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
        ) : rows.length === 0 ? (
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
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('payments.id', 'المعرف')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('payments.amount', 'المبلغ')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('payments.method', 'الطريقة')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('payments.status', 'الحالة')}</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500">{t('payments.date', 'التاريخ')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
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
              page={page}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              filteredCount={total}
              onPageChange={setPage}
              itemLabel={t('payments.itemLabel', 'عملية')}
            />
          </>
        )}
      </div>
    </div>
  );
}
