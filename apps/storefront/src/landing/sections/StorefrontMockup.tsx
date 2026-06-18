/**
 * StorefrontMockup — combined mockup sections for the landing page
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor, sprints 8-9/13).
 * Contains the mock data (MOCK_CATEGORIES, MOCK_PRODUCTS), the small
 * storefront components (StoreHeader, StoreHero, StoreCategories,
 * StoreProductCard, StoreProducts, StoreProductModal, StoreCartDrawer,
 * StoreBottomNav, StoreFooter), the AnimatedCounter helper, and the
 * two landing sections that compose them (MockupPreview, StorefrontPreview).
 *
 * Kept together as a single module because MockupPreview and StorefrontPreview
 * share the entire storefront component tree + mock data + types.
 */
import { useEffect, useRef, useState as useReactState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Palette,
  Search,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  Truck,
  User,
  X,
  Zap,
} from 'lucide-react';
import { getClaim } from '@/lib/landing-claims';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

// ── Shared types & data ────────────────────────────────────────────────────

export interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  category: string;
  description: string;
  rating: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

const MOCK_CATEGORIES: { id: number; name: string; image: string; count: string }[] = [
  { id: 1, name: 'إلكترونيات', image: 'https://picsum.photos/seed/electronics/400/300', count: '٢٤ منتج' },
  { id: 2, name: 'أزياء', image: 'https://picsum.photos/seed/fashion/400/300', count: '١٨ منتج' },
  { id: 3, name: 'إكسسوارات', image: 'https://picsum.photos/seed/accessories/400/300', count: '٣١ منتج' },
  { id: 4, name: 'العناية', image: 'https://picsum.photos/seed/beauty/400/300', count: '١٥ منتج' },
];

