import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import {
  PaymentLogoImg,
  getPaymentLogosByCategory,
} from '@/components/ui/trust-badges';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { LUXURY_THEME_CLASS } from './luxuryTokens';

export default function LuxuryShowcaseFooter() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { store, loading } = useStore();
  const theme = useStorefrontTheme();

  if (loading || !store) {
    return (
      <footer className={`${LUXURY_THEME_CLASS} mt-auto`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
        <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 py-3 sm:px-6">
          <div className="flex flex-wrap gap-3">
            <div className="h-3 w-24 animate-pulse rounded" style={{ backgroundColor: 'var(--lux-border, #E6D8C6)' }} />
            <div className="h-3 w-32 animate-pulse rounded" style={{ backgroundColor: 'var(--lux-border, #E6D8C6)' }} />
            <div className="h-3 w-28 animate-pulse rounded" style={{ backgroundColor: 'var(--lux-border, #E6D8C6)' }} />
          </div>
        </div>
      </footer>
    );
  }

  const footerConfig = theme?.footer;
  const showPaymentLogos = footerConfig?.showPaymentLogos !== false;
  const rawDescription = (footerConfig?.companyDescription?.trim() || store.description || '');
  const companyDescription = rawDescription.length > 80 ? rawDescription.slice(0, 80).replace(/\s+\S*$/, '') + '…' : rawDescription;

  return (
    <footer className={`${LUXURY_THEME_CLASS} mt-auto`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 py-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-start">
          <div className="text-center md:text-start">
            <p className="text-sm font-light tracking-wider" style={{ color: 'var(--lux-text, #2B2520)' }}>{store.name}</p>
            {companyDescription ? (
              <p className="mt-1 text-xs font-light leading-relaxed" style={{ color: 'var(--lux-muted, #756B61)' }}>{companyDescription}</p>
            ) : null}
          </div>

          <div className="flex flex-col items-center md:items-center gap-2">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {showPaymentLogos ? (
                <>
                  {getPaymentLogosByCategory('LOCAL_PAYMENT_METHOD').map(logo => (
                    <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
                  ))}
                  {getPaymentLogosByCategory('CARD_NETWORK').map(logo => (
                    <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
                  ))}
                  {getPaymentLogosByCategory('DIGITAL_WALLET').map(logo => (
                    <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
                  ))}
                  {getPaymentLogosByCategory('BNPL_PROVIDER').map(logo => (
                    <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />
                  ))}
                </>
              ) : null}
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1" aria-label="سياسات المتجر">
              <Link to={`/s/${slug}/policies/terms`} className="text-xs font-light transition-colors hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]" style={{ color: 'var(--lux-muted, #756B61)' }}>{t('footer.termsOfService', 'شروط الاستخدام')}</Link>
              <span className="text-xs" style={{ color: 'var(--lux-muted, #756B61)' }}>·</span>
              <Link to={`/s/${slug}/policies/privacy`} className="text-xs font-light transition-colors hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]" style={{ color: 'var(--lux-muted, #756B61)' }}>{t('footer.privacyPolicy', 'سياسة الخصوصية')}</Link>
              <span className="text-xs" style={{ color: 'var(--lux-muted, #756B61)' }}>·</span>
              <Link to={`/s/${slug}/policies/shipping`} className="text-xs font-light transition-colors hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]" style={{ color: 'var(--lux-muted, #756B61)' }}>{t('footer.shippingPolicy', 'سياسة الشحن')}</Link>
              <span className="text-xs" style={{ color: 'var(--lux-muted, #756B61)' }}>·</span>
              <Link to={`/s/${slug}/policies/returns`} className="text-xs font-light transition-colors hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]" style={{ color: 'var(--lux-muted, #756B61)' }}>{t('footer.returnPolicy', 'سياسة الاسترجاع')}</Link>
            </nav>
          </div>

          <div className="flex flex-col items-center md:items-end gap-1">
            <p className="text-xs font-light" style={{ color: 'var(--lux-muted, #756B61)' }}>
              &copy; {new Date().getFullYear()} {store.name} —{' '}
              <Link
                to="/signup"
                className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)] rounded-sm"
                style={{ color: 'var(--lux-primary, #B88A3D)' }}
                aria-label={t('footer.poweredBy', 'هاء متاجر') + ' — ' + t('store.buildYourStore', 'ابنِ متجرك')}
              >
                {t('footer.poweredBy', 'هاء متاجر')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
