/**
 * Nav — sticky top navigation for the landing page
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor).
 * Brand: Haa logo + main nav links + login/signup CTAs.
 */
import { Link } from 'react-router-dom';
import { useState as useReactState } from 'react';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; required to pass icon as prop to <Icon>
import { ArrowLeft } from 'lucide-react';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';
import { StoreContainer, Icon } from '@/components/ui';
import type { TFn } from './types';

export function Nav({ t }: { t: TFn }) {
  const [logoError, setLogoError] = useReactState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-white/60 backdrop-blur-2xl backdrop-saturate-150">
      <StoreContainer className="flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label={t('store.logo', 'الرئيسية')} className="flex items-center gap-2.5">
          {showLogo ? (
            <img
              key={platformLogoUrl}
              src={platformLogoUrl!}
              alt="Haa"
              className="platform-logo h-12 w-auto"
              onError={() => setLogoError(true)}
            />
          ) : (
            <img src="/assets/haa-logo.png" alt="Haa" className="h-12 w-auto" />
          )}
        </Link>

        <nav aria-label={t('store.mainNav', 'التنقل الرئيسي')} className="hidden items-center gap-1 md:flex">
          {[
            { label: t('landing.nav.features', 'الميزات'), href: '#features' },
            { label: t('landing.nav.howItWorks', 'كيف نعمل'), href: '#how' },
            { label: 'تعرف علينا', href: '#about' },
            { label: t('landing.nav.pricing', 'الأسعار'), href: '#pricing' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="min-h-[44px] rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {label}
            </a>
          ))}
          <Link
            to="/marketplace"
            className="min-h-[44px] rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary"
          >
            السوق
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login?ref=nav"
            className="hidden min-h-[40px] items-center rounded-full px-3 text-[15px] font-medium text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
          >
            {t('landing.nav.login', 'تسجيل الدخول')}
          </Link>
          <Link
            to="/signup?ref=nav"
            className="aurora-btn inline-flex h-10 min-h-[40px] items-center gap-2 rounded-full bg-text-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 hover:!text-white"
          >
            {t('landing.nav.signup', 'سجّل كتاجر')}
            <Icon icon={ArrowLeft} size="xs" />
          </Link>
        </div>
      </StoreContainer>
    </header>
  );
}
