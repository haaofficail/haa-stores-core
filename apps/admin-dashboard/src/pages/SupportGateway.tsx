import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminApi, type AdminSupportTicket } from '../lib/api';
import { Icon } from '../components/ui/icon';
import { ErrorState } from '../components/ui/ErrorState';
import { AdminEmptyState } from '../components/ui/AdminEmptyState';
import { TablePager } from '../components/ui/TablePager';

const PAGE_SIZE = 25;

const STATUS_OPTIONS = [
  { key: '', label: 'كل الحالات' },
  { key: 'open', label: 'مفتوحة' },
  { key: 'in_progress', label: 'قيد المعالجة' },
  { key: 'waiting_on_customer', label: 'بانتظار العميل' },
  { key: 'resolved', label: 'تم الحل' },
  { key: 'closed', label: 'مغلقة' },
];

const PRIORITY_OPTIONS = [
  { key: '', label: 'كل الأولويات' },
  { key: 'urgent', label: 'عاجلة' },
  { key: 'high', label: 'عالية' },
  { key: 'medium', label: 'متوسطة' },
  { key: 'low', label: 'منخفضة' },
];

const STATUS_LABELS: Record<string, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  waiting_on_customer: 'بانتظار العميل',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'عاجلة',
  high: 'عالية',
  medium: 'متوسطة',
  low: 'منخفضة',
};

const STATUS_BADGES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-primary-100 text-primary-700',
  waiting_on_customer: 'bg-orange-100 text-orange-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
};

const PRIORITY_BADGES: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-gray-100 text-gray-700',
  low: 'bg-emerald-100 text-emerald-700',
};

type DecisionTone = 'danger' | 'warning' | 'primary' | 'success' | 'neutral';

type TicketDecision = {
  owner: string;
  nextAction: string;
  tone: DecisionTone;
};

const DECISION_BADGES: Record<DecisionTone, string> = {
  danger: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  primary: 'border-primary-200 bg-primary-50 text-primary-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-gray-200 bg-gray-50 text-gray-700',
};

function supportTicketDecision(ticket: AdminSupportTicket): TicketDecision {
  if (ticket.priority === 'urgent') {
    return {
      owner: 'فريق الدعم',
      nextAction: 'صعّد التذكرة اليوم وابدأ التواصل مع المتجر أو العميل.',
      tone: 'danger',
    };
  }

  if (ticket.status === 'open') {
    return {
      owner: 'فريق الدعم',
      nextAction: 'ابدأ الفرز وحدد هل تحتاج التذكرة تواصلًا مع التاجر أو العميل.',
      tone: 'warning',
    };
  }

  if (ticket.status === 'in_progress') {
    return {
      owner: ticket.assignedTo ? 'عضو دعم مخصص' : 'فريق الدعم',
      nextAction: 'تابع الحل المفتوح وحدّث التاجر قبل إغلاق اليوم.',
      tone: 'primary',
    };
  }

  if (ticket.status === 'waiting_on_customer') {
    return {
      owner: 'العميل/التاجر',
      nextAction: 'أرسل تذكيرًا أو انتظر الرد قبل التصعيد.',
      tone: 'warning',
    };
  }

  return {
    owner: 'لا يوجد إجراء نشط',
    nextAction: 'راجع السجل عند إعادة فتح أو تصعيد جديد.',
    tone: ticket.status === 'resolved' ? 'success' : 'neutral',
  };
}

function timeAgo(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return '—';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(iso).toLocaleDateString('ar-SA');
}

function Badge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

