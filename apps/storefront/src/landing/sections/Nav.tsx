/**
 * Nav — sticky top navigation for the landing page
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor).
 * Brand: Haa logo + main nav links + login/signup CTAs.
 * Mobile: hamburger sheet with full nav links.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useState as useReactState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- TODO: P1-#5 migration; required to pass icon as prop to <Icon>
import { ArrowLeft, Menu, X as XIcon } from 'lucide-react';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';
import { StoreContainer, Icon } from '@/components/ui';
import type { TFn } from './types';

const NAV_LINKS = (t: TFn) => [
  { label: t('landing.nav.features', 'الميزات'), href: '#features' },
  { label: t('landing.nav.howItWorks', 'كيف نعمل'), href: '#how' },
  { label: 'تعرف علينا', href: '#about' },
  { label: t('landing.nav.pricing', 'الأسعار'), href: '#pricing' },
  { label: 'السوق', href: '/marketplace', isLink: true },
];

export function Nav({ t, authMode = false }: { t: TFn; authMode?: boolean }) {
  const [logoError, setLogoError] = useReactState(false);
  const [mobileOpen, setMobileOpen] = useReactState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

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

        {/* Desktop nav — hidden in auth mode */}
        {!authMode && (
          <nav aria-label={t('store.mainNav', 'التنقل الرئيسي')} className="hidden items-center gap-1 md:flex">
            {NAV_LINKS(t).map(({ label, href, isLink }) =>
              isLink ? (
                <Link
                  key={href}
                  to={href}
                  className="min-h-[44px] rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={href}
                  href={href}
                  className="min-h-[44px] rounded-full px-3 text-sm font-medium text-text-secondary transition-colors hover:bg-white/60 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {label}
                </a>
              )
            )}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {authMode ? (
            <Link
              to="/"
              className="aurora-btn-primary inline-flex h-11 min-h-[44px] items-center gap-2 rounded-full px-5 text-sm font-semibold text-white transition-all hover:!text-white"
            >
              الرئيسية
              <ArrowLeft className="h-3.5 w-3.5 rotate-180" aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link
                to="/signup?ref=nav"
                className="aurora-btn inline-flex h-11 min-h-[44px] items-center gap-2 rounded-full bg-text-primary px-5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/30 hover:!text-white"
              >
                {t('landing.nav.signup', 'سجّل كتاجر')}
                <Icon icon={ArrowLeft} size="xs" aria-hidden="true" />
              </Link>

              {/* Mobile hamburger */}
              <button
                type="button"
                aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                aria-expanded={mobileOpen}
                aria-controls="mobile-nav"
                onClick={() => setMobileOpen((v) => !v)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/50 text-text-primary backdrop-blur-sm transition-colors hover:bg-white/80 md:hidden"
              >
                {mobileOpen ? <XIcon className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </button>
            </>
          )}
        </div>
      </StoreContainer>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm motion-reduce:backdrop-blur-none md:hidden"
            aria-hidden="true"
            onClick={closeMobile}
          />
          <nav
            id="mobile-nav"
            aria-label={t('store.mainNav', 'التنقل الرئيسي')}
            className="absolute inset-x-0 top-full z-50 border-b border-white/10 bg-white/95 pb-4 pt-2 shadow-xl backdrop-blur-2xl md:hidden"
          >
            <StoreContainer>
              <ul className="flex flex-col gap-1" role="list">
                {NAV_LINKS(t).map(({ label, href, isLink }) => (
                  <li key={href}>
                    {isLink ? (
                      <Link
                        to={href}
                        onClick={closeMobile}
                        className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium text-text-secondary transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        onClick={closeMobile}
                        className="flex min-h-[48px] items-center rounded-xl px-4 text-base font-medium text-text-secondary transition-colors hover:bg-primary-50 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </StoreContainer>
          </nav>
        </>
      )}
    </header>
  );
}
