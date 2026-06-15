import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
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
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
          </picture>
        ) : (
          <div className="absolute inset-0">
            <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon="hero" />
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
          {/* Eyebrow — small uppercase label that anchors the brand */}
          <span
            className="mb-4 inline-flex items-center text-[10px] font-light uppercase tracking-[0.32em]"
            style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-primary, #B88A3D)' }}
          >
            {t('hero.eyebrow', 'مدعوم من هاء ستورز')}
          </span>
          {subtitle && (
            <span
              className="mb-2 text-[11px] font-light uppercase tracking-[0.2em]"
              style={{ color: hasImage ? 'rgba(255,255,255,0.7)' : 'var(--lux-muted, #756B61)' }}
            >
              {subtitle}
            </span>
          )}
          <h2
            className="max-w-2xl text-[clamp(32px,5vw,72px)] font-light leading-[1.05] tracking-[-0.01em]"
            style={{
              color: hasImage ? '#FFFFFF' : 'var(--lux-text, #2B2520)',
              fontFamily: 'theme-serif, "IBM Plex Sans Arabic", serif',
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              className="mt-3 max-w-lg text-[15px] font-light leading-[1.65] sm:text-[17px]"
              style={{
                color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-muted, #756B61)',
                fontFamily: 'theme-sans, "IBM Plex Sans Arabic", sans-serif',
              }}
            >
              {description}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ctaLabel && (
              <Link
                to={href}
                className="inline-flex min-h-[48px] items-center justify-center px-8 text-xs font-light uppercase tracking-[0.18em] transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
                style={{
                  color: '#FFFFFF',
                  backgroundColor: 'var(--lux-primary, #B88A3D)',
                  border: '1px solid var(--lux-primary, #B88A3D)',
                  borderRadius: '3px',
                }}
              >
                {ctaLabel}
              </Link>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/signup');
              }}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 px-6 text-xs font-light uppercase tracking-[0.18em] transition-all hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              style={{
                color: hasImage ? '#FFFFFF' : 'var(--lux-text, #2B2520)',
                border: hasImage
                  ? '1px solid rgba(255,255,255,0.6)'
                  : '1px solid var(--lux-text, #2B2520)',
                borderRadius: '3px',
              }}
            >
              <Store className="h-3.5 w-3.5" strokeWidth={1.5} />
              {t('hero.buildYourStoreCta', 'ابنِ متجرك')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
