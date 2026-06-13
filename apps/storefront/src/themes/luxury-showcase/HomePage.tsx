import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import ThemedProductCard from '@/components/ThemedProductCard';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import { AutoScroll } from '@splidejs/splide-extension-auto-scroll';
import '@splidejs/react-splide/css/core';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { TrustBadgesSection } from '@/components/ui/trust-badges';
import { organizationJSONLD } from '@/lib/jsonld';
import type { HomePageProps } from '@haa/storefront-themes';
import HeroSlider from './components/HeroSlider';

const CARD_WIDTH_MAP: Record<number, string> = {
  1: 'w-24 sm:w-28',
  2: 'w-28 sm:w-32',
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

type SliderSettings = {
  autoplay?: boolean;
  speed?: number;
  showArrows?: boolean;
  showDots?: boolean;
};

function ProductCarousel({ products, slug, title, onAddToCart, slider, productCardSize }: { products: any[]; slug: string; title: string; onAddToCart?: (product: any) => Promise<void>; slider?: SliderSettings; productCardSize?: number }) {
  const { i18n } = useTranslation();
  if (products.length === 0) return null;
  const autoplay = slider?.autoplay !== false;
  const speedMs = Math.max(1000, Math.min(Number(slider?.speed) || 3000, 10000));
  const autoScrollSpeed = autoplay ? Math.max(0.3, Math.min(3, 3000 / speedMs)) : 0;

  return (
    <section>
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
                <ThemedProductCard product={product} slug={slug} onAddToCart={onAddToCart} productCardSize={productCardSize} />
              </div>
            </SplideSlide>
          ))}
        </Splide>
      </div>
    </section>
  );
}

