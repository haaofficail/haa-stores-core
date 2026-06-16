import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';
import { luxuryCSSVars, LUXURY_THEME_CLASS } from '../luxuryTokens';
import LuxuryImageFallback from './LuxuryImageFallback';

function getDisplayName(product: any): string {
  return product?.nameAr || product?.name || product?.title || '';
}

function getProductType(product: any): string {
  return product?.type || product?.categoryName || product?.category?.name || product?.category?.nameAr || '';
}

export default function LuxuryProductCard({
  product, slug, onAddToCart, compact, showSalesCount, showStockBadge,
}: {
  product: any;
  slug: string;
  onAddToCart?: (product: any) => Promise<void>;
  compact?: boolean;
  showSalesCount?: boolean;
  showStockBadge?: boolean;
}) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const name = getDisplayName(product);
  const productType = getProductType(product);

  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = useMemo(() => {
    if (!hasDiscount) return 0;
    return Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100);
  }, [product.price, product.compareAtPrice, hasDiscount]);

  const isOutOfStock = !!(product.trackInventory && product.stockQuantity === 0);
  const isLowStock = !!(product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= 5);
  const images = product?.images || product?.productImages || [];
  const firstImage = Array.isArray(images) ? images[0] : null;
  const hasImage = firstImage && !imgError;
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
      <Link
        to={productUrl}
        className={`${LUXURY_THEME_CLASS} flex items-center gap-3 p-2 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]`}
        style={{ backgroundColor: 'var(--lux-card, #FAF7F1)', borderRadius: 'var(--lux-card-radius, 6px)', ...luxuryCSSVars } as React.CSSProperties}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-16 sm:w-16" style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)', borderRadius: '4px' }}>
          {hasImage ? (
            <img width={160} height={160} src={firstImage} alt={name} className="h-full w-full object-contain p-2" loading="lazy" decoding="async" onError={() => setImgError(true)} />
          ) : (
            <LuxuryImageFallback aspectRatio="1/1" className="w-full h-full" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-xs font-light" style={{ color: 'var(--lux-text, #2B2520)' }}>{name}</h3>
          <span className="text-xs font-light" style={{ color: 'var(--lux-primary, #B88A3D)' }}>
            {formatCurrency(Number(product.price))} <SarIcon size="sm" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div
      className={`${LUXURY_THEME_CLASS} group flex flex-col overflow-hidden transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 h-full`}
      style={{
        backgroundColor: 'var(--lux-card, #FAF7F1)',
        borderRadius: 'var(--lux-card-radius, 6px)',
        boxShadow: '0 1px 3px var(--lux-shadow, rgba(43,37,32,0.08))',
        ...luxuryCSSVars,
      } as React.CSSProperties}
    >
      <Link
        to={productUrl}
        className="relative block overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)] shrink-0"
        style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}
      >
        {hasImage ? (
          <img
            width={400} height={400}
            src={firstImage} alt={name}
            className="w-full object-contain transition-transform duration-500 group-hover:scale-105"
            style={{ aspectRatio: '1 / 1' }}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <LuxuryImageFallback aspectRatio="1/1" className="w-full" />
        )}
        {hasDiscount && discountPercent > 0 && (
          <span
            className="absolute top-2 start-2 text-[10px] font-medium leading-none px-1.5 py-0.5"
            style={{
              color: '#FAF7F1',
              backgroundColor: 'var(--lux-primary, #B88A3D)',
              borderRadius: '2px',
            }}
          >
            -{discountPercent}%
          </span>
        )}
        {showStockBadge !== false && isLowStock && (
          <span
            className="absolute top-2 end-2 text-[9px] font-medium leading-none px-1.5 py-0.5 backdrop-blur-sm"
            style={{
              color: 'var(--lux-muted, #756B61)',
              border: '1px solid var(--lux-border, #E6D8C6)',
              backgroundColor: 'rgba(250, 247, 241, 0.8)',
              borderRadius: '2px',
            }}
          >
            {t('product.lowStock', 'مخزون محدود')}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
        <Link to={productUrl} className="block flex-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]">
          <h3
            className="line-clamp-2 text-sm font-light leading-snug"
            style={{ color: 'var(--lux-text, #2B2520)' }}
          >
            {name}
          </h3>
        </Link>

        {productType && (
          <p className="text-[11px] font-light mt-0.5" style={{ color: 'var(--lux-muted, #756B61)' }}>
            {productType}
          </p>
        )}

        <div className="flex items-center gap-2 h-[18px] my-1">
          {product.rating != null && product.rating > 0 && (
            <span className="flex items-center gap-0.5 text-[12px]" style={{ color: 'var(--lux-primary, #B88A3D)' }}>
              {'★'.repeat(Math.round(Number(product.rating)))}
              {'☆'.repeat(5 - Math.round(Number(product.rating)))}
              {product.reviewCount != null && product.reviewCount > 0 && (
                <span className="text-[10px] font-light mr-1" style={{ color: 'var(--lux-muted, #756B61)' }}>
                  ({product.reviewCount})
                </span>
              )}
            </span>
          )}
          {showSalesCount !== false && product.salesCount != null && product.salesCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-light leading-none" style={{ color: 'var(--lux-muted, #756B61)' }}>
              <TrendingUp className="h-3 w-3" />
              {t('product.soldCount', 'تم بيع {{count}}', { count: product.salesCount })}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm font-light" style={{ color: 'var(--lux-text, #2B2520)' }}>
            {formatCurrency(Number(product.price))} <SarIcon size="sm" />
          </span>
          {hasDiscount && (
            <span className="text-[11px] font-light line-through" style={{ color: 'var(--lux-muted, #756B61)' }}>
              {formatCurrency(Number(product.compareAtPrice))} <SarIcon size="xs" />
            </span>
          )}
        </div>

        <div className="mt-3 md:opacity-0 md:transition-opacity md:duration-300 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          {renderButton()}
        </div>
      </div>
    </div>
  );

  function renderButton() {
    if (isOutOfStock) {
      return (
        <span
          className="block py-2 text-center text-xs font-light"
          style={{
            color: 'var(--lux-muted, #756B61)',
            border: '1px solid var(--lux-border, #E6D8C6)',
            borderRadius: '3px',
          }}
        >
          {t('product.outOfStock', 'غير متوفر')}
        </span>
      );
    }

    if (added) {
      return (
        <span
          className="flex items-center justify-center gap-1 py-2 text-xs font-medium"
          style={{
            color: 'var(--lux-muted, #756B61)',
            backgroundColor: 'var(--lux-subtle-surface, #FBF8F2)',
            borderRadius: '3px',
          }}
        >
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
        className="w-full py-2 text-xs font-medium tracking-wider text-white transition-opacity hover:opacity-85 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
        style={{
          backgroundColor: 'var(--lux-text, #2B2520)',
          borderRadius: '3px',
        }}
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
