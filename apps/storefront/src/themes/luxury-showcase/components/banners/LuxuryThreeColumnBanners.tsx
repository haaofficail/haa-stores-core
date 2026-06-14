import { Link } from 'react-router-dom';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

/**
 * LuxuryThreeColumnBanners — ثلاث بنرات جنب بعض
 *
 * المقاسات الافتراضية:
 *   mobile  (390px): 160px ارتفاع — grid عمودي (فوق بعض)
 *   tablet  (768px): 24vw ارتفاع — grid أفقي (3 أعمدة)
 *   desktop (1440px): 280px ارتفاع — grid أفقي
 *
 * ديسكتوب: 3 بنرات جنب بعض
 * جوال: فوق بعض (stack)
 */

type ColumnBannerItem = {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  slug: string;
};

export default function LuxuryThreeColumnBanners({
  banners,
  slug,
}: {
  banners: [ColumnBannerItem, ColumnBannerItem, ColumnBannerItem];
  slug: string;
}) {
  return (
    <section className={`${LUXURY_THEME_CLASS}`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="mx-auto grid max-w-[var(--container-max-width,1440px)] grid-cols-1 gap-0 sm:grid-cols-3">
        {banners.map((b, i) => {
          const href = b.ctaUrl || `/s/${slug}/c/all`;
          const hasImage = Boolean(b.imageUrl);
          return (
            <Link
              key={i}
              to={href}
              className="group relative flex items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              style={{ minHeight: 'clamp(160px, 24vw, 280px)', backgroundColor: 'var(--lux-image-frame, #F7EFE6)' }}
            >
              {hasImage ? (
                <img src={b.imageUrl} alt={b.title || ''} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0">
                  <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon={['star', 'perfume', 'gift'][i] as any} />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center justify-center p-5 text-center">
                {b.title && <h3 className="text-base font-light text-white">{b.title}</h3>}
                {b.subtitle && <p className="mt-1 text-[11px] font-light text-white/70">{b.subtitle}</p>}
                {b.ctaLabel && <span className="mt-2 text-[10px] font-light uppercase tracking-[0.15em] text-white/80">{b.ctaLabel}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
