import { Link } from 'react-router-dom';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

/**
 * LuxuryHeroBanner — main hero banner
 *
 * المقاسات الافتراضية:
 *   mobile  (390px):  360px ارتفاع
 *   tablet  (768px):  50vw ارتفاع
 *   desktop (1440px): 620px ارتفاع
 *
 * الصور:
 *   desktop: imageUrl (1920×620 يُفضل)
 *   mobile:  imageMobileUrl (600×420 يُفضل) — fallback إلى imageUrl
 *
 * النص:
 *   في single mode خلفية موحدة مع الثيم
 *   مع صورة: نص أبيض + overlay داكن
 *   بدون صورة: نص بلون الثيم
 */

export type HeroBannerProps = {
  title: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  imageMobileUrl?: string;
  slug: string;
};

export default function LuxuryHeroBanner({
  title = 'عطور خالدة. لحظات لا تُنسى.',
  subtitle = '',
  description = 'تجربة عطرية راقية صُممت بعناية لتمنح كل لحظة حضورًا لا يُنسى.',
  ctaLabel = 'تسوق المجموعة',
  ctaUrl,
  imageUrl,
  imageMobileUrl,
  slug,
}: HeroBannerProps) {
  const href = ctaUrl || `/s/${slug}/c/all`;
  const hasImage = Boolean(imageUrl);

  return (
    <section className={`${LUXURY_THEME_CLASS} relative overflow-hidden`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div
        className="relative flex items-center justify-center w-full"
        style={{ minHeight: 'clamp(360px, 50vw, 620px)' }}
      >
        {hasImage ? (
          <picture>
            <source media="(max-width: 768px)" srcSet={imageMobileUrl || imageUrl} />
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        ) : (
          <div className="absolute inset-0">
            <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon="perfume" />
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background: hasImage
              ? 'linear-gradient(to left, rgba(43,37,32,0.7) 0%, rgba(43,37,32,0.15) 50%, transparent 100%)'
              : 'none',
          }}
        />
        <div className="relative z-10 mx-auto flex w-full max-w-[var(--container-max-width,1440px)] flex-col items-start justify-center px-6 sm:px-10 lg:px-12">
          {subtitle && (
            <span
              className="mb-2 text-[11px] font-light uppercase tracking-[0.2em]"
              style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : 'var(--lux-muted, #756B61)' }}
            >
              {subtitle}
            </span>
          )}
          <h2
            className="max-w-2xl text-[clamp(28px,5vw,68px)] font-light leading-tight tracking-tight"
            style={{ color: hasImage ? '#FFFFFF' : 'var(--lux-text, #2B2520)' }}
          >
            {title}
          </h2>
          {description && (
            <p
              className="mt-3 max-w-lg text-base sm:text-lg font-light leading-relaxed"
              style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-muted, #756B61)' }}
            >
              {description}
            </p>
          )}
          {ctaLabel && (
            <Link
              to={href}
              className="mt-6 inline-flex min-h-[48px] items-center justify-center px-8 text-xs font-light uppercase tracking-[0.15em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              style={{
                color: hasImage ? '#FFFFFF' : 'var(--lux-primary, #B88A3D)',
                border: hasImage ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--lux-primary, #B88A3D)',
                borderRadius: '3px',
              }}
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