const PRODUCT_BADGES = ['', 'جديد', 'خصم 20%', 'مخزون محدود', 'مميز', 'الأكثر مبيعًا'];

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: 'سماعة لاسلكية', price: '١٩٩ ر.س', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop', category: 'إلكترونيات', description: 'سماعة بلوتوث لاسلكية أنيقة.', rating: 5 },
  { id: 2, name: 'عطر نسائي', price: '٨٦٥ ر.س', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop', category: 'عطور', description: 'عطر نسائي فاخر برائحة الأزهار.', rating: 5 },
  { id: 3, name: 'ساعة كاجوال', price: '٥٤٩ ر.س', image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop', category: 'إكسسوارات', description: 'ساعة كاجوال بتصميم عصري أنيق.', rating: 4 },
  { id: 4, name: 'حقيبة قوتشي', price: '٩٥٠ ر.س', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop', category: 'أزياء', description: 'حقيبة قوتشي جلدية فاخرة.', rating: 5 },
  { id: 5, name: 'عطر فرنسي', price: '٥٤٩ ر.س', image: 'https://picsum.photos/seed/perfume/400/400', category: 'العناية', description: 'عطر خشبي مع مسك العنبر. يدوم ١٢ ساعة.', rating: 5 },
  { id: 6, name: 'محفظة رجالية', price: '٢٥٠ ر.س', image: 'https://picsum.photos/seed/wallet-clutch/400/400', category: 'إكسسوارات', description: 'محفظة جلد فاخرة بتصميم عصري أنيق.', rating: 4 },
  { id: 7, name: 'سوار ذهبي', price: '١,٢٩٩ ر.س', image: 'https://picsum.photos/seed/bracelet/400/400', category: 'إكسسوارات', description: 'سوار من الذهب عيار ٢١ مع فصوص زركون.', rating: 5 },
  { id: 8, name: 'كريم ترطيب فاخر', price: '١٨٩ ر.س', image: 'https://picsum.photos/seed/skincare/400/400', category: 'العناية', description: 'كريم ترطيب بخلاصة الصبار وزبدة الشيا.', rating: 4 },
];

// ── Storefront sub-components ──────────────────────────────────────────────

function StoreHeader({ cartCount, onCartClick, t }: { cartCount: number; onCartClick: () => void; t: TFn }) {
  return (
    <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl border-b border-neutral-100">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1 text-xs font-medium text-neutral-500">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm border border-neutral-400 relative">
            <span className="absolute inset-x-0.5 top-0.5 h-1 rounded-sm bg-neutral-400" />
          </span>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 11v2M10 11v2M14 11v2M18 11v2" stroke="currentColor" strokeWidth="1.5"/></svg>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"><path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 h-12">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">هـ</div>
          <span className="text-sm font-bold text-neutral-900">متجر الهدايا</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label={t('landing.demoSearch', 'بحث في المتجر')} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <Search className="h-4 w-4" />
          </button>
          <button type="button" aria-label={t('landing.demoCart', 'السلة')} onClick={onCartClick} className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-0.5 -end-0.5 h-3.5 w-3.5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white">
                {cartCount > 9 ? '٩+' : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

function StoreHero() {
  return (
    <div className="relative bg-gradient-to-br from-amber-50 via-white to-orange-50 overflow-hidden">
      <div className="flex flex-col items-center px-4 py-6 gap-4 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1">
          <Truck className="h-3 w-3 text-green-600" />
          <span className="text-xs font-semibold text-green-700">توصيل في نفس اليوم</span>
        </div>
        <div>
          <h3 className="text-xl font-black text-neutral-900 leading-tight">متجر الهدايا</h3>
          <p className="text-xs text-neutral-500 mt-1">أفكار هدايا مميزة بأسعار مناسبة</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
            <span>٤.٨</span>
          </div>
          <span className="text-neutral-300">|</span>
          <span>٢٬٤٣١ تقييم</span>
          <span className="text-neutral-300">|</span>
          <span>توصيل لـ الرياض وجدة</span>
        </div>
      </div>
    </div>
  );
}

function StoreCategories() {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-neutral-900">الأكثر مبيعًا</h4>
        <span className="text-xs text-blue-600 font-semibold cursor-pointer">عرض الكل</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {MOCK_CATEGORIES.slice(0, 4).map((cat) => (
          <div key={cat.id} className="flex flex-col items-center gap-1.5 cursor-pointer group">
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-neutral-50 ring-1 ring-neutral-100 group-hover:ring-2 group-hover:ring-blue-200 transition-all">
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
            </div>
            <span className="text-xs font-semibold text-neutral-700 text-center leading-tight">{cat.name}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const BADGE_STYLES: Record<string, string> = {
  'جديد': 'bg-blue-500 text-white',
  'خصم 20%': 'bg-red-500 text-white',
  'مخزون محدود': 'bg-amber-500 text-white',
  'مميز': 'bg-purple-500 text-white',
  'الأكثر مبيعًا': 'bg-emerald-500 text-white',
};

const PRODUCT_BADGE_MAP: Record<number, string> = { 1: '', 2: 'جديد', 3: 'خصم 20%', 4: 'مخزون محدود' };

function StoreProductCard({ product, onAddToCart, onClick }: { product: Product; onAddToCart: (p: Product) => void; onClick: (p: Product) => void }) {
  const badge = PRODUCT_BADGE_MAP[product.id] ?? PRODUCT_BADGES[product.id % PRODUCT_BADGES.length];
  return (
    <div className="group cursor-pointer" onClick={() => onClick(product)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100 mb-2 shadow-sm group-hover:shadow-lg transition-shadow">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
        {badge && (
          <span className={`absolute top-2 start-2 px-2 py-0.5 rounded-full text-xs font-bold ${BADGE_STYLES[badge] || 'bg-neutral-800 text-white'}`}>
            {badge}
          </span>
        )}
        <button type="button" onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
          className="absolute bottom-2 end-2 min-h-[32px] min-w-[32px] rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center text-neutral-700 hover:bg-blue-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
        >
          <ShoppingCart className="h-3.5 w-3.5" />
        </button>
      </div>
      <h4 className="text-xs font-semibold text-neutral-900 leading-tight line-clamp-1">{product.name}</h4>
      <p className="text-xs font-black text-neutral-900 mt-0.5">{product.price}</p>
    </div>
  );
}

function StoreProducts({ onAddToCart, onProductClick }: { onAddToCart: (p: Product) => void; onProductClick: (p: Product) => void }) {
  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-black text-neutral-900">مجموعة هدايا فاخرة</h4>
        <span className="text-xs text-blue-600 font-semibold cursor-pointer">عرض الكل</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {MOCK_PRODUCTS.slice(0, 4).map((p) => (
          <StoreProductCard key={p.id} product={p} onAddToCart={onAddToCart} onClick={onProductClick} />
        ))}
      </div>
    </section>
  );
}

function StoreProductModal({ product, onClose, onAddToCart, t }: { product: Product; onClose: () => void; onAddToCart: (p: Product) => void; t: TFn }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="relative bg-white rounded-2xl mx-4 max-w-sm w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label={t('common.close', 'إغلاق')} onClick={onClose} className="absolute top-3 end-3 z-10 min-h-[32px] min-w-[32px] rounded-full bg-white/90 shadow flex items-center justify-center text-neutral-600 hover:text-neutral-900 transition-colors">
          <X className="h-4 w-4" />
        </button>
        <div className="aspect-square bg-neutral-100">
          <img src={product.image} alt={product.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="p-4">
          <div className="flex items-center gap-1 mb-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < product.rating ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
            ))}
          </div>
          <h3 className="text-lg font-bold text-neutral-900">{product.name}</h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{product.description}</p>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-neutral-100">
            <span className="text-xl font-black text-neutral-900">{product.price}</span>
            <button type="button" onClick={() => { onAddToCart(product); onClose(); }}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-5 text-sm font-bold text-white shadow-lg hover:scale-[1.02] transition-transform"
            >
              <ShoppingCart className="h-4 w-4" />أضف للسلة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StoreCartDrawer({ items, onClose, onRemove, total }: { items: CartItem[]; onClose: () => void; onRemove: (product: Product) => void; total: string }) {
  return (
    <div className="absolute inset-0 z-40 flex justify-end" onClick={onClose}>
      <div className="relative bg-white w-72 h-full shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="سلة التسوق">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900">سلة التسوق ({items.length})</h3>
          <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">السلة فارغة</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 px-4">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="w-12 h-12 rounded-xl object-cover bg-neutral-100 shrink-0 overflow-hidden">
                    <img src={item.product.image} alt={item.product.name} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-neutral-900 truncate">{item.product.name}</p>
                    <p className="text-xs font-bold text-neutral-700 mt-0.5">{item.product.price}</p>
                    <p className="text-xs text-neutral-400">الكمية: {item.quantity}</p>
                  </div>
                  <button type="button" onClick={() => onRemove(item.product)} className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-neutral-100 px-4 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-neutral-500">الإجمالي</span>
                <span className="text-sm font-black text-neutral-900">{total}</span>
              </div>
              <button type="button" className="w-full min-h-[44px] rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform">
                إتمام الشراء <ArrowLeft className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StoreBottomNav() {
  const tabs = [
    { icon: Store, label: 'الرئيسية', active: true },
    { icon: Search, label: 'بحث', active: false },
    { icon: ShoppingCart, label: 'السلة', active: false },
    { icon: User, label: 'حسابي', active: false },
  ];
  return (
    <nav className="bg-white border-t border-neutral-100">
      <div className="flex items-center justify-around h-[52px] px-1">
        {tabs.map(({ icon: Icon, label, active }) => (
          <button key={label} type="button" className="flex flex-col items-center justify-center gap-0.5 min-w-[60px] h-full">
            <div className={`flex items-center justify-center rounded-xl transition-all duration-200 ${active ? 'bg-blue-50' : ''}`} style={{ padding: '4px 10px' }}>
              <Icon className={`h-[18px] w-[18px] ${active ? 'text-blue-600' : 'text-neutral-400'}`} strokeWidth={active ? 2.5 : 1.5} />
            </div>
            <span className={`text-xs font-semibold leading-none ${active ? 'text-blue-600' : 'text-neutral-400'}`}>{label}</span>
          </button>
        ))}
      </div>
      {/* Home indicator */}
      <div className="flex justify-center pb-[6px]">
        <div className="h-[5px] w-[36px] rounded-full bg-neutral-300" />
      </div>
    </nav>
  );
}

function StoreFooter() {
  return (
    <div className="px-4 py-4 text-center">
      <p className="text-xs text-neutral-400">© 2026 متجر هاء</p>
    </div>
  );
}

// ── Animated counter helper (used by MockupPreview) ────────────────────────

function AnimatedCounter({ value, prefix, suffix }: { value: number; prefix: string; suffix: string }) {
  const [count, setCount] = useReactState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          obs.disconnect();
          const duration = 1000;
          const start = performance.now();
          const animate = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const p = 1 - Math.pow(1 - t, 3);
            setCount(Math.round(p * value));
            if (t < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

// ── MockupPreview — full-width image mockup section ───────────────────────

export function MockupPreview() {
  const benefits = [
    { prefix: '< ', value: 60, suffix: ' ثانية', desc: 'إطلاق فوري' },
    { prefix: '', value: getClaim('themeCount').text, suffix: '', desc: 'ثيمات احترافية' },
    { prefix: '', value: getClaim('zeroCommission').text, suffix: '', desc: 'دفع سعودي كامل' },
  ];
  return (
    <section className="relative py-16 sm:py-24 scroll-mt-20">
      <StoreContainer>
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Image — right side */}
          <div className="flex-1 flex justify-center lg:justify-start">
            <Link to="/s/demo" className="block w-full max-w-2xl transition-opacity hover:opacity-90">
              <img
                src="/mockup-preview.png"
                alt="معاينة المتجر"
                className="w-full h-auto"
                loading="lazy"
              />
            </Link>
          </div>
          {/* Content — left side */}
          <div className="flex-1 text-center lg:text-start">
            <span className="aurora-pill text-xs">{'لماذا Haa؟'}</span>
            <h2 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
              {'كل ما تحتاجه في منصة واحدة'}
            </h2>
            <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
              {'منصة متكاملة تدير متجرك من البداية للنهاية. بدون أكواد، بدون عمولات، بدون تعقيد.'}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {benefits.map(({ prefix, value, suffix, desc }, idx) => {
                const gradients = [
                  'from-blue-500 to-indigo-500',
                  'from-violet-500 to-purple-600',
                  'from-emerald-500 to-teal-500',
                ];
                const icons = [Zap, Palette, CreditCard];
                const Icon = icons[idx];
                return (
                  <div
                    key={prefix + suffix}
                    className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-6 shadow-sm backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/60 hover:shadow-xl"
                    style={{
                      opacity: 0,
                      animation: `fadeSlideUp 0.6s ease-out ${0.15 * idx}s forwards`,
                    }}
                  >
                    <div aria-hidden="true" className={`absolute -end-10 -top-10 h-28 w-28 rounded-pill bg-gradient-to-br ${gradients[idx]} opacity-10 blur-2xl transition-opacity duration-500 group-hover:opacity-25`} />
                    <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradients[idx]} text-white shadow-lg`}>
                      <Icon className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                    <div className="mt-4 text-2xl font-bold tracking-[-0.01em] text-text-primary">
                      {typeof value === 'number' && value > 0 ? (
                        <AnimatedCounter prefix={prefix} value={value} suffix={suffix} />
                      ) : (
                        <span>{prefix}{value}{suffix}</span>
                      )}
                    </div>
                    <div className="mt-1 text-sm font-medium text-text-secondary">{desc}</div>
                  </div>
                );
              })}
            </div>
            <style>{`
              @keyframes fadeSlideUp {
                from { opacity: 0; transform: translateY(12px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                to="/signup?ref=mockup-cta"
                className="min-h-[52px] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-8 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:scale-[1.02] hover:text-white transition-transform"
              >
                {'ابدأ مجانًا'}
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/s/demo"
                className="min-h-[52px] inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/50 px-6 text-base font-semibold text-text-secondary shadow-sm backdrop-blur-sm hover:scale-[1.02] hover:text-text-primary transition-transform"
              >
                {'شاهد متجرًا حقيقيًا'}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </StoreContainer>
    </section>
  );
}

// ── StorefrontPreview — live storefront mockup inside iPhone frame ─────────

export function StorefrontPreview({ t }: { t: TFn }) {
  const [cartItems, setCartItems] = useReactState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useReactState(false);
  const [selectedProduct, setSelectedProduct] = useReactState<Product | null>(null);

  const addToCart = useCallback((product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((product: Product) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== product.id));
  }, []);

  const total = useMemo(() => {
    const sum = cartItems.reduce((acc, item) => {
      const price = parseInt(item.product.price.replace(/[^\d]/g, ''), 10);
      return acc + price * item.quantity;
    }, 0);
    return sum.toLocaleString('ar-SA') + ' ر.س';
  }, [cartItems]);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <section id="storefront-preview" className="relative overflow-hidden bg-white py-16 sm:py-24 scroll-mt-20">
      <StoreContainer className="relative">
        <div className="mx-auto max-w-2xl text-center">
          <span className="aurora-pill text-xs">{t('landing.store.eyebrow', 'المتجر الإلكتروني')}</span>
          <h2 className="mt-6 text-[36px] font-bold leading-[1.15] tracking-[-0.02em] text-text-primary sm:text-[48px]">
            {t('landing.store.title', 'متجر يعمل بهذا الشكل')}
          </h2>
          <p className="mt-6 text-[18px] leading-[1.6] text-text-secondary sm:text-[20px]">
            {t('landing.store.subtitle', 'تصميم عصري، تجربة سلسة، جاهز للبيع.')}
          </p>
        </div>

        {/* iPhone device frame — clean CSS */}
        <div className="relative mt-16 mx-auto w-[250px]">
          <div aria-hidden="true" className="absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 bg-blue-300/30 blur-[80px]" />
          <div className="relative">
            {/* Shadow */}
            <div aria-hidden="true" className="absolute -bottom-[6%] left-1/2 z-0 h-[10%] w-[75%] -translate-x-1/2 rounded-full bg-black/10 blur-[16px]" />

            {/* Phone body */}
            <div className="relative overflow-hidden rounded-[40px] border-[3px] border-neutral-300 bg-neutral-100 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_48px_-12px_rgba(0,0,0,0.2)]">
              {/* Screen */}
              <div className="overflow-hidden rounded-[34px] bg-white flex flex-col" dir="rtl" style={{ aspectRatio: '9/19.5' }}>
                <div className="flex-1 overflow-y-auto">
                  <StoreHeader cartCount={cartCount} onCartClick={() => setCartOpen(true)} t={t} />
                  <StoreHero />
                  <StoreCategories />
                  <StoreProducts onAddToCart={addToCart} onProductClick={setSelectedProduct} />
                  <StoreFooter />
                </div>
                <StoreBottomNav />
                {selectedProduct && (
                  <StoreProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={addToCart} t={t} />
                )}
                {cartOpen && (
                  <StoreCartDrawer items={cartItems} onClose={() => setCartOpen(false)} onRemove={removeFromCart} total={total} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
              to="/signup?ref=store-preview"
              className="aurora-btn-primary group inline-flex h-14 min-h-[56px] items-center justify-center gap-2 rounded-full px-8 text-[17px] font-semibold text-white shadow-xl shadow-blue-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:!text-white"
            >
              {t('landing.store.cta', 'ابدأ مجانًا — وأطلق متجرك الآن')}
            <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1" />
          </Link>
        </div>
      </StoreContainer>
    </section>
  );
}
