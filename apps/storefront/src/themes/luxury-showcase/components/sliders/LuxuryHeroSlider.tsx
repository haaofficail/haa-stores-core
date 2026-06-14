import { Link } from 'react-router-dom';
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
                <img src={slide.imageUrl} alt={slide.title || ''} className="absolute inset-0 h-full w-full object-cover" />
              </picture>
            ) : (
              <div className="absolute inset-0">
                <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon="perfume" />
              </div>
            )}
            {hasImage && (
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, rgba(43,37,32,0.7) 0%, rgba(43,37,32,0.15) 50%, transparent 100%)' }} />
            )}
            <div className="relative z-10 mx-auto flex w-full max-w-[var(--container-max-width,1440px)] flex-col items-start justify-center px-6 sm:px-10 lg:px-12">
              {slide.title && (
                <h2
                  className="mb-2 max-w-2xl text-[clamp(28px,5vw,68px)] font-light leading-tight tracking-tight"
                  style={{ color: hasImage ? '#FFFFFF' : 'var(--lux-text, #2B2520)' }}
                >
                  {slide.title}
                </h2>
              )}
              {slide.description && (
                <p
                  className="max-w-lg text-base font-light leading-relaxed sm:text-lg"
                  style={{ color: hasImage ? 'rgba(255,255,255,0.85)' : 'var(--lux-muted, #756B61)' }}
                >
                  {slide.description}
                </p>
              )}
              {slide.buttonText && (
                <span
                  className="mt-6 inline-flex min-h-[48px] items-center justify-center px-8 text-xs font-light uppercase tracking-[0.15em] transition-all"
                  style={{
                    color: hasImage ? '#FFFFFF' : 'var(--lux-primary, #B88A3D)',
                    border: hasImage ? '1px solid rgba(255,255,255,0.4)' : '1px solid var(--lux-primary, #B88A3D)',
                    borderRadius: '3px',
                  }}
                >
                  {slide.buttonText}
                </span>
              )}
            </div>
          </Link>
        );
      }}
    />
  );
}
