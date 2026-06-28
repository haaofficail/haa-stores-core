/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { AdminTableSkeleton } from '../components/ui/AdminTableSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { downloadRowsAsCsv } from '../lib/downloadRowsAsCsv';

export default function AuditLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.getAuditLogs()
      .then(setLogs)
      .catch(() => { setError(true); toast.error(t('auditLogs.loadError', 'فشل تحميل سجل التدقيق')); })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

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
          <ErrorState message={t('auditLogs.loadError', 'فشل تحميل سجل التدقيق')} onRetry={load} />
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-footnote text-gray-400">{t('auditLogs.empty', 'لا توجد سجلات')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('auditLogs.event', 'الحدث')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('auditLogs.user', 'المستخدم')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('auditLogs.target', 'الهدف')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('auditLogs.details', 'التفاصيل')}</th>
                <th className="px-4 py-3 text-start font-medium text-gray-500">{t('auditLogs.date', 'التاريخ')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.filter(l => {
                if (!query) return true;
                const q = query.toLowerCase();
                return (l.event || l.action || '').toLowerCase().includes(q) || (l.userEmail || String(l.userId || '')).toLowerCase().includes(q);
              }).map(l => (
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
        )}
      </div>
    </div>
  );
}
