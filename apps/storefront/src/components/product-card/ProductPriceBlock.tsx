import { CurrencyAmount } from '@/components/ui/CurrencyAmount';
import { SavingsBadge } from './SavingsBadge';

interface ProductPriceBlockProps {
  price: number;
  oldPrice?: number | null;
  className?: string;
  showDecimals?: boolean;
  showSavings?: boolean;
  variant?: 'grid' | 'compact';
}

export function ProductPriceBlock({
  price, oldPrice, className = '', showDecimals = false,
  showSavings = true, variant = 'grid',
}: ProductPriceBlockProps) {
  const hasDiscount = oldPrice != null && oldPrice > price;
  const savings = hasDiscount ? oldPrice! - price : 0;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <CurrencyAmount amount={price} className="text-xs" weight="medium" />
        {hasDiscount && (
          <CurrencyAmount amount={oldPrice!} className="text-xs font-medium line-through" color="text-text-tertiary" />
        )}
      </div>
    );
  }

  return (
    <div className={`mt-2 grid min-h-[86px] grid-rows-[28px_28px_28px] gap-1 overflow-hidden ${className}`}>
      <div className="row-start-1 flex h-[28px] min-w-0 items-center overflow-hidden">
        {hasDiscount ? (
          <span className="inline-flex h-[24px] w-[96px] shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md bg-danger-soft px-1.5 text-xs font-semibold leading-none text-danger line-through">
            <CurrencyAmount amount={oldPrice!} className="text-xs font-semibold line-through" color="text-danger" />
          </span>
        ) : (
          <span aria-hidden="true" className="invisible h-[24px] w-[96px]" />
        )}
      </div>
      {showSavings ? (
        <div className="row-start-2 flex h-[28px] min-w-0 items-center overflow-hidden">
          {hasDiscount ? (
            <SavingsBadge value={savings} />
          ) : (
            <span aria-hidden="true" className="invisible h-[24px] w-[96px]" />
          )}
        </div>
      ) : null}
      <div className={`flex h-[28px] min-w-0 items-center overflow-hidden ${showSavings ? 'row-start-3 justify-center' : 'row-start-2 justify-start'}`}>
        <CurrencyAmount amount={price} size="xl" weight="bold" decimals={showDecimals ? 2 : 0} />
      </div>
    </div>
  );
}
