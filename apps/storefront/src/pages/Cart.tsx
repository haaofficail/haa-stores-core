import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { useSharedCart } from '@/hooks/CartContext';
import {
  StoreContainer, StoreButton, StoreCard, StoreSkeleton, StoreEmptyState, StoreQuantitySelector, StoreBadge, StoreInput, StoreIconButton,
} from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { ShoppingCart, Trash2, Package, ArrowLeft, ShoppingBag, Check, Tag, X, Gift } from 'lucide-react';
import { toast } from 'sonner';
import { SarIcon } from '@/components/ui/SarIcon';
import { useSEO } from '@/hooks/useSEO';
import { useStore } from '@/hooks/useStore';
import { checkoutApi, type CouponValidation, type Cart } from '@/lib/api';

function getVariantLabel(item: Cart['items'][number]): string {
  if (!item.variant) return '';
  if (item.variant.name) return item.variant.name;
  if (item.variant.options && typeof item.variant.options === 'object') {
    return Object.values(item.variant.options).filter(Boolean).join(' / ');
  }
  return '';
}

export default function Cart() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { store } = useStore();
  const { cart, loading, updateItem, removeItem, addItem } = useSharedCart();
  const [updating, setUpdating] = useState<number | null>(null);
  const [savedItems, setSavedItems] = useState<Cart['items']>([]);

  useSEO({
    title: `${t('cart.title', 'سلة التسوق')} - ${store?.name || ''}`,
  });

  const [couponCode, setCouponCode] = useState('');
  const [couponData, setCouponData] = useState<CouponValidation | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const handleApplyCoupon = useCallback(async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const result = await checkoutApi.validateCoupon(slug!, code, Number(cart!.subtotal));
      if (result.valid) {
        setCouponData(result);
        toast.success(t('cart.couponApplied', 'تم تطبيق كود الخصم'));
      } else {
        setCouponError(result.reason || t('cart.couponInvalid', 'كود الخصم غير صالح'));
        setCouponData(null);
      }
    } catch {
      setCouponError(t('common.error'));
    } finally {
      setCouponLoading(false);
    }
  }, [couponCode, slug, cart, t]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponCode('');
    setCouponData(null);
    setCouponError('');
  }, []);

  const handleQuantityChange = async (itemId: number, newQty: number) => {
    if (newQty < 1) return;
    setUpdating(itemId);
    try {
      await updateItem(itemId, newQty);
      toast.success(t('cart.quantityUpdated'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: number) => {
    setUpdating(itemId);
    try {
      await removeItem(itemId);
      toast.success(t('cart.itemRemoved'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveForLater = async (item: Cart['items'][number]) => {
    setUpdating(item.id);
    try {
      await removeItem(item.id);
      setSavedItems((prev) => [...prev, item]);
      toast.success(t('cart.savedForLater', 'تم حفظ المنتج لوقت لاحق'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const handleMoveToCart = async (item: Cart['items'][number]) => {
    setUpdating(item.id);
    try {
      await addItem(item.product.id, item.quantity, undefined, {
        giftWrapSelected: item.giftWrapSelected,
        sendAsGift: item.sendAsGift,
        giftMessage: item.giftMessage ?? undefined,
      }, item.variantId ?? undefined);
      setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(t('cart.moveToCart', 'تم نقل المنتج للسلة'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setUpdating(null);
    }
  };

  const handleRemoveSaved = (itemId: number) => {
    setSavedItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  if (loading) {
    return (
      <StoreContainer className="py-8">
        <StoreSkeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <StoreSkeleton key={i} className="h-24" />)}
        </div>
      </StoreContainer>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <StoreContainer className="py-8" id="main-content">
        <StoreEmptyState
          icon={ShoppingCart}
          title={t('cart.empty')}
          description={t('cart.emptyDescription')}
          action={
            <StoreButton href={`/s/${slug}`} icon={<Icon icon={ArrowLeft} size="xs" />}>
              {t('cart.continueShopping')}
            </StoreButton>
          }
        />
      </StoreContainer>
    );
  }

  const subtotal = Number(cart.subtotal);

  return (
    <div className="animate-fade-in" id="main-content">
      <StoreContainer className="py-3 sm:py-4">
        <h1 className="text-lg sm:text-xl font-bold text-text-primary mb-4">{t('cart.title')}</h1>

        <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="lg:col-span-2 space-y-2">
            {cart.items.map((item) => {
              const variantLabel = getVariantLabel(item);
              const availableStock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
              const maxQty = item.product.trackInventory ? Math.max(1, availableStock) : 99;
              return (
                <StoreCard key={item.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/s/${slug}/p/${item.product.slug}`}
                      className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center overflow-hidden shrink-0"
                    >
                      {item.product.images?.[0] ? (
                        <img width={400} height={400} src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Icon icon={Package} size="md" className="text-text-disabled" />
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/s/${slug}/p/${item.product.slug}`}
                        className="font-medium text-sm text-text-primary hover:text-primary-600 transition-colors line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      {variantLabel && (
                        <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5 line-clamp-1">
                          {variantLabel}
                        </p>
                      )}
                      <p className="text-primary-600 font-semibold text-xs mt-0.5">
                        {Number(item.unitPrice).toFixed(2)} <SarIcon size="md" />
                      </p>
                      {(item.giftWrapSelected || item.sendAsGift) && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                           {item.giftWrapSelected && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.giftWrap', 'تغليف')}</StoreBadge>}
                           {item.sendAsGift && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.sendAsGift', 'هدية')}</StoreBadge>}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <StoreQuantitySelector
                        value={item.quantity}
                        onChange={(newQty) => handleQuantityChange(item.id, newQty)}
                        min={1}
                        max={maxQty}
                        disabled={updating === item.id}
                      />
                      <p className="font-semibold text-xs sm:w-16 sm:text-start">
                        {Number(item.totalPrice).toFixed(2)} <SarIcon size="md" />
                      </p>
                      <button
                        onClick={() => handleSaveForLater(item)}
                        disabled={updating === item.id}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 disabled:opacity-40 text-[11px]"
                        aria-label={t('cart.saveForLater', 'حفظ لوقت لاحق')}
                      >
                        {t('cart.saveForLater', 'حفظ')}
                      </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={updating === item.id}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger-soft transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400 disabled:opacity-40"
                          aria-label={t('cart.removeProduct', 'حذف المنتج')}
                        >
                          <Icon icon={Trash2} size="2xs" />
                        </button>
                    </div>
                  </div>
                </StoreCard>
              );
            })}
            {savedItems.length > 0 && (
              <div className="pt-4">
                <h2 className="text-sm font-bold text-text-primary mb-2">{t('cart.savedForLater', 'محفوظ لوقت لاحق')}</h2>
                <div className="space-y-2">
                  {savedItems.map((item) => (
                    <StoreCard key={item.id} className="p-3 opacity-70">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/s/${slug}/p/${item.product.slug}`}
                          className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center overflow-hidden shrink-0"
                        >
                          {item.product.images?.[0] ? (
                            <img width={400} height={400} src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                        <Icon icon={Package} size="md" className="text-text-disabled" />
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          {(() => {
                            const variantLabel = getVariantLabel(item);
                            return (
                              <>
                          <Link
                            to={`/s/${slug}/p/${item.product.slug}`}
                            className="font-medium text-sm text-text-primary hover:text-primary-600 transition-colors line-clamp-1"
                          >
                            {item.product.name}
                          </Link>
                                {variantLabel && (
                                  <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5 line-clamp-1">
                                    {variantLabel}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                          <p className="text-primary-600 font-semibold text-xs mt-0.5">
                            {Number(item.unitPrice).toFixed(2)} <SarIcon size="md" />
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <StoreButton variant="ghost" size="sm" onClick={() => handleMoveToCart(item)} disabled={updating === item.id}>
                            {t('cart.moveToCart', 'نقل للسلة')}
                          </StoreButton>
                  <StoreIconButton
                    variant="danger"
                    size="md"
                    onClick={() => handleRemoveSaved(item.id)}
                    aria-label={t('cart.removeSaved', 'حذف')}
                  >
                    <Icon icon={Trash2} size="2xs" />
                  </StoreIconButton>
                        </div>
                      </div>
                    </StoreCard>
                  ))}
                </div>
              </div>
            )}

            <StoreButton variant="ghost" size="sm" href={`/s/${slug}`} className="mt-2"
              iconStart={<Icon icon={ArrowLeft} size="2xs" />}>
              {t('cart.continueShopping')}
            </StoreButton>
          </div>

          <div className="lg:col-span-1 space-y-3">
            {(() => {
              const FREE_SHIPPING = 199;
              const remaining = Math.max(0, FREE_SHIPPING - subtotal);
              const progress = Math.min(100, (subtotal / FREE_SHIPPING) * 100);
              return (
              <div className="bg-primary-50 rounded-xl p-3">
                {remaining > 0 ? (
                  <>
                    <p className="text-xs font-medium text-primary-700 mb-1.5">
                      {t('cart.freeShippingProgress', { amount: `${remaining.toFixed(2)} ر.س` })}
                    </p>
                    <div className="h-1.5 bg-primary-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="text-xs font-medium text-primary-700 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                    {t('cart.freeShippingReached')}
                  </p>
                )}
              </div>
              );
            })()}

            <StoreCard className="p-3">
                <h3 className="text-xs font-bold text-text-primary mb-2 flex items-center gap-1.5">
                  <Icon icon={Tag} size="2xs" className="text-primary-600" />
                  {t('cart.couponTitle', 'كود خصم')}
                </h3>
              {couponData?.valid ? (
                <div className="flex items-center justify-between bg-primary-50 rounded-lg p-2.5">
                  <div>
                    <p className="text-xs font-bold text-primary-700">{couponData.code}</p>
                      <p className="text-[var(--badge-font-size)] text-primary-600">
                        {t('cart.couponDiscount', 'الخصم')}: -{Number(couponData.discount).toFixed(2)} <SarIcon size="md" />
                      </p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="p-1 rounded-lg hover:bg-primary-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
                    aria-label={t('cart.removeCoupon', 'إزالة الكود')}
                  >
                    <Icon icon={X} size="2xs" className="text-primary-600" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5 items-start">
                  <div className="flex-1">
                    <StoreInput
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value); setCouponError(''); }}
                      placeholder={t('cart.couponPlaceholder', 'أدخل كود الخصم')}
                      dir="auto"
                    />
                  </div>
                  <StoreButton
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="shrink-0"
                    size="md"
                  >
                    {couponLoading ? t('common.loading', '...') : t('cart.applyCoupon', 'تطبيق')}
                  </StoreButton>
                </div>
              )}
              {couponError && (
                <p className="text-[11px] text-danger mt-1.5">{couponError}</p>
              )}
            </StoreCard>

            <StoreCard className="p-4 sticky top-20">
              <h2 className="font-bold text-sm mb-3">{t('cart.orderSummary', 'ملخص الطلب')}</h2>

              <div className="space-y-2 mb-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                       {item.product.images?.[0] ? (
                         <img width={400} height={400} src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />
                       ) : (
                          <Icon icon={ShoppingBag} size="2xs" className="text-text-disabled" />
                       )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-text-primary">{item.product.name}</p>
                      {getVariantLabel(item) && (
                        <p className="text-[var(--badge-font-size)] text-text-tertiary line-clamp-1">
                          {getVariantLabel(item)}
                        </p>
                      )}
                      <p className="text-[var(--badge-font-size)] text-text-tertiary">{item.quantity} × {Number(item.unitPrice).toFixed(2)} <SarIcon size="sm" /></p>
                      {(item.giftWrapSelected || item.sendAsGift) && (
                         <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.giftWrapSelected && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.giftWrap', 'تغليف')}</StoreBadge>}
                           {item.sendAsGift && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.sendAsGift', 'هدية')}</StoreBadge>}
                         </div>
                      )}
                    </div>
                    <p className="font-medium text-xs">{Number(item.totalPrice).toFixed(2)} <SarIcon size="md" /></p>
                  </div>
                ))}
              </div>

              <div className="pt-3 space-y-1.5 border-t border-border">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">{t('cart.subtotal')}</span>
                  <span className="font-medium">{subtotal.toFixed(2)} <SarIcon size="md" /></span>
                </div>
                {couponData?.valid && (
                  <div className="flex justify-between text-xs">
                    <span className="text-text-secondary">{t('cart.couponDiscount', 'الخصم')}</span>
                    <span className="font-medium text-primary-600">-{Number(couponData.discount).toFixed(2)} <SarIcon size="md" /></span>
                  </div>
                )}
                <p className="text-[11px] text-text-tertiary text-start">{t('cart.shippingCalculated', 'سيتم حساب الشحن عند إتمام الطلب')}</p>
              </div>

              <div className="pt-3 mt-3 border-t border-border">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-bold text-sm">{t('cart.total', 'الإجمالي')}</span>
                  <span className="font-bold text-base text-primary-600">{(subtotal - (couponData?.discount || 0)).toFixed(2)} <SarIcon size="md" /></span>
                </div>
                <StoreButton
                  href={`/s/${slug}/checkout${couponData?.valid && couponData.code ? `?coupon=${encodeURIComponent(couponData.code)}` : ''}`}
                  className="w-full"
                  size="md"
                >
                  {t('cart.checkout')}
                </StoreButton>
              </div>
            </StoreCard>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
