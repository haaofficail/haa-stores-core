import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Info } from 'lucide-react';
import type { HaaMarketplaceProduct } from '@/lib/api';
import { marketplaceCart } from '@/lib/marketplace-cart';
import { toast } from 'sonner';
import {
  AddToCartButton,
  BNPLBadges,
  CurrencyAmount,
  CurrencyStrike,
  OutOfStockOverlay,
  ProductBadges,
  ProductImageFrame,
  ProductTitle,
  RatingStars,
  SavingsBadge,
} from '@/components/product-card';

interface MarketplaceProductCardProps {
  product: HaaMarketplaceProduct;
  showCategory?: boolean;
  showAddToCart?: boolean;
  showSalesCount?: boolean;
  showBNPL?: boolean;
  className?: string;
}

export function MarketplaceProductCard({
  product, showCategory = false, showAddToCart = true,
  showSalesCount = true, showBNPL = true, className = '',
}: MarketplaceProductCardProps) {
  const outOfStock = !!(product.trackInventory && product.stockQuantity <= 0);
  const compareAt = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const currentPrice = Number(product.price);
  const hasDiscount = compareAt !== null && compareAt > currentPrice;
  const discountPercent = hasDiscount ? Math.round((1 - currentPrice / compareAt!) * 100) : null;

  const handleAddToCart = useCallback(async () => {
    marketplaceCart.add(product, 1);
    toast.success('تمت الإضافة إلى سلة سوق هاء');
  }, [product]);

  return (
    <article className={`group flex h-full flex-col overflow-hidden rounded-[8px] border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 hover:border-gray-200 hover:shadow-xl hover:shadow-black/10 ${className}`}>
      <Link to={product.productUrl} className="block shrink-0">
        <ProductImageFrame src={product.images?.[0]} alt={product.name} aspectRatio="square" className="bg-white [&_img]:p-1.5">
          <ProductBadges
            discountPercent={discountPercent}
            isOutOfStock={outOfStock}
            trackInventory={product.trackInventory}
            stockQuantity={product.stockQuantity}
            featured={false}
          />
          <OutOfStockOverlay isOutOfStock={outOfStock} />
        </ProductImageFrame>
      </Link>

      <div className="flex flex-1 flex-col gap-0.5 p-1.5">
        {showCategory && product.categoryName && (
          <p className="truncate text-[10px] font-bold text-gray-500">{product.categoryName}</p>
        )}

        <ProductTitle name={product.name} href={product.productUrl} lines={2} size="sm" weight="bold" color="text-black" className="min-h-[30px]" />

        <div className="flex h-[20px] items-center justify-between gap-1 overflow-hidden">
          {product.isDemoStore ? (
            <span className="inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 px-1.5 text-[10px] font-bold text-amber-700 leading-none">
              <Info className="h-2.5 w-2.5" />
              متجر تجريبي
            </span>
          ) : (
            <span aria-hidden="true" />
          )}
          <div className="flex min-w-0 shrink items-center justify-end gap-1 overflow-hidden">
            <RatingStars rating={product.rating} count={product.reviewCount} size="3xs" />
            {showSalesCount && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gray-500 leading-none">
                <TrendingUp className="h-3 w-3" />
                {product.salesCount != null && product.salesCount > 0 ? product.salesCount : 0}+
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <div className="flex h-[22px] min-w-0 items-center gap-1.5 overflow-hidden">
            {hasDiscount ? (
              <>
                <span className="inline-flex h-[20px] min-w-[76px] items-center justify-center rounded-md bg-red-50 px-1.5">
                  <CurrencyStrike amount={compareAt!} size="xs" decimals={0} />
                </span>
                <SavingsBadge value={compareAt! - currentPrice} className="h-[20px] w-[82px] text-[11px]" />
              </>
            ) : (
              <span aria-hidden="true" className="h-[20px]" />
            )}
          </div>
          <div className="flex h-[26px] items-center justify-between gap-2 overflow-hidden">
            <CurrencyAmount amount={currentPrice} size="xl" weight="bold" decimals={0} />
            {showBNPL && (
              <div className="shrink-0">
                <BNPLBadges />
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto shrink-0 pt-0">
          {showAddToCart && (
            <AddToCartButton
              product={product}
              onAddToCart={handleAddToCart}
              isOutOfStock={outOfStock}
              variant="primary"
              size="sm"
              className="rounded-[8px] bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500/40"
            >
              أضف
            </AddToCartButton>
          )}
        </div>
      </div>
    </article>
  );
}
