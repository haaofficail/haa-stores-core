import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../lib/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    adminApi.dashboard()
      .then(setStats)
      .catch(() => { setError(true);       toast.error(t('dashboard.loadError', 'فشل تحميل البيانات')); })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-6">{t('dashboard.title', 'الرئيسية')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-200 rounded-xl p-6 animate-pulse">
              <div className="h-8 w-16 bg-gray-300 rounded mb-2" />
              <div className="h-4 w-20 bg-gray-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-gray-500 mb-3">{t('dashboard.loadError', 'فشل تحميل البيانات')}</p>
        <button onClick={load} className="text-sm text-blue-600 hover:text-blue-800 font-medium">{t('dashboard.retry', 'إعادة المحاولة')}</button>
      </div>
    );
  }

  const cards = [
    { label: t('dashboard.tenants', 'التجار'), value: stats.tenants, color: 'bg-blue-500' },
    { label: t('dashboard.stores', 'المتاجر'), value: stats.stores, color: 'bg-green-500' },
    { label: t('dashboard.users', 'المستخدمين'), value: stats.users, color: 'bg-purple-500' },
    { label: t('dashboard.orders', 'الطلبات'), value: stats.orders, color: 'bg-orange-500' },
    { label: t('dashboard.pendingKyc', 'طلبات التحقق المعلقة'), value: stats.pendingKyc, color: stats.pendingKyc > 0 ? 'bg-red-500' : 'bg-gray-500' },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t('dashboard.title', 'الرئيسية')}</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`${c.color} text-white rounded-xl p-6`}>
            <div className="text-3xl font-bold">{c.value}</div>
            <div className="text-sm opacity-90 mt-1">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