function SummaryCard({ label, value, helper, tone }: { label: string; value: number; helper: string; tone: 'primary' | 'warning' | 'danger' | 'neutral' }) {
  const toneClass = {
    primary: 'bg-primary-50 text-primary-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    neutral: 'bg-gray-50 text-gray-700',
  }[tone];

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-title2 font-bold text-gray-900">{value}</p>
          <p className="mt-1 text-xs leading-5 text-gray-500">{helper}</p>
        </div>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon name="Headphones" size="sm" />
        </span>
      </div>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: AdminSupportTicket }) {
  const decision = supportTicketDecision(ticket);

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-4 align-top">
        <p className="text-sm font-semibold text-gray-900">{ticket.subject}</p>
        <p className="mt-1 line-clamp-2 max-w-xl text-xs leading-5 text-gray-500">{ticket.messagePreview}</p>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="text-sm font-semibold text-gray-900">{ticket.storeName}</div>
        <div className="mt-1 text-xs text-gray-500">/{ticket.storeSlug}</div>
      </td>
      <td className="px-4 py-4 align-top">
        <div className="text-sm text-gray-900">{ticket.name}</div>
        <div className="mt-1 text-xs text-gray-500">{ticket.email ?? ticket.phone ?? 'لا توجد وسيلة تواصل'}</div>
      </td>
      <td className="px-4 py-4 align-top"><Badge label={STATUS_LABELS[ticket.status] ?? ticket.status} className={STATUS_BADGES[ticket.status] ?? 'bg-gray-100 text-gray-700'} /></td>
      <td className="px-4 py-4 align-top"><Badge label={PRIORITY_LABELS[ticket.priority] ?? ticket.priority} className={PRIORITY_BADGES[ticket.priority] ?? 'bg-gray-100 text-gray-700'} /></td>
      <td className="px-4 py-4 align-top text-sm text-gray-500">{timeAgo(ticket.updatedAt)}</td>
      <td className="px-4 py-4 align-top">
        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${DECISION_BADGES[decision.tone]}`}>{decision.owner}</span>
      </td>
      <td className="max-w-xs px-4 py-4 align-top text-xs leading-5 text-gray-600">{decision.nextAction}</td>
      <td className="px-4 py-4 align-top"><Link to={`/tenants/${ticket.tenantId}`} className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1">ملف التاجر</Link></td>
    </tr>
  );
}

export default function SupportGateway() {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const ticketsQuery = useQuery({
    queryKey: ['admin-support-gateway', status, priority, query, page],
    queryFn: () => adminApi.getSupportGatewayTickets({ status: status || undefined, priority: priority || undefined, q: query.trim() || undefined, page, limit: PAGE_SIZE }),
  });

  const result = ticketsQuery.data;
  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const startIndex = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIndex = total === 0 ? 0 : Math.min(total, page * PAGE_SIZE);
  const resetPage = (fn: (value: string) => void) => (value: string) => { fn(value); setPage(1); };
  const hasActiveFilters = Boolean(status || priority || query.trim());
  const clearFilters = () => {
    setStatus('');
    setPriority('');
    setQuery('');
    setPage(1);
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500"><Icon name="Headphones" size="xs" className="text-primary-600" /><span>تشغيل ودعم</span></div>
          <h1 className="mt-2 text-title2 font-bold tracking-tight text-gray-900">بوابة الدعم</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">تعرض تذاكر دعم المتاجر على مستوى المنصة حتى يعرف الأدمن أين توجد طلبات مفتوحة أو عاجلة، بدون كشف رموز وصول العملاء أو تنفيذ قرارات دعم من خارج مسار التاجر.</p>
        </div>
        <Link to="/landing-inbox" className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1">فتح صندوق وارد الهبوط</Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="إجمالي التذاكر" value={total} helper="حسب الفلاتر الحالية" tone="neutral" />
        <SummaryCard label="مفتوحة" value={result?.summary.open ?? 0} helper="تحتاج متابعة تشغيلية" tone="warning" />
        <SummaryCard label="بانتظار العميل" value={result?.summary.waitingOnCustomer ?? 0} helper="تحتاج ردًا من العميل" tone="primary" />
        <SummaryCard label="عاجلة" value={result?.summary.urgent ?? 0} helper="راجعها قبل نهاية اليوم" tone="danger" />
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_auto]">
          <label className="block"><span className="text-xs font-semibold text-gray-500">بحث</span><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} type="search" placeholder="ابحث بالموضوع أو العميل أو المتجر..." className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100" /></label>
          <label className="block"><span className="text-xs font-semibold text-gray-500">الحالة</span><select value={status} onChange={(event) => resetPage(setStatus)(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100">{STATUS_OPTIONS.map(option => <option key={option.key || 'all'} value={option.key}>{option.label}</option>)}</select></label>
          <label className="block"><span className="text-xs font-semibold text-gray-500">الأولوية</span><select value={priority} onChange={(event) => resetPage(setPriority)(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100">{PRIORITY_OPTIONS.map(option => <option key={option.key || 'all'} value={option.key}>{option.label}</option>)}</select></label>
          <div className="flex items-end">
            <button type="button" onClick={clearFilters} disabled={!hasActiveFilters} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50">مسح الفلاتر</button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
        {ticketsQuery.isPending ? <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}</div> : ticketsQuery.isError ? <ErrorState message="فشل تحميل بوابة الدعم" onRetry={() => ticketsQuery.refetch()} /> : rows.length === 0 ? <AdminEmptyState icon="Headphones" title="لا توجد تذاكر دعم ضمن الفلتر الحالي" description="هذا لا يعني أن الدعم غير موجود؛ قد تكون كل التذاكر مغلقة أو أن الفلتر ضيق." meaning="إذا كان التجار يبلغون عن مشاكل ولا تظهر هنا، راجع إعدادات إنشاء التذاكر في المتجر أو افتح صندوق وارد الهبوط للرسائل العامة." actions={[{ label: 'عرض كل التذاكر', href: '/support-gateway' }, { label: 'فتح المتاجر', href: '/stores' }]} /> : <>
          <div className="overflow-x-auto"><table className="min-w-full text-right text-sm"><thead className="bg-gray-50 text-xs font-semibold text-gray-500"><tr><th className="px-4 py-3 text-start">التذكرة</th><th className="px-4 py-3 text-start">المتجر</th><th className="px-4 py-3 text-start">العميل</th><th className="px-4 py-3 text-start">الحالة</th><th className="px-4 py-3 text-start">الأولوية</th><th className="px-4 py-3 text-start">آخر تحديث</th><th className="px-4 py-3 text-start">المسؤول</th><th className="px-4 py-3 text-start">الإجراء التالي</th><th className="px-4 py-3 text-start">إجراء</th></tr></thead><tbody>{rows.map(ticket => <TicketRow key={ticket.id} ticket={ticket} />)}</tbody></table></div>
          <TablePager page={page} totalPages={totalPages} startIndex={startIndex} endIndex={endIndex} filteredCount={total} onPageChange={setPage} itemLabel="تذكرة" />
        </>}
      </div>
    </div>
  );
}
