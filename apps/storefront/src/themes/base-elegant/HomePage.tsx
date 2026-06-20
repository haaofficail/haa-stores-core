import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { StoreButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import ThemedProductCard from '@/components/ThemedProductCard';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';
import '@splidejs/react-splide/css/core';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, ChevronDown, Ruler, Package } from 'lucide-react';
import { TrustBadgesSection } from '@/components/ui/trust-badges';
import { organizationJSONLD } from '@/lib/jsonld';
import type { HomePageProps } from '@haa/storefront-themes';

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.unobserve(el);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

function CategoryCard({ category, slug, index = 0, size = 3 }: { category: any; slug: string; index?: number; size?: number }) {
  const [ref, inView] = useInView();
  const sz = Math.max(1, Math.min(5, size || 3));
  const sizes = [
    { pad: 'p-1.5', img: 'w-8 h-8', icon: 'h-3 w-3', text: 'text-xs', grid: 'text-center line-clamp-1 leading-tight' },
    { pad: 'p-2', img: 'w-10 h-10', icon: 'h-4 w-4', text: 'text-xs', grid: 'text-center line-clamp-1 leading-tight' },
    { pad: 'p-3 sm:p-4', img: 'w-12 h-12', icon: 'h-6 w-6', text: 'text-sm', grid: 'text-center line-clamp-1 leading-tight' },
    { pad: 'p-4 sm:p-5', img: 'w-16 h-16', icon: 'h-7 w-7', text: 'text-sm', grid: 'text-center line-clamp-1 leading-tight' },
    { pad: 'p-5 sm:p-6', img: 'w-20 h-20', icon: 'h-8 w-8', text: 'text-base', grid: 'text-center line-clamp-1 leading-tight' },
  ];
  const s = sizes[sz - 1];
  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ease-out motion-safe:duration-500 ${
        inView
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-5'
      }`}
      style={{
        transitionDelay: `${index * 60}ms`,
        willChange: inView ? 'auto' : 'transform, opacity',
      }}
    >
      <Link
        to={`/s/${slug}/c/${category.slug}`}
        className={`group flex flex-col items-center justify-center gap-2 bg-surface-1 rounded-card shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300 ease-out h-full w-full ${s.pad}`}
      >
        {category.imageUrl ? (
          <div className={`${s.img} rounded-xl overflow-hidden`}>
            <img width={400} height={400} src={category.imageUrl} alt={category.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
          </div>
        ) : (
          <div className={`${s.img} rounded-xl bg-primary-50 flex items-center justify-center`}>
            <Package className={`${s.icon} text-primary-400 group-hover:scale-110 transition-transform duration-500`} />
          </div>
        )}
        <span className={`font-semibold ${s.text} text-text-primary group-hover:text-primary-600 transition-colors duration-300 ${s.grid}`}>
          {category.name}
        </span>
      </Link>
    </div>
  );
}

type SliderSettings = {
  autoplay?: boolean;
  speed?: number;
  showArrows?: boolean;
  showDots?: boolean;
};

const CARD_WIDTH_MAP: Record<number, string> = {
  1: 'w-28 sm:w-32',
  2: 'w-32 sm:w-36',
  3: 'w-36 sm:w-44',
  4: 'w-48 sm:w-52',
  5: 'w-56 sm:w-64',
};

function getCardWidth(productCardSize?: number): string {
  return CARD_WIDTH_MAP[productCardSize ?? 3] || CARD_WIDTH_MAP[3];
}

function getGridCols(productCardSize?: number): string {
  const size = productCardSize ?? 3;
  if (size <= 1) return 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-6';
  if (size === 2) return 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5';
  if (size === 3) return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
}

function ProductCarousel({ products, slug, title, onAddToCart, slider, productCardSize }: { products: any[]; slug: string; title: string; onAddToCart?: (product: any) => Promise<void>; slider?: SliderSettings; productCardSize?: number }) {
  const { i18n } = useTranslation();
  const [ref, inView] = useInView();
  if (products.length === 0) return null;
  const autoplay = slider?.autoplay !== false;
  const speedMs = Math.max(1000, Math.min(Number(slider?.speed) || 3000, 10000));
  const autoScrollSpeed = autoplay ? Math.max(0.3, Math.min(3, 3000 / speedMs)) : 0;

  return (
    <section
      ref={ref}
      className={`transition-all duration-500 ease-out motion-safe:duration-500 ${
        inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
      style={{ willChange: inView ? 'auto' : 'transform, opacity' }}
    >
      <div className="max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
        <h2 className="text-base sm:text-lg font-bold text-text-primary">{title}</h2>
      </div>
      <div className="py-2 sm:py-3 pb-3 sm:pb-4 relative">
        <Splide
          options={{
            type: 'loop',
            drag: 'free',
            focus: 'center',
            autoWidth: true,
            gap: '0.75rem',
            padding: { left: '1rem', right: '1rem' },
            pagination: slider?.showDots === true,
            arrows: slider?.showArrows === true,
            direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
            autoScroll: {
              speed: autoScrollSpeed,
              pauseOnHover: true,
            },
          }}
          extensions={autoplay ? { AutoScroll } : {}}
          aria-label={title}
        >
          {products.map(product => (
            <SplideSlide key={product.id}>
          <div className={`${getCardWidth(productCardSize)} pb-2`}>
            <ThemedProductCard product={product} slug={slug} onAddToCart={onAddToCart} compact={(productCardSize ?? 3) <= 2} />
          </div>
            </SplideSlide>
          ))}
        </Splide>
      </div>
    </section>
  );
}

