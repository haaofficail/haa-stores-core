import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supportApi, type CreatedTicket } from '@/lib/api';
import { Icon } from '@/components/ui/icon';

const FOCUS_VISIBLE = 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--theme-primary,var(--brand-primary))]';

const PRIVACY_REQUEST_TEMPLATES = {
  dataExport: {
    subject: '[خصوصية] طلب نسخة من بياناتي',
    message: [
      'أرغب بطلب نسخة من بياناتي الشخصية المرتبطة بهذا المتجر.',
      '',
      'بيانات التحقق:',
      '- رقم الجوال أو البريد المستخدم في الطلبات:',
      '- آخر رقم طلب إن وجد:',
      '',
      'أفهم أن هذا الطلب يفتح تذكرة خصوصية وسيتم التحقق من الهوية قبل تسليم أي بيانات.',
    ].join('\n'),
  },
  dataDeletion: {
    subject: '[خصوصية] طلب حذف بياناتي',
    message: [
      'أرغب بطلب حذف أو إتلاف بياناتي الشخصية المرتبطة بهذا المتجر قدر الإمكان نظامياً.',
      '',
      'بيانات التحقق:',
      '- رقم الجوال أو البريد المستخدم في الطلبات:',
      '- آخر رقم طلب إن وجد:',
      '',
      'أفهم أن بعض البيانات قد تُحفظ لمدة نظامية لأغراض الفواتير والضرائب والنزاعات قبل الحذف النهائي.',
    ].join('\n'),
  },
};

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setSubmitting(false);
    }
  }

  function applyPrivacyTemplate(kind: keyof typeof PRIVACY_REQUEST_TEMPLATES) {
    const template = PRIVACY_REQUEST_TEMPLATES[kind];
    setSubject(t(`support.privacy.${kind}.subject`, template.subject));
    setMessage(t(`support.privacy.${kind}.message`, template.message));
    setError('');
  }

  const ticketPath = ticket && slug ? `/s/${slug}/support/tickets/${ticket.id}` : '';
  const ticketUrl = ticketPath ? `${window.location.origin}${ticketPath}` : '';

  if (ticket) {
    return (
      <div className="container-store py-8 sm:py-12 max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-success-soft flex items-center justify-center mx-auto mb-4">
          <Icon name="CheckCircle" size="lg" className="text-success" />
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
            <p className="text-xs uppercase tracking-wide text-text-tertiary">Access code</p>
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
            <Icon name="ArrowRight" size="xs" />
            {t('store.home')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-store py-8 sm:py-12 max-w-2xl mx-auto overflow-x-hidden">
      <Link to={`/s/${slug}`} className={`inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary-600 transition-colors mb-8 ${FOCUS_VISIBLE}`}>
        <Icon name="ArrowRight" size="xs" />
        {t('store.home')}
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
        {t('support.title')}
      </h1>
      <p className="text-text-secondary mb-8">
        {t('support.desc')}
      </p>

      <section className="mb-6 rounded-2xl border border-border-primary bg-surface-1 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info-strong">
            <Icon name="ShieldCheck" size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-text-primary">
              {t('support.privacy.title', 'طلبات الخصوصية')}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {t('support.privacy.desc', 'يمكنك فتح تذكرة لطلب نسخة من بياناتك أو طلب حذفها. سنراجع الطلب ونتحقق من الهوية قبل أي إجراء.')}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                data-privacy-request="data-export"
                onClick={() => applyPrivacyTemplate('dataExport')}
                className={`rounded-xl border border-border-primary bg-white px-4 py-3 text-start text-sm font-medium text-text-primary transition-colors hover:border-primary-300 hover:bg-primary-50 ${FOCUS_VISIBLE}`}
              >
                {t('support.privacy.dataExportAction', 'طلب نسخة من بياناتي')}
              </button>
              <button
                type="button"
                data-privacy-request="data-deletion"
                onClick={() => applyPrivacyTemplate('dataDeletion')}
                className={`rounded-xl border border-border-primary bg-white px-4 py-3 text-start text-sm font-medium text-text-primary transition-colors hover:border-primary-300 hover:bg-primary-50 ${FOCUS_VISIBLE}`}
              >
                {t('support.privacy.dataDeletionAction', 'طلب حذف بياناتي')}
              </button>
            </div>
          </div>
        </div>
      </section>

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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              dir="ltr"
              className={`w-full px-4 py-2.5 rounded-xl border border-border-primary bg-white text-start text-text-primary ${FOCUS_VISIBLE}`}
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
          <div className="p-3 rounded-xl bg-danger-soft border border-danger text-sm text-danger">
            {error}
          </div>
        )}

        <button
          type="submit" disabled={submitting}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50 transition-colors ${FOCUS_VISIBLE}`}
        >
          <Icon name="Mail" size="xs" />
          {submitting ? t('support.sending') : t('support.send')}
        </button>
      </form>
    </div>
  );
}
