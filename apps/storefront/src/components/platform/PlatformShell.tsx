/**
 * PlatformShell — shared nav + footer for all platform pages
 * (About, Pricing, Support, Legal, …)
 *
 * Uses the exact same lp-nav / lp-foot classes and StoreButton as
 * LandingPage.tsx so every platform page looks like one product.
 */
import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PLATFORM_LEGAL_ENTITY } from '@haa/shared';
import { StoreButton } from '@/components/ui';
import { merchantDashboardUrl } from '@/lib/merchant';
import '@/landing/landing.css';

const NAV_LINKS = [
  { label: 'المزايا',   href: '/#features' },
  { label: 'الأسعار',   href: '/pricing',    isRoute: true },
  { label: 'من نحن',    href: '/about',      isRoute: true },
  { label: 'الدعم',     href: '/support',    isRoute: true },
  { label: 'السوق',     href: '/marketplace', isRoute: true },
];

function PlatformNav() {
  const { pathname } = useLocation();

  return (
    <nav className="lp-nav" dir="rtl">
      <div className="lp-container lp-nav__in">
        <Link to="/" className="lp-logo">
          <img src="/assets/haa-stores-logo.png" alt="هاء متاجر" />
        </Link>

        <div className="lp-nav__links">
          {NAV_LINKS.map(({ label, href, isRoute }) =>
            isRoute ? (
              <Link
                key={href}
                to={href}
                style={pathname === href ? { color: 'var(--color-primary-600)', background: 'var(--surface-2)' } : undefined}
              >
                {label}
              </Link>
            ) : (
              <a key={href} href={href}>{label}</a>
            )
          )}
        </div>

        <div className="lp-nav__cta">
          <StoreButton variant="ghost" size="sm" href={merchantDashboardUrl('/login')}>دخول</StoreButton>
          <StoreButton size="sm" href="/signup">ابدأ مجاناً</StoreButton>
        </div>
      </div>
    </nav>
  );
}

function PlatformFooter() {
  return (
    <footer className="lp-foot" dir="rtl">
      <div className="lp-container">
        <div className="lp-foot__grid">
          <div className="lp-foot__brand">
            <Link to="/" className="lp-logo">
              <img src="/assets/haa-stores-logo.png" alt="هاء متاجر" style={{ height: 80 }} />
            </Link>
            <p>منصة المتاجر السعودية الأسهل والأوضح ماليًا وتشغيليًا. أطلق متجرك وابدأ البيع اليوم.</p>
          </div>
          <div className="lp-foot__col">
            <h4>المنتج</h4>
            <a href="/#features">المزايا</a>
            <Link to="/pricing">الأسعار</Link>
            <Link to="/marketplace">السوق</Link>
          </div>
          <div className="lp-foot__col">
            <h4>الشركة</h4>
            <Link to="/about">من نحن</Link>
            <a href="mailto:hello@haastores.com">تواصل معنا</a>
          </div>
          <div className="lp-foot__col">
            <h4>الدعم</h4>
            <Link to="/support">مركز المساعدة</Link>
            <Link to="/legal/privacy">سياسة الخصوصية</Link>
            <Link to="/legal/terms">الشروط والأحكام</Link>
          </div>
        </div>

        <div className="lp-foot__bottom">
          <div className="lp-saudi-made">
            <img src="/assets/saudi-map.png" alt="خريطة السعودية" />
            <div className="lp-saudi-made__txt">
              <b>صنع في السعودية</b>
              <span>منصة سعودية بالكامل</span>
            </div>
          </div>
          <div className="lp-foot__copy">
            © {new Date().getFullYear()} هاء متاجر · جميع الحقوق محفوظة
          </div>
        </div>

        <p className="lp-legal-entity" dir="rtl">
          {PLATFORM_LEGAL_ENTITY.displayLine}
        </p>
      </div>
    </footer>
  );
}

export function PlatformShell({ children }: { children: ReactNode }) {
  return (
    <div className="lp-page" dir="rtl" lang="ar">
      <PlatformNav />
      <div>{children}</div>
      <PlatformFooter />
    </div>
  );
}
