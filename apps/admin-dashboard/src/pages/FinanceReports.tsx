/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; the table-controls hook is intentionally generic over them (P2-030 follow-up). */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, hasAdminPermission, type FinanceReports as FinanceReportsData, type FinanceReportRow } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';
import { downloadBlob } from '../lib/downloadRowsAsCsv';

type Tab = 'archive' | 'reconciliation' | 'stuck';

const RECON_LABELS: Record<string, string> = {
  matched: 'مطابقة',
  missing_bank_reference: 'مرجع بنكي ناقص',
  missing_receipt: 'إيصال ناقص',
  amount_mismatch: 'اختلاف مبلغ',
  currency_mismatch: 'اختلاف عملة',
  pending_second_approval: 'بانتظار اعتماد ثانٍ',
  stuck_transfer_pending: 'تحويل عالق',
  manual_review: 'مراجعة يدوية',
};

export default function FinanceReports() {
  const [tab, setTab] = useState<Tab>('archive');
  const [exporting, setExporting] = useState(false);
  const canExportFinanceReports = hasAdminPermission('wallet.payout.export');

  const { data, isPending: loading, isError: error, refetch } = useQuery<FinanceReportsData>({
    queryKey: queryKeys.financeReports,
    queryFn: () => adminApi.getFinanceReports(),
  });

  useEffect(() => {
    if (error) toast.error('تعذّر تحميل التقارير المالية');
  }, [error]);

  const rows = useMemo<FinanceReportRow[]>(() => (data ? data[tab] : []), [data, tab]);

  const controls = useTableControls<any>({
    rows,
    searchFields: ['settlementId', 'storeName', 'status', 'bankReference', 'bankName'],
    initialSort: { key: 'amount', dir: 'desc' },
    storageKey: 'financeReports',
    getValue: (r, key) => {
      if (key === 'receipt') return r.receiptId ?? '';
      if (key === 'reconciliationStatus') return RECON_LABELS[r.reconciliationStatus] ?? r.reconciliationStatus;
      return r[key];
    },
  });
  const { query, setQuery } = controls;

  const selectTab = (key: Tab) => {
    setTab(key);
    controls.setPage(1);
  };

  const exportCsv = async () => {
    if (!canExportFinanceReports) {
      toast.error('لا تملك صلاحية تصدير التقارير المالية');
      return;
    }
    if (rows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const blob = await adminApi.exportFinanceReportsCsv(tab);
      downloadBlob(blob, `settlement-${tab}.csv`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تعذّر تصدير التقارير المالية');
    } finally {
      setExporting(false);
    }
  };

  const tabBtn = (key: Tab, label: string, count: number) => (
    <button onClick={() => selectTab(key)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {label} <span className="tabular-nums">({count})</span>
    </button>
  );

  let reportContent: ReactNode;
  if (loading) {
    reportContent = <AdminTableSkeleton columns={['w-24', 'w-28', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16']} />;
  } else if (error) {
    reportContent = <ErrorState message="تعذّر تحميل التقارير المالية" onRetry={() => refetch()} />;
  } else if (rows.length === 0) {
    reportContent = <div className="p-12 text-center text-gray-400 text-footnote">لا توجد سجلات</div>;
  } else if (controls.filteredCount === 0) {
    reportContent = <div className="p-12 text-center text-gray-400 text-footnote">لا توجد نتائج مطابقة</div>;
  } else {
    reportContent = (
      <>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortableTh sortKey="settlementId" label="رقم التسوية" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="storeName" label="التاجر" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="amount" label="المبلغ" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="status" label="الحالة" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="bankReference" label="المرجع البنكي" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="receipt" label="الإيصال" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="reconciliationStatus" label="المطابقة" sort={controls.sort} onToggle={controls.toggleSort} />
              <th className="px-4 py-3 text-start font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {controls.rows.map((r) => (
              <tr key={r.payoutId} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-900">{r.settlementId}</td>
                <td className="px-4 py-3 text-gray-900">{r.storeName}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{r.amount} {r.currency}</td>
                <td className="px-4 py-3 text-gray-500">{r.status}</td>
                <td className="px-4 py-3 text-gray-500">{r.bankReference ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 font-mono">{r.receiptId ? `#${r.receiptId} · ${r.sha256 ?? ''}` : '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{RECON_LABELS[r.reconciliationStatus] ?? r.reconciliationStatus}</span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/finance/settlements/${r.payoutId}`} className="text-sm text-primary-600 hover:underline">تفاصيل</Link>
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
          itemLabel="تسوية"
        />
      </>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900">التقارير المالية</h2>
        <button
          onClick={exportCsv}
          disabled={!canExportFinanceReports || rows.length === 0 || exporting}
          title={canExportFinanceReports ? undefined : 'لا تملك صلاحية تصدير التقارير المالية'}
          className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
          {exporting ? 'جاري التصدير...' : 'تصدير CSV'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabBtn('archive', 'أرشيف التسويات', data?.archive.length ?? 0)}
        {tabBtn('reconciliation', 'مطابقة التسويات', data?.reconciliation.length ?? 0)}
        {tabBtn('stuck', 'التسويات العالقة', data?.stuck.length ?? 0)}
      </div>

      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="بحث برقم التسوية أو التاجر..."
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {reportContent}
      </div>
    </div>
  );
}
