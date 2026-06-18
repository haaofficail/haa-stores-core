/**
 * MarketplaceProductCard — thin wrapper around canonical ProductCard.
 *
 * T2.2 consolidation: this replaces the standalone MarketplaceProductCard.tsx.
 * It uses the canonical `ProductCard` with `variant='marketplace'` and layers
 * marketplace-specific behaviors:
 *   - `marketplaceCart.add()` (not the generic `onAddToCart` prop)
 *   - "أضف" instead of "أضف للسلة" (compact button label)
 *   - Demo store badge (uses `isDemoStore` field, custom to Haa marketplace)
 *
 * If the canonical grows more marketplace-specific layout, move it into the
 * `variant='marketplace'` branch and delete this wrapper.
 */
import { useCallback } from 'react';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { marketplaceCart } from '@/lib/marketplace-cart';
import type { HaaMarketplaceProduct } from '@/lib/api';
import { ProductCard } from './ProductCard';

interface MarketplaceProductCardProps {
  product: HaaMarketplaceProduct;
  showCategory?: boolean;
  showAddToCart?: boolean;
  showSalesCount?: boolean;
  showBNPL?: boolean;
  className?: string;
}

export function MarketplaceProductCard({
  product,
  showCategory = false,
  showAddToCart = true,
  showSalesCount = true,
  showBNPL = true,
  className = '',
}: MarketplaceProductCardProps) {
  const handleAddToCart = useCallback(async () => {
    marketplaceCart.add(product, 1);
    toast.success('تمت الإضافة إلى سلة سوق هاء');
  }, [product]);

  return (
    <div className={`relative ${className}`}>
      {product.isDemoStore && (
        <span className="absolute top-2 end-2 z-20 inline-flex h-[18px] shrink-0 items-center gap-0.5 rounded-md bg-amber-50 border border-amber-200 px-1.5 text-xs font-bold text-amber-700 leading-none pointer-events-none">
          <Info className="h-2.5 w-2.5" />
          متجر تجريبي
        </span>
      )}
      <ProductCard
        product={product as unknown as Parameters<typeof ProductCard>[0]['product']}
        slug={product.store.slug}
        variant="marketplace"
        showCategory={showCategory}
        showAddToCart={showAddToCart}
        showSalesCount={showSalesCount}
        showBNPL={showBNPL}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

export default MarketplaceProductCard;
