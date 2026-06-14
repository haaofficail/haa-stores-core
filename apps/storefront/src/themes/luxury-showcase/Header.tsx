import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Menu, X, Search, Package } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { useSharedCart } from '@/hooks/CartContext';
import { LUXURY_THEME_CLASS, luxuryCSSVars } from './luxuryTokens';

const ICON_STROKE = 1.25;

export default function LuxuryShowcaseHeader() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading, error } = useStore();
  const theme = useStorefrontTheme();
  const { itemCount } = useSharedCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  if (error) {
    return (
      <header className="sticky top-0 z-sticky bg-[var(--surface-1)] border-b border-[var(--border)]">
        <div className="max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[56px] flex items-center justify-center">
            <p className="text-sm font-light text-[var(--text-tertiary)]">{t('store.error', 'عذراً، حدث خطأ في تحميل المتجر')}</p>
          </div>
        </div>
      </header>
    );
  }

  if (storeLoading || !store) {
    return (
      <header className="sticky top-0 z-sticky bg-[var(--surface-1)] border-b border-[var(--border)]">
        <div className="max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[56px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-[var(--border)] animate-pulse rounded-sm" />
              <div className="h-4 w-24 bg-[var(--border)] animate-pulse rounded hidden sm:block" />
            </div>
            <div className="hidden lg:flex items-center gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-3 w-14 bg-[var(--border)] animate-pulse mx-1 rounded" />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 bg-[var(--border)] animate-pulse rounded-sm" />
              <div className="h-9 w-9 bg-[var(--border)] animate-pulse rounded-sm" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
    { to: `/s/${slug}`, label: t('store.home') },
    { to: `/s/${slug}/c/all`, label: t('store.allCategories') },
    { to: `/s/${slug}/c/all`, label: t('store.categories', 'التصنيفات') },
    { to: `/s/${slug}/about`, label: t('store.about') },
    { to: `/s/${slug}/contact`, label: t('store.contact') },
    { to: `/s/${slug}/support`, label: t('support.title', 'الدعم الفني') },
    { to: `/s/${slug}/support/kb`, label: t('support.kb.title', 'المعرفة والمساعدة') },
  ];
  const announcementText = theme?.header?.announcementText || t('home.announcement', '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/s/${slug}/c/all?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setMenuOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <div className={LUXURY_THEME_CLASS} style={luxuryCSSVars as React.CSSProperties}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--text-primary)] focus:text-white focus:text-sm focus:font-medium"
        style={{ insetInlineStart: '0.5rem' }}
      >
        {t('store.skipToContent', 'تخطى إلى المحتوى')}
      </a>

      {announcementText && (
        <div className="text-center py-1 text-[10px] font-light tracking-wider leading-relaxed bg-[var(--surface-2)] text-[var(--text-secondary)]">
          <div className="max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8">
            {announcementText}
          </div>
        </div>
      )}

      <header className="sticky top-0 z-sticky bg-[var(--surface-1)] border-b border-[var(--border)]">
        <div className="max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[56px] flex items-center justify-between gap-3">
            <Link to={`/s/${slug}`} className="flex items-center min-w-0 gap-2 shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] rounded">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.name} className="h-7 w-7 object-contain shrink-0" />
              ) : null}
              <span className="text-xs md:text-sm font-light text-[var(--text-primary)] tracking-widest truncate uppercase">
                {store.name}
              </span>
              {store.isDemo && (
                <span className="text-[9px] font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-sm px-1.5 py-0.5 leading-none tracking-wider whitespace-nowrap">
                  {t('store.demo', 'تجريبي')}
                </span>
              )}
            </Link>

            <nav
              className="hidden lg:flex items-center justify-center gap-0.5 flex-1"
              aria-label={t('store.mainNav', 'التنقل الرئيسي')}
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="min-h-[36px] inline-flex items-center px-2.5 text-[11px] font-light text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-wider uppercase transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-0.5 shrink-0">
              {searchOpen ? (
                <form onSubmit={handleSearch} className="hidden md:flex items-center">
                  <div className="flex min-h-[36px] items-center border border-[var(--border)] bg-[var(--surface-2)]">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t('store.search')}
                      className="w-32 lg:w-36 px-2.5 py-1.5 text-[11px] bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                      onBlur={() => !searchQuery && setSearchOpen(false)}
                      aria-label={t('store.search', 'بحث')}
                    />
                    <button
                      type="submit"
                      className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                      aria-label={t('store.search', 'بحث')}
                    >
                      <Search className="w-3 h-3" strokeWidth={ICON_STROKE} />
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] rounded"
                  aria-label={t('store.openSearch', 'فتح البحث')}
                >
                  <Search className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
                </button>
              )}
              <Link
                to={`/s/${slug}/track`}
                className="hidden sm:inline-flex min-w-[40px] min-h-[40px] items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                title={t('store.trackOrder')}
                aria-label={t('store.trackOrder', 'تتبع الطلب')}
              >
                <Package className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
              </Link>
              <Link
                to={`/s/${slug}/cart`}
                className="relative min-w-[40px] min-h-[40px] inline-flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                aria-label={t('store.cart', 'سلة التسوق')}
              >
                <ShoppingCart className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
                {itemCount > 0 && (
                  <span
                    className="absolute -top-0.5 -start-0.5 min-w-[13px] h-[13px] rounded-full flex items-center justify-center text-[9px] font-medium text-[var(--surface-1)] bg-[var(--text-primary)]"
                    style={{ padding: '0 2px' }}
                  >
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Link>
              <button
                className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={menuOpen ? t('store.closeMenu', 'إغلاق القائمة') : t('store.openMenu', 'فتح القائمة')}
              >
                {menuOpen ? (
                  <X className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
                ) : (
                  <Menu className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
                )}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-[var(--border)] bg-[var(--surface-1)]">
            <div className="max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <form onSubmit={handleSearch} className="mb-3 md:hidden">
                <div className="flex items-center border border-[var(--border)] bg-[var(--surface-2)]">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('store.search')}
                    className="flex-1 px-3 py-2.5 text-xs bg-transparent outline-none text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    aria-label={t('store.search', 'بحث')}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label={t('store.search', 'بحث')}
                  >
                    <Search className="w-3.5 h-3.5" strokeWidth={ICON_STROKE} />
                  </button>
                </div>
              </form>
              <nav className="flex flex-col gap-1" aria-label={t('store.mobileNav', 'التنقل')}>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="px-3 py-2.5 text-sm font-light text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to={`/s/${slug}/track`}
                  className="px-3 py-2.5 text-sm font-light text-[var(--text-secondary)] hover:text-[var(--text-primary)] tracking-wider uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)] sm:hidden"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('store.trackOrder')}
                </Link>
              </nav>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