type BannerData = {
  imageUrl: string;
  imageMobileUrl?: string;
  title: string;
  description: string;
  buttonText: string;
  linkType: string;
  linkValue: string;
  sizeGuideUrl?: string;
  height?: number;
  openInNewTab?: boolean;
};

function resolveBannerHref(banner: BannerData, slug: string): string {
  const type = banner.linkType || 'all';
  if (type === 'all') return `/s/${slug}/c/all`;
  if (type === 'category') return `/s/${slug}/c/${banner.linkValue || 'all'}`;
  if (type === 'product') return `/s/${slug}/p/${banner.linkValue}`;
  return banner.linkValue || `/s/${slug}/c/all`;
}

function BannerSection({ banners, slug, display }: { banners: BannerData[]; slug: string; display?: string }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [ref, inView] = useInView();
  const touchRef = useRef<{ startX: number }>({ startX: 0 });

  if (!banners || banners.length === 0) return null;

  const banner = banners[current];
  const hasImage = banner.imageUrl && banner.imageUrl.trim().length > 0;
  const showSizeGuide = banner.sizeGuideUrl && banner.sizeGuideUrl.trim().length > 0;
  const href = resolveBannerHref(banner, slug);

  const goTo = (i: number): void => {
    if (i < 0) setCurrent(banners.length - 1);
    else if (i >= banners.length) setCurrent(0);
    else setCurrent(i);
  };

  const isFull = display === 'full';
  const isWide = display === 'wide';
  const bannerHeight = Math.max(220, Math.min(Number(banner.height) || 400, 720));
  const isExternalLink = banner.linkType === 'custom' && /^https?:\/\//.test(banner.linkValue || '');
  return (
    <section ref={ref} className={`${isFull ? 'w-full' : isWide ? 'max-w-7xl mx-auto px-4 sm:px-6' : 'max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8'} ${isFull ? '' : 'py-8 sm:py-10'}`}>
      <div
        className={`relative overflow-hidden ${isFull ? '' : 'rounded-card'} bg-gradient-to-l from-primary-600 via-primary-500 to-primary-600 shadow-card transition-all duration-500 ease-out motion-safe:duration-500 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
        style={{ minHeight: bannerHeight }}
        onTouchStart={(e) => { touchRef.current.startX = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          const diff = touchRef.current.startX - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 50) {
            goTo(current + (diff > 0 ? 1 : -1));
          }
        }}
      >
        {hasImage && (
          <picture>
            <source media="(max-width: 768px)" srcSet={banner.imageMobileUrl || banner.imageUrl} />
            <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
          </picture>
        )}
        <div className={`absolute inset-0 ${hasImage ? 'bg-black/40' : "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"}`} />
        <div className={`relative z-10 ${isFull ? 'max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8' : ''} ${isFull ? 'py-8 sm:py-10' : 'px-6 sm:px-10 py-8 sm:py-10'} text-center`}>
          {banner.title && (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 text-white font-bold rounded-full mb-3 backdrop-blur-sm"
                style={{ fontSize: 'var(--badge-font-size, 11px)' }}>
                <Icon icon={BadgeCheck} size="2xs" />
                {banner.title}
              </span>
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
                {banner.title}
              </h3>
            </>
          )}
          {banner.description && (
            <p className="text-sm sm:text-base text-white/80 max-w-md mx-auto mb-5 leading-relaxed">
              {banner.description}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {banner.buttonText && (isExternalLink ? (
              <a href={banner.linkValue} target={banner.openInNewTab !== false ? '_blank' : undefined} rel="noopener noreferrer">
                <StoreButton variant="secondary" size="md">{banner.buttonText}<Icon icon={ArrowLeft} size="xs" /></StoreButton>
              </a>
            ) : (
              <Link to={href}>
                <StoreButton variant="secondary" size="md">{banner.buttonText}<Icon icon={ArrowLeft} size="xs" /></StoreButton>
              </Link>
            ))}
            {showSizeGuide && (() => {
              const isExternal = banner.sizeGuideUrl?.startsWith('http://') || banner.sizeGuideUrl?.startsWith('https://');
              if (isExternal) {
                return (
                  <a href={banner.sizeGuideUrl!} target="_blank" rel="noopener noreferrer">
                    <StoreButton variant="secondary" size="md" className="!bg-transparent !text-white !border-white/30 hover:!bg-white/10"><Icon icon={Ruler} size="xs" />{t('home.sizeGuide', 'دليل المقاسات')}</StoreButton>
                  </a>
                );
              }
              return (
                <Link to={banner.sizeGuideUrl!}>
                  <StoreButton variant="secondary" size="md" className="!bg-transparent !text-white !border-white/30 hover:!bg-white/10"><Icon icon={Ruler} size="xs" />{t('home.sizeGuide', 'دليل المقاسات')}</StoreButton>
                </Link>
              );
            })()}
          </div>
        </div>
        {banners.length > 1 && (
          <>
            <button
              onClick={() => goTo(current - 1)}
              className="absolute inset-inline-end-3 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors hidden sm:flex"
              aria-label={t('common.previous')}
            >
              <Icon icon={ChevronRight} size="md" className="text-white" />
            </button>
            <button
              onClick={() => goTo(current + 1)}
              className="absolute inset-inline-start-3 top-1/2 -translate-y-1/2 z-20 min-w-[44px] min-h-[44px] rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 transition-colors hidden sm:flex"
              aria-label={t('common.next')}
            >
              <Icon icon={ChevronLeft} size="md" className="text-white" />
            </button>
            <div className="absolute bottom-4 start-1/2 -translate-x-1/2 z-20 flex gap-2">
{banners.map((_b: unknown, i: number) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60 w-2'
                }`}
              />
            ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function SectionHeader({ title, description, action }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4 sm:mb-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-text-primary">{title}</h2>
        {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function renderProductGrid(products: any[], slug: string, onAddToCart: (p: any) => Promise<void>, productCardSize?: number) {
  return (
    <div className={`grid ${getGridCols(productCardSize)} gap-3 sm:gap-4 items-stretch`}>
      {products.map((product) => (
        <ThemedProductCard key={product.id} product={product} slug={slug} onAddToCart={onAddToCart} compact={(productCardSize ?? 3) <= 2} />
      ))}
    </div>
  );
}

function renderSlider(products: any[], slug: string, onAddToCart: (p: any) => Promise<void>, slider?: SliderSettings, productCardSize?: number) {
  return <ProductCarousel products={products} slug={slug} title="" onAddToCart={onAddToCart} slider={slider} productCardSize={productCardSize} />;
}

function renderHorizontalScroll(products: any[], slug: string, onAddToCart: (p: any) => Promise<void>, productCardSize?: number) {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
        {products.map((product) => (
          <div key={product.id} className={`${getCardWidth(productCardSize)} shrink-0`}>
            <ThemedProductCard product={product} slug={slug} onAddToCart={onAddToCart} compact={(productCardSize ?? 3) <= 2} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandsCarousel({ items, title, speed = 1 }: { items: { imageUrl: string; linkUrl?: string; name?: string }[]; title: string; speed?: number }) {
  useTranslation();
  if (items.length === 0) return null;
  const autoSpeed = Math.max(0.3, Math.min(speed, 5));
  return (
    <Splide
      options={{
        type: 'loop',
        drag: 'free',
        focus: 'center',
        autoWidth: true,
        gap: '1.5rem',
        pagination: false,
        arrows: false,
        direction: 'rtl',
        autoScroll: { speed: autoSpeed, pauseOnHover: true },
      }}
      extensions={{ AutoScroll }}
      aria-label={title}
    >
      {items.map((item, i) => (
        <SplideSlide key={i}>
          {item.linkUrl ? (
            <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-16 w-24 sm:w-28">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name || ''} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-text-tertiary">{item.name || 'براند'}</span>
              )}
            </a>
          ) : (
            <div className="flex items-center justify-center h-16 w-24 sm:w-28">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name || ''} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-text-tertiary">{item.name || 'براند'}</span>
              )}
            </div>
          )}
        </SplideSlide>
      ))}
    </Splide>
  );
}

function FAQAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (items.length === 0) return null;
  return (
    <div className="space-y-2 max-w-2xl mx-auto">
      {items.map((item, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors text-right"
          >
            <span>{item.question}</span>
            <Icon icon={ChevronDown} className={`text-text-tertiary shrink-0 transition-transform duration-200 ${openIndex === i ? '' : '-rotate-90'}`} size="xs" />
          </button>
          {openIndex === i && (
            <div className="px-4 pb-3 text-sm text-text-secondary leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function getSectionVisibilityClass(settings: Record<string, any>): string {
  if (settings.hideOnMobile && settings.hideOnDesktop) return 'hidden';
  if (settings.hideOnMobile) return 'hidden sm:block';
  if (settings.hideOnDesktop) return 'sm:hidden';
  return '';
}

function getSectionLink(url: string | undefined, slug: string): string {
  if (!url) return `/s/${slug}/c/all`;
  if (url.startsWith('/')) return url;
  return `/s/${slug}/${url.replace(/^\/+/, '')}`;
}

function sanitizeSectionHtml(html: string): string {
  if (!html) return '';
  // DOMPurify (allowlist) بدل المنقّي القديم القائم على regex (blocklist) القابل للتجاوز — QA S2.
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'span', 'h1', 'h2', 'h3', 'h4', 'blockquote'],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'style'],
    ALLOW_DATA_ATTR: false,
  });
}

function getProductsForSource(products: any[], source: string | undefined, limit: number, settings: Record<string, any> = {}): any[] {
  const active = products.filter((p: any) => p.status === 'active');
  if (!source) return [];
  if (source === 'manual' && Array.isArray(settings.productIds) && settings.productIds.length > 0) {
    const ids = new Set(settings.productIds.map(Number));
    return active.filter((p: any) => ids.has(p.id)).slice(0, limit);
  }
  if (source === 'category' && settings.categoryId) {
    return active.filter((p: any) => Number(p.categoryId) === Number(settings.categoryId)).slice(0, limit);
  }
  if (source === 'newest') return [...active].sort((a: any, b: any) => b.id - a.id).slice(0, limit);
  if (source === 'bestSellers') return [...active].sort((a: any, b: any) => (b.salesCount ?? 0) - (a.salesCount ?? 0)).slice(0, limit);
  if (source === 'discounted') return active.filter((p: any) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price)).slice(0, limit);
  if (source === 'featured') return active.slice(0, limit);
  return active.slice(0, limit);
}

export default function BaseElegantHomePage(props: HomePageProps) {
  const { t } = useTranslation();

  return (
    <div className="animate-fade-in overflow-x-hidden" id="main-content">
      <h1 className="sr-only">{props.store.name}</h1>
      {props.store && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationJSONLD(props.store.name, props.store.logoUrl || '', `${window.location.origin}/s/${props.slug}`) }} />}
      {props.sections.filter((s: any) => s.enabled !== false).map((section: any) => {
        const settings = section.settings || {};
        const visibilityClass = getSectionVisibilityClass(settings);

        switch (section.type) {
          case 'banner':
            return (
              <div key={section.id} className={visibilityClass}>
                <BannerSection banners={[{
                  imageUrl: settings.imageUrl || '',
                  imageMobileUrl: settings.imageMobileUrl || '',
                  title: settings.subtitle || section.title || '',
                  description: settings.description || '',
                  buttonText: settings.buttonText || '',
                  linkType: settings.linkType || 'all',
                  linkValue: settings.linkValue || '',
                  height: settings.height,
                  openInNewTab: settings.openInNewTab,
                }]} slug={props.slug} display={settings.display || 'contained'} />
              </div>
            );

          case 'categories': {
            const catLimit = settings.categoryLimit || 6;
            const catLayout = settings.categoryLayout || 'grid';
            const selectedIds: number[] = settings.categoryIds || [];
            const catItems = selectedIds.length > 0
              ? props.categories.filter((c: any) => selectedIds.includes(c.id)).slice(0, catLimit)
              : props.categories.slice(0, catLimit);
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-3 ${visibilityClass}`}>
                <SectionHeader
                  title={section.title || t('home.categories')}
                  action={
                    props.categories.length > catLimit ? (
                      <Link to={`/s/${props.slug}/c/all`} className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                        {t('home.viewAll')} <Icon icon={ArrowLeft} size="2xs" />
                      </Link>
                    ) : undefined
                  }
                />
                {catLayout === 'slider' ? (
                  <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                      {catItems.map((cat: any, i: number) => (
                        <div key={cat.id} className="w-32 shrink-0"><CategoryCard category={cat} slug={props.slug} index={i} size={props.theme?.layout?.categoryCardSize ?? 3} /></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 items-stretch">
                    {catItems.map((cat: any, i: number) => (
                      <CategoryCard key={cat.id} category={cat} slug={props.slug} index={i} size={props.theme?.layout?.categoryCardSize ?? 3} />
                    ))}
                  </div>
                )}
              </section>
            );
          }

          case 'products':
          case 'bestSellers':
          case 'newest':
          case 'offers':
          case 'discounted':
          case 'featured': {
            const limit = settings.limit || 8;
            const layout = settings.layout || 'grid';
            const source = settings.source || section.type;
            const productList = getProductsForSource(props.products, source, limit, settings);
            if (productList.length === 0) return null;
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                <SectionHeader
                  title={section.title}
                  action={
                    settings.showMoreButton !== false && settings.showMoreUrl ? (
                      <Link to={getSectionLink(settings.showMoreUrl, props.slug)} className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                        {t('home.viewAll')} <Icon icon={ArrowLeft} size="2xs" />
                      </Link>
                    ) : undefined
                  }
                />
                {layout === 'slider' ? renderSlider(productList, props.slug, props.onAddToCart, settings.slider, settings.productCardSize) :
                 layout === 'horizontal' ? renderHorizontalScroll(productList, props.slug, props.onAddToCart, settings.productCardSize) :
                 renderProductGrid(productList, props.slug, props.onAddToCart, settings.productCardSize)}
              </section>
            );
          }

          case 'text':
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <div className={`text-sm text-text-secondary leading-relaxed ${settings.alignment === 'center' ? 'text-center' : settings.alignment === 'left' ? 'text-left' : 'text-right'}`} dangerouslySetInnerHTML={{ __html: sanitizeSectionHtml(settings.content || '') }} />
              </section>
            );

          case 'imageText':
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <div className={`flex flex-col sm:flex-row items-center gap-6 ${settings.imagePosition === 'left' ? 'sm:flex-row-reverse' : ''}`}>
                  {settings.imageUrl && (
                    <div className="w-full sm:w-1/2">
                      <img src={settings.imageUrl} alt={section.title} className="w-full rounded-2xl object-cover" style={{ maxHeight: 300 }} />
                    </div>
                  )}
                  <div className={`w-full sm:w-1/2 text-sm text-text-secondary leading-relaxed ${settings.alignment === 'center' ? 'text-center' : settings.alignment === 'left' ? 'text-left' : 'text-right'}`} dangerouslySetInnerHTML={{ __html: sanitizeSectionHtml(settings.content || '') }} />
                </div>
              </section>
            );

          case 'brands':
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <BrandsCarousel items={(settings as any).items || []} title={section.title} speed={(settings as any).speed} />
              </section>
            );

          case 'faq':
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <FAQAccordion items={(settings as any).items || []} />
              </section>
            );

          default:
            return null;
        }
      })}
      <div className="max-w-[var(--container-max-width,1280px)] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TrustBadgesSection config={props.theme} variant="home" />
      </div>
    </div>
  );
}
