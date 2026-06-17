import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Store } from 'lucide-react';
import LuxurySlider from './LuxurySlider';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

type HeroSlide = {
  imageUrl?: string;
  imageMobileUrl?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  linkType?: string;
  linkValue?: string;
};

function resolveHref(slide: HeroSlide, slug: string): string {
  const type = slide.linkType || 'all';
  if (type === 'all') return `/s/${slug}/c/all`;
  if (type === 'category') return `/s/${slug}/c/${slide.linkValue || 'all'}`;
  if (type === 'product') return `/s/${slug}/p/${slide.linkValue}`;
  return slide.linkValue || `/s/${slug}/c/all`;
}

export default function LuxuryHeroSlider({
  slides,
  slug,
  autoplay = false,
}: {
  slides: HeroSlide[];
  slug: string;
  autoplay?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (slides.length === 0) return null;

  return (
    <LuxurySlider
      slides={slides}
      autoplay={autoplay}
      showArrows={slides.length > 1}
      showDots={slides.length > 1}
      ariaLabel="Hero Slider"
      className={LUXURY_THEME_CLASS}
      renderSlide={(index) => {
        const slide = slides[index];
        const href = resolveHref(slide, slug);
        const hasImage = Boolean(slide.imageUrl);

        return (
          <Link
            to={href}
            className="relative flex w-full items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--lux-primary)]"
            style={{ minHeight: 'clamp(360px, 50vw, 620px)', backgroundColor: 'var(--lux-bg, #FAF7F1)' }}
          >
            {hasImage ? (
              <picture>
                <source media="(max-width: 768px)" srcSet={slide.imageMobileUrl || slide.imageUrl} />
                <img
                  src={slide.imageUrl}
                  alt={slide.title || ''}
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
            {hasImage && (
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, rgba(43,37,32,0.7) 0%, rgba(43,37,32,0.15) 50%, transparent 100%)' }} />
            )}
            <div className="relative z-10 mx-auto flex w-full max-w-[var(--container-max-width,1440px)] flex-col items-start justify-center px-6 sm:px-10 lg:px-12">
              {slide.title && (
                <span
                  className="mb-4 inline-flex items-center text-xs font-light uppercase tracking-[0.32em]"
                  style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-primary, #B88A3D)' }}
                >
                  {t('hero.eyebrow', 'مدعوم من هاء ستورز')}
                </span>
              )}
              {slide.title && (
                <h2
                  className="mb-3 max-w-2xl text-[clamp(32px,5vw,72px)] font-light leading-[1.05] tracking-[-0.01em]"
                  style={{
                    color: hasImage ? '#FFFFFF' : 'var(--lux-text, #2B2520)',
                    fontFamily: 'theme-serif, "IBM Plex Sans Arabic", serif',
                  }}
                >
                  {slide.title}
                </h2>
              )}
              {slide.description && (
                <p
                  className="max-w-lg text-[15px] font-light leading-[1.65] sm:text-[17px]"
                  style={{
                    color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-muted, #756B61)',
                    fontFamily: 'theme-sans, "IBM Plex Sans Arabic", sans-serif',
                  }}
                >
                  {slide.description}
                </p>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {slide.buttonText && (
                  <span
                    className="inline-flex min-h-[48px] items-center justify-center px-8 text-xs font-light uppercase tracking-[0.18em] transition-all hover:opacity-90"
                    style={{
                      color: '#FFFFFF',
                      backgroundColor: 'var(--lux-primary, #B88A3D)',
                      border: '1px solid var(--lux-primary, #B88A3D)',
                      borderRadius: '3px',
                    }}
                  >
                    {slide.buttonText}
                  </span>
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
          </Link>
        );
      }}
    />
  );
}
