import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Heart,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { SarIcon } from '@/components/ui/SarIcon';

type AnyRecord = Record<string, any>;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getPrice(product: AnyRecord, propsBag: AnyRecord) {
  return (
    propsBag.displayPrice ??
    propsBag.price ??
    product.salePrice ??
    product.price ??
    product.finalPrice ??
    0
  );
}

function getComparePrice(product: AnyRecord, propsBag: AnyRecord) {
  return (
    propsBag.compareAtPrice ??
    product.compareAtPrice ??
    product.originalPrice ??
    product.oldPrice ??
    null
  );
}

function getOptions(product: AnyRecord, propsBag: AnyRecord): AnyRecord[] {
  const options =
    propsBag.options ||
    propsBag.productOptions ||
    product.options ||
    product.productOptions ||
    [];

  return Array.isArray(options) ? options : [];
}

function isOutOfStock(product: AnyRecord, propsBag: AnyRecord) {
  if (typeof propsBag.isOutOfStock === 'boolean') return propsBag.isOutOfStock;
  if (typeof product.isOutOfStock === 'boolean') return product.isOutOfStock;
  if (typeof product.inStock === 'boolean') return !product.inStock;
  if (typeof product.stock === 'number') return product.stock <= 0;
  if (typeof product.quantity === 'number') return product.quantity <= 0;
  return false;
}

