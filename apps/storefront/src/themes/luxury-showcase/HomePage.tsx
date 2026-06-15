import { useTranslation } from 'react-i18next';
import type { HomePageProps } from '@haa/storefront-themes';
import { organizationJSONLD } from '@/lib/jsonld';
import { LUXURY_THEME_CLASS, defaultBackground } from './luxuryTokens';

import LuxuryHeroBanner from './components/banners/LuxuryHeroBanner';
import LuxuryThinPromoBanner from './components/banners/LuxuryThinPromoBanner';
import LuxuryBannerRenderer from './components/banners/LuxuryBannerRenderer';
import type { LuxuryBannerItem, LuxuryBannerPosition } from './components/banners/LuxuryBannerRenderer';
import LuxuryHeroSlider from './components/sliders/LuxuryHeroSlider';
import CuratedCollectionsSection from './components/sections/CuratedCollectionsSection';
import FeaturedProductsSection from './components/sections/FeaturedProductsSection';
import BestSellersSection from './components/sections/BestSellersSection';
import BrandStorySection from './components/sections/BrandStorySection';
import TrustRowSection from './components/sections/TrustRowSection';
import NewsletterSection from './components/sections/NewsletterSection';
import JournalSection from './components/sections/JournalSection';

function getCollectionsFromCategories(categories: any[]): { name: string; description?: string; imageUrl?: string; slug?: string }[] {
  return categories.slice(0, 4).map((c: any) => ({
    name: c.nameAr || c.name || '',
    description: c.description || '',
    imageUrl: c.imageUrl || c.image,
    slug: c.slug,
  }));
}

function getFeatured(products: any[], themeConfig?: any): any[] {
  const limit = themeConfig?.productCard?.limit || 8;
  return products
    .filter((p: any) => p.status === 'active')
    .slice(0, limit);
}

function getBestSellers(products: any[], themeConfig?: any): any[] {
  const limit = themeConfig?.productCard?.limit || 8;
  return products
    .filter((p: any) => p.status === 'active')
    .sort((a: any, b: any) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
    .slice(0, limit);
}

function filterBanners(banners: LuxuryBannerItem[], position: LuxuryBannerPosition): LuxuryBannerItem[] {
  return (banners || []).filter((b) => b.position === position && b.enabled !== false);
}

export default function LuxuryShowcaseHomePage(props: HomePageProps) {
  const { t } = useTranslation();

  const store = props.store || {};
  const slug = props.slug;
  const themeConfig = props.theme || {};
  const categories = props.categories || [];
  const products = props.products || [];

  const background = (themeConfig as any)?.background || defaultBackground;
  const heroConfig = (themeConfig as any)?.hero || {};
  const collectionsConfig = (themeConfig as any)?.collections || {};
  const bannersConfig = (themeConfig as any)?.banners || {};
  const slidersConfig = (themeConfig as any)?.sliders || {};

  const heroTitle = heroConfig.title || 'عطور خالدة. لحظات لا تُنسى.';
  const heroSubtitle = heroConfig.subtitle || 'جوهر الفخامة';
  const heroDescription = heroConfig.description || 'تجربة عطرية راقية صُممت بعناية لتمنح كل لحظة حضورًا لا يُنسى.';
  const heroCta = heroConfig.ctaLabel || 'تسوق المجموعة';

  const collectionItems = collectionsConfig.enabled !== false
    ? (collectionsConfig.items || getCollectionsFromCategories(categories))
    : [];

  const heroSlides = themeConfig?.homepage?.heroSlider || [];
  const bannerItems: LuxuryBannerItem[] = bannersConfig.items || [];

  const heroBanners = filterBanners(bannerItems, 'hero');
  const afterCollectionBanners = filterBanners(bannerItems, 'after-collections');
  const betweenProductsBanners = filterBanners(bannerItems, 'between-products');
  const beforeFooterBanners = filterBanners(bannerItems, 'before-footer');

  const heroSliderEnabled = slidersConfig?.hero?.enabled !== false;

  const bgStyle: React.CSSProperties = {
    backgroundColor: background.color || '#FAF7F1',
  };

  return (
    <div
      id="main-content"
      className={LUXURY_THEME_CLASS}
      style={bgStyle}
    >
      <h1 className="sr-only">{store.name}</h1>
      {store && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: organizationJSONLD(
              store.name,
              store.logoUrl || '',
              `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${slug}`,
            ),
          }}
        />
      )}

      {/* Hero Section — Slider or Banner */}
      {heroSlides.length > 1 && heroSliderEnabled ? (
        <LuxuryHeroSlider
          slides={heroSlides}
          slug={slug}
          autoplay={slidersConfig?.hero?.autoplay !== false}
        />
      ) : heroSlides.length === 1 ? (
        <LuxuryHeroBanner
          title={heroSlides[0].title || heroTitle}
          subtitle=""
          description={heroSlides[0].description || heroDescription}
          ctaLabel={heroSlides[0].buttonText || heroCta}
          ctaUrl={heroSlides[0].linkType ? undefined : `/s/${slug}/c/all`}
          imageUrl={heroSlides[0].imageUrl}
          imageMobileUrl={heroSlides[0].imageMobileUrl}
          slug={slug}
        />
      ) : (
        <LuxuryHeroBanner
          title={heroTitle}
          subtitle={heroSubtitle}
          description={heroDescription}
          ctaLabel={heroCta}
          slug={slug}
        />
      )}

      {/* Hero-position banners */}
      {heroBanners.length > 0 && bannerItems.length > 0 && (
        <LuxuryBannerRenderer items={heroBanners} slug={slug} />
      )}

      {/* Collections */}
      {collectionItems.length > 0 && (
        <CuratedCollectionsSection items={collectionItems} slug={slug} />
      )}

      {/* After-collections banners */}
      {afterCollectionBanners.length > 0 && (
        <LuxuryBannerRenderer items={afterCollectionBanners} slug={slug} />
      )}

      {/* Featured Products */}
      {products.length > 0 && (
        <FeaturedProductsSection
          products={getFeatured(products, themeConfig)}
          slug={slug}
          title={t('home.featured', 'مختارات فاخرة')}
          limit={8}
          onAddToCart={props.onAddToCart}
        />
      )}

      {/* Between-products banners */}
      {betweenProductsBanners.length > 0 ? (
        <LuxuryBannerRenderer items={betweenProductsBanners} slug={slug} />
      ) : (
        <LuxuryThinPromoBanner text={t('home.freeGiftWrap', 'تغليف فاخر مجاني للطلبات المختارة')} />
      )}

      {/* Brand Story */}
      <BrandStorySection />

      {/* Best Sellers */}
      {products.length > 0 && (
        <BestSellersSection
          products={getBestSellers(products, themeConfig)}
          slug={slug}
          title={t('home.bestSellers', 'الأكثر مبيعاً')}
          onAddToCart={props.onAddToCart}
        />
      )}

      {/* Before-footer banners */}
      {beforeFooterBanners.length > 0 && (
        <LuxuryBannerRenderer items={beforeFooterBanners} slug={slug} />
      )}

      {/* Trust Row */}
      <TrustRowSection />

      {/* Journal / Stories */}
      <JournalSection />

      {/* Newsletter */}
      <NewsletterSection />
    </div>
  );
}
