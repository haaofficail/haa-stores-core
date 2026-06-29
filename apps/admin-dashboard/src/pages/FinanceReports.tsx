import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, type FinanceReports as FinanceReportsData, type FinanceReportRow } from '../lib/api';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { downloadRowsAsCsv } from '../lib/downloadRowsAsCsv';

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
  const [data, setData] = useState<FinanceReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('archive');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.getFinanceReports()
      .then(setData)
      .catch(() => { setError(true); toast.error('تعذّر تحميل التقارير المالية'); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo<FinanceReportRow[]>(() => (data ? data[tab] : []), [data, tab]);

  const exportCsv = () => {
    // Masked rows only — never contain a full IBAN or a receipt URL.
    const out = rows.map((r) => ({
      settlementId: r.settlementId, storeName: r.storeName, amount: r.amount, currency: r.currency,
      status: r.status, bankReference: r.bankReference ?? '', bankName: r.bankName ?? '',
      transferDate: r.transferDate ?? '', receiptId: r.receiptId ?? '', sha256: r.sha256 ?? '',
      accountantId: r.accountantId ?? '', secondApproverId: r.secondApproverId ?? '',
      reconciliationStatus: r.reconciliationStatus,
    }));
    downloadRowsAsCsv(out as unknown as Record<string, unknown>[], `settlement-${tab}.csv`);
  };

  const tabBtn = (key: Tab, label: string, count: number) => (
    <button onClick={() => setTab(key)}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${tab === key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {label} <span className="tabular-nums">({count})</span>
    </button>
  );

  let reportContent: ReactNode;
  if (loading) {
    reportContent = <AdminTableSkeleton columns={['w-24', 'w-28', 'w-20', 'w-20', 'w-20', 'w-24', 'w-16']} />;
  } else if (error) {
    reportContent = <ErrorState message="تعذّر تحميل التقارير المالية" onRetry={load} />;
  } else if (rows.length === 0) {
    reportContent = <div className="p-12 text-center text-gray-400 text-footnote">لا توجد سجلات</div>;
  } else {
    reportContent = (
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-start font-medium text-gray-500">رقم التسوية</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500">التاجر</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500">المبلغ</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500">الحالة</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500">المرجع البنكي</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500">الإيصال</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500">المطابقة</th>
            <th className="px-4 py-3 text-start font-medium text-gray-500"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
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
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900">التقارير المالية</h2>
        <button onClick={exportCsv} disabled={rows.length === 0}
          className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40">
          تصدير CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabBtn('archive', 'أرشيف التسويات', data?.archive.length ?? 0)}
        {tabBtn('reconciliation', 'مطابقة التسويات', data?.reconciliation.length ?? 0)}
        {tabBtn('stuck', 'التسويات العالقة', data?.stuck.length ?? 0)}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {reportContent}
      </div>
    </div>
  );
}
