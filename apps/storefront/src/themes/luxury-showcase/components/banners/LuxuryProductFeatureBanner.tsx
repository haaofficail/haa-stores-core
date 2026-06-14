import { Link } from 'react-router-dom';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

/**
 * LuxuryProductFeatureBanner — بنر مع منتج مميز
 *
 * المقاسات الافتراضية:
 *   mobile  (390px): 240px ارتفاع (صورة فوق، نص تحت)
 *   tablet  (768px): 35vw ارتفاع
 *   desktop (1440px): 380px ارتفاع (صورة يمين، نص يسار)
 *
 * ديسكتوب: صورة + نص جنب بعض
 * جوال: صورة فوق، نص تحت
 *
 * يستخدم لعرض منتج معين أو إطلاق منتج جديد
 */

export default function LuxuryProductFeatureBanner({
  title = '',
  subtitle = '',
  ctaLabel,
  ctaUrl,
  imageUrl,
  productSlug,
  slug,
}: {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  productSlug?: string;
  slug: string;
}) {
  const href = productSlug ? `/s/${slug}/p/${productSlug}` : ctaUrl || `/s/${slug}/c/all`;
  const hasImage = Boolean(imageUrl);

  return (
    <section className={`${LUXURY_THEME_CLASS}`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <Link
        to={href}
        className="group relative mx-auto flex max-w-[var(--container-max-width,1440px)] flex-col items-center overflow-hidden sm:flex-row focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
        style={{ minHeight: 'clamp(240px, 35vw, 380px)', backgroundColor: 'var(--lux-image-frame, #F7EFE6)' }}
      >
        <div className="flex w-full items-center justify-center sm:w-1/2" style={{ minHeight: 'clamp(200px, 30vw, 340px)' }}>
          {hasImage ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <LuxuryImageFallback aspectRatio="1/1" className="w-40 h-40 sm:w-48 sm:h-48" icon="perfume" />
          )}
        </div>
        <div className="flex w-full flex-col items-start justify-center px-6 py-8 sm:w-1/2 sm:px-10">
          {subtitle && (
            <span className="mb-2 text-[11px] font-light uppercase tracking-[0.2em]" style={{ color: 'var(--lux-muted, #756B61)' }}>
              {subtitle}
            </span>
          )}
          {title && (
            <h3 className="text-[clamp(20px,3vw,32px)] font-light leading-tight" style={{ color: 'var(--lux-text, #2B2520)' }}>
              {title}
            </h3>
          )}
          {ctaLabel && (
            <span className="mt-4 text-xs font-light uppercase tracking-[0.15em]" style={{ color: 'var(--lux-primary, #B88A3D)' }}>
              {ctaLabel}
            </span>
          )}
        </div>
      </Link>
    </section>
  );
}
