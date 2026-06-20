import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- icons passed through <Icon> wrapper
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
      <footer className="bg-white mt-auto border-t border-gray-100">
        <div className="container-store py-4 sm:py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1 space-y-4">
              <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-gray-100 animate-pulse" /><div className="h-5 w-24 bg-gray-100 rounded animate-pulse" /></div>
              <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                <div className="space-y-2">{[1, 2, 3].map((j) => (<div key={j} className="h-3 w-24 bg-gray-100 rounded animate-pulse" />))}</div>
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
  const companyDescription = footerConfig?.companyDescription?.trim() || store.description;
  const whatsappContact = store.contactChannels?.whatsapp;
  const visibleSocialLinks = [
    { key: 'instagram', label: 'Instagram', href: socialLinks.instagram },
    { key: 'twitter', label: 'X', href: socialLinks.twitter },
    { key: 'tiktok', label: 'TikTok', href: socialLinks.tiktok },
    { key: 'snapchat', label: 'Snapchat', href: socialLinks.snapchat },
    { key: 'whatsapp', label: 'WhatsApp', href: whatsappContact?.enabled ? whatsappContact.waMeLink : socialLinks.whatsapp },
  ].filter((link): link is { key: string; label: string; href: string } => typeof link.href === 'string' && link.href.trim().length > 0);
  const contactEmail = store.contactChannels?.email || store.email || 'info@haastores.com';

  return (
    <>
      {showPaymentLogos && (
        <div className="bg-white border-t border-gray-100">
          <div className="container-store py-2">
            <div className="flex items-center justify-center gap-x-3 gap-y-1 flex-wrap">
              {getPaymentLogosByCategory('LOCAL_PAYMENT_METHOD').map(logo => <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />)}
              {getPaymentLogosByCategory('CARD_NETWORK').map(logo => <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />)}
              {getPaymentLogosByCategory('DIGITAL_WALLET').map(logo => <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />)}
              {getPaymentLogosByCategory('BNPL_PROVIDER').map(logo => <PaymentLogoImg key={logo.id} logo={logo} size="h-2.5" />)}
            </div>
          </div>
        </div>
      )}
      <footer className="bg-white mt-auto border-t border-gray-100">
        <div className="container-store py-6 sm:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">

            {/* Col 1: Logo + About — 5 cols */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                {store.logoUrl ? (
                  <img src={store.logoUrl} alt={store.name} className="store-logo" />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-primary-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {store.name.charAt(0)}
                  </div>
                )}
                <span className="font-bold text-sm text-black">{store.name}</span>
              </div>
              {companyDescription && (
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">{companyDescription}</p>
              )}
            </div>

            {/* Col 2: Quick Links + Customer Service — 3 cols */}
            <div className="lg:col-span-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h4 className="font-bold text-black mb-2 text-sm">{t('footer.quickLinks')}</h4>
                  <ul className="space-y-1.5">
                    <li><Link to={`/s/${slug}`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('store.home')}</Link></li>
                    <li><Link to={`/s/${slug}/c/all`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('store.categories')}</Link></li>
                    <li><Link to={`/s/${slug}/about`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('store.about')}</Link></li>
                    <li><Link to={`/s/${slug}/contact`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('store.contact')}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-bold text-black mb-2 text-sm">{t('footer.customerService')}</h4>
                  <ul className="space-y-1.5">
                    <li><Link to={`/s/${slug}/track`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('store.trackOrder')}</Link></li>
                    <li><Link to={`/s/${slug}/policies/returns`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('footer.returnPolicy')}</Link></li>
                    <li><Link to={`/s/${slug}/policies/privacy`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('footer.privacyPolicy')}</Link></li>
                    <li><Link to={`/s/${slug}/policies/terms`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">{t('footer.termsOfService')}</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Col 3: Contact + Social — 4 cols */}
            <div className="lg:col-span-4 space-y-3">
              <h4 className="font-bold text-black mb-2 text-sm">{t('store.contact')}</h4>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <Icon icon={Mail} size="xs" className="text-gray-400" />
                  <a href={`mailto:${contactEmail}`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none" dir="ltr">{contactEmail}</a>
                </li>
                {store.phone && (
                  <li className="flex items-center gap-2">
                    <Icon icon={Phone} size="xs" className="text-gray-400" />
                    <a href={`tel:${store.phone}`} className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none" dir="ltr">{store.phone}</a>
                  </li>
                )}
                {whatsappContact?.enabled && whatsappContact.waMeLink && (
                  <li className="flex items-center gap-2">
                    <Icon icon={Phone} size="xs" className="text-gray-400" />
                    <a href={whatsappContact.waMeLink} target="_blank" rel="noreferrer" className="text-sm text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none" dir="ltr">WhatsApp</a>
                  </li>
                )}
              </ul>
              {showSocialLinks && visibleSocialLinks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {visibleSocialLinks.map((link) => (
                    <a key={link.key} href={link.href} target="_blank" rel="noreferrer"
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:text-primary-600 transition-colors motion-reduce:transition-none">
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center">
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