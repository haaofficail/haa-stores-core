import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { ArrowRight, Send, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supportApi, type CreatedTicket } from '@/lib/api';

const FOCUS_VISIBLE = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]';

export default function Support() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState<CreatedTicket | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setTicket(null);
    setError('');
  }, [location.pathname]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!slug || !name || !subject || !message) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await supportApi.createTicket(slug, { name, email, phone, subject, message });
      localStorage.setItem(`support-ticket-token:${slug}:${result.id}`, result.accessToken);
      setTicket(result);
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  const ticketPath = ticket && slug ? `/s/${slug}/support/tickets/${ticket.id}` : '';
  const ticketUrl = ticketPath ? `${window.location.origin}${ticketPath}` : '';

  if (ticket) {
    return (
      <div className="container-store py-8 sm:py-12 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          {t('support.submitted', 'تم إرسال طلب الدعم')}
        </h1>
        <p className="text-text-secondary mb-2">
          {t('support.submittedDesc', 'تم استلام طلبك وسنقوم بالرد في أقرب وقت.')}
        </p>
        <p className="text-xs text-text-tertiary mb-6">
          {t('support.saveLink', 'احفظ الرابط ورمز الدخول التاليين لمتابعة طلبك:')}
        </p>
        <div className="bg-surface-1 rounded-xl p-4 mb-6 text-left space-y-3" dir="ltr">
          <a href={ticketUrl} className="text-sm text-primary-600 hover:text-primary-700 break-all">
            {ticketUrl}
          </a>
          <div className="rounded-lg border border-border-primary bg-white p-3">
            <p className="text-[11px] uppercase tracking-wide text-text-tertiary">Access code</p>
            <code className="mt-1 block break-all text-sm font-semibold text-text-primary">{ticket.accessToken}</code>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            to={ticketPath}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            {t('support.viewTicket', 'متابعة الطلب')}
          </Link>
          <Link to={`/s/${slug}`} className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary-600 transition-colors">
            <ArrowRight className="h-4 w-4" />
            {t('store.home')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-store py-8 sm:py-12 max-w-2xl mx-auto">
      <Link to={`/s/${slug}`} className={`inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-8 ${FOCUS_VISIBLE}`}>
        <ArrowRight className="h-4 w-4" />
        {t('store.home')}
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
        {t('support.title')}
      </h1>
      <p className="text-text-secondary mb-8">
        {t('support.desc')}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {t('support.name')} <span className="text-error">*</span>
          </label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)} required
            className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE}`}
            placeholder={t('support.namePlaceholder')}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('support.email')}
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE}`}
              placeholder={t('support.emailPlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t('support.phone')}
            </label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE}`}
              placeholder={t('support.phonePlaceholder')}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {t('support.subject')} <span className="text-error">*</span>
          </label>
          <input
            type="text" value={subject} onChange={e => setSubject(e.target.value)} required
            className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE}`}
            placeholder={t('support.subjectPlaceholder')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {t('support.message')} <span className="text-error">*</span>
          </label>
          <textarea
            value={message} onChange={e => setMessage(e.target.value)} required rows={5}
            className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-text-primary ${FOCUS_VISIBLE} resize-y`}
            placeholder={t('support.messagePlaceholder')}
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit" disabled={submitting}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors ${FOCUS_VISIBLE}`}
        >
          <Send className="h-4 w-4" />
          {submitting ? t('support.sending') : t('support.send')}
        </button>
      </form>
    </div>
  );
}
