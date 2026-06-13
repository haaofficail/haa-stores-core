import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { Mail, Phone } from 'lucide-react';
import {
  PaymentLogoImg,
  getPaymentLogosByCategory,
} from '@/components/ui/trust-badges';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { type ThemeConfig } from '@haa/storefront-themes';
import { Icon } from '@/components/ui/icon';

type SocialLinks = Partial<ThemeConfig['socialLinks']>;

export default function Footer() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { store, loading } = useStore();
  const theme = useStorefrontTheme();

  if (loading || !store) {
    return (
      <footer className="bg-surface-1 mt-auto border-t border-border">
        <div className="container-store py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-surface-2 animate-pulse" />
                <div className="h-5 w-24 bg-surface-2 rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-surface-2 rounded animate-pulse" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-20 bg-surface-2 rounded animate-pulse" />
                <div className="space-y-2">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-3 w-24 bg-surface-2 rounded animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </footer>
    );
  }

  const footerConfig = theme?.footer;
  const socialLinks: SocialLinks = theme?.socialLinks ?? {};
  const showPaymentLogos = footerConfig?.showPaymentLogos !== false;
  const showSocialLinks = footerConfig?.showSocialLinks !== false;
  const showNewsletter = footerConfig?.showNewsletter !== false;
  const companyDescription = footerConfig?.companyDescription?.trim() || store.description;
  const whatsappContact = store.contactChannels?.whatsapp;
  const visibleSocialLinks = [
    { key: 'instagram', label: 'Instagram', href: socialLinks.instagram },
    { key: 'twitter', label: 'X', href: socialLinks.twitter },
    { key: 'tiktok', label: 'TikTok', href: socialLinks.tiktok },
    { key: 'snapchat', label: 'Snapchat', href: socialLinks.snapchat },
    { key: 'whatsapp', label: 'WhatsApp', href: whatsappContact?.enabled ? whatsappContact.waMeLink : socialLinks.whatsapp },
  ].filter((link): link is { key: string; label: string; href: string } => typeof link.href === 'string' && link.href.trim().length > 0);
  const contactEmail = store.contactChannels?.email || store.email || 'info@haasoft.com';

  return (
    <>
      {showPaymentLogos && (
        <div className="bg-surface-1">
          <div className="container-store py-3">
            <div className="flex items-center justify-center gap-x-4 gap-y-1.5 overflow-x-auto">
              {getPaymentLogosByCategory('LOCAL_PAYMENT_METHOD').map(logo => (
                <PaymentLogoImg key={logo.id} logo={logo} size="h-3" />
              ))}
              {getPaymentLogosByCategory('CARD_NETWORK').map(logo => (
                <PaymentLogoImg key={logo.id} logo={logo} size="h-3" />
              ))}
              {getPaymentLogosByCategory('DIGITAL_WALLET').map(logo => (
                <PaymentLogoImg key={logo.id} logo={logo} size="h-3" />
              ))}
              {getPaymentLogosByCategory('BNPL_PROVIDER').map(logo => (
                <PaymentLogoImg key={logo.id} logo={logo} size="h-3" />
              ))}
            </div>
          </div>
        </div>
      )}
      <footer className="bg-surface-1 mt-auto">
      <div className="container-store py-4 sm:py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8">

          {/* Col 1: Logo + About + Newsletter — 5 cols on lg */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-sm">
                  {store.name.charAt(0)}
                </div>
              )}
              <span className="font-bold text-base text-text-primary">{store.name}</span>
            </div>
            {companyDescription && (
              <p className="text-sm text-text-secondary leading-relaxed">{companyDescription}</p>
            )}
            {showNewsletter && (
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  className="min-h-[40px] flex-1 rounded-lg border border-border bg-surface-1 px-3 text-sm outline-none focus:border-primary-500"
                  placeholder={t('footer.emailPlaceholder', 'البريد الإلكتروني')}
                />
                <button type="submit" className="min-h-[40px] rounded-lg bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 shrink-0">
                  {t('common.subscribe', 'اشتراك')}
                </button>
              </form>
            )}
          </div>

          {/* Col 2: Links combined (Quick + Customer Service) — 3 cols on lg */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-text-primary mb-3 text-sm">{t('footer.quickLinks')}</h4>
                <ul className="space-y-2">
                  <li><Link to={`/s/${slug}`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('store.home')}</Link></li>
                  <li><Link to={`/s/${slug}/c/all`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('store.categories')}</Link></li>
                  <li><Link to={`/s/${slug}/about`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('store.about')}</Link></li>
                  <li><Link to={`/s/${slug}/contact`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('store.contact')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-text-primary mb-3 text-sm">{t('footer.customerService')}</h4>
                <ul className="space-y-2">
                  <li><Link to={`/s/${slug}/track`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('store.trackOrder')}</Link></li>
                  <li><Link to={`/s/${slug}/policies/returns`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('footer.returnPolicy')}</Link></li>
                  <li><Link to={`/s/${slug}/policies/privacy`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('footer.privacyPolicy')}</Link></li>
                  <li><Link to={`/s/${slug}/policies/terms`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors">{t('footer.termsOfService')}</Link></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Col 3: Contact + Social + Payments — 4 cols on lg */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <h4 className="font-semibold text-text-primary mb-3 text-sm">{t('store.contact')}</h4>
              <ul className="space-y-2">
                <li className="flex items-center gap-2.5">
                  <Icon icon={Mail} size="xs" className="text-text-tertiary" />
                  <a href={`mailto:${contactEmail}`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors" dir="ltr">{contactEmail}</a>
                </li>
                {store.phone && (
                  <li className="flex items-center gap-2.5">
                    <Icon icon={Phone} size="xs" className="text-text-tertiary" />
                    <a href={`tel:${store.phone}`} className="text-sm text-text-secondary hover:text-primary-600 transition-colors" dir="ltr">{store.phone}</a>
                  </li>
                )}
                {whatsappContact?.enabled && whatsappContact.waMeLink && (
                  <li className="flex items-center gap-2.5">
                    <Icon icon={Phone} size="xs" className="text-text-tertiary" />
                    <a href={whatsappContact.waMeLink} target="_blank" rel="noreferrer" className="text-sm text-text-secondary hover:text-primary-600 transition-colors" dir="ltr">WhatsApp</a>
                  </li>
                )}
              </ul>
              {showSocialLinks && visibleSocialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {visibleSocialLinks.map((link) => (
                    <a key={link.key} href={link.href} target="_blank" rel="noreferrer"
                      className="text-xs px-2.5 py-1 rounded-full bg-surface-2 text-text-secondary hover:text-primary-600 transition-colors">
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar: copyright + legal links */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-2">
            <Link to={`/s/${slug}/policies/terms`} className="text-xs text-text-tertiary hover:text-primary-600 transition-colors">شروط الاستخدام</Link>
            <span className="hidden sm:inline text-text-tertiary">&middot;</span>
            <Link to={`/s/${slug}/policies/privacy`} className="text-xs text-text-tertiary hover:text-primary-600 transition-colors">سياسة الخصوصية</Link>
            <span className="hidden sm:inline text-text-tertiary">&middot;</span>
            <Link to={`/s/${slug}/policies/shipping`} className="text-xs text-text-tertiary hover:text-primary-600 transition-colors">سياسة الشحن</Link>
            <span className="hidden sm:inline text-text-tertiary">&middot;</span>
            <Link to={`/s/${slug}/policies/returns`} className="text-xs text-text-tertiary hover:text-primary-600 transition-colors">سياسة الاسترجاع</Link>
          </div>
          <p className="text-xs text-text-tertiary text-center">
            &copy; {new Date().getFullYear()} {store.name}. {t('footer.copyright')}
            <span className="mx-1.5">&middot;</span>
            <span>{t('footer.poweredBy', 'مدعوم بواسطة هاء متاجر')}</span>
          </p>
        </div>
      </div>
    </footer>
    </>
  );
}