export function LuxuryProductInfoPanel({
  product,
  propsBag,
  name,
  category,
  description,
}: {
  product: AnyRecord;
  propsBag: AnyRecord;
  name: string;
  category: string;
  description: string;
}) {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const price = getPrice(product, propsBag);
  const comparePrice = getComparePrice(product, propsBag);
  const outOfStock = isOutOfStock(product, propsBag);

  const quantity = propsBag.quantity ?? 1;
  const onQuantityChange = propsBag.onQuantityChange || propsBag.setQuantity;

  const options = getOptions(product, propsBag);
  const selectedOptions = propsBag.selectedOptions || {};
  const onOptionChange = propsBag.onOptionChange || propsBag.setSelectedOption;

  const discountPercent = useMemo(() => {
    const current = toNumber(price);
    const compare = toNumber(comparePrice);
    if (!compare || compare <= current) return null;
    return Math.round(((compare - current) / compare) * 100);
  }, [price, comparePrice]);

  async function handleAddToCart() {
    if (!propsBag.onAddToCart || outOfStock || adding) return;

    setAdding(true);

    try {
      await propsBag.onAddToCart(product);
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
    } finally {
      setAdding(false);
    }
  }

  async function handleBuyNow() {
    if (propsBag.onBuyNow) {
      await propsBag.onBuyNow(product);
      return;
    }

    await handleAddToCart();
  }

  return (
    <aside className="lg:sticky lg:top-24">
      <div className="border-t border-[#e8ded4] pt-6 lg:border-t-0 lg:pt-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {category ? (
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[#a65d4e]">
                {category}
              </p>
            ) : null}

            <h1 className="max-w-xl text-3xl font-light leading-tight tracking-tight text-[#1a1a1a] sm:text-4xl lg:text-5xl">
              {name}
            </h1>
          </div>

          <button
            type="button"
            onClick={() => propsBag.onShare?.(product)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8ded4] bg-[#faf8f6]/70 text-[#6b635b] transition hover:border-[#1a1a1a] hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
            aria-label={t('product.share', 'مشاركة المنتج')}
          >
            <Share2 className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>

        <div className="mb-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-light tracking-tight text-[#1a1a1a]">
              {formatCurrency(price)}
              <SarIcon className="mr-1 inline-block h-[0.75em] w-[0.65em] align-middle" />
            </span>

            {comparePrice ? (
              <span className="text-sm font-light text-[#8a7e72] line-through">
                {formatCurrency(comparePrice)}
              </span>
            ) : null}

            {discountPercent ? (
              <span className="text-xs font-medium text-[#a65d4e]">
                {t('product.save', 'وفر')} {discountPercent}%
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs font-light text-[#8a7e72]">
            {t('product.taxInfo', 'شامل الضريبة. خيارات الشحن تظهر عند إتمام الطلب.')}
          </p>
        </div>

        {description ? (
          <p className="mb-7 max-w-xl text-sm font-light leading-7 text-[#6b635b]">
            {description.length > 260
              ? `${description.slice(0, 260).replace(/\s+\S*$/, '')}…`
              : description}
          </p>
        ) : null}

        <div className="space-y-6 border-y border-[#e8ded4] py-6">
          {options.map((option) => {
            const optionName = option.nameAr || option.name || option.label;
            const optionKey = option.key || option.id || optionName;
            const values = Array.isArray(option.values) ? option.values : [];

            if (!optionName || values.length === 0) return null;

            return (
              <div key={optionKey}>
                <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6b635b]">
                  {optionName}
                </p>

                <div className="flex flex-wrap gap-2">
                  {values.map((value: any) => {
                    const valueLabel =
                      typeof value === 'string'
                        ? value
                        : value.nameAr || value.name || value.label || value.value;

                    const valueKey =
                      typeof value === 'string'
                        ? value
                        : value.id || value.key || value.value || valueLabel;

                    const active = selectedOptions?.[optionKey] === valueKey;

                    return (
                      <button
                        key={valueKey}
                        type="button"
                        onClick={() => onOptionChange?.(optionKey, valueKey)}
                        className={[
                          'min-w-16 rounded-lg border px-4 py-2 text-sm font-light transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]',
                          active
                            ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                            : 'border-[#e8ded4] bg-[#faf8f6]/70 text-[#6b635b] hover:border-[#1a1a1a]',
                        ].join(' ')}
                      >
                        {valueLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[#6b635b]">
              {t('product.quantity', 'الكمية')}
            </p>

            <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#e8ded4] bg-[#f4efe9]/70">
              <button
                type="button"
                onClick={() => onQuantityChange?.(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center text-[#6b635b] transition hover:bg-[#f4efe9] hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
                aria-label={t('product.decreaseQuantity', 'تقليل الكمية')}
              >
                <Minus className="h-4 w-4" />
              </button>

              <span className="min-w-12 px-4 text-center text-sm text-[#1a1a1a]">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => onQuantityChange?.(quantity + 1)}
                className="flex h-11 w-11 items-center justify-center text-[#6b635b] transition hover:bg-[#f4efe9] hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
                aria-label={t('product.increaseQuantity', 'زيادة الكمية')}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock || adding}
            className={[
              'flex min-h-12 flex-1 items-center justify-center rounded-lg px-6 text-sm font-light uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]',
              outOfStock
                ? 'cursor-not-allowed border border-[#c5b5a5] bg-[#f4efe9] text-[#8a7e72]'
                : 'bg-[#1a1a1a] text-white hover:opacity-85',
            ].join(' ')}
          >
            {outOfStock ? (
              t('product.outOfStock', 'غير متوفر')
            ) : added ? (
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4" />
                {t('product.addedToCart', 'تمت الإضافة')}
              </span>
            ) : adding ? (
              t('product.adding', 'جارٍ الإضافة...')
            ) : (
              <span className="inline-flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t('product.addToCart', 'أضف إلى السلة')}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => propsBag.onWishlist?.(product)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[#e8ded4] bg-[#faf8f6]/70 text-[#6b635b] transition hover:border-[#1a1a1a] hover:text-[#1a1a1a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
            aria-label={t('product.addToWishlist', 'إضافة للمفضلة')}
          >
            <Heart className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        {propsBag.onBuyNow ? (
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={outOfStock}
            className="mt-3 flex min-h-12 w-full items-center justify-center rounded-lg border border-[#1a1a1a] bg-transparent px-6 text-sm font-light uppercase tracking-[0.16em] text-[#1a1a1a] transition hover:bg-[#1a1a1a] hover:text-white disabled:cursor-not-allowed disabled:border-[#c5b5a5] disabled:text-[#8a7e72] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a65d4e]"
          >
            {t('product.buyNow', 'اشتري الآن')}
          </button>
        ) : null}

        <div className="mt-6 border-t border-[#e8ded4]/40 pt-4">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-[#8a7e72]">
            {t('product.paymentShipping', 'الدفع والشحن')}
          </p>
          <div className="space-y-0.5 text-[12px] font-light leading-6 text-[#6b635b]">
            <p>{t('product.trustItems', 'شحن موثوق · دفع آمن · استرجاع سهل')}</p>
            <p>{t('product.confirmShipping', 'يتم تأكيد توفر المنتج وخيارات الشحن قبل إتمام الطلب.')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
