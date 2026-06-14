import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxurySingleBanner from './LuxurySingleBanner';
import LuxuryTwoColumnBanners from './LuxuryTwoColumnBanners';
import LuxuryThreeColumnBanners from './LuxuryThreeColumnBanners';
import LuxuryProductFeatureBanner from './LuxuryProductFeatureBanner';
import LuxurySplitBanner from './LuxurySplitBanner';
import LuxuryThinPromoBanner from './LuxuryThinPromoBanner';
import LuxuryStoryBanner from './LuxuryStoryBanner';
import LuxuryCollectionBanner from './LuxuryCollectionBanner';

export type LuxuryBannerType =
  | 'single'
  | 'two-column'
  | 'three-column'
  | 'product-feature'
  | 'split'
  | 'thin-promo'
  | 'story'
  | 'collection';

export type LuxuryBannerPosition =
  | 'hero'
  | 'after-collections'
  | 'between-products'
  | 'before-story'
  | 'before-footer';

export type LuxuryBannerItem = {
  id: string;
  type: LuxuryBannerType;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  imageMobileUrl?: string;
  productSlug?: string;
  collectionSlug?: string;
  reversed?: boolean;
  position: LuxuryBannerPosition;
  enabled: boolean;
  sortOrder: number;
};

export default function LuxuryBannerRenderer({
  items,
  slug,
}: {
  items: LuxuryBannerItem[];
  slug: string;
}) {
  const enabled = items.filter((b) => b.enabled !== false).sort((a, b) => a.sortOrder - b.sortOrder);
  if (enabled.length === 0) return null;

  return (
    <>
      {enabled.map((banner) => (
        <div key={banner.id} className={LUXURY_THEME_CLASS}>
          {renderSingleBanner(banner, slug)}
        </div>
      ))}
    </>
  );
}

function renderSingleBanner(banner: LuxuryBannerItem, slug: string) {
  const base = { slug, ctaUrl: banner.ctaUrl };
  switch (banner.type) {
    case 'single':
      return (
        <LuxurySingleBanner
          title={banner.title}
          subtitle={banner.subtitle}
          description={banner.subtitle}
          ctaLabel={banner.ctaLabel}
          ctaUrl={banner.ctaUrl}
          imageUrl={banner.imageUrl}
          imageMobileUrl={banner.imageMobileUrl}
          slug={slug}
        />
      );
    case 'two-column':
      return (
        <LuxuryTwoColumnBanners
          banners={[
            { title: banner.title, subtitle: banner.subtitle, imageUrl: '', ...base },
            { title: '', subtitle: '', ...base },
          ]}
          slug={slug}
        />
      );
    case 'three-column':
      return (
        <LuxuryThreeColumnBanners
          banners={[
            { title: banner.title, subtitle: banner.subtitle, imageUrl: '', ...base },
            { title: '', subtitle: '', ...base },
            { title: '', subtitle: '', ...base },
          ]}
          slug={slug}
        />
      );
    case 'product-feature':
      return (
        <LuxuryProductFeatureBanner
          title={banner.title}
          subtitle={banner.subtitle}
          ctaLabel={banner.ctaLabel}
          ctaUrl={banner.ctaUrl}
          imageUrl={banner.imageUrl}
          productSlug={banner.productSlug}
          slug={slug}
        />
      );
    case 'split':
      return (
        <LuxurySplitBanner
          title={banner.title}
          description={banner.subtitle}
          ctaLabel={banner.ctaLabel}
          ctaUrl={banner.ctaUrl}
          imageUrl={banner.imageUrl}
          slug={slug}
        />
      );
    case 'thin-promo':
      return <LuxuryThinPromoBanner text={banner.title} />;
    case 'story':
      return (
        <LuxuryStoryBanner
          title={banner.title}
          description={banner.subtitle}
        />
      );
    case 'collection':
      return (
        <LuxuryCollectionBanner
          name={banner.title}
          description={banner.subtitle}
          imageUrl={banner.imageUrl}
          slug={slug}
          categorySlug={banner.collectionSlug}
        />
      );
    default:
      return null;
  }
}
