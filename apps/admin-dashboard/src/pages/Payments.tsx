import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';

export default function Payments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.getPayments()
      .then(setPayments)
      .catch(() => { setError(true); toast.error(t('payments.loadError', 'فشل تحميل المدفوعات')); })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('payments.pageTitle', 'المدفوعات')}</h2>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 mb-3">{t('payments.loadError', 'فشل تحميل المدفوعات')}</p>
            <button
              onClick={() => load()}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('common.retry', 'إعادة المحاولة')}
            </button>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500">{t('payments.empty', 'لا توجد مدفوعات')}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payments.id', 'المعرف')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payments.amount', 'المبلغ')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payments.method', 'الطريقة')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payments.status', 'الحالة')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">{t('payments.date', 'التاريخ')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-900">#{p.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.amount} {p.currency || 'SAR'}</td>
                  <td className="px-4 py-3 text-gray-500">{p.method || '-'}</td>
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
        )}
      </div>
    </div>
  );
}
