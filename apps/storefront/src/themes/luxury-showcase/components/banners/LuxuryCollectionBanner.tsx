import { Link } from 'react-router-dom';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

/**
 * LuxuryCollectionBanner — بطاقة تصنيف / مجموعة
 *
 * المقاسات الافتراضية:
 *   mobile  (390px): 200px ارتفاع
 *   tablet  (768px): 30vw ارتفاع
 *   desktop (1440px): 320px ارتفاع
 *
 * تستخدم في CuratedCollectionsSection أو LuxuryCollectionCarousel
 * تحتوي صورة + gradient + اسم التصنيف + زر استكشف
 * عند غياب الصورة: LuxuryImageFallback
 */

export default function LuxuryCollectionBanner({
  name = 'المجموعة',
  description = 'اكتشف مجموعتنا المختارة',
  imageUrl,
  slug,
  categorySlug,
}: {
  name?: string;
  description?: string;
  imageUrl?: string;
  slug: string;
  categorySlug?: string;
}) {
  const href = categorySlug ? `/s/${slug}/c/${categorySlug}` : `/s/${slug}/c/all`;

  return (
    <Link
      to={href}
      className={`${LUXURY_THEME_CLASS} group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]`}
      style={{ backgroundColor: 'var(--lux-image-frame, #F7EFE6)', minHeight: 'clamp(200px, 30vw, 320px)' }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
      ) : (
        <div className="absolute inset-0">
          <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon="star" />
        </div>
      )}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(43,37,32,0.5) 0%, transparent 60%)' }} />
      <div className="relative z-10 flex h-full flex-col justify-end p-6">
        <h3 className="text-lg font-light text-white">{name}</h3>
        {description && <p className="mt-1 text-xs font-light text-white/70">{description}</p>}
        <span className="mt-2 text-xs font-light uppercase tracking-[0.15em] text-white/80">
          استكشف
        </span>
      </div>
    </Link>
  );
}
