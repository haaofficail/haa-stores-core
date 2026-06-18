/**
 * ProductCard — canonical product card (T2.2 consolidated)
 *
 * Single source of truth for product cards across the storefront.
 * Supports 4 variants:
 *   - `default`    → used by base storefront + theme fallback
 *   - `compact`    → compact product grids (sidebar, related products)
 *   - `marketplace` → Haa marketplace demo stores
 *   - `luxury`     → luxury theme (uses canonical structure, theme handles visual tokens)
 *
 * Theme integration:
 *   When `useStorefrontTheme()` returns a config with `layout` flags, the card
 *   reads `showCategory`, `showRating`, `showStockBadge`, `showSalesCount`,
 *   `showDiscountBadge`, `showCountdown` from `themeConfig.layout`.
 *   Defaults are all `true` (i.e. flag must be explicitly `false` to hide).
 *   Theme `productCardStyle: 'square'` removes the 8px rounded corners.
 *
 * Variants `default`, `compact`, `marketplace` are rendered inline.
 * Variant `luxury` uses the same structure but with theme tokens — see
 * themes/luxury-showcase/components/LuxuryProductCard.tsx for the dedicated
 * luxury implementation (kept separate due to its unique CSS variables).
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  ProductImageFrame,
  ProductBadges,
  OutOfStockOverlay,
  ProductTitle,
  ProductPriceBlock,
  RatingStars,
  AddToCartButton,
  BNPLBadges,
} from '.';
import CountdownTimer from '@/components/CountdownTimer';
import { useStorefrontTheme } from '@/hooks/useTheme';

/**
 * Minimal product shape required by ProductCard.
 * The `product` prop accepts any object with at least `name` + `slug` + `price`
 * — extra fields are ignored. This lets it accept `PublicProduct`,
 * `HaaMarketplaceProduct`, or any custom shape without per-callsite casting.
 *
 * All optional fields use `T | null | undefined` (rather than just `T?`) to
 * accept shapes like `PublicProduct` whose fields are typed as nullable.
 */
export type ProductLike = {
  id?: string | number | null;
  name: string;
  slug: string;
  price: number | string;
  compareAtPrice?: number | string | null;
  offerEndDate?: string | Date | null;
  images?: string[] | null;
  rating?: number | null;
  reviewCount?: number | null;
  salesCount?: number | null;
  trackInventory?: boolean | null;
  stockQuantity?: number | null;
  isFeatured?: boolean | null;
  categoryName?: string | null;
  productUrl?: string | null;
} & { [key: string]: unknown };

export interface ProductCardBaseProps {
  product: ProductLike;
  slug: string;
  variant?: 'default' | 'compact' | 'marketplace' | 'luxury';
  /** Layout flags — read from theme config when null. Defaults to `true` if no theme. */
  showCategory?: boolean | null;
  showRating?: boolean | null;
  showStockBadge?: boolean | null;
  showSalesCount?: boolean | null;
  showDiscountBadge?: boolean | null;
  showCountdown?: boolean | null;
  showAddToCart?: boolean;
  showBNPL?: boolean;
  /** Legacy prop from old ProductCard. 1=smallest, 5=largest. Maps to compact if <= 2. */
  productCardSize?: number;
  /** Legacy prop from old ProductCard. */
  compact?: boolean;
  onAddToCart?: (product: any) => Promise<void>;
  className?: string;
  imageAspectRatio?: 'square' | '4:3' | '16:9';
}

const LOW_STOCK_THRESHOLD = 5;

