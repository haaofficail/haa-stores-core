import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Ticket, ChevronLeft, MessageSquare } from 'lucide-react';
import { getStoreId, supportApi } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

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
  in_progress: 'bg-blue-100 text-blue-700',
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

  useEffect(() => {
    if (!storeId) return;
    setLoading(true);
    supportApi.listTickets(storeId, statusFilter || undefined)
      .then(d => { setTickets(d.tickets); setCount(d.count); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, statusFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Ticket className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">{t('support.tickets', 'تذاكر الدعم')}</h1>
            <p className="text-sm text-neutral-500">{count} {t('support.totalTickets', 'تذكرة')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
        {statusFilters.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>
            {s ? statusLabels[s] || s : t('support.all', 'الكل')}
          </button>
        ))}
      </div>

      {loading ? <LoadingSkeleton /> : tickets.length === 0 ? (
        <div className="text-center py-16">
          <Ticket className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500">{t('support.noTickets', 'لا توجد تذاكر')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <Link key={ticket.id} to={`/support/tickets/${ticket.id}`}
              className="block p-4 rounded-xl border border-neutral-200 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
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