function SectionHeader({ title, description, action }: { title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-5 sm:mb-6">
      <div>
        <h2 className="text-base sm:text-lg font-light text-[#1a1a1a] tracking-wide">{title}</h2>
        {description && <p className="text-xs text-[#8a7e72] mt-1 font-light">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function CategoryCard({ category, slug }: { category: any; slug: string }) {
  return (
    <Link
      to={`/s/${slug}/c/${category.slug}`}
      className="group flex flex-col items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
    >
      <div className="w-full aspect-square bg-[#faf8f6] overflow-hidden mb-2 sm:mb-3">
        {category.imageUrl ? (
          <img width={200} height={200} src={category.imageUrl} alt={category.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : null}
      </div>
      <span className="text-[11px] text-[#6b635b] tracking-wider uppercase font-light text-center">
        {category.name}
      </span>
    </Link>
  );
}

function renderProductGrid(products: any[], slug: string, onAddToCart: (p: any) => Promise<void>, productCardSize?: number) {
  return (
    <div className={`grid ${getGridCols(productCardSize)} gap-3 sm:gap-4 items-stretch`}>
      {products.map((product) => (
        <ThemedProductCard key={product.id} product={product} slug={slug} onAddToCart={onAddToCart} productCardSize={productCardSize} />
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
            <ThemedProductCard product={product} slug={slug} onAddToCart={onAddToCart} productCardSize={productCardSize} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandsCarousel({ items, title, speed = 1 }: { items: { imageUrl: string; linkUrl?: string; name?: string }[]; title: string; speed?: number }) {
  const { t, i18n } = useTranslation();
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
        direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
        autoScroll: { speed: autoSpeed, pauseOnHover: true },
      }}
      extensions={{ AutoScroll }}
      aria-label={title}
    >
      {items.map((item, i) => (
        <SplideSlide key={i}>
              {item.linkUrl ? (
                <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center h-14 w-20 sm:w-24 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name || ''} className="max-h-full max-w-full object-contain opacity-60 hover:opacity-100 transition-opacity" />
              ) : (
                <span className="text-[10px] text-[#8a7e72]">{item.name || t('home.brand', 'براند')}</span>
              )}
            </a>
          ) : (
            <div className="flex items-center justify-center h-14 w-20 sm:w-24">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name || ''} className="max-h-full max-w-full object-contain opacity-60" />
              ) : (
                <span className="text-[10px] text-[#8a7e72]">{item.name || t('home.brand', 'براند')}</span>
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
    <div className="space-y-px max-w-2xl mx-auto">
      {items.map((item, i) => (
        <div key={i} className="border-b border-[#e8ded4]">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between py-3 text-sm text-[#1a1a1a] hover:text-[#a65d4e] transition-colors text-right focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
          >
            <span className="font-light">{item.question}</span>
            <ChevronDown className={`text-[#8a7e72] shrink-0 transition-transform duration-200 ${openIndex === i ? '' : '-rotate-90'}`} size={14} />
          </button>
          {openIndex === i && (
            <div className="pb-4 text-xs text-[#6b635b] leading-relaxed font-light">
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
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
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

function BannerContent({ st }: { st: Record<string, any> }) {
  return (
    <>
      {st.subtitle && <span className="text-[11px] uppercase tracking-[0.2em] text-white/70 font-light mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">{st.subtitle}</span>}
      {st.description && <p className="text-lg sm:text-xl lg:text-2xl text-white font-light max-w-md leading-relaxed mb-4 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">{st.description}</p>}
    </>
  );
}

export default function LuxuryShowcaseHomePage(props: HomePageProps) {
  const { t } = useTranslation();

  const heroSlides = (props.theme?.homepage?.heroSlider) || [];
  const enabledSections = props.sections.filter((s: any) => s.enabled !== false);

  return (
    <div id="main-content">
      <h1 className="sr-only">{props.store.name}</h1>
      {props.store && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: organizationJSONLD(props.store.name, props.store.logoUrl || '', `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${props.slug}`) }} />}
      {heroSlides.length > 0 && (
        <HeroSlider slides={heroSlides} slug={props.slug} />
      )}
      {enabledSections.map((section: any) => {
        const settings = section.settings || {};
        const visibilityClass = getSectionVisibilityClass(settings);

        switch (section.type) {
          case 'banner': {
            const st = section.settings || {};
            const hasBannerImage = st.imageUrl?.trim().length > 0;
            if (!hasBannerImage) return null;
            const isExternal = st.linkType === 'custom' && /^https?:\/\//.test(st.linkValue || '');
            const bannerHref = st.linkType === 'all' ? `/s/${props.slug}/c/all` :
              st.linkType === 'category' ? `/s/${props.slug}/c/${st.linkValue || 'all'}` :
              st.linkType === 'product' ? `/s/${props.slug}/p/${st.linkValue}` :
              st.linkValue || `/s/${props.slug}/c/all`;
            const bannerInner = (
              <>
                <picture>
                  <source media="(max-width: 768px)" srcSet={st.imageMobileUrl || st.imageUrl} />
                  <img src={st.imageUrl} alt={st.subtitle || section.title || ''} className="absolute inset-0 w-full h-full object-cover" />
                </picture>
                <div className="absolute inset-0 bg-gradient-to-l from-[#1a1a1a]/70 via-[#1a1a1a]/20 to-transparent" />
                <div className="relative z-10 flex flex-col justify-center h-full px-6 sm:px-10 py-6 sm:py-10">
                  <BannerContent st={st} />
                </div>
              </>
            );
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                {isExternal ? (
                  <a href={st.linkValue} target="_blank" rel="noopener noreferrer" className="relative overflow-hidden bg-[#1a1a1a] block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]" style={{ minHeight: Math.max(200, Math.min(Number(st.height) || 300, 500)) }}>
                    {bannerInner}
                  </a>
                ) : (
                  <Link to={bannerHref} className="relative overflow-hidden bg-[#1a1a1a] block focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]" style={{ minHeight: Math.max(200, Math.min(Number(st.height) || 300, 500)) }}>
                    {bannerInner}
                  </Link>
                )}
              </section>
            );
          }

          case 'categories': {
            const catLimit = settings.categoryLimit || 6;
            const catLayout = settings.categoryLayout || 'grid';
            const selectedIds: number[] = settings.categoryIds || [];
            const catItems = selectedIds.length > 0
              ? props.categories.filter((c: any) => selectedIds.includes(c.id)).slice(0, catLimit)
              : props.categories.slice(0, catLimit);
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 ${visibilityClass} ${catLayout === 'slider' ? '' : ''}`}>
                <SectionHeader
                  title={section.title || t('home.categories')}
                  action={
                    props.categories.length > catLimit ? (
                      <Link to={`/s/${props.slug}/c/all`} className="text-[11px] text-[#8a7e72] hover:text-[#1a1a1a] transition-colors tracking-wider uppercase font-light flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">
                        {t('home.viewAll')} <ArrowLeft className="w-3 h-3" />
                      </Link>
                    ) : undefined
                  }
                />
                {catLayout === 'slider' ? (
                  <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                      {catItems.map((cat: any) => (
                        <div key={cat.id} className="w-24 sm:w-28 shrink-0"><CategoryCard category={cat} slug={props.slug} /></div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-5">
                    {catItems.map((cat: any) => (
                      <CategoryCard key={cat.id} category={cat} slug={props.slug} />
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
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                <SectionHeader
                  title={section.title}
                  action={
                    settings.showMoreButton !== false && settings.showMoreUrl ? (
                      <Link to={getSectionLink(settings.showMoreUrl, props.slug)} className="text-[11px] text-[#8a7e72] hover:text-[#1a1a1a] transition-colors tracking-wider uppercase font-light flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">
                        {t('home.viewAll')} <ArrowLeft className="w-3 h-3" />
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

          case 'text': {
            const sanitized = sanitizeSectionHtml(settings.content || '');
            if (!sanitized) return null;
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <div
                  className={`text-xs text-[#6b635b] leading-relaxed font-light ${settings.alignment === 'center' ? 'text-center' : settings.alignment === 'left' ? 'text-left' : 'text-right'}`}
                  dangerouslySetInnerHTML={{ __html: sanitized }}
                />
              </section>
            );
          }

          case 'imageText': {
            const istSanitized = sanitizeSectionHtml(settings.content || '');
            if (!settings.imageUrl && !istSanitized) return null;
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <div className={`flex flex-col sm:flex-row items-center gap-6 sm:gap-8 ${settings.imagePosition === 'left' ? 'sm:flex-row-reverse' : ''}`}>
                  {settings.imageUrl && (
                    <div className="w-full sm:w-1/2">
                      <img src={settings.imageUrl} alt={section.title} className="w-full object-cover" style={{ maxHeight: 280 }} />
                    </div>
                  )}
                  <div
                    className={`w-full sm:w-1/2 text-xs text-[#6b635b] leading-relaxed font-light ${settings.alignment === 'center' ? 'text-center' : settings.alignment === 'left' ? 'text-left' : 'text-right'}`}
                    dangerouslySetInnerHTML={{ __html: istSanitized }}
                  />
                </div>
              </section>
            );
          }

          case 'brands':
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <BrandsCarousel items={(settings as any).items || []} title={section.title} speed={(settings as any).speed} />
              </section>
            );

          case 'faq':
            return (
              <section key={section.id} className={`max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 ${visibilityClass}`}>
                {section.title && <SectionHeader title={section.title} />}
                <FAQAccordion items={(settings as any).items || []} />
              </section>
            );

          default:
            return null;
        }
      })}
      <div className="max-w-[var(--container-max-width,1440px)] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <TrustBadgesSection config={props.theme} variant="home" />
      </div>
    </div>
  );
}
