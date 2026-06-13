import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';

export default function AuditLogs() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    adminApi.getAuditLogs()
      .then(setLogs)
      .catch(() => { setError(true); toast.error(t('auditLogs.loadError', 'فشل تحميل سجل التدقيق')); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('auditLogs.pageTitle', 'سجل التدقيق')}</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-3">{t('auditLogs.loadError', 'فشل تحميل سجل التدقيق')}</p>
            <button
              onClick={() => load()}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {t('common.retry', 'إعادة المحاولة')}
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">{t('auditLogs.empty', 'لا توجد سجلات')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('auditLogs.event', 'الحدث')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('auditLogs.user', 'المستخدم')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('auditLogs.target', 'الهدف')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('auditLogs.details', 'التفاصيل')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('auditLogs.date', 'التاريخ')}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
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
