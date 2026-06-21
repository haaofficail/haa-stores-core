import { Link, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingCart, Menu, X, Search, Package, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/hooks/useStore';
import { useSharedCart } from '@/hooks/CartContext';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/ui/icon';
import { StoreIconButton } from '@/components/ui';
import { tracker } from '@/lib/tracker';

export default function Header() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading, error } = useStore();
  const { itemCount } = useSharedCart();
  const theme = useStorefrontTheme();
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

  if (storeLoading || error || !store) {
    return (
      <header className="sticky top-0 z-sticky backdrop-blur-xl border-b border-border" style={{ backgroundColor: 'var(--header-background)', color: 'var(--header-text)' }}>
        <div className="container-store">
          <div className="min-h-[56px] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-surface-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-5 w-24 bg-surface-2 rounded animate-pulse motion-reduce:animate-none hidden sm:block" />
            </div>
            <div className="hidden lg:flex items-center gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 w-16 bg-surface-2 rounded animate-pulse motion-reduce:animate-none mx-1" />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-surface-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-10 w-10 rounded-lg bg-surface-2 animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  const navLinks = [
    { to: `/s/${slug}`, label: t('store.home') },
    { to: `/s/${slug}/c/all`, label: t('store.allCategories') },
    { to: `/s/${slug}/about`, label: t('store.about') },
    { to: `/s/${slug}/contact`, label: t('store.contact') },
  ];
  const headerConfig = theme?.header;
  const showAnnouncementBar = headerConfig?.showAnnouncementBar !== false;
  const announcementText = headerConfig?.announcementText?.trim() || t('home.announcement');
  const stickyHeader = headerConfig?.stickyHeader !== false;
  const showSearch = headerConfig?.showSearch !== false;
  const showCart = headerConfig?.showCart !== false;
  const showAccount = headerConfig?.showAccount !== false;

  const isDemo = store?.isDemo === true;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (slug) {
        tracker.trackSearch(slug, searchQuery.trim());
      }
      navigate(`/s/${slug}/c/all?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-xl focus:text-sm focus:font-semibold"
        style={{ insetInlineStart: '0.5rem' }}
      >
        {t('store.skipToContent', 'تخطى إلى المحتوى')}
      </a>
      {isDemo && (
        <div className="bg-warning-soft text-warning text-center py-1 text-xs sm:text-xs font-medium border-b border-warning-soft">
          <div className="container-store flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3 h-3 inline-block" />
            <span>متجر تجريبي — جميع المنتجات لأغراض العرض والتجربة</span>
          </div>
        </div>
      )}
      <header className={`${stickyHeader ? 'sticky top-0' : 'relative'} z-sticky border-b border-border/70 backdrop-blur-xl`} style={{ backgroundColor: 'var(--header-background)', color: 'var(--header-text)' }}>
      {showAnnouncementBar && announcementText && (
        <div className="text-center py-1.5 sm:py-2 text-xs sm:text-xs font-medium leading-relaxed" style={{ backgroundColor: 'var(--announcement-background)', color: 'var(--announcement-text)' }}>
          <div className="container-store">
            {announcementText}
          </div>
        </div>
      )}
      <div className="container-store">
        <div className="min-h-[64px] grid grid-cols-[auto_1fr_auto] items-center" style={{ gap: 'var(--space-4)' }}>
          <Link to={`/s/${slug}`} className="flex min-w-0 items-center shrink-0" style={{ gap: 'var(--space-3)' }}>
            {store.logoUrl ? (
              <img src={store.logoUrl} alt={store.name} className="store-logo" />
            ) : (
              <div className="h-9 w-9 flex items-center justify-center text-white font-bold text-sm bg-primary-500 rounded-lg shrink-0">
                {store.name.charAt(0)}
              </div>
            )}
            <span className="font-bold text-base lg:text-lg hidden sm:block truncate">{store.name}</span>
          </Link>

          <nav className="hidden lg:flex items-center justify-center" style={{ gap: 'var(--space-1)' }} aria-label={t('store.mainNav', 'التنقل الرئيسي')}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="min-h-[44px] inline-flex items-center px-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-xl transition-colors motion-reduce:transition-none"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end" style={{ gap: 'var(--space-1)' }}>
            {showSearch && (
            <form onSubmit={handleSearch} className="hidden md:flex items-center">
              {searchOpen ? (
                <div className="flex min-h-[44px] items-center bg-surface-2 border border-border rounded-xl overflow-hidden">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('store.search')}
                    className="w-48 px-3 py-2 text-sm bg-transparent outline-none"
                    onBlur={() => !searchQuery && setSearchOpen(false)}
                    aria-label={t('store.search', 'بحث')}
                  />
                  <StoreIconButton type="submit" aria-label={t('store.search', 'بحث')} className="rounded-none">
                    <Icon icon={Search} size="sm" />
                  </StoreIconButton>
                </div>
              ) : (
                <StoreIconButton
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label={t('store.openSearch', 'فتح البحث')}
                >
                  <Icon icon={Search} size="sm" />
                </StoreIconButton>
              )}
            </form>
            )}

            {showAccount && (
            <Link
              to={`/s/${slug}/track`}
              className="hidden sm:inline-flex min-w-[44px] min-h-[44px] items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-xl transition-colors motion-reduce:transition-none"
              title={t('store.trackOrder')}
              aria-label={t('store.trackOrder', 'تتبع الطلب')}
            >
              <Icon icon={Package} size="sm" />
            </Link>
            )}

            {showCart && (
            <Link
              to={`/s/${slug}/cart`}
              className="relative min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-xl transition-colors motion-reduce:transition-none"
              aria-label={t('store.cart', 'سلة التسوق')}
            >
              <Icon icon={ShoppingCart} size="sm" />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -start-0.5 bg-primary-500 text-white text-xs font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-1">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
            )}

            <StoreIconButton
              className="lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? t('store.closeMenu', 'إغلاق القائمة') : t('store.openMenu', 'فتح القائمة')}
            >
              <Icon icon={menuOpen ? X : Menu} size="sm" />
            </StoreIconButton>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t bg-surface-1 animate-fade-in motion-reduce:animate-none">
          <div className="container-store py-3">
            {showSearch && (
            <form onSubmit={handleSearch} className="mb-3 md:hidden">
              <div className="flex items-center bg-surface-2 rounded-lg border border-border-hover overflow-hidden">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('store.search')}
                  className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none"
                  aria-label={t('store.search', 'بحث')}
                />
                <button type="submit" className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary" aria-label={t('store.search', 'بحث')}>
                  <Icon icon={Search} size="md" />
                </button>
              </div>
            </form>
            )}
            <nav className="flex flex-col gap-1" aria-label={t('store.mobileNav', 'التنقل')}>
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 hover:bg-black/5 transition-all motion-reduce:transition-none"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {showAccount && (
              <Link
                to={`/s/${slug}/track`}
                className="px-3 py-2.5 rounded-lg text-sm font-medium opacity-70 hover:opacity-100 hover:bg-black/5 transition-all motion-reduce:transition-none sm:hidden"
                onClick={() => setMenuOpen(false)}
              >
                {t('store.trackOrder')}
              </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
    </>
  );
}
