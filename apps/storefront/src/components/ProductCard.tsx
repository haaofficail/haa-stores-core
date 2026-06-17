import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { type PublicProduct } from '@/lib/api';
import CountdownTimer from '@/components/CountdownTimer';
import { Icon } from '@/components/ui/icon';
import { StoreBadge, StoreCard, StoreButton } from '@/components/ui';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { RatingStars, ProductPriceBlock, BNPLBadges } from '@/components/product-card';
import { ShoppingBag, Check, ShoppingCart, Eye, BadgeCheck, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface ProductCardProps {
  product: PublicProduct;
  slug: string;
  onAddToCart?: (product: PublicProduct) => Promise<void>;
  compact?: boolean;
  productCardSize?: number;
}

const CARD_SIZE_CLASSES: Record<number, { padding: string; title: string }> = {
  1: { padding: 'p-2', title: 'text-xs' },
  2: { padding: 'p-2.5', title: 'text-xs' },
  3: { padding: 'p-3', title: 'text-product-title' },
  4: { padding: 'p-4', title: 'text-base' },
  5: { padding: 'p-5', title: 'text-lg' },
};

export default function ProductCard({ product, slug, onAddToCart, compact, productCardSize }: ProductCardProps) {
  const { t } = useTranslation();
  const [imgError, setImgError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const theme = useStorefrontTheme();
  const layout = theme?.layout;
  const sizeKey = productCardSize ?? (compact ? 2 : 3);
  const size = CARD_SIZE_CLASSES[sizeKey] || CARD_SIZE_CLASSES[3];

  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100) : null;
  const isLowStock = product.trackInventory && product.stockQuantity > 0 && product.stockQuantity <= 5;
  const isOutOfStock = !!(product.trackInventory && product.stockQuantity === 0);
  const countdownEnd = useMemo(() => hasDiscount && product.offerEndDate ? new Date(product.offerEndDate).getTime() : 0, [hasDiscount, product.offerEndDate]);
  const showRating = layout?.showRating !== false;
  const showCategory = layout?.showCategory !== false;
  const showStockBadge = layout?.showStockBadge !== false;
  const showSalesCount = layout?.showSalesCount !== false;
  const showDiscountBadge = layout?.showDiscountBadge !== false;
  const showCountdown = layout?.showCountdown !== false && hasDiscount && countdownEnd > 0;
  const hasCategory = showCategory && !!product.categoryName;
  const productUrl = `/s/${slug}/p/${product.slug}`;

  const handleAdd = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart || isOutOfStock || adding) return;
    setAdding(true);
    try {
      await onAddToCart(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setAdding(false);
    }
  }, [onAddToCart, product, isOutOfStock, adding, t]);

  return (
    <StoreCard variant="interactive" className={`group overflow-hidden h-full flex flex-col ${layout?.productCardStyle === 'square' ? 'rounded-none' : '!rounded-[8px]'}`}>
      <Link to={productUrl} className="block shrink-0">
        <div className="relative bg-white overflow-hidden" style={{ aspectRatio: layout?.imageAspectRatio === '4:3' ? '4/3' : layout?.imageAspectRatio === '16:9' ? '16/9' : '1/1', borderRadius: '8px 8px 0 0' }}>
          {product.images?.[0] && !imgError ? (
            <>
              <img
                src={product.images[0]}
                alt={product.name}
                width={400} height={400}
                className={`w-full h-full object-contain p-2 transition-all duration-500 ease-out ${product.images[1] ? 'group-hover:opacity-0' : 'group-hover:scale-105'}`}
                loading="lazy"
                onError={() => setImgError(true)}
              />
              {product.images[1] && (
                <img
                  src={product.images[1]}
                  alt={product.name}
                  width={400} height={400}
                  className="absolute inset-0 w-full h-full object-contain p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
                  loading="lazy"
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon={ShoppingBag} size="lg" className="text-text-disabled" />
            </div>
          )}

          {showDiscountBadge && hasDiscount && (
            <span className="absolute top-2 start-2 z-10 bg-error text-error-text text-xs font-bold px-2 py-0.5 rounded-full">
              -{discountPercent}%
            </span>
          )}

          <div className="absolute top-2 end-2 z-10 min-h-[24px]">
            {showStockBadge && isLowStock && (
              <StoreBadge variant="warning" size="sm">
                {t('product.lowStock')}
              </StoreBadge>
            )}
          </div>

          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
              <span className="bg-surface-1 px-3 py-1 rounded-full text-xs font-bold text-text-primary">
                {t('product.outOfStock')}
              </span>
            </div>
          )}

          {showCountdown && (
            <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 to-transparent pt-4 pb-1 z-10">
              <CountdownTimer endTime={countdownEnd} size="overlay" />
            </div>
          )}
        </div>
      </Link>

      <div className={`${size.padding} flex flex-col flex-1`} style={{ gap: 'var(--space-2)' }}>
        {hasCategory && (
          <p className="min-h-[14px] text-[var(--badge-font-size)] text-primary-600 font-medium leading-none truncate">
            {product.categoryName}
          </p>
        )}
        {!hasCategory && <div className="min-h-[14px]" aria-hidden="true" />}

        <h3 className={`min-h-[2.5em] font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors duration-300 ${size.title}`}>
          {product.name}
        </h3>

        <div className="min-h-[28px] flex items-start gap-1.5 overflow-hidden">
          {showRating && (
            <RatingStars rating={product.rating} count={product.reviewCount} size="3xs" />
          )}
          {showStockBadge && !isLowStock && !isOutOfStock && (!product.trackInventory || product.stockQuantity > 5) && (
            <StoreBadge variant="stock" size="sm" icon={<Icon icon={BadgeCheck} size="2xs" />}>
              {t('product.inStock')}
            </StoreBadge>
          )}
          {showSalesCount && (
            <StoreBadge variant="neutral" size="sm" icon={<Icon icon={TrendingUp} size="2xs" />}>
              {product.salesCount != null && product.salesCount > 0 ? t('product.soldCount', { count: product.salesCount! }) : t('product.soldCount', { count: 0 })}
            </StoreBadge>
          )}
        </div>

        <ProductPriceBlock
          price={Number(product.price)}
          oldPrice={hasDiscount ? Number(product.compareAtPrice!) : null}
        />

        <div className="shrink-0">
          <BNPLBadges />
        </div>

        <div className="mt-auto shrink-0 pt-1">
          {onAddToCart ? (
            isOutOfStock ? (
              <StoreButton variant="secondary" href={productUrl} iconStart={<Icon icon={Eye} size="sm" />} className="w-full">
                {t('product.viewDetails')}
              </StoreButton>
            ) : (
              <button
                onClick={handleAdd}
                disabled={adding || added}
                className={`w-full font-semibold flex items-center justify-center gap-1.5 transition-[box-shadow,transform] duration-300 min-h-[44px] text-sm rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${
                  added
                    ? 'bg-success text-success-text'
                    : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]'
                }`}
              >
                {adding ? (
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : added ? (
                  <><Icon icon={Check} size="sm" />{t('cart.addedToCart')}</>
                ) : (
                  <><Icon icon={ShoppingCart} size="sm" />{t('product.addToCart')}</>
                )}
              </button>
            )
          ) : (
            <StoreButton variant="secondary" href={productUrl} iconStart={<Icon icon={Eye} size="sm" />} className="w-full">
              {t('product.viewDetails')}
            </StoreButton>
          )}
        </div>
      </div>
    </StoreCard>
  );
}