import { Link } from 'react-router-dom';
import { TrendingUp } from 'lucide-react';
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

export interface ProductCardBaseProps {
  product: {
    id: string | number;
    name: string;
    slug: string;
    price: number | string;
    compareAtPrice?: number | string | null;
    images?: string[];
    rating?: number | null;
    reviewCount?: number | null;
    salesCount?: number | null;
    trackInventory?: boolean;
    stockQuantity?: number;
    isFeatured?: boolean;
    categoryName?: string;
    productUrl?: string;
  };
  slug: string;
  variant?: 'default' | 'compact' | 'marketplace' | 'luxury';
  showCategory?: boolean;
  showRating?: boolean;
  showSalesCount?: boolean;
  showAddToCart?: boolean;
  showBNPL?: boolean;
  onAddToCart?: (product: any) => Promise<void>;
  className?: string;
  imageAspectRatio?: 'square' | '4:3' | '16:9';
}

export function ProductCard({
  product,
  slug,
  variant = 'default',
  showCategory = false,
  showRating = true,
  showSalesCount = true,
  showAddToCart = true,
  showBNPL = true,
  onAddToCart,
  className = '',
  imageAspectRatio = 'square'
}: ProductCardBaseProps) {
  const hasDiscount = product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const discountPercent = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100) : null;
  const isOutOfStock = !!(product.trackInventory && (product.stockQuantity ?? 0) <= 0);
  const productUrl = product.productUrl || `/s/${slug}/p/${product.slug}`;

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
  const buttonVariant = variant === 'luxury' ? 'primary' : variant === 'marketplace' ? 'primary' : 'primary';

  return (
    <article className={`group flex flex-col overflow-hidden h-full ${variantClasses[variant]} ${className}`}>
      <Link to={productUrl} className="block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2" style={{ borderRadius: variant === 'luxury' || variant === 'marketplace' ? '16px 16px 0 0' : '8px 8px 0 0' }}>
        <ProductImageFrame
          src={product.images?.[0]}
          alt={product.name}
          aspectRatio={imageAspectRatio}
        >
          <ProductBadges
            discountPercent={discountPercent}
            isOutOfStock={isOutOfStock}
            trackInventory={product.trackInventory}
            stockQuantity={product.stockQuantity}
            featured={product.isFeatured}
          />
          <OutOfStockOverlay isOutOfStock={isOutOfStock} />
        </ProductImageFrame>
      </Link>

      <div className={`flex flex-col flex-1 gap-1.5 ${paddingClasses[variant]}`}>
        {showCategory && product.categoryName ? (
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

        <div className="flex items-center gap-2 h-[18px]">
          {showRating && (
            <RatingStars rating={product.rating ?? null} count={product.reviewCount ?? null} size="3xs" />
          )}
          {showSalesCount && (
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
              عرض التفاصيل
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
