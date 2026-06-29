import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { LUXURY_THEME_CLASS } from '../luxuryTokens';

type AnyRecord = Record<string, unknown>;
type LuxuryProductLike = {
  salePrice?: string | number;
  price?: string | number;
  finalPrice?: string | number;
  compareAtPrice?: string | number | null;
  originalPrice?: string | number | null;
  oldPrice?: string | number | null;
  options?: unknown[];
  productOptions?: unknown[];
  isOutOfStock?: boolean;
  inStock?: boolean;
  stock?: number;
  quantity?: number;
};
type LuxuryPropsBag = {
  displayPrice?: string | number;
  price?: string | number;
  compareAtPrice?: string | number | null;
  isOutOfStock?: boolean;
  quantity?: number;
  onQuantityChange?: (v: number) => void;
  setQuantity?: (v: number) => void;
  options?: unknown[];
  productOptions?: unknown[];
  selectedOptions?: Record<string, unknown>;
  onOptionChange?: (key: string, val: unknown) => void;
  setSelectedOption?: (key: string, val: unknown) => void;
  cartReady?: boolean;
  onAddToCart?: (product: unknown) => Promise<void> | void;
  onBuyNow?: (product: unknown) => Promise<void> | void;
  onShare?: (product: unknown) => void;
  onWishlist?: (product: unknown) => void;
};

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getPrice(product: LuxuryProductLike, propsBag: LuxuryPropsBag) {
  return propsBag.displayPrice ?? propsBag.price ?? product.salePrice ?? product.price ?? product.finalPrice ?? 0;
}

function getComparePrice(product: LuxuryProductLike, propsBag: LuxuryPropsBag) {
  return propsBag.compareAtPrice ?? product.compareAtPrice ?? product.originalPrice ?? product.oldPrice ?? null;
}

function getOptions(product: LuxuryProductLike, propsBag: LuxuryPropsBag): AnyRecord[] {
  const options = propsBag.options || propsBag.productOptions || product.options || product.productOptions || [];
  return Array.isArray(options) ? (options as AnyRecord[]) : [];
}

function isOutOfStock(product: LuxuryProductLike, propsBag: LuxuryPropsBag) {
  if (typeof propsBag.isOutOfStock === 'boolean') return propsBag.isOutOfStock;
  if (typeof product.isOutOfStock === 'boolean') return product.isOutOfStock;
  if (typeof product.inStock === 'boolean') return !product.inStock;
  if (typeof product.stock === 'number') return product.stock <= 0;
  if (typeof product.quantity === 'number') return product.quantity <= 0;
  return false;
}

