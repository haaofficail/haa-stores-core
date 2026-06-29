/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { SortableTh } from '../components/ui/SortableTh';
import { TablePager } from '../components/ui/TablePager';
import { useTableControls } from '../lib/useTableControls';
import { downloadRowsAsCsv } from '../lib/downloadRowsAsCsv';

export default function AuditLogs() {
  const { t } = useTranslation();
  const { data: logs = [], isPending: loading, isError: error, refetch } = useQuery<any[]>({
    queryKey: queryKeys.auditLogs,
    queryFn: () => adminApi.getAuditLogs(),
  });

  useEffect(() => {
    if (error) toast.error(t('auditLogs.loadError', 'فشل تحميل سجل التدقيق'));
  }, [error, t]);

  const controls = useTableControls<any>({
    rows: logs,
    filterFn: (l, q) => {
      const needle = q.toLowerCase();
      return (
        String(l.event || l.action || '').toLowerCase().includes(needle) ||
        String(l.userEmail || l.userId || '').toLowerCase().includes(needle) ||
        String(l.targetType ? `${l.targetType} #${l.targetId}` : '').toLowerCase().includes(needle) ||
        String(l.details || '').toLowerCase().includes(needle)
      );
    },
    initialSort: { key: 'createdAt', dir: 'desc' },
    storageKey: 'auditLogs',
    getValue: (l, key) => {
      if (key === 'event') return l.event || l.action;
      if (key === 'user') return l.userEmail || l.userId;
      if (key === 'target') return l.targetType ? `${l.targetType} #${l.targetId}` : '';
      return l[key];
    },
  });
  const { query, setQuery } = controls;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">{t('auditLogs.pageTitle', 'سجل التدقيق')}</h2>
        <button
          onClick={() => downloadRowsAsCsv(logs, 'audit-logs.csv')}
          className="px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          تصدير CSV
        </button>
      </div>
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('auditLogs.search', 'بحث بالحدث أو المستخدم...')}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <AdminTableSkeleton columns={['w-24', 'w-32', 'w-28', 'w-20', 'w-24']} />
        ) : error ? (
          <ErrorState message={t('auditLogs.loadError', 'فشل تحميل سجل التدقيق')} onRetry={() => refetch()} />
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('auditLogs.empty', 'لا توجد سجلات')}</p>
          </div>
        ) : controls.filteredCount === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('auditLogs.noResults', 'لا توجد نتائج مطابقة')}</p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <SortableTh sortKey="event" label={t('auditLogs.event', 'الحدث')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="user" label={t('auditLogs.user', 'المستخدم')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <SortableTh sortKey="target" label={t('auditLogs.target', 'الهدف')} sort={controls.sort} onToggle={controls.toggleSort} />
                  <th className="px-4 py-3 text-start font-medium text-gray-500">{t('auditLogs.details', 'التفاصيل')}</th>
                  <SortableTh sortKey="createdAt" label={t('auditLogs.date', 'التاريخ')} sort={controls.sort} onToggle={controls.toggleSort} />
                </tr>
              </thead>
              <tbody>
                {controls.rows.map(l => (
                  <tr key={l.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-900">{l.event || l.action || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.userEmail || l.userId || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.targetType ? `${l.targetType} #${l.targetId}` : '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{l.details || '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{l.createdAt ? new Date(l.createdAt).toLocaleDateString('ar-SA') : '-'}</td>
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
              itemLabel={t('auditLogs.itemLabel', 'سجل')}
            />
          </>
        )}
      </div>
    </div>
  );
}
