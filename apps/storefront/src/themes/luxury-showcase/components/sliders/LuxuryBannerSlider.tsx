import { Link } from 'react-router-dom';
import LuxurySlider from './LuxurySlider';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

type BannerSlide = {
  imageUrl?: string;
  imageMobileUrl?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function LuxuryBannerSlider({
  slides,
  slug,
  autoplay = false,
}: {
  slides: BannerSlide[];
  slug: string;
  autoplay?: boolean;
}) {
  if (slides.length === 0) return null;

  return (
    <LuxurySlider
      slides={slides}
      autoplay={autoplay}
      showArrows={slides.length > 1}
      showDots={false}
      ariaLabel="Banner Slider"
      className={LUXURY_THEME_CLASS}
      renderSlide={(index) => {
        const slide = slides[index];
        const href = slide.ctaHref || `/s/${slug}/c/all`;
        const hasImage = Boolean(slide.imageUrl);

        return (
          <Link
            to={href}
            className="group relative flex w-full items-center justify-center overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
            style={{ minHeight: 'clamp(200px, 30vw, 360px)', backgroundColor: 'var(--lux-image-frame, #F7EFE6)' }}
          >
            {hasImage ? (
              <picture>
                <source media="(max-width: 768px)" srcSet={slide.imageMobileUrl || slide.imageUrl} />
                <img src={slide.imageUrl} alt={slide.title || ''} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="eager" decoding="sync" />
              </picture>
            ) : (
              <div className="absolute inset-0">
                <LuxuryImageFallback aspectRatio="auto" className="w-full h-full" icon="star" />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(43,37,32,0.4) 0%, transparent 60%)' }} />
            <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
              {slide.title && <h3 className="text-xl font-light text-white">{slide.title}</h3>}
              {slide.subtitle && <p className="mt-1 text-sm font-light text-white/70">{slide.subtitle}</p>}
              {slide.ctaLabel && <span className="mt-3 text-xs font-light uppercase tracking-[0.15em] text-white/80">{slide.ctaLabel}</span>}
            </div>
          </Link>
        );
      }}
    />
  );
}