export function LuxuryProductInfoPanel({
  product, propsBag, name, category, description,
}: {
  product: LuxuryProductLike;
  propsBag: LuxuryPropsBag;
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
    <aside className={`${LUXURY_THEME_CLASS} lg:sticky lg:top-24`} style={{ backgroundColor: 'var(--lux-bg, #FAF7F1)' }}>
        <div className="pt-6 lg:pt-10">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {category ? (
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.24em]" style={{ color: 'var(--lux-primary, #B88A3D)' }}>
                {category}
              </p>
            ) : null}
            <h1 className="max-w-xl text-2xl font-light leading-tight tracking-tight sm:text-3xl lg:text-4xl" style={{ color: 'var(--lux-text, #2B2520)' }}>
              {name}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => propsBag.onShare?.(product)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
            style={{ borderColor: 'var(--lux-border, #E6D8C6)', color: 'var(--lux-muted, #756B61)' }}
            aria-label={t('product.share', 'مشاركة المنتج')}
          >
            <Icon name="Share2" size="md" className="stroke-[1.5]" />
          </button>
        </div>

        <div className="mb-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-light tracking-tight" style={{ color: 'var(--lux-text, #2B2520)' }}>
              {formatCurrency(price)}
              <SarIcon size="md" className="me-1" />
            </span>
            {comparePrice ? (
              <span className="text-sm font-light line-through" style={{ color: 'var(--lux-muted, #756B61)' }}>
                {formatCurrency(comparePrice)} <SarIcon size="sm" />
              </span>
            ) : null}
            {discountPercent ? (
              <span className="text-xs font-medium" style={{ color: 'var(--lux-primary, #B88A3D)' }}>
                {t('product.save', 'وفر')} {discountPercent}%
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs font-light" style={{ color: 'var(--lux-muted, #756B61)' }}>
            {t('product.taxInfo', 'شامل الضريبة. خيارات الشحن تظهر عند إتمام الطلب.')}
          </p>
        </div>

        {description ? (
          <p className="mb-7 max-w-xl text-sm font-light leading-7" style={{ color: 'var(--lux-muted, #756B61)' }}>
            {description.length > 260 ? `${description.slice(0, 260).replace(/\s+\S*$/, '')}…` : description}
          </p>
        ) : null}

        <div className="space-y-6 py-6">
          {options.map((option) => {
            const o = option as { nameAr?: string; name?: string; label?: string; key?: string; id?: string | number; values?: unknown[] };
            const optionName = o.nameAr || o.name || o.label;
            const optionKey = String(o.name || o.key || o.id || optionName || '');
            const values = Array.isArray(o.values) ? o.values : [];
            if (!optionName || values.length === 0) return null;
            return (
              <div key={optionKey}>
                <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--lux-muted, #756B61)' }}>
                  {optionName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {values.map((value: unknown) => {
                    const v = value as { nameAr?: string; name?: string; label?: string; value?: string; id?: string | number; key?: string };
                    const valueLabel = typeof value === 'string' ? value : v.nameAr || v.name || v.label || v.value;
                    const valueKey = typeof value === 'string' ? value : v.id || v.key || v.value || valueLabel;
                    const active = selectedOptions?.[optionKey] === valueKey;
                    const valueLabelText = String(valueLabel ?? valueKey ?? '');
                    return (
                      <button
                        key={valueKey}
                        type="button"
                        onClick={() => onOptionChange?.(optionKey, valueKey)}
                        aria-pressed={active}
                        aria-label={`${optionName}: ${valueLabelText}`}
                        className={[
                          'min-w-14 rounded-lg border px-3 py-1.5 text-sm font-light transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]',
                        ].join(' ')}
                        style={{
                          borderColor: active ? 'var(--lux-text, #2B2520)' : 'var(--lux-border, #E6D8C6)',
                          backgroundColor: active ? 'var(--lux-text, #2B2520)' : 'transparent',
                          color: active ? '#FFFFFF' : 'var(--lux-muted, #756B61)',
                        }}
                      >
                        {valueLabelText}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em]" style={{ color: 'var(--lux-muted, #756B61)' }}>
              {t('product.quantity', 'الكمية')}
            </p>
            <div className="inline-flex items-center overflow-hidden rounded-lg border" style={{ borderColor: 'var(--lux-border, #E6D8C6)' }}>
              <button
                type="button"
                onClick={() => onQuantityChange?.(Math.max(1, quantity - 1))}
                className="flex h-9 w-9 items-center justify-center transition hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
                style={{ color: 'var(--lux-muted, #756B61)' }}
                aria-label={t('product.decreaseQuantity', 'تقليل الكمية')}
              >
                <Icon name="Minus" size="xs" />
              </button>
              <span className="min-w-10 px-3 text-center text-sm" style={{ color: 'var(--lux-text, #2B2520)' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange?.(quantity + 1)}
                className="flex h-9 w-9 items-center justify-center transition hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
                style={{ color: 'var(--lux-muted, #756B61)' }}
                aria-label={t('product.increaseQuantity', 'زيادة الكمية')}
              >
                <Icon name="Plus" size="xs" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            data-testid="pdp-add-to-cart"
            onClick={handleAddToCart}
            disabled={outOfStock || adding || propsBag.cartReady === false}
            className={[
              'flex min-h-8 flex-1 items-center justify-center rounded-lg px-3 text-xs font-light uppercase tracking-[0.16em] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]',
            ].join(' ')}
            style={{
              backgroundColor: outOfStock ? 'transparent' : 'var(--lux-primary, #B88A3D)',
              color: outOfStock ? 'var(--lux-muted, #756B61)' : '#FFFFFF',
              border: outOfStock ? '1px solid var(--lux-border, #E6D8C6)' : '1px solid var(--lux-primary, #B88A3D)',
              cursor: outOfStock ? 'not-allowed' : 'pointer',
            }}
          >
            {outOfStock ? (
              t('product.outOfStock', 'غير متوفر')
            ) : added ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="Check" size="xs" />
                {t('product.addedToCart', 'تمت الإضافة')}
              </span>
            ) : adding ? (
              t('product.adding', 'جارٍ الإضافة...')
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="ShoppingBag" size="xs" />
                {t('product.addToCart', 'أضف إلى السلة')}
              </span>
            )}
          </button>

          {propsBag.onBuyNow ? (
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={outOfStock}
              className="flex min-h-8 flex-1 items-center justify-center rounded-lg px-3 text-xs font-light uppercase tracking-[0.16em] transition disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
              style={{
                backgroundColor: outOfStock ? 'transparent' : 'var(--lux-primary, #B88A3D)',
                color: outOfStock ? 'var(--lux-muted, #756B61)' : '#FFFFFF',
                border: outOfStock ? '1px solid var(--lux-border, #E6D8C6)' : 'none',
                cursor: outOfStock ? 'not-allowed' : 'pointer',
              }}
            >
              {t('product.buyNow', 'اشتري الآن')}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => propsBag.onWishlist?.(product)}
            className="flex min-h-8 w-9 shrink-0 items-center justify-center rounded-lg border transition hover:text-[var(--lux-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lux-primary)]"
            style={{ borderColor: 'var(--lux-border, #E6D8C6)', color: 'var(--lux-muted, #756B61)' }}
            aria-label={t('product.addToWishlist', 'إضافة للمفضلة')}
          >
            <Icon name="Heart" size="xs" className="stroke-[1.5]" />
          </button>
        </div>

        {/* Inline trust row — luxury reference pattern. Three small
            assurances immediately below the action buttons. */}
        <ul
          className="mt-6 grid grid-cols-3 gap-3 border-t pt-6"
          style={{ borderColor: 'var(--lux-border, #E6D8C6)' }}
          aria-label={t('product.trustAriaLabel', 'ضمانات المنتج')}
        >
          <li className="flex flex-col items-center gap-1.5 text-center">
            <Icon
              name="Truck"
              size="xs"
              style={{ color: 'var(--lux-primary, #B88A3D)' }}
              className="stroke-[1.5]"
            />
            <span className="text-xs font-light leading-tight" style={{ color: 'var(--lux-muted, #756B61)' }}>
              <span className="block" style={{ color: 'var(--lux-text, #2B2520)' }}>
                {t('product.freeShipping', 'شحن مجاني')}
              </span>
              <span className="block">{t('product.worldwide', 'لجميع الدول')}</span>
            </span>
          </li>
          <li className="flex flex-col items-center gap-1.5 text-center">
            <Icon
              name="ShieldCheck"
              size="xs"
              style={{ color: 'var(--lux-primary, #B88A3D)' }}
              className="stroke-[1.5]"
            />
            <span className="text-xs font-light leading-tight" style={{ color: 'var(--lux-muted, #756B61)' }}>
              <span className="block" style={{ color: 'var(--lux-text, #2B2520)' }}>
                {t('product.warranty', 'ضمان سنتين')}
              </span>
              <span className="block">{t('product.onAllOrders', 'على كل الطلبات')}</span>
            </span>
          </li>
          <li className="flex flex-col items-center gap-1.5 text-center">
            <Icon
              name="RefreshCcw"
              size="xs"
              style={{ color: 'var(--lux-primary, #B88A3D)' }}
              className="stroke-[1.5]"
            />
            <span className="text-xs font-light leading-tight" style={{ color: 'var(--lux-muted, #756B61)' }}>
              <span className="block" style={{ color: 'var(--lux-text, #2B2520)' }}>
                {t('product.returnsDays', 'استرجاع 30 يوم')}
              </span>
              <span className="block">{t('product.hassleFree', 'بدون تعقيد')}</span>
            </span>
          </li>
        </ul>

      </div>
    </aside>
  );
}
