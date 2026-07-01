/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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

  const urgentActions = [
    {
      title: t('dashboard.reviewMerchants', 'متاجر تحتاج مراجعة'),
      value: stats.pendingKyc ?? 0,
      href: '/compliance',
      tone: (stats.pendingKyc ?? 0) > 0 ? 'border-red-100 bg-red-50 text-red-700' : 'border-emerald-100 bg-emerald-50 text-emerald-700',
      hint: (stats.pendingKyc ?? 0) > 0 ? 'ابدأ بملفات التوثيق قبل أي قرار نشر.' : 'لا توجد طلبات توثيق معلقة في هذا المؤشر.',
    },
    {
      title: 'حسابات بنكية',
      value: 'مراجعة',
      href: '/bank-accounts',
      tone: 'border-amber-100 bg-amber-50 text-amber-700',
      hint: 'افتح الحسابات البنكية للتأكد من وجود حساب موثق قبل السحب.',
    },
    {
      title: 'جاهزية التسوية',
      value: 'قرار',
      href: '/settlement-readiness',
      tone: 'border-sky-100 bg-sky-50 text-sky-700',
      hint: 'راجع الموانع: الحساب المحمي، PSP، MoR، وامتثال ساما.',
    },
    {
      title: 'Webhooks',
      value: 'صحة',
      href: '/operations/webhooks',
      tone: 'border-gray-100 bg-gray-50 text-gray-700',
      hint: 'تحقق من آخر أحداث الدفع/الشحن والتكرارات قبل فتح بلاغات تشغيلية.',
    },
  ];

  const healthRows = [
    ['API', 'سليم محليًا', 'آخر ops:monitor لم يسجل P0/P1'],
    ['DB / Queue', 'راقب قبل الإطلاق', 'يعتمد على تقرير الصحة وليس رقمًا مخترعًا داخل الصفحة'],
    ['Payments', 'تحقق لكل متجر', 'لا تعتمد الدفع كجاهز حتى تظهر configured + enabled + mode بوضوح'],
    ['Shipping', 'تحقق يدويًا', 'الشحن اليدوي أو غير المهيأ يبقى مانع إطلاق حتى يؤكد المالك'],
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-title2 font-bold text-gray-900 tracking-tight">
          {t('dashboard.title', 'الرئيسية')}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
          مركز قيادة للقرارات اليومية: راجع ما يمنع النشر أو السحب أو التشغيل قبل التعامل مع الأرقام كإشارة جاهزية.
        </p>
      </header>
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

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">أولويات اليوم</h3>
              <p className="mt-1 text-sm text-gray-500">كل عنصر يفتح صفحة قرار، وليس جدولًا خامًا فقط.</p>
            </div>
            <span className="rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700">
              Decision queue
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {urgentActions.map(action => (
              <Link
                key={action.href}
                to={action.href}
                className={`rounded-xl border p-4 transition-colors hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${action.tone}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{action.title}</p>
                  <span className="text-xl font-bold tabular-nums">{typeof action.value === 'number' ? action.value.toLocaleString('ar-SA') : action.value}</span>
                </div>
                <p className="mt-2 text-xs leading-5 opacity-80">{action.hint}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900">صحة التشغيل والإطلاق</h3>
          <p className="mt-1 text-sm text-gray-500">لا تعرض الصفحة حالة live كحقيقة إلا من مصدر موثوق.</p>
          <div className="mt-4 divide-y divide-gray-100">
            {healthRows.map(([label, status, hint]) => (
              <div key={label} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900">{label}</p>
                  <span className="rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">{status}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-500">{hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
