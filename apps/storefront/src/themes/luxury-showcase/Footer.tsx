import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import {
  PaymentLogoImg,
  getPaymentLogosByCategory,
} from '@/components/ui/trust-badges';
import { useStorefrontTheme } from '@/hooks/useTheme';
export default function LuxuryShowcaseFooter() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { store, loading } = useStore();
  const theme = useStorefrontTheme();

  if (loading || !store) {
    return (
      <footer className="mt-auto border-t border-[#e8ded4] bg-[#faf8f6]">
        <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 py-4 sm:px-6 lg:py-5">
          <div className="flex flex-wrap gap-3">
            <div className="h-3 w-24 animate-pulse rounded bg-[#e8ded4]" />
            <div className="h-3 w-32 animate-pulse rounded bg-[#e8ded4]" />
            <div className="h-3 w-28 animate-pulse rounded bg-[#e8ded4]" />
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
    <footer className="mt-auto border-t border-[#e8ded4] bg-[#faf8f6]">
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 py-4 sm:px-6 lg:py-5">
        {/* Row 1: Store name right (يمين), links left */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="min-w-0 max-w-xs">
            <p className="text-sm font-light tracking-wider text-[#1a1a1a]">{store.name}</p>
            {companyDescription ? (
              <p className="mt-0.5 line-clamp-1 text-xs font-light text-[#8a7e72]">{companyDescription}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link to={`/s/${slug}`} className="text-xs font-light text-[#6b635b] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('store.home')}</Link>
            <Link to={`/s/${slug}/c/all`} className="text-xs font-light text-[#6b635b] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('store.categories')}</Link>
            <Link to={`/s/${slug}/about`} className="text-xs font-light text-[#6b635b] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('store.about')}</Link>
            <Link to={`/s/${slug}/track`} className="text-xs font-light text-[#6b635b] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('store.trackOrder')}</Link>
            <Link to={`/s/${slug}/contact`} className="text-xs font-light text-[#6b635b] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('store.contact')}</Link>
            <Link to={`/s/${slug}/support`} className="text-xs font-light text-[#6b635b] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('support.title', 'الدعم الفني')}</Link>
          </div>
        </div>

        {/* Row 2: Bottom bar with policies + payment logos + copyright */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#e8ded4]/50 pt-2.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link to={`/s/${slug}/policies/terms`} className="text-[11px] font-light text-[#8a7e72] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('footer.termsOfService', 'شروط الاستخدام')}</Link>
            <span className="text-[10px] text-[#c5b5a5]">·</span>
            <Link to={`/s/${slug}/policies/privacy`} className="text-[11px] font-light text-[#8a7e72] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('footer.privacyPolicy', 'سياسة الخصوصية')}</Link>
            <span className="text-[10px] text-[#c5b5a5]">·</span>
            <Link to={`/s/${slug}/policies/shipping`} className="text-[11px] font-light text-[#8a7e72] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('footer.shippingPolicy', 'سياسة الشحن')}</Link>
            <span className="text-[10px] text-[#c5b5a5]">·</span>
            <Link to={`/s/${slug}/policies/returns`} className="text-[11px] font-light text-[#8a7e72] transition-colors hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">{t('footer.returnPolicy', 'سياسة الاسترجاع')}</Link>

            {showPaymentLogos ? (
              <>
                <span className="text-[10px] text-[#c5b5a5]">·</span>
                {getPaymentLogosByCategory('LOCAL_PAYMENT_METHOD').map(logo => (
                  <PaymentLogoImg key={logo.id} logo={logo} size="h-3.5" />
                ))}
                {getPaymentLogosByCategory('CARD_NETWORK').map(logo => (
                  <PaymentLogoImg key={logo.id} logo={logo} size="h-3.5" />
                ))}
                {getPaymentLogosByCategory('DIGITAL_WALLET').map(logo => (
                  <PaymentLogoImg key={logo.id} logo={logo} size="h-3.5" />
                ))}
                {getPaymentLogosByCategory('BNPL_PROVIDER').map(logo => (
                  <PaymentLogoImg key={logo.id} logo={logo} size="h-3.5" />
                ))}
              </>
            ) : null}
          </div>
          <p className="text-[11px] font-light text-[#8a7e72]">
            &copy; {new Date().getFullYear()} {store.name} — {t('footer.poweredBy', 'هاء متاجر')}
          </p>
        </div>
      </div>
    </footer>
  );
}
