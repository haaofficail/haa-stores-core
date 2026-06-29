/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; the table-controls hook is intentionally generic over them (P2-030 follow-up). */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { adminApi, type AccountantInboxItem } from '../lib/api';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';
import { downloadRowsAsCsv } from '../lib/downloadRowsAsCsv';

type Segment = 'ready' | 'exceptions';

const STATUS_LABELS: Record<string, string> = {
  requested: 'مطلوبة',
  under_review: 'قيد المراجعة',
  approved: 'معتمدة',
  transfer_pending: 'قيد التحويل',
  failed: 'فاشلة',
  cancelled: 'ملغاة',
  rejected: 'مرفوضة',
  reversed: 'معكوسة',
};

function statusLabel(s: string) {
  return STATUS_LABELS[s] ?? s;
}

export default function AccountantInbox() {
  const [ready, setReady] = useState<AccountantInboxItem[]>([]);
  const [exceptions, setExceptions] = useState<AccountantInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [segment, setSegment] = useState<Segment>('ready');
  const [statusFilter, setStatusFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi
      .getAccountantInbox()
      .then((data) => {
        setReady(data.ready ?? []);
        setExceptions(data.exceptions ?? []);
      })
      .catch(() => {
        setError(true);
        toast.error('فشل تحميل صندوق التسويات');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = segment === 'ready' ? ready : exceptions;

  // Compose the segment + status + period filters BEFORE the table-controls hook so
  // the hook's search/sort/paginate operate only over the already-scoped rows.
  const scopedRows = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (periodFilter && (r.period ?? '') !== periodFilter) return false;
      return true;
    });
  }, [rows, statusFilter, periodFilter]);

  const statusOptions = useMemo(
    () => [...new Set(rows.map((r) => r.status))],
    [rows],
  );

  const controls = useTableControls<any>({
    rows: scopedRows,
    searchFields: ['merchantName', 'reference'],
    initialSort: { key: 'netAmount', dir: 'desc' },
    storageKey: 'accountantInbox',
  });
  const { query, setQuery } = controls;

  const tab = (key: Segment, label: string, count: number) => (
    <button
      onClick={() => {
        setSegment(key);
        controls.setPage(1);
      }}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        segment === key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {label} <span className="tabular-nums">({count})</span>
    </button>
  );

  const emptyMessage = segment === 'ready'
    ? 'لا توجد تسويات جاهزة للتحويل'
    : 'لا توجد استثناءات';

  let inboxContent: ReactNode;
  if (loading) {
    inboxContent = <AdminTableSkeleton columns={['w-20', 'w-28', 'w-20', 'w-16', 'w-16', 'w-20', 'w-20', 'w-16', 'w-20']} />;
  } else if (error) {
    inboxContent = <ErrorState message="فشل تحميل صندوق التسويات" onRetry={load} />;
  } else if (scopedRows.length === 0) {
    inboxContent = (
      <div className="p-12 text-center">
        <p className="text-footnote text-gray-400">{emptyMessage}</p>
      </div>
    );
  } else if (controls.filteredCount === 0) {
    inboxContent = (
      <div className="p-12 text-center">
        <p className="text-footnote text-gray-400">لا توجد نتائج مطابقة</p>
      </div>
    );
  } else {
    inboxContent = (
      <>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortableTh sortKey="reference" label="رقم التسوية" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="merchantName" label="التاجر" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="netAmount" label="الصافي" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="period" label="الفترة" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="ordersCount" label="عدد الطلبات" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="status" label="الحالة" sort={controls.sort} onToggle={controls.toggleSort} />
              <SortableTh sortKey="bankAccountStatus" label="الحساب البنكي" sort={controls.sort} onToggle={controls.toggleSort} />
              <th className="px-4 py-3 text-start font-medium text-gray-500">IBAN</th>
              <SortableTh sortKey="dueDate" label="الاستحقاق" sort={controls.sort} onToggle={controls.toggleSort} />
              <th className="px-4 py-3 text-start font-medium text-gray-500">اعتماد ثانٍ؟</th>
              {segment === 'exceptions' && (
                <th className="px-4 py-3 text-start font-medium text-gray-500">سبب المنع</th>
              )}
              <th className="px-4 py-3 text-start font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {controls.rows.map((r) => (
              <tr key={r.settlementId} className="border-t hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-mono text-gray-900">{r.reference}</td>
                <td className="px-4 py-3 text-gray-900">{r.merchantName}</td>
                <td className="px-4 py-3 font-medium text-gray-900 tabular-nums">{r.netAmount} {r.currency}</td>
                <td className="px-4 py-3 text-gray-500">{r.period ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 tabular-nums">{r.ordersCount ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">{statusLabel(r.status)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.bankAccountStatus === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>{r.bankAccountStatus}</span>
                </td>
                <td className="px-4 py-3 font-mono text-gray-500">{r.ibanLast4 ? `••••${r.ibanLast4}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{r.dueDate ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.needsSecondApproval ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                  }`}>{r.needsSecondApproval ? 'نعم' : 'لا'}</span>
                </td>
                {segment === 'exceptions' && (
                  <td className="px-4 py-3 text-red-600">{r.exceptionReason ?? '—'}</td>
                )}
                <td className="px-4 py-3">
                  <Link to={`/finance/settlements/${r.settlementId}`} className="text-sm text-primary-600 hover:underline">تفاصيل</Link>
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
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">صندوق التسويات</h2>
        <button
          onClick={() => downloadRowsAsCsv(scopedRows as unknown as Record<string, unknown>[], `settlement-${segment}.csv`)}
          disabled={scopedRows.length === 0}
          className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          تصدير CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {tab('ready', 'جاهزة للتحويل', ready.length)}
        {tab('exceptions', 'استثناءات', exceptions.length)}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث باسم التاجر أو رقم التسوية..."
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); controls.setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">كل الحالات</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{statusLabel(s)}</option>
          ))}
        </select>
        <input
          type="text"
          value={periodFilter}
          onChange={(e) => { setPeriodFilter(e.target.value); controls.setPage(1); }}
          placeholder="الفترة (مثال 2026-05)"
          className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        {inboxContent}
      </div>
    </div>
  );
}
