import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingBag, ShoppingCart, Check } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';

export default function LuxuryProductCard({
  product, slug, onAddToCart, compact,
}: {
  product: any;
  slug: string;
  onAddToCart?: (product: any) => Promise<void>;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100)
    : 0;
  const isOutOfStock = product.trackInventory && product.stockQuantity === 0;
  const hasImage = product.images?.[0] && !imgError;
  const productUrl = `/s/${slug}/p/${product.slug}`;

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart || adding || isOutOfStock) return;
    setAdding(true);
    try {
      await onAddToCart(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
    } finally {
      setAdding(false);
    }
  }, [onAddToCart, adding, isOutOfStock, product]);

  if (compact) {
    return (
      <Link to={productUrl} className="flex items-center gap-3 rounded-xl bg-[#faf8f6] p-2 transition hover:shadow-sm hover:bg-[#faf8f6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center bg-[#faf8f6] sm:h-16 sm:w-16">
          {hasImage ? (
            <img
              width={160} height={160}
              src={product.images[0]} alt={product.name}
              className="h-full w-full object-contain p-2"
              onError={() => setImgError(true)}
            />
          ) : (
            <ShoppingBag className="h-5 w-5 text-[#c5b5a5]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-xs font-light text-[#1a1a1a]">{product.name}</h3>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="tabular-nums text-xs font-medium text-[#1a1a1a]" dir="ltr">
              {formatCurrency(product.price)}
              <SarIcon className="mr-0.5 inline-block h-[0.7em] w-[0.6em] align-middle" />
            </span>
            {hasDiscount && (
              <span className="tabular-nums text-[10px] text-[#8a7e72] line-through" dir="ltr">
                {formatCurrency(product.compareAtPrice!)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl bg-[#faf8f6] transition hover:shadow-sm hover:bg-[#faf8f6]">
      <Link to={productUrl} className="block overflow-hidden bg-[#faf8f6] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]">
        {hasImage ? (
          <img
            width={400} height={400}
            src={product.images[0]} alt={product.name}
            className="w-full object-contain transition-transform duration-500 group-hover:scale-105"
            style={{ aspectRatio: '1 / 1' }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-[#c5b5a5]" />
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <Link to={productUrl} className="block flex-1">
          <h3 className="line-clamp-2 text-sm font-light leading-relaxed text-[#1a1a1a]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="tabular-nums text-sm font-medium text-[#1a1a1a]" dir="ltr">
            {formatCurrency(product.price)}
            <SarIcon className="mr-0.5 inline-block h-[0.75em] w-[0.65em] align-middle" />
          </span>
          {hasDiscount && (
            <span className="tabular-nums text-xs text-[#8a7e72] line-through" dir="ltr">
              {formatCurrency(product.compareAtPrice!)}
            </span>
          )}
        </div>

        {hasDiscount && (
          <span className="mt-0.5 text-[11px] font-medium text-[#a65d4e]">
            -{discountPercent}%
          </span>
        )}

        <div className="mt-3 sm:opacity-0 sm:transition-opacity sm:duration-300 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {renderButton()}
        </div>
      </div>
    </div>
  );

  function renderButton() {
    if (isOutOfStock) {
      return (
        <span className="block rounded-lg border border-[#e8ded4] py-2 text-center text-xs text-[#8a7e72]">
          {t('product.outOfStock', 'غير متوفر')}
        </span>
      );
    }

    if (added) {
      return (
        <span className="flex items-center justify-center gap-1 rounded-lg bg-[#f4efe9] py-2 text-xs font-medium text-[#6b635b]">
          <Check className="h-3 w-3" />
          {t('cart.addedToCart', 'تمت الإضافة')}
        </span>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={adding}
        className="w-full rounded-lg bg-[#1a1a1a] py-2 text-xs font-medium tracking-wider text-white transition-colors hover:opacity-85 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
      >
        {adding ? (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        ) : (
          <span className="flex items-center justify-center gap-1.5">
            <ShoppingCart className="h-3 w-3" />
            {t('product.addToCart', 'أضف للسلة')}
          </span>
        )}
      </button>
    );
  }
}
