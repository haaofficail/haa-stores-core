import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryCollectionBanner from '../banners/LuxuryCollectionBanner';

type CollectionItem = {
  name: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
};

export default function LuxuryCollectionCarousel({
  items,
  slug,
  slidesPerView = 4,
}: {
  items: CollectionItem[];
  slug: string;
  slidesPerView?: number;
}) {
  const { i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRtl = i18n.language === 'ar';

  if (items.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: isRtl ? (dir === 'left' ? amount : -amount) : (dir === 'left' ? -amount : amount),
      behavior: 'smooth',
    });
  };

  return (
    <div className={`${LUXURY_THEME_CLASS} relative`}>
      <div className="absolute start-0 top-1/2 z-10 -translate-y-1/2">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
          style={{ backgroundColor: 'rgba(250,247,241,0.85)', color: 'var(--lux-muted, #756B61)' }}
          aria-label="السابق"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute end-0 top-1/2 z-10 -translate-y-1/2">
        <button
          type="button"
          onClick={() => scroll('right')}
          className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
          style={{ backgroundColor: 'rgba(250,247,241,0.85)', color: 'var(--lux-muted, #756B61)' }}
          aria-label="التالي"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', padding: '4px 0' }}
      >
        {items.map((item, i) => (
          <div
            key={item.slug || i}
            className="snap-start shrink-0"
            style={{ width: `calc(${100 / Math.min(slidesPerView, items.length)}% - 12px)` }}
          >
            <LuxuryCollectionBanner
              name={item.name}
              description={item.description}
              imageUrl={item.imageUrl}
              slug={slug}
              categorySlug={item.slug}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
