import { Link } from 'react-router-dom';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

/**
 * LuxurySplitBanner — نصفين: صورة + نص
 *
 * المقاسات الافتراضية:
 *   mobile  (390px): 280px ارتفاع (صورة فوق، نص تحت)
 *   tablet  (768px): 35vw ارتفاع
 *   desktop (1440px): 400px ارتفاع (صورة يمين، نص يسار)
 *
 * ديسكتوب: نص + صورة جنب بعض
 * جوال: فوق بعض
 * يدعم reversed لعكس الترتيب
 */

export default function LuxurySplitBanner({
  title = 'قصة عطر',
  description = 'كل عطر يحكي قصة. اكتشف الحرفية وراء كل قطرة.',
  ctaLabel = 'اكتشف القصة',
  ctaUrl,
  imageUrl,
  slug,
  reversed = false,
}: {
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  slug: string;
  reversed?: boolean;
}) {
  const href = ctaUrl || `/s/${slug}/c/all`;

  return (
    <section className={`${LUXURY_THEME_CLASS}`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className={`mx-auto flex max-w-[var(--container-max-width,1440px)] flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} px-4 sm:px-6 lg:px-8`}>
        <div className="flex items-center justify-center lg:w-1/2" style={{ minHeight: 'clamp(280px, 35vw, 400px)' }}>
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <LuxuryImageFallback aspectRatio="4/3" className="w-full" icon="star" />
          )}
        </div>
        <div className="flex flex-col justify-center px-6 py-10 lg:w-1/2 lg:px-12">
          <h3 className="text-[clamp(20px,3vw,34px)] font-light leading-tight" style={{ color: 'var(--lux-text, #2B2520)' }}>
            {title}
          </h3>
          {description && (
            <p className="mt-3 text-sm font-light leading-relaxed" style={{ color: 'var(--lux-muted, #756B61)' }}>
              {description}
            </p>
          )}
          {ctaLabel && (
            <Link
              to={href}
              className="mt-5 inline-flex items-center gap-1 text-xs font-light uppercase tracking-[0.15em] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              style={{ color: 'var(--lux-primary, #B88A3D)' }}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
