import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';

export default function NewsletterSection({
  title = 'انضم إلى عالم العطور',
  description = 'كن أول من يعرف عن الإصدارات الجديدة والعروض الخاصة.',
}: {
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section className={`${LUXURY_THEME_CLASS} py-6 sm:py-8`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)', borderTop: '1px solid var(--lux-border, #E6D8C6)', borderBottom: '1px solid var(--lux-border, #E6D8C6)' }}>
      <div className="mx-auto max-w-lg px-4 text-center sm:px-6">
        <h3 className="text-lg font-light sm:text-xl" style={{ color: 'var(--lux-text, #2B2520)' }}>
          {title}
        </h3>
        <p className="mt-2 text-sm font-light leading-relaxed" style={{ color: 'var(--lux-muted, #756B61)' }}>
          {description}
        </p>
        {submitted ? (
          <p className="mt-4 text-sm font-light" style={{ color: 'var(--lux-primary, #B88A3D)' }}>
            {t('newsletter.subscribed', 'شكراً لاشتراكك!')}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-5 flex max-w-md gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('newsletter.emailPlaceholder', 'بريدك الإلكتروني')}
              required
              className="min-h-11 flex-1 px-4 text-sm outline-none"
              style={{
                backgroundColor: 'var(--lux-subtle-surface, #FBF8F2)',
                border: '1px solid var(--lux-border, #E6D8C6)',
                borderRadius: '3px',
                color: 'var(--lux-text, #2B2520)',
              }}
            />
            <button
              type="submit"
              className="min-h-11 px-6 text-xs font-light uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              style={{
                backgroundColor: 'var(--lux-primary, #B88A3D)',
                borderRadius: '3px',
              }}
            >
              {t('newsletter.subscribe', 'اشتراك')}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
