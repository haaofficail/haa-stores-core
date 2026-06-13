import { useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

type AnyRecord = Record<string, any>;

function resolveImageUrl(img: unknown): string {
  if (typeof img === 'string') return img;
  if (img && typeof img === 'object') {
    const o = img as Record<string, unknown>;
    return (
      String(o.url ?? o.src ?? o.imageUrl ?? o.publicUrl ?? o.key ?? o.path ?? '')
    );
  }
  return '';
}

function getImages(product: AnyRecord): string[] {
  const rawImages = product?.images ?? product?.productImages ?? [];
  const fromArray = Array.isArray(rawImages)
    ? rawImages.map(resolveImageUrl).filter(Boolean)
    : [];

  const single = resolveImageUrl(
    product?.imageUrl ??
      product?.image ??
      product?.thumbnailUrl ??
      product?.thumbnail ??
      product?.coverImage ??
      product?.mainImage ??
      product?.primaryImage ??
      '',
  );

  return Array.from(new Set([...fromArray, single].filter(Boolean)));
}

export function LuxuryProductGallery({ product }: { product: AnyRecord }) {
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
    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Main image — first in DOM so RTL places it rightmost */}
      <div className="min-w-0 flex-1">
        <div className="group relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-3xl bg-[#faf8f6] sm:min-h-[560px] lg:min-h-[720px]">

          {activeImage ? (
            <img
              src={activeImage}
              alt={product?.nameAr || product?.name || 'صورة المنتج'}
              className="relative z-10 max-h-[85%] max-w-[90%] object-contain lg:max-h-[88%] lg:max-w-[88%]"
              loading="eager"
            />
          ) : (
            <div className="relative z-10 flex h-72 w-full max-w-md flex-col items-center justify-center text-[#8a7e72]">
              <ImageIcon className="mb-3 h-10 w-10 stroke-[1.2]" />
              <p className="text-sm font-light">{t('product.noImage', 'لا توجد صورة للمنتج')}</p>
            </div>
          )}

          {/* Prev/Next arrows — only when 2+ images */}
          {hasThumbnails && (
            <>
              <button
                type="button"
                onClick={() => goTo(activeIndex - 1)}
                className="absolute end-3 top-1/2 z-20 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-[#faf8f6]/80 text-[#6b635b] opacity-0 shadow-sm transition hover:bg-[#faf8f6] hover:text-[#1a1a1a] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
                aria-label="الصورة السابقة"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goTo(activeIndex + 1)}
                className="absolute start-3 top-1/2 z-20 flex min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-[#faf8f6]/80 text-[#6b635b] opacity-0 shadow-sm transition hover:bg-[#faf8f6] hover:text-[#1a1a1a] group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
                aria-label="الصورة التالية"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Thumbnails — only shown when there are 2+ images */}
      {hasThumbnails ? (
        <div className="flex shrink-0 gap-3 overflow-x-auto lg:w-24 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
          {images.map((image, index) => {
            const active = index === activeIndex;

            return (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={[
                  'h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-[#faf8f6] transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e] lg:h-[92px] lg:w-[92px]',
                  active
                    ? 'border-[#a65d4e] ring-1 ring-[#a65d4e]'
                    : 'border-[#e8ded4] opacity-70 hover:opacity-100',
                ].join(' ')}
                aria-label={`عرض الصورة ${index + 1}`}
              >
                <img
                  src={image}
                  alt=""
                  className="h-full w-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
