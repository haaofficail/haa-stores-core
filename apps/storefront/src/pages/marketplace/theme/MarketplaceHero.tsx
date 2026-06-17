import { Link } from 'react-router-dom';
import { useState } from 'react';
import { BadgeCheck, Building2, Menu, PackageSearch, Search, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react';
import { StoreInput } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';

export function MarketplaceHero({
  total,
  cartCount,
  searchInput,
  onSearchInputChange,
}: {
  total: number;
  cartCount: number;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <section className="relative bg-white border-b border-gray-100" aria-label="سوق هاء - الصفحة الرئيسية">
      {/* ── Top Header Bar ── */}
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 min-h-[56px] sm:min-h-[60px] lg:min-h-[64px]">
          <Link to="/marketplace" className="flex items-center gap-2.5 shrink-0">
            {showLogo ? (
              <img key={platformLogoUrl} src={platformLogoUrl!} alt="سوق هاء" className="platform-logo h-8 w-auto" onError={() => setLogoError(true)} />
            ) : (
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500 text-white">
                  <Icon icon={Building2} size="2xs" />
                </span>
                <span className="text-base lg:text-lg font-bold leading-none text-primary-500">سوق هاء</span>
              </>
            )}
          </Link>

          {/* Desktop Search */}
          <div className="hidden min-w-0 flex-1 items-center max-w-md overflow-hidden rounded-xl bg-primary-50 lg:flex">
            <div className="relative min-w-0 flex-1">
              <Icon icon={Search} size="xs" className="pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 text-gray-400" />
              <StoreInput value={searchInput} onChange={(e) => onSearchInputChange(e.target.value)} placeholder="ابحث عن منتجات، ماركات، أو متاجر..." className="min-h-[40px] border-0 bg-transparent pe-10 text-sm shadow-none focus-visible:ring-0" />
            </div>
            <button type="button" className="min-h-[44px] rounded-xl px-4 bg-primary-500 text-white hover:bg-primary-600 text-sm font-semibold transition-colors">
              بحث
            </button>
          </div>

          <div className="flex items-center gap-1 text-sm font-bold text-primary-600">
            <Link to="/marketplace/sellers" className="hidden hover:text-primary-500 sm:inline-flex px-2.5 py-1.5 rounded-xl transition-colors">المتاجر</Link>
            <Link to="/marketplace/orders" className="hidden hover:text-primary-500 sm:inline-flex px-2.5 py-1.5 rounded-xl transition-colors">تتبع الطلب</Link>

            <button
              type="button"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="lg:hidden inline-flex min-h-[44px] w-[44px] items-center justify-center rounded-xl text-primary-600 hover:bg-primary-50 transition-colors"
              aria-label="بحث"
            >
              <Icon icon={mobileSearchOpen ? X : Search} size="sm" />
            </button>

            <Link to="/marketplace/cart" className="relative inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-primary-500 px-3 text-white hover:bg-primary-600 transition-colors">
              <Icon icon={ShoppingBag} size="2xs" />
              <span className="hidden sm:inline text-xs">السلة ({cartCount})</span>
              <span className="sm:hidden text-xs">{cartCount}</span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex min-h-[44px] w-[44px] items-center justify-center rounded-xl text-primary-600 hover:bg-primary-50 transition-colors"
              aria-label="القائمة"
            >
              <Icon icon={mobileMenuOpen ? X : Menu} size="sm" />
            </button>
          </div>
        </div>

        {/* Mobile Search */}
        {mobileSearchOpen && (
          <div className="pb-3 lg:hidden">
            <div className="flex items-center overflow-hidden rounded-xl bg-primary-50">
              <div className="relative min-w-0 flex-1">
                <Icon icon={Search} size="sm" className="pointer-events-none absolute top-1/2 end-3 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(e) => onSearchInputChange(e.target.value)}
                  placeholder="ابحث عن منتجات..."
                  className="w-full min-h-[44px] border-0 bg-transparent pe-10 ps-10 text-sm outline-none"
                  aria-label="بحث"
                />
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="pb-3 lg:hidden">
            <nav className="flex flex-col gap-1 rounded-xl bg-primary-50 p-2" aria-label="قائمة الموبايل">
              <Link to="/marketplace/sellers" className="px-3 py-2.5 rounded-xl text-sm font-bold text-primary-600 hover:bg-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                المتاجر
              </Link>
              <Link to="/marketplace/orders" className="px-3 py-2.5 rounded-xl text-sm font-bold text-primary-600 hover:bg-white transition-colors" onClick={() => setMobileMenuOpen(false)}>
                تتبع الطلب
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* ── Hero Content ── */}
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 pb-4 sm:pb-5 lg:pb-6">
        <div className="flex flex-col items-center text-center pt-3 sm:pt-4 lg:pt-5">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black leading-tight">
            سوق <span className="text-primary-500">هاء</span>
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 max-w-lg">
            تسوّق من أفضل المتاجر السعودية في سوق واحد
          </p>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5">
            <Icon icon={BadgeCheck} size="2xs" className="text-success" />
            <span className="text-xs font-bold text-primary-500">{total} منتج متاح</span>
          </div>
        </div>

        {/* ── Trust Row ── */}
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          {[
            { icon: ShieldCheck, text: 'متاجر موثوقة' },
            { icon: Truck, text: 'توصيل سريع' },
            { icon: BadgeCheck, text: 'دفع آمن' },
            { icon: PackageSearch, text: 'ضمان ومرتجعات' },
          ].map((item) => (
            <span key={item.text} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500">
              <Icon icon={item.icon} size="2xs" className="text-primary-500" />
              {item.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
