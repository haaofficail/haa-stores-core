import { useRef, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';

type SlideRenderFn = (index: number) => React.ReactNode;

export type LuxurySliderProps = {
  slides: unknown[];
  renderSlide: SlideRenderFn;
  id?: string;
  autoplay?: boolean;
  intervalMs?: number;
  showArrows?: boolean;
  showDots?: boolean;
  className?: string;
  ariaLabel?: string;
};

export default function LuxurySlider({
  slides,
  renderSlide,
  autoplay = false,
  intervalMs = 5000,
  showArrows = true,
  showDots = true,
  className = '',
  ariaLabel,
}: LuxurySliderProps) {
  const { i18n } = useTranslation();
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const total = slides.length;
  if (total === 0) return null;

  const isRtl = i18n.language === 'ar';

  const goTo = useCallback((index: number) => {
    if (index < 0) setCurrent(total - 1);
    else if (index >= total) setCurrent(0);
    else setCurrent(index);
  }, [total]);

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (!autoplay || total <= 1) return;
    timerRef.current = setInterval(goNext, intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoplay, intervalMs, goNext, total]);

  if (total === 1) {
    return (
      <div className={`${LUXURY_THEME_CLASS} ${className}`}>
        {renderSlide(0)}
      </div>
    );
  }

  return (
    <div className={`${LUXURY_THEME_CLASS} relative ${className}`} ref={containerRef} role="region" aria-label={ariaLabel || 'Slider'}>
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${isRtl ? '' : '-'}${current * 100}%)` }}
        >
          {slides.map((_, i) => (
            <div key={i} className="w-full shrink-0" role="group" aria-roledescription="slide" aria-label={`Slide ${i + 1} of ${total}`}>
              {renderSlide(i)}
            </div>
          ))}
        </div>
      </div>

      {showArrows && total > 1 && (
        <>
          <button
            type="button"
            onClick={isRtl ? goNext : goPrev}
            className="absolute start-3 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
            style={{ backgroundColor: 'rgba(250,247,241,0.8)', color: 'var(--lux-muted, #756B61)' }}
            aria-label="السابق"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={isRtl ? goPrev : goNext}
            className="absolute end-3 top-1/2 z-10 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
            style={{ backgroundColor: 'rgba(250,247,241,0.8)', color: 'var(--lux-muted, #756B61)' }}
            aria-label="التالي"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}

      {showDots && total > 1 && (
        <div className="absolute bottom-4 start-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className="flex h-8 w-8 items-center justify-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              aria-label={`Slide ${i + 1}`}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  i === current ? 'bg-[var(--lux-primary)]' : 'bg-[var(--lux-border)]'
                }`}
                style={{ height: i === current ? '8px' : '6px', width: i === current ? '24px' : '6px' }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