export function ProductCard({
  product,
  slug,
  variant: variantProp = 'default',
  showCategory = null,
  showRating = null,
  showStockBadge = null,
  showSalesCount = null,
  showDiscountBadge = null,
  showCountdown = null,
  showAddToCart = true,
  showBNPL = true,
  // Legacy props from old ProductCard: accept but ignore. compact maps to 'compact' variant;
  // productCardSize used to imply compact when <= 2 (handled by callers).
  productCardSize: _productCardSize,
  compact: compactProp,
  onAddToCart,
  className = '',
  imageAspectRatio = 'square'
}: ProductCardBaseProps) {
  const { t } = useTranslation();
  const themeConfig = useStorefrontTheme();
  const layout = themeConfig?.layout as Record<string, unknown> | undefined;

  // Resolve each layout flag: explicit prop > theme flag > true default
  const resolvedShowCategory = showCategory ?? (layout?.showCategory as boolean | undefined) ?? true;
  const resolvedShowRating = showRating ?? (layout?.showRating as boolean | undefined) ?? true;
  const resolvedShowStockBadge = showStockBadge ?? (layout?.showStockBadge as boolean | undefined) ?? true;
  const resolvedShowSalesCount = showSalesCount ?? (layout?.showSalesCount as boolean | undefined) ?? true;
  const resolvedShowDiscountBadge = showDiscountBadge ?? (layout?.showDiscountBadge as boolean | undefined) ?? true;
  const resolvedShowCountdown = showCountdown ?? (layout?.showCountdown as boolean | undefined) ?? true;
  const resolvedImageAspectRatio =
    (layout?.imageAspectRatio as 'square' | '4:3' | '16:9' | undefined) ?? imageAspectRatio;
  const productCardStyle = layout?.productCardStyle as 'rounded' | 'square' | undefined;

  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100) : null;
  const isOutOfStock = !!(product.trackInventory && (product.stockQuantity ?? 0) <= 0);
  const isLowStock = !!(product.trackInventory && (product.stockQuantity ?? 0) > 0 && (product.stockQuantity ?? 0) <= LOW_STOCK_THRESHOLD);
  const isInStock = !!(!isLowStock && !isOutOfStock && (!product.trackInventory || (product.stockQuantity ?? 0) > LOW_STOCK_THRESHOLD));
  const productUrl = product.productUrl || `/s/${slug}/p/${product.slug}`;

  const countdownEnd = useMemo(
    () => hasDiscount && product.offerEndDate ? new Date(product.offerEndDate).getTime() : 0,
    [hasDiscount, product.offerEndDate]
  );
  const showTimer = resolvedShowCountdown && hasDiscount && countdownEnd > 0;

  // Resolve variant: explicit prop OR derived from legacy `compact` flag.
  const variant = variantProp ?? (compactProp ? 'compact' : 'default');
  const variantClasses = {
    default: 'rounded-[8px] bg-white shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300',
    compact: 'rounded-[8px] bg-white shadow-sm hover:shadow-md transition-all duration-300',
    marketplace: 'rounded-2xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300',
    luxury: 'rounded-2xl bg-[#faf8f6] hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300',
  };

  const paddingClasses = {
    default: 'p-3',
    compact: 'p-2.5',
    marketplace: 'p-3',
    luxury: 'px-4 pb-4 pt-3',
  };

  const titleSize = variant === 'compact' ? 'sm' : 'md';
  const titleWeight = variant === 'luxury' ? 'light' : 'semibold' as const;
  const buttonSize = variant === 'compact' ? 'sm' : 'md';
  const buttonVariant = variant === 'luxury' ? 'primary' : 'primary' as const;

  // Style: theme can force 'square' (no rounded) via productCardStyle: 'square'
  const cornerRadius = productCardStyle === 'square' ? 'rounded-none' : variantClasses[variant];
  const imageRadius = productCardStyle === 'square' ? 'rounded-none' : variant === 'luxury' || variant === 'marketplace' ? 'rounded-t-2xl' : 'rounded-t-[8px]';

  return (
    <article className={`group flex flex-col overflow-hidden h-full ${cornerRadius} ${className}`}>
      <Link to={productUrl} className={`block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 ${imageRadius}`}>
        <ProductImageFrame
          src={product.images?.[0]}
          alt={product.name}
          aspectRatio={resolvedImageAspectRatio}
        >
          {resolvedShowDiscountBadge && (
            <ProductBadges
              discountPercent={discountPercent}
              isOutOfStock={isOutOfStock}
              trackInventory={product.trackInventory}
              stockQuantity={product.stockQuantity}
              featured={product.isFeatured}
            />
          )}
          {/* Theme-specific stock badge (separate from discount badge) */}
          {resolvedShowStockBadge && isLowStock && !isOutOfStock && (
            <span className="absolute top-2 end-2 z-10 inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-700 leading-none">
              {t('product.lowStock', 'مخزون محدود')}
            </span>
          )}
          <OutOfStockOverlay isOutOfStock={isOutOfStock} />
          {showTimer && (
            <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/60 to-transparent pt-4 pb-1 z-10">
              <CountdownTimer endTime={countdownEnd} size="overlay" />
            </div>
          )}
        </ProductImageFrame>
      </Link>

      <div className={`flex flex-col flex-1 gap-1.5 ${paddingClasses[variant]}`}>
        {resolvedShowCategory && product.categoryName ? (
          <ProductTitle
            name={product.categoryName}
            lines={1}
            size="sm"
            weight="bold"
            color="text-gray-500"
            className="h-[14px] truncate"
            asLink={false}
          />
        ) : (
          <div className="h-[14px]" aria-hidden="true" />
        )}

        <ProductTitle
          name={product.name}
          href={productUrl}
          lines={2}
          size={titleSize}
          weight={titleWeight}
          color="text-black"
          hoverColor={variant === 'luxury' ? 'text-[#a65d4e]' : 'text-blue-600'}
          className="h-[2.5em]"
        />

        <div className="min-h-[28px] flex items-start gap-1.5 overflow-hidden">
          {resolvedShowRating && (
            <RatingStars rating={product.rating ?? null} count={product.reviewCount ?? null} size="3xs" />
          )}
          {resolvedShowStockBadge && isInStock && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700 leading-none">
              ✓ {t('product.inStock', 'متوفر')}
            </span>
          )}
          {resolvedShowSalesCount && (
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 leading-none">
              <TrendingUp className="h-3 w-3" />
              {product.salesCount != null && product.salesCount > 0 ? product.salesCount : 0}+
            </span>
          )}
        </div>

        <ProductPriceBlock
          price={Number(product.price)}
          oldPrice={hasDiscount ? Number(product.compareAtPrice!) : null}
        />

        {showBNPL && (
          <div className="shrink-0">
            <BNPLBadges />
          </div>
        )}

        <div className="mt-auto shrink-0 pt-1">
          {showAddToCart && onAddToCart ? (
            <AddToCartButton
              product={product}
              onAddToCart={onAddToCart}
              isOutOfStock={isOutOfStock}
              variant={buttonVariant}
              size={buttonSize}
            />
          ) : showAddToCart ? (
            <a
              href={productUrl}
              className="w-full inline-flex items-center justify-center min-h-[44px] text-sm font-semibold rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
            >
              {t('product.viewDetails', 'عرض التفاصيل')}
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/**
 * Default export — wrapped with theme awareness.
 * Used as the fallback in ThemedProductCard when no theme ProductCard is registered.
 */
export default function ProductCardDefaultExport(props: ProductCardBaseProps) {
  return <ProductCard {...props} />;
}
