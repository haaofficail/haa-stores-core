import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Send, MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supportApi, type SupportTicket as SupportTicketType } from '@/lib/api';

const FOCUS_VISIBLE = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--theme-primary,var(--brand-primary))]';

const statusLabels: Record<string, string> = {
  open: 'مفتوح',
  in_progress: 'قيد المراجعة',
  waiting_on_customer: 'بانتظار ردك',
  resolved: 'تم الحل',
  closed: 'مغلق',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  waiting_on_customer: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-neutral-100 text-neutral-500',
};

export default function SupportTicket() {
  const { slug, ticketId } = useParams<{ slug: string; ticketId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const storageKey = slug && ticketId ? `support-ticket-token:${slug}:${ticketId}` : '';
  const legacyAccessToken = searchParams.get('accessToken');
  const [accessToken, setAccessToken] = useState(() => {
    if (legacyAccessToken) return legacyAccessToken;
    return storageKey ? localStorage.getItem(storageKey) ?? '' : '';
  });
  const [tokenInput, setTokenInput] = useState('');
  const [ticket, setTicket] = useState<SupportTicketType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    if (!slug || !ticketId || !accessToken) {
      setLoading(false);
      return;
    }
    if (storageKey) localStorage.setItem(storageKey, accessToken);
    if (legacyAccessToken) setSearchParams(new URLSearchParams(), { replace: true });
    setLoading(true);
    setLoadError('');
    supportApi.getTicket(slug, Number(ticketId), accessToken)
      .then(setTicket)
      .catch((err) => {
        if (err.message?.includes('NOT_FOUND') || err.message?.includes('غير موجود')) {
          setLoadError(t('support.ticketNotFound', 'التذكرة غير موجودة'));
        } else {
          setLoadError(t('support.loadError', 'حدث خطأ أثناء تحميل التذكرة'));
        }
      })
      .finally(() => setLoading(false));
  }, [slug, ticketId, accessToken, legacyAccessToken, setSearchParams, storageKey, t]);

  if (!accessToken) {
    return (
      <div className="container-store py-12 max-w-2xl mx-auto text-center">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-2">{t('support.noAccessToken', 'رمز الدخول مطلوب')}</h1>
        <p className="text-text-secondary mb-4">{t('support.noAccessTokenDesc', 'أدخل رمز الدخول الذي ظهر لك عند إنشاء التذكرة.')}</p>
        <form
          className="mx-auto mb-5 max-w-md space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (tokenInput.trim()) setAccessToken(tokenInput.trim());
          }}
        >
          <input
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE}`}
            placeholder={t('support.accessCodePlaceholder', 'رمز الدخول')}
            dir="ltr"
          />
          <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
            {t('support.openTicket', 'فتح التذكرة')}
          </button>
        </form>
        <Link to={`/s/${slug}/support`} className={`text-primary-600 hover:text-primary-700 text-sm inline-flex items-center gap-1 ${FOCUS_VISIBLE}`}>
          <ArrowRight className="h-4 w-4" /> {t('support.newTicket', 'إنشاء تذكرة جديدة')}
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-store py-8 space-y-6">
        <div className="h-10 w-48 bg-surface-2 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-surface-2 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="container-store py-12 max-w-2xl mx-auto text-center">
        <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
        <h1 className="text-xl font-bold text-text-primary mb-2">{t('support.ticketNotFound', 'التذكرة غير موجودة')}</h1>
        <p className="text-text-secondary mb-4">{loadError}</p>
        <Link to={`/s/${slug}/support`} className={`text-primary-600 hover:text-primary-700 text-sm inline-flex items-center gap-1 ${FOCUS_VISIBLE}`}>
          <ArrowRight className="h-4 w-4" /> {t('support.newTicket', 'إنشاء تذكرة جديدة')}
        </Link>
      </div>
    );
  }

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!reply.trim() || !slug || !ticketId || !accessToken) return;
    setSending(true);
    setReplyError('');
    setReplySent(false);
    try {
      await supportApi.replyToTicket(slug, Number(ticketId), accessToken, reply);
      const updated = await supportApi.getTicket(slug, Number(ticketId), accessToken);
      setTicket(updated);
      setReply('');
      setReplySent(true);
      setTimeout(() => setReplySent(false), 3000);
    } catch (err: any) {
      setReplyError(err.message || t('common.error'));
    } finally {
      setSending(false);
    }
  }

  const allMessages: Array<{ id: number; authorType: string; message: string; isStaffReply: boolean; createdAt: string }> = [
    { id: 0, authorType: 'customer', message: ticket.message, isStaffReply: false, createdAt: ticket.createdAt },
    ...(ticket.messages || []),
  ];

  return (
    <div className="container-store py-8 sm:py-12 max-w-3xl mx-auto overflow-x-hidden">
      <Link to={`/s/${slug}/support`} className={`inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-6 ${FOCUS_VISIBLE}`}>
        <ArrowRight className="h-4 w-4" />
        {t('support.backToForm', 'العودة لنموذج الدعم')}
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{ticket.subject}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-text-tertiary">
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {new Date(ticket.createdAt).toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status] || ''}`}>
          {statusLabels[ticket.status] || ticket.status}
        </span>
      </div>

      <div className="space-y-4 mb-8">
        {allMessages.map((msg, i) => (
          <div key={msg.id || i} className={`flex ${msg.isStaffReply ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.isStaffReply ? 'bg-surface-2 text-text-primary' : 'bg-primary-50 text-text-primary'}`}>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-3.5 w-3.5 text-text-tertiary" />
                <span className="text-xs text-text-tertiary">
                  {msg.isStaffReply ? t('support.staff', 'الدعم الفني') : ticket.name}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              <p className="text-xs text-text-tertiary mt-1">{new Date(msg.createdAt).toLocaleString('ar-SA')}</p>
            </div>
          </div>
        ))}
      </div>

      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
        <form onSubmit={handleReply} className="border-t border-border-primary pt-6">
          <label className="block text-sm font-medium text-text-primary mb-2">
            {t('support.addReply', 'إضافة رد')}
          </label>
          <textarea
            value={reply} onChange={e => setReply(e.target.value)} rows={3}
            className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE} resize-y mb-3`}
            placeholder={t('support.replyPlaceholder', 'اكتب ردك هنا...')}
          />
          {replySent && (
            <p className="text-sm text-green-600 mb-3 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              {t('support.replySent', 'تم إرسال ردك بنجاح')}
            </p>
          )}
          {replyError && (
            <p className="text-sm text-red-600 mb-3">{replyError}</p>
          )}
          <button
            type="submit" disabled={sending || !reply.trim()}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm ${FOCUS_VISIBLE}`}
          >
            <Send className="h-4 w-4" />
            {sending ? t('support.sending', 'جاري الإرسال...') : t('support.send', 'إرسال')}
          </button>
        </form>
      )}
    </div>
  );
}
