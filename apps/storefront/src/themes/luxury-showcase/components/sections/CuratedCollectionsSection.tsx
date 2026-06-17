import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryCollectionBanner from '../banners/LuxuryCollectionBanner';

type CollectionItem = {
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
};

export default function CuratedCollectionsSection({
  items,
  slug,
}: {
  items: CollectionItem[];
  slug: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className={`${LUXURY_THEME_CLASS} py-12 sm:py-14 lg:py-16`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto max-w-[var(--container-max-width,1440px)] px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <p
            className="mb-3 text-xs font-light uppercase tracking-[0.32em]"
            style={{ color: 'var(--lux-primary, #B88A3D)' }}
          >
            Featured Collections
          </p>
          <h2
            className="text-[clamp(22px,3vw,36px)] font-light leading-tight tracking-[-0.01em]"
            style={{
              color: 'var(--lux-text, #2B2520)',
              fontFamily: 'theme-serif, "IBM Plex Sans Arabic", serif',
            }}
          >
            مجموعات مختارة
          </h2>
          <div className="mx-auto mt-3 h-px w-10" style={{ backgroundColor: 'var(--lux-primary, #B88A3D)' }} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
          {items.slice(0, 4).map((item, i) => (
            <LuxuryCollectionBanner
              key={item.slug || i}
              name={item.name}
              description={item.description}
              imageUrl={item.imageUrl}
              slug={slug}
              categorySlug={item.slug}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
