/* eslint-disable @typescript-eslint/no-explicit-any -- webhook payloads are operational JSON from provider/workers. */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi, type AdminWebhookEvent } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';

function formatRate(value: number | null | undefined): string {
  if (!Number.isFinite(Number(value))) return '0%';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatNumber(value: unknown): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '0';
}

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString('en-US') : '-';
}

function statusClass(status: string): string {
  if (status === 'delivered' || status === 'success') return 'bg-green-100 text-green-700';
  if (status === 'failed' || status === 'error') return 'bg-red-100 text-red-700';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
}

export default function OperationalWebhooks() {
  const [tenantId, setTenantId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [filters, setFilters] = useState({ tenantId: '', storeId: '' });

  const statsQuery = useQuery({
    queryKey: [...queryKeys.operationalWebhooks, 'stats'],
    queryFn: async () => {
      const [webhookDedup, idempotencyKey] = await Promise.all([
        adminApi.getWebhookDedupStats(),
        adminApi.getIdempotencyKeyStats(),
      ]);
      return { webhookDedup, idempotencyKey };
    },
  });

  const eventsQuery = useQuery<AdminWebhookEvent[]>({
    queryKey: [...queryKeys.operationalWebhooks, 'events', filters.tenantId, filters.storeId],
    queryFn: () => adminApi.getWebhooks({
      tenantId: filters.tenantId || undefined,
      storeId: filters.storeId || undefined,
    }),
  });

  useEffect(() => {
    if (statsQuery.isError || eventsQuery.isError) {
      toast.error('فشل تحميل بيانات webhooks التشغيلية');
    }
  }, [eventsQuery.isError, statsQuery.isError]);

  const events = eventsQuery.data ?? [];
  const providerRows = useMemo(() => {
    const providers = statsQuery.data?.webhookDedup.byProvider ?? {};
    return Object.entries(providers).map(([provider, stats]) => ({ provider, ...stats }));
  }, [statsQuery.data?.webhookDedup.byProvider]);

  const controls = useTableControls<any>({
    rows: events,
    searchFields: ['eventType', 'status', 'lastError'],
    initialSort: { key: 'createdAt', dir: 'desc' },
    storageKey: 'operationalWebhooks',
  });
  const { query, setQuery } = controls;

  const applyFilters = () => {
    setFilters({ tenantId: tenantId.trim(), storeId: storeId.trim() });
    controls.setPage(1);
  };

  const clearFilters = () => {
    setTenantId('');
    setStoreId('');
    setFilters({ tenantId: '', storeId: '' });
    controls.setPage(1);
  };

  const webhookStats = statsQuery.data?.webhookDedup;
  const idempotencyStats = statsQuery.data?.idempotencyKey;
  const cards = [
    ['Webhook total', webhookStats?.total],
    ['Fresh', webhookStats?.fresh],
    ['Duplicates', webhookStats?.duplicates],
    ['Duplicate rate', formatRate(webhookStats?.duplicateRate)],
    ['Race recovered', webhookStats?.raceRecovered],
    ['Idempotency total', idempotencyStats?.total],
    ['Replay hits', idempotencyStats?.hits],
    ['Conflicts', idempotencyStats?.conflicts],
    ['Hit rate', formatRate(idempotencyStats?.hitRate)],
    ['Cache size', idempotencyStats?.size],
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <header>
        <h1 className="text-title2 font-bold text-gray-900 tracking-tight">عمليات Webhooks</h1>
        <p className="mt-1 text-sm text-gray-500">
          مراقبة أحداث الدفع والشحن الواردة. الفراغ هنا طبيعي فقط إذا لم تصل أحداث من المزودين ضمن النطاق.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-2 text-title3 font-bold text-gray-900 tabular-nums tracking-tight">
              {typeof value === 'string' ? value : formatNumber(value)}
            </p>
          </div>
        ))}
      </section>

      {statsQuery.isError && (
        <ErrorState message="فشل تحميل إحصاءات منع التكرار" onRetry={() => statsQuery.refetch()} />
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">مزودو webhooks</h2>
          <div className="mt-4 space-y-2">
            {statsQuery.isPending ? (
              <AdminTableSkeleton columns={['w-28', 'w-16', 'w-16']} rows={4} />
            ) : providerRows.length === 0 ? (
              <AdminEmptyState
                icon="FileText"
                title="لا توجد إحصاءات حسب المزود"
                description="Webhook health: لا توجد أحداث مزودين ضمن النطاق الحالي."
                meaning="Last received: —"
              />
            ) : (
              providerRows.map((row) => (
                <div key={row.provider} className="rounded-lg bg-gray-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-gray-900">{row.provider}</p>
                    <p className="text-xs text-gray-500">{formatRate(row.duplicateRate)}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    إجمالي: {formatNumber(row.total)} · مكرر: {formatNumber(row.duplicates)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Tenant ID</label>
              <input
                inputMode="numeric"
                value={tenantId}
                onChange={(event) => setTenantId(event.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Store ID</label>
              <input
                inputMode="numeric"
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button onClick={applyFilters} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              تطبيق
            </button>
            <button onClick={clearFilters} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              مسح
            </button>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="بحث في النوع أو الحالة..."
              className="ms-auto w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="overflow-x-auto">
            {eventsQuery.isPending ? (
              <AdminTableSkeleton columns={['w-16', 'w-32', 'w-20', 'w-16', 'w-20', 'w-28']} />
            ) : eventsQuery.isError ? (
              <ErrorState message="فشل تحميل أحداث webhooks" onRetry={() => eventsQuery.refetch()} />
            ) : events.length === 0 ? (
              <AdminEmptyState
                icon="FileText"
                title="لا توجد أحداث webhooks لهذا النطاق"
                description="هذا طبيعي إذا لم تصل أحداث دفع أو شحن من المزودين بعد."
                meaning="Webhook health: لا توجد أحداث. Last received: —"
              />
            ) : controls.filteredCount === 0 ? (
              <AdminEmptyState
                icon="AlertCircle"
                title="لا توجد نتائج مطابقة"
                description="غيّر tenant/store أو نص البحث قبل فتح بلاغ webhook."
              />
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <SortableTh sortKey="id" label="ID" sort={controls.sort} onToggle={controls.toggleSort} />
                      <SortableTh sortKey="eventType" label="النوع" sort={controls.sort} onToggle={controls.toggleSort} />
                      <SortableTh sortKey="status" label="الحالة" sort={controls.sort} onToggle={controls.toggleSort} />
                      <SortableTh sortKey="attempts" label="المحاولات" sort={controls.sort} onToggle={controls.toggleSort} />
                      <SortableTh sortKey="storeId" label="المتجر" sort={controls.sort} onToggle={controls.toggleSort} />
                      <SortableTh sortKey="createdAt" label="التاريخ" sort={controls.sort} onToggle={controls.toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {controls.rows.map((event) => (
                      <tr key={event.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-gray-900">#{event.id}</td>
                        <td className="px-4 py-3 text-gray-900">{event.eventType}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded px-2 py-1 text-xs font-medium ${statusClass(event.status)}`}>
                            {event.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-gray-500">{event.attempts}/{event.maxAttempts}</td>
                        <td className="px-4 py-3 text-gray-500">{event.storeId ?? '-'}</td>
                        <td className="px-4 py-3 text-gray-500">{formatDate(event.createdAt)}</td>
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
                  itemLabel="حدث"
                />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
