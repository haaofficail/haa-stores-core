import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LUXURY_THEME_CLASS } from '../../luxuryTokens';
import LuxuryImageFallback from '../LuxuryImageFallback';

type AnyRecord = Record<string, any>;

function resolveImageUrl(img: unknown): string {
  if (typeof img === 'string') return img;
  if (img && typeof img === 'object') {
    const o = img as Record<string, unknown>;
    return String(o.url ?? o.src ?? o.imageUrl ?? o.publicUrl ?? o.key ?? o.path ?? '');
  }
  return '';
}

function getImages(product: AnyRecord): string[] {
  const rawImages = product?.images ?? product?.productImages ?? [];
  const fromArray = Array.isArray(rawImages) ? rawImages.map(resolveImageUrl).filter(Boolean) : [];
  const single = resolveImageUrl(product?.imageUrl ?? product?.image ?? product?.thumbnailUrl ?? product?.thumbnail ?? product?.coverImage ?? product?.mainImage ?? product?.primaryImage ?? '');
  return Array.from(new Set([...fromArray, single].filter(Boolean)));
}

export default function LuxuryProductGallerySlider({
  product,
}: {
  product: AnyRecord;
}) {
  const { t } = useTranslation();
  const images = useMemo(() => getImages(product), [product]);
  const [activeIndex, setActiveIndex] = useState(0);

  const activeImage = images[activeIndex];
  const hasThumbnails = images.length > 1;

  const goTo = useCallback((i: number) => {
    if (i < 0) setActiveIndex(images.length - 1);
    else if (i >= images.length) setActiveIndex(0);
    else setActiveIndex(i);
  }, [images.length]);

  return (
    <div className={`${LUXURY_THEME_CLASS} flex flex-col gap-4 lg:flex-row lg:items-start`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
      <div className="min-w-0 flex-1">
        <div
          className="group relative flex items-center justify-center overflow-hidden"
          style={{
            minHeight: 'clamp(360px, 50vw, 520px)',
            backgroundColor: 'var(--lux-image-frame, #F7EFE6)',
            borderRadius: '4px',
          }}
        >
          {activeImage ? (
            <img
              src={activeImage}
              alt={product?.nameAr || product?.name || 'صورة المنتج'}
              className="relative z-10 max-h-[85%] max-w-[90%] object-contain lg:max-h-[88%] lg:max-w-[88%]"
              loading="eager"
              decoding="sync"
            />
          ) : (
            <div className="relative z-10 flex w-full flex-col items-center justify-center">
              <LuxuryImageFallback aspectRatio="1/1" className="w-48 h-48 sm:w-56 sm:h-56" icon="perfume" />
              <p className="mt-2 text-sm font-light" style={{ color: 'var(--lux-muted, #756B61)' }}>
                {t('product.noImage', 'لا توجد صورة للمنتج')}
              </p>
            </div>
          )}

          {hasThumbnails && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute end-3 top-1/2 z-20 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full opacity-0 shadow-sm transition hover:text-[var(--lux-text)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
                style={{ backgroundColor: 'rgba(250,247,241,0.8)', color: 'var(--lux-muted, #756B61)' }}
                aria-label="الصورة السابقة"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute start-3 top-1/2 z-20 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full opacity-0 shadow-sm transition hover:text-[var(--lux-text)] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
                style={{ backgroundColor: 'rgba(250,247,241,0.8)', color: 'var(--lux-muted, #756B61)' }}
                aria-label="الصورة التالية"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {hasThumbnails && (
        <div className="flex shrink-0 gap-3 overflow-x-auto lg:w-24 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden" role="tablist" aria-label="صور المنتج">
          {images.map((image, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={`${image}-${index}`}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveIndex(index)}
                className="h-20 w-20 shrink-0 overflow-hidden transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)] lg:h-[92px] lg:w-[92px]"
                style={{
                  backgroundColor: 'var(--lux-image-frame, #F7EFE6)',
                  borderRadius: '4px',
                  border: active ? '1px solid var(--lux-primary, #B88A3D)' : '1px solid var(--lux-border, #E6D8C6)',
                  opacity: active ? 1 : 0.7,
                }}
                aria-label={`عرض الصورة ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full object-cover" loading={index === 0 ? 'eager' : 'lazy'} decoding={index === 0 ? 'sync' : 'async'} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
