import { Link } from 'react-router-dom';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

/**
 * LuxurySingleBanner — بنر كامل العرض
 *
 * المقاسات الافتراضية:
 *   mobile  (390px):  220px ارتفاع
 *   tablet  (768px):  35vw ارتفاع
 *   desktop (1440px): 400px ارتفاع
 *
 * الاستخدام: بنر ترويجي، عرض خاص، إعلان منتصف الصفحة
 */

export default function LuxurySingleBanner({
  title = '',
  subtitle = '',
  description = '',
  ctaLabel,
  ctaUrl,
  imageUrl,
  imageMobileUrl,
  slug,
}: {
  title?: string;
  subtitle?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  imageMobileUrl?: string;
  slug: string;
}) {
  const href = ctaUrl || `/s/${slug}/c/all`;
  const hasImage = Boolean(imageUrl);

  return (
    <section className={`${LUXURY_THEME_CLASS} relative overflow-hidden`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)', borderTop: '1px solid var(--lux-border, #E6D8C6)', borderBottom: '1px solid var(--lux-border, #E6D8C6)' }}>
      <div
        className="relative flex items-center justify-center w-full"
        style={{ minHeight: 'clamp(220px, 35vw, 400px)' }}
      >
        {hasImage ? (
          <picture>
            <source media="(max-width: 768px)" srcSet={imageMobileUrl || imageUrl} />
            <img src={imageUrl} alt={title} className="absolute inset-0 h-full w-full object-cover" loading="eager" decoding="sync" />
          </picture>
        ) : (
          <div className="absolute inset-0">
            <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon="star" />
          </div>
        )}
        {hasImage && (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, rgba(43,37,32,0.5) 0%, transparent 60%)' }} />
        )}
        <div className="relative z-10 mx-auto flex w-full max-w-[var(--container-max-width,1440px)] flex-col items-center justify-center px-6 text-center sm:px-10">
          {subtitle && (
            <span className="mb-2 text-[11px] font-light uppercase tracking-[0.2em]" style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : 'var(--lux-muted, #756B61)' }}>
              {subtitle}
            </span>
          )}
          {title && (
            <h3 className="max-w-xl text-[clamp(20px,3vw,36px)] font-light leading-tight" style={{ color: hasImage ? '#FFFFFF' : 'var(--lux-text, #2B2520)' }}>
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-2 max-w-md text-sm font-light leading-relaxed" style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-muted, #756B61)' }}>
              {description}
            </p>
          )}
          {ctaLabel && (
            <Link
              to={href}
              className="mt-4 inline-flex min-h-[42px] items-center justify-center px-6 text-xs font-light uppercase tracking-[0.15em] transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
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
