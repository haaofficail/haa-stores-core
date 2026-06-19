import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ticket, ChevronLeft, MessageSquare, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getStoreId, supportApi } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { Button } from '@/components/ui/button';

interface TicketItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
}

const statusFilters = ['', 'open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];

const statusLabels: Record<string, string> = {
  open: 'مفتوح',
  in_progress: 'قيد المراجعة',
  waiting_on_customer: 'بانتظار العميل',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

const statusColors: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-primary-100 text-primary-700',
  waiting_on_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-neutral-100 text-neutral-500',
};

const priorityColors: Record<string, string> = {
  low: 'text-neutral-400',
  medium: 'text-amber-500',
  high: 'text-orange-600',
  urgent: 'text-red-600',
};

export default function SupportTickets() {
  const { t } = useTranslation();
  const storeId = Number(getStoreId());
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    supportApi.listTickets(storeId, statusFilter || undefined)
      .then(d => { setTickets(d.tickets); setCount(d.count); })
      .catch((err: unknown) => {
        console.error(err);
        toast.error('فشل تحميل التذاكر');
      })
      .finally(() => setLoading(false));
  }, [storeId, statusFilter]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter(t =>
      t.subject.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{t('support.tickets', 'تذاكر الدعم')}</h1>
            <p className="text-sm text-neutral-500">{count} {t('support.totalTickets', 'تذكرة')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {statusFilters.map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'secondary'}
            onClick={() => setStatusFilter(s)}>
            {s ? statusLabels[s] || s : t('support.all', 'الكل')}
          </Button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full pr-10 px-4 py-2 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder={t('support.searchPlaceholder', 'بحث بالموضوع أو اسم العميل...')} />
      </div>

      {loading ? <LoadingSkeleton /> : filteredTickets.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{t('support.noTickets', 'لا توجد تذاكر')}</p>
          {!searchQuery && (
            <Button asChild className="mt-4">
              <a href="mailto:support@haa.store">{t('support.createTicket', 'إنشاء تذكرة جديدة')}</a>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map(ticket => (
            <Link key={ticket.id} to={`/support/tickets/${ticket.id}`}
              className="block p-4 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-neutral-400 font-mono shrink-0">#{ticket.id}</span>
                    <h3 className="font-semibold text-neutral-900 truncate">{ticket.subject}</h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status] || ''}`}>
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-neutral-500">
                    <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {ticket.name}</span>
                    <span className={`flex items-center gap-1 ${priorityColors[ticket.priority] || ''}`}>
                      {ticket.priority === 'urgent' ? 'عاجل' : ticket.priority === 'high' ? 'عالية' : ticket.priority === 'low' ? 'منخفضة' : 'متوسطة'}
                    </span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString('ar-SA')}</span>
                  </div>
                </div>
                <ChevronLeft className="h-5 w-5 text-neutral-400 shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
