import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Send, MessageSquare, Clock, User } from 'lucide-react';
import { getStoreId, supportApi } from '@/lib/api';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface TicketMsg {
  id: number;
  authorType: string;
  authorId: number | null;
  message: string;
  isStaffReply: boolean;
  createdAt: string;
}

interface TicketDetail {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  messages: TicketMsg[];
}

const statusOptions = ['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'];
const priorityOptions = ['low', 'medium', 'high', 'urgent'];

const statusLabels: Record<string, string> = {
  open: 'مفتوح',
  in_progress: 'قيد المراجعة',
  waiting_on_customer: 'بانتظار العميل',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

const priorityLabels: Record<string, string> = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
  urgent: 'عاجل',
};

export default function SupportTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { t } = useTranslation();
  const storeId = Number(getStoreId());
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!storeId || !ticketId) return;
    setLoading(true);
    supportApi.getTicket(storeId, Number(ticketId))
      .then(setTicket)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [storeId, ticketId]);

  async function updateStatus(status: string) {
    if (!ticket || !ticketId) return;
    try {
      await supportApi.updateStatus(storeId, Number(ticketId), status);
      setTicket(prev => prev ? { ...prev, status } : prev);
    } catch {}
  }

  async function updatePriority(priority: string) {
    if (!ticket || !ticketId) return;
    try {
      await supportApi.updatePriority(storeId, Number(ticketId), priority);
      setTicket(prev => prev ? { ...prev, priority } : prev);
    } catch {}
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !ticket || !ticketId) return;
    setSending(true);
    try {
      await supportApi.reply(storeId, Number(ticketId), reply);
      const updated = await supportApi.getTicket(storeId, Number(ticketId));
      setTicket(updated);
      setReply('');
    } catch {}
    setSending(false);
  }

  if (loading) return <LoadingSkeleton />;
  if (!ticket) return <div className="p-6 text-neutral-500">{t('support.ticketNotFound', 'التذكرة غير موجودة')}</div>;

  const allMessages: TicketMsg[] = [
    { id: 0, authorType: 'customer', authorId: null, message: ticket.message, isStaffReply: false, createdAt: ticket.createdAt },
    ...ticket.messages,
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link to="/support/tickets" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary-600 transition-colors mb-6">
        <ArrowRight className="h-4 w-4" />
        {t('support.backToTickets', 'العودة للتذاكر')}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{ticket.subject}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-neutral-500">
            <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {ticket.name}</span>
            {ticket.email && <span>{ticket.email}</span>}
            {ticket.phone && <span>{ticket.phone}</span>}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(ticket.createdAt).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={ticket.status} onChange={e => updateStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {statusOptions.map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
          </select>
          <select value={ticket.priority} onChange={e => updatePriority(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
            {priorityOptions.map(p => <option key={p} value={p}>{priorityLabels[p]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4 mb-8">
        {allMessages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.isStaffReply ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-2xl px-5 py-3.5 ${msg.isStaffReply ? 'bg-primary-50 text-neutral-900' : 'bg-neutral-100 text-neutral-900'}`}>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-500 font-medium">
                  {msg.isStaffReply ? t('support.you', 'أنت') : ticket.name}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              <p className="text-xs text-neutral-400 mt-1.5">{new Date(msg.createdAt).toLocaleString('ar-SA')}</p>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <form onSubmit={handleReply} className="border-t border-neutral-200 pt-6">
          <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y mb-3"
            placeholder={t('support.replyPlaceholder', 'اكتب ردك هنا...')}
          />
          <button type="submit" disabled={sending || !reply.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm">
            <Send className="h-4 w-4" />
            {sending ? t('support.sending', 'جاري الإرسال...') : t('support.send', 'إرسال الرد')}
          </button>
        </form>
      )}
    </div>
  );
}
