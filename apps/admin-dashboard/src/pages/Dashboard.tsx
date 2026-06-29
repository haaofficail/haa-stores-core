/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/ui/icon';

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Icon name="AlertCircle" size="md" className="text-red-400" />
      </div>
      <p className="text-callout font-medium text-gray-700 mb-1">تعذّر تحميل البيانات</p>
      <p className="text-footnote text-gray-400 mb-5">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-footnote font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { data: stats, isPending, isError, refetch } = useQuery<any>({
    queryKey: queryKeys.dashboard,
    queryFn: () => adminApi.dashboard(),
  });

  useEffect(() => {
    if (isError) toast.error(t('dashboard.loadError', 'فشل تحميل البيانات'));
  }, [isError, t]);

  if (isPending) {
    return (
      <div>
        <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-card p-5 space-y-3 animate-pulse">
              <div className="h-9 w-9 bg-gray-100 rounded-lg" />
              <div className="h-7 w-14 bg-gray-100 rounded" />
              <div className="h-4 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return <ErrorState message={t('dashboard.loadError', 'فشل تحميل البيانات')} onRetry={() => refetch()} />;
  }

  type StatCard = {
    label: string;
    value: number;
    icon: 'Users' | 'Store' | 'ReceiptText' | 'ShoppingBag' | 'ShieldCheck';
    iconBg: string;
    iconColor: string;
    alert?: boolean;
  };

  const cards: StatCard[] = [
    {
      label: t('dashboard.tenants', 'التجار'),
      value: stats.tenants,
      icon: 'Users',
      iconBg: 'bg-primary-50',
      iconColor: 'text-primary-600',
    },
    {
      label: t('dashboard.stores', 'المتاجر'),
      value: stats.stores,
      icon: 'Store',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      label: t('dashboard.users', 'المستخدمين'),
      value: stats.users,
      icon: 'ReceiptText',
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
    {
      label: t('dashboard.orders', 'الطلبات'),
      value: stats.orders,
      icon: 'ShoppingBag',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: t('dashboard.pendingKyc', 'طلبات التحقق المعلقة'),
      value: stats.pendingKyc,
      icon: 'ShieldCheck',
      iconBg: stats.pendingKyc > 0 ? 'bg-red-50' : 'bg-gray-50',
      iconColor: stats.pendingKyc > 0 ? 'text-red-500' : 'text-gray-400',
      alert: stats.pendingKyc > 0,
    },
  ];

  return (
    <div>
      <h2 className="text-title2 font-bold text-gray-900 tracking-tight mb-6">
        {t('dashboard.title', 'الرئيسية')}
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div
            key={c.label}
            className={`bg-white rounded-xl shadow-card p-5 border ${
              c.alert ? 'border-red-100' : 'border-transparent'
            } hover:shadow-card-hover transition-shadow`}
          >
            <div className={`h-9 w-9 rounded-lg ${c.iconBg} flex items-center justify-center mb-3`}>
              <Icon name={c.icon} size="sm" className={c.iconColor} />
            </div>
            <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">
              {c.value?.toLocaleString('ar-SA') ?? '—'}
            </div>
            <div className="text-footnote text-gray-500 mt-1 leading-snug">{c.label}</div>
            {c.alert && (
              <div className="mt-2 inline-flex items-center gap-1 text-caption2 font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                <Icon name="AlertTriangle" size="3xs" className="text-red-500" />
                يحتاج مراجعة
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
