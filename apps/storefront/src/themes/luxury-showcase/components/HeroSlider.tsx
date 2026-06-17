import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import '@splidejs/react-splide/css/core';
import { LUXURY_THEME_CLASS } from '../luxuryTokens';

type Slide = {
  imageUrl: string;
  imageMobileUrl?: string;
  title?: string;
  description?: string;
  buttonText?: string;
  linkType?: string;
  linkValue?: string;
  openInNewTab?: boolean;
};

function resolveHref(slide: Slide, slug: string): string {
  const type = slide.linkType || 'all';
  if (type === 'all') return `/s/${slug}/c/all`;
  if (type === 'category') return `/s/${slug}/c/${slide.linkValue || 'all'}`;
  if (type === 'product') return `/s/${slug}/p/${slide.linkValue}`;
  return slide.linkValue || `/s/${slug}/c/all`;
}

export default function HeroSlider({ slides, slug }: { slides: Slide[]; slug: string }) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const splideRef = useRef<any>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const instance = splideRef.current?.splide;
    if (!instance) return;
    const onMoved = () => setCurrent(instance.index);
    instance.on('moved', onMoved);
    return () => { instance.off('moved', onMoved); };
  }, []);

  if (!slides || slides.length === 0) return null;

  return (
    <div className={`${LUXURY_THEME_CLASS} relative`}>
      <Splide
        ref={splideRef}
        options={{
          type: 'loop',
          autoplay: true,
          interval: 5000,
          pauseOnHover: true,
          pagination: false,
          arrows: false,
          speed: 800,
          direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
        }}
        aria-label="Hero Slider"
      >
        {slides.map((slide, index) => {
          const href = resolveHref(slide, slug);
          const isExternal = slide.linkType === 'custom' && /^https?:\/\//.test(slide.linkValue || '');
          const hasImage = slide.imageUrl?.trim().length > 0;

          return (
            <SplideSlide key={index}>
              <div
                onClick={() => {
                  if (isExternal) {
                    window.open(slide.linkValue, slide.openInNewTab !== false ? '_blank' : undefined, 'noopener,noreferrer');
                  } else {
                    navigate(href);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (isExternal) {
                      window.open(slide.linkValue, slide.openInNewTab !== false ? '_blank' : undefined, 'noopener,noreferrer');
                    } else {
                      navigate(href);
                    }
                  }
                }}
                role="link"
                tabIndex={0}
                className="relative flex h-[420px] w-full cursor-pointer items-center justify-center overflow-hidden bg-[var(--surface-1)] sm:h-[520px] lg:h-[620px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
              >
                {hasImage && (
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
                )}
                <div className={`absolute inset-0 ${hasImage ? 'bg-gradient-to-l from-[var(--text-primary)]/70 via-[var(--text-primary)]/20 to-transparent' : 'hidden'}`} />
                <div className="relative z-10 mx-auto flex w-full max-w-[var(--container-max-width,1440px)] flex-col justify-center px-4 sm:px-6 lg:px-8">
                  {slide.title && (
                    <span className="mb-2 text-xs font-light uppercase tracking-[0.2em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                      {slide.title}
                    </span>
                  )}
                  {slide.description && (
                    <p className="mb-4 max-w-md text-lg font-light leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] sm:text-xl lg:text-2xl">
                      {slide.description}
                    </p>
                  )}
                  {slide.buttonText && (
                    <span
                      className="inline-flex min-h-[44px] w-max items-center justify-center px-6 text-xs font-light uppercase tracking-[0.15em] transition hover:opacity-90"
                      style={{
                        backgroundColor: 'var(--lux-primary, #B88A3D)',
                        color: '#FFFFFF',
                        border: '1px solid var(--lux-primary, #B88A3D)',
                      }}
                    >
                      {slide.buttonText}
                    </span>
                  )}
                </div>
              </div>
            </SplideSlide>
          );
        })}
      </Splide>
      {slides.length > 1 && (
        <div className="absolute bottom-4 start-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => splideRef.current?.go(i)}
              className="flex h-11 w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
              aria-label={`Go to slide ${i + 1}`}
            >
              <span className={`block rounded-full transition-all duration-300 ${
                i === current ? 'h-1.5 w-6 bg-[var(--surface-1)]' : 'h-1.5 w-1.5 bg-[var(--surface-1)]/30 hover:bg-[var(--surface-1)]/50'
              }`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
