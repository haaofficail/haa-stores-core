import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSharedCart } from '@/hooks/CartContext';
import { checkoutApi, featuresApi, pickupLocationsApi, giftOptionsApi, type ShippingRate, type PickupLocation, type GiftOptions, type PaymentMethodAvailability, type Cart } from '@/lib/api';
import { useSEO } from '@/hooks/useSEO';
import {
  StoreContainer, StoreButton, StoreCard, StoreInput, StoreTextarea, StoreSkeleton,
  StoreStepIndicator, StoreAlert, StoreBadge,
} from '@/components/ui';
import { toast } from 'sonner';
import { Package, ArrowLeft, ArrowRight, CreditCard, Building, Banknote, ShieldCheck, MapPin, Truck, Gift, Phone, Clock } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { tracker } from '@/lib/tracker';

function generateIdempotencyKey(): string {
  try { return crypto.randomUUID(); } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function toMoneyNumber(value: unknown): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getVariantLabel(item: Cart['items'][number]): string {
  if (!item.variant) return '';
  if (item.variant.name) return item.variant.name;
  if (item.variant.options && typeof item.variant.options === 'object') {
    return Object.values(item.variant.options).filter(Boolean).join(' / ');
  }
  return '';
}

export default function Checkout() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const couponCode = searchParams.get('coupon') || undefined;
  const navigate = useNavigate();
  const { cart, loading: cartLoading, clearLocalCart } = useSharedCart();

  const [currentStep, setCurrentStep] = useState(0);
  const [confirming, setConfirming] = useState(false);

  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState({ city: '', district: '', street: '', details: '' });
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('fake_card_success');
  const [shippingLoading, setShippingLoading] = useState(false);

  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [storeGiftOptions, setStoreGiftOptions] = useState<GiftOptions | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'shipping' | 'pickup'>('shipping');
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<number | null>(null);
  const [orderGift, setOrderGift] = useState<{ sendAsGift: boolean; message: string }>({ sendAsGift: false, message: '' });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bnplMethods, setBnplMethods] = useState<PaymentMethodAvailability[]>([]);

  useSEO({ title: t('checkout.title', 'إتمام الطلب'), noIndex: true });

  // Check for BNPL callback return (orderNumber in URL)
  const callbackOrderNumber = searchParams.get('orderNumber');
  useEffect(() => {
    if (callbackOrderNumber && slug) {
      navigate(`/s/${slug}/order/${callbackOrderNumber}`, { replace: true });
    }
  }, [callbackOrderNumber, slug, navigate]);

  useEffect(() => {
    if (!slug) return;
    featuresApi.get(slug).then(setFeatures).catch(() => {});
    pickupLocationsApi.list(slug).then(setPickupLocations).catch(() => {});
    giftOptionsApi.get(slug).then(setStoreGiftOptions).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug || !cart) return;
    checkoutApi.getPaymentMethods(slug, cart.id).then((res) => {
      setBnplMethods(res.methods.filter(m => m.provider === 'tabby' || m.provider === 'tamara'));
    }).catch(() => {});
  }, [slug, cart]);

  useEffect(() => {
    if (cartLoading) return;
    if (!cart || cart.items.length === 0) {
      if (slug) navigate(`/s/${slug}/cart`);
    }
  }, [cart, cartLoading, slug, navigate]);

  useEffect(() => {
    if (slug && cart && cart.items.length > 0) {
      tracker.trackBeginCheckout(slug, cart.id);
    }
  }, [slug, cart?.id, cart?.items?.length]);

  useEffect(() => {
    if (address.city.trim() && cart && slug) {
      setShippingLoading(true);
      checkoutApi.getShippingRates(slug, cart.id, address.city)
        .then((rates) => {
          setShippingRates(rates);
          if (rates.length > 0 && !selectedShippingId) {
            setSelectedShippingId(rates[0].shippingMethodId);
          }
        })
        .catch(() => toast.error(t('common.error', 'فشل تحميل طرق الشحن')))
        .finally(() => setShippingLoading(false));
    }
  }, [address.city]);

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    switch (step) {
      case 0:
        if (!customer.name.trim()) errs.name = t('checkout.errNameRequired', 'الاسم مطلوب');
        if (!customer.phone.trim()) errs.phone = t('checkout.errPhoneRequired', 'رقم الجوال مطلوب');
        else if (!/^[0-9+\-\s]{8,20}$/.test(customer.phone.trim())) errs.phone = t('checkout.errPhoneInvalid', 'رقم جوال غير صالح');
        if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errs.email = t('checkout.errEmailInvalid', 'بريد إلكتروني غير صالح');
        break;
      case 1:
        if (fulfillmentType === 'shipping') {
          if (!address.city.trim()) errs.city = t('checkout.errCityRequired', 'المدينة مطلوبة');
        } else {
          if (!selectedPickupLocationId) errs.fulfillment = t('checkout.errPickupLocationRequired', 'اختر فرع الاستلام');
        }
        break;
      case 2:
        if (fulfillmentType === 'shipping' && !selectedShippingId) errs.shipping = t('checkout.errShippingRequired', 'اختر طريقة الشحن');
        break;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setErrors({});
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const isBNPL = paymentMethod === 'tabby_installments' || paymentMethod === 'tamara_installments';

  const handleConfirm = async () => {
    if (!slug || !cart) return;
    if (fulfillmentType === 'shipping' && !selectedShippingId) return;
    if (fulfillmentType === 'pickup' && !selectedPickupLocationId) return;
    setConfirming(true);
    try {
      const session = await checkoutApi.createSession(slug, {
        cartId: cart.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || undefined,
        shippingAddress: fulfillmentType === 'shipping' ? {
          street: address.street,
          district: address.district,
          city: address.city,
          country: 'Saudi Arabia',
        } : undefined,
        shippingMethodId: fulfillmentType === 'shipping' ? selectedShippingId! : undefined,
        fulfillmentType: fulfillmentType === 'pickup' ? 'local_pickup' as const : undefined,
        pickupLocationId: fulfillmentType === 'pickup' ? selectedPickupLocationId! : undefined,
        gift: orderGift.sendAsGift ? { sendAsGift: true, message: orderGift.message || undefined } : undefined,
        paymentMethod,
        idempotencyKey: generateIdempotencyKey(),
        couponCode,
      });

      if (isBNPL) {
        const currentUrl = window.location.href;
        const cancelUrl = `${window.location.origin}/s/${slug}`;
        const bnplResult = await checkoutApi.initiateBNPLPayment(slug, {
          sessionId: session.id,
          successUrl: currentUrl,
          cancelUrl,
          failureUrl: cancelUrl,
        });
        clearLocalCart();
        tracker.trackPurchase(slug, bnplResult.order.id, cart.id, { orderNumber: bnplResult.order.orderNumber, paymentMethod: 'bnpl' });
        if (couponCode) {
          tracker.trackCouponApplied(slug, couponCode, cart.id);
        }
        window.location.href = bnplResult.redirectUrl;
        return;
      }

      const result = await checkoutApi.confirm(slug, session.id);
      // 3DS challenge (SAMA mandatory): if the payment provider returned
      // a redirectUrl, the customer must complete the issuer's challenge
      // before the payment is confirmed. Navigate to the challenge URL;
      // the issuer will redirect the customer back to a callback that
      // finalizes the payment.
      if (result.paymentStatus === 'requires_3ds' && result.redirectUrl) {
        clearLocalCart();
        tracker.trackPurchase(slug, result.order.id, cart.id, { orderNumber: result.order.orderNumber, paymentMethod: '3ds_pending' });
        toast.info(t('checkout.threeDsRedirect', 'جاري التحقق من بطاقتك…'));
        // Use a relative path for the fake provider's local 3DS page;
        // for real providers, redirectUrl is an absolute issuer URL.
        window.location.href = result.redirectUrl;
        return;
      }
      clearLocalCart();
      tracker.trackPurchase(slug, result.order.id, cart.id, { orderNumber: result.order.orderNumber });
      if (couponCode) {
        tracker.trackCouponApplied(slug, couponCode, cart.id);
      }
      toast.success(t('checkout.success'));
      navigate(`/s/${slug}/order/${result.order.orderNumber}`);
    } catch (err: any) {
      const msg = err?.message || t('checkout.error');
      if (msg.includes('فشلت') || msg.toLowerCase().includes('fail')) {
        toast.error(t('checkout.paymentError'));
      } else {
        toast.error(msg);
      }
    } finally {
      setConfirming(false);
    }
  };

  if (cartLoading) {
    return (
      <StoreContainer className="py-8">
        <StoreSkeleton className="h-8 w-48 mb-6" />
        <div className="space-y-4">{[1, 2, 3].map((i) => <StoreSkeleton key={i} className="h-16" />)}</div>
      </StoreContainer>
    );
  }

  if (!cart || cart.items.length === 0) return null;

  const subtotal = toMoneyNumber(cart.subtotal);
  const selectedRate = shippingRates.find((r) => r.shippingMethodId === selectedShippingId);
  const shippingCost = toMoneyNumber(selectedRate?.baseRate);
  const total = Math.max(0, subtotal + shippingCost);

  const STEPS = [
    t('checkout.stepCustomer', 'بيانات العميل'),
    t('checkout.stepFulfillment', 'طريقة الاستلام'),
    ...(fulfillmentType === 'shipping' ? [t('checkout.stepShipping', 'الشحن')] : []),
    t('checkout.stepPayment', 'الدفع'),
    t('checkout.stepReview', 'المراجعة'),
  ];

  const bnplOptions = bnplMethods.map(m => {
    const isTabby = m.provider === 'tabby';
    return {
      value: isTabby ? 'tabby_installments' as const : 'tamara_installments' as const,
      label: m.name,
      icon: (
        <img
          src={`/assets/payment-logos/${m.provider}.svg`}
          alt={m.name}
          className="h-5 w-auto"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ),
      desc: isTabby
        ? t('checkout.payTabbyDesc', 'ادفع على 4 دفعات بدون فوائد')
        : t('checkout.payTamaraDesc', 'ادفع لاحقًا على أقساط ميسرة'),
    };
  });

  const paymentMethods = [
    { value: 'fake_card_success', label: t('checkout.payCard'), icon: <CreditCard className="h-4 w-4" />, desc: t('checkout.payCardDesc', 'تجريبي — سينجح الدفع') },
    { value: 'bank_transfer', label: t('checkout.payBankTransfer'), icon: <Building className="h-4 w-4" />, desc: t('checkout.payBankTransferDesc', 'تحويل بنكي مباشر') },
    { value: 'cash_on_delivery', label: t('checkout.payCash'), icon: <Banknote className="h-4 w-4" />, desc: t('checkout.payCashDesc', 'ادفع عند استلام طلبك') },
    ...bnplOptions,
  ];

  return (
    <div className="animate-fade-in" id="main-content">
      <StoreContainer className="py-3 sm:py-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to={`/s/${slug}/cart`} className="p-2 rounded-lg hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" aria-label={t('common.back')}>
            <Icon icon={ArrowLeft} size="xs" className="text-text-secondary" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('checkout.title')}</h1>
        </div>

        <StoreStepIndicator steps={STEPS} currentStep={currentStep} />

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            {currentStep === 0 && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.customerInfo')}</h2>
                <div className="space-y-4">
                  <StoreInput label={`${t('checkout.name')} *`} value={customer.name} onChange={(e) => { setCustomer({ ...customer, name: e.target.value }); setErrors({}); }} error={errors.name} placeholder={t('checkout.placeholderFullName', 'الاسم الكامل')} />
                  <StoreInput label={`${t('checkout.phone')} *`} value={customer.phone} onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setErrors({}); }} error={errors.phone} placeholder="05xxxxxxxx" dir="ltr" className="text-start" />
                  <StoreInput label={t('checkout.email')} value={customer.email} onChange={(e) => { setCustomer({ ...customer, email: e.target.value }); setErrors({}); }} error={errors.email} placeholder={t('checkout.placeholderEmail', 'email@example.com (اختياري)')} dir="ltr" className="text-start" />
                </div>
              </StoreCard>
            )}

            {currentStep === 1 && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.fulfillmentType', 'طريقة الاستلام')}</h2>
                {(features?.pickup !== false) && pickupLocations.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => { setFulfillmentType('shipping'); setSelectedPickupLocationId(null); }}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        fulfillmentType === 'shipping' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border hover:border-border-hover'
                      }`}>
                      <Icon icon={Truck} size="xs" />{t('checkout.shipping', 'شحن')}
                    </button>
                    <button type="button" onClick={() => { setFulfillmentType('pickup'); setSelectedShippingId(null); }}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        fulfillmentType === 'pickup' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border hover:border-border-hover'
                      }`}>
                      <Icon icon={MapPin} size="xs" />{t('checkout.pickup', 'استلام')}
                    </button>
                  </div>
                )}
                {fulfillmentType === 'shipping' ? (
                  <div className="space-y-4">
                    <StoreInput label={`${t('checkout.city')} *`} value={address.city} onChange={(e) => { setAddress({ ...address, city: e.target.value }); setErrors({}); }} error={errors.city} placeholder={t('checkout.placeholderCity', 'مثال: الرياض')} />
                    <StoreInput label={t('checkout.district')} value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} placeholder={t('checkout.placeholderDistrict', 'مثال: حي النرجس')} />
                    <StoreInput label={t('checkout.street')} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} placeholder={t('checkout.placeholderStreet', 'الشارع، رقم المبنى')} />
                    <StoreInput label={t('checkout.additionalDetails')} value={address.details} onChange={(e) => setAddress({ ...address, details: e.target.value })} placeholder={t('checkout.placeholderDetails', 'تفاصيل إضافية (اختياري)')} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pickupLocations.map((loc) => (
                      <label key={loc.id}
                        className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedPickupLocationId === loc.id ? 'border-primary-500 bg-primary-50/50' : 'border-border hover:border-border-hover'
                        }`}>
                        <input type="radio" name="pickupLocation" value={loc.id}
                          checked={selectedPickupLocationId === loc.id}
                          onChange={() => setSelectedPickupLocationId(loc.id)}
                          className="accent-primary-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{loc.nameAr || loc.nameEn}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{loc.address}</p>
                          {loc.phone && <p className="text-xs text-text-tertiary mt-0.5" dir="ltr"><Icon icon={Phone} size="2xs" className="inline align-middle ms-0.5" />{loc.phone}</p>}
                          {loc.hours && typeof loc.hours === 'object' && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              <Icon icon={Clock} size="2xs" className="inline align-middle ms-0.5" />{Object.entries(loc.hours as Record<string, string>).map(([d, h]) => `${d}: ${h}`).join(' | ')}
                            </p>
                          )}
                          {loc.instructions && <p className="text-xs text-text-tertiary mt-1">{loc.instructions}</p>}
                          {loc.mapsUrl && (
                            <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block">
                              {t('checkout.viewOnMap', 'عرض على الخريطة')}
                            </a>
                          )}
                        </div>
                      </label>
                    ))}
                    {pickupLocations.length === 0 && (
                      <p className="text-text-secondary text-sm">{t('checkout.noPickupLocations', 'لا توجد فروع متاحة للاستلام')}</p>
                    )}
                    {selectedPickupLocationId && storeGiftOptions?.pickupInstructions && (
                      <StoreAlert variant="info" className="text-xs">
                        {storeGiftOptions.pickupInstructions}
                      </StoreAlert>
                    )}
                  </div>
                )}
                {errors.fulfillment && <p className="text-xs text-danger mt-2">{errors.fulfillment}</p>}

                {/* Order-level gift options */}
                {features?.sendAsGift !== false && (
                  <StoreAlert variant="info" className="mt-4" title={t('product.sendAsGift', 'إرسال الطلب كهدية')}>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={orderGift.sendAsGift}
                          onChange={e => setOrderGift(p => ({ ...p, sendAsGift: e.target.checked }))}
                          className="rounded border-primary-300 h-4 w-4 accent-primary-500" />
                        <span className="text-sm font-medium">{t('product.sendAsGift', 'إرسال الطلب كهدية')}</span>
                      </label>
                      {orderGift.sendAsGift && (
                        <>
                          <StoreTextarea
                            value={orderGift.message}
                            onChange={e => {
                              const max = storeGiftOptions?.giftMessageMaxLength ?? 250;
                              if (e.target.value.length <= max) setOrderGift(p => ({ ...p, message: e.target.value }));
                            }}
                            placeholder={t('product.giftMessagePlaceholder', 'رسالة الهدية (اختياري)')}
                            className="h-20"
                          />
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-text-tertiary">
                              {t('checkout.giftMessageHint', 'سيتم إرفاق الرسالة مع الطلب')}
                            </p>
                            <span className={`text-xs ${orderGift.message.length > (storeGiftOptions?.giftMessageMaxLength ?? 250) ? 'text-danger' : 'text-text-tertiary'}`}>
                              {orderGift.message.length} / {storeGiftOptions?.giftMessageMaxLength ?? 250}
                            </span>
                          </div>
                          {orderGift.message.length > (storeGiftOptions?.giftMessageMaxLength ?? 250) && (
                            <p className="text-xs text-danger">{t('checkout.errGiftMessageTooLong', 'رسالة الهدية طويلة. الحد الأقصى {{max}} حرف.', { max: storeGiftOptions?.giftMessageMaxLength ?? 250 })}</p>
                          )}
                        </>
                      )}
                    </div>
                  </StoreAlert>
                )}
              </StoreCard>
            )}

            {currentStep === 2 && fulfillmentType === 'shipping' && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.shippingMethod')}</h2>
                {shippingLoading ? (
                  <div className="space-y-3">{[1, 2].map((i) => <StoreSkeleton key={i} className="h-16" />)}</div>
                ) : shippingRates.length === 0 ? (
                  <div className="text-center py-8 text-text-secondary">
                    <p>{address.city.trim() ? t('checkout.noShippingMethods') : t('checkout.enterCity', 'أدخل المدينة لعرض طرق الشحن')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {shippingRates.map((rate) => (
                      <label
                        key={rate.shippingMethodId}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedShippingId === rate.shippingMethodId
                            ? 'border-primary-500 bg-primary-50/50'
                            : 'border-border hover:border-border-hover'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={rate.shippingMethodId}
                          checked={selectedShippingId === rate.shippingMethodId}
                          onChange={() => setSelectedShippingId(rate.shippingMethodId)}
                          className="accent-primary-500"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{rate.methodName}</p>
                          {rate.estimatedDaysMin && (
                            <p className="text-xs text-text-secondary">{rate.estimatedDaysMin}-{rate.estimatedDaysMax} {t('checkout.days', 'أيام')}</p>
                          )}
                        </div>
                        <p className="font-bold text-sm">
                          {toMoneyNumber(rate.baseRate) > 0 ? <>{toMoneyNumber(rate.baseRate).toFixed(2)} <SarIcon size="sm" /></> : t('checkout.free', 'مجاني')}
                        </p>
                      </label>
                    ))}
                  </div>
                )}
                {errors.shipping && <p className="text-xs text-danger mt-2">{errors.shipping}</p>}
              </StoreCard>
            )}

            {currentStep === 3 && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.paymentMethod')}</h2>
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.value}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === method.value
                          ? 'border-primary-500 bg-primary-50/50'
                          : 'border-border hover:border-border-hover'
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                        className="accent-primary-500"
                      />
                      <div className="p-2 rounded-lg bg-surface-2">{method.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{method.label}</p>
                        <p className="text-xs text-text-secondary">{method.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
                <StoreAlert variant="warning" className="mt-4">
                  <p className="text-xs">{t('checkout.localTestWarning', 'هذه نسخة تجريبية محلية. لن يتم خصم أي مبالغ حقيقية.')}</p>
                </StoreAlert>
              </StoreCard>
            )}

            {currentStep === 4 && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.orderSummary')} — {t('checkout.stepReview', 'المراجعة')}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-text-secondary mb-1">{t('checkout.reviewName', 'الاسم')}</p>
                      <p className="font-medium">{customer.name}</p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">{t('checkout.reviewPhone', 'الجوال')}</p>
                      <p className="font-medium" dir="ltr">{customer.phone}</p>
                    </div>
                    {customer.email && (
                      <div className="col-span-2">
                        <p className="text-text-secondary mb-1">{t('checkout.reviewEmail', 'البريد')}</p>
                        <p className="font-medium" dir="ltr">{customer.email}</p>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-border pt-4">
                    <p className="text-text-secondary mb-1 text-sm">{t('checkout.reviewShippingAddress', 'عنوان الشحن')}</p>
                    <p className="font-medium text-sm">
                      {[address.street, address.district, address.city, address.details].filter(Boolean).join(t('common.comma', '، '))}
                    </p>
                  </div>
                  {cart && cart.items && cart.items.length > 0 && (
                    <div className="border-t border-border pt-4">
                      <p className="text-text-secondary mb-2 text-sm">{t('checkout.reviewItems', 'المنتجات')}</p>
                      <div className="space-y-2">
                        {cart.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-start text-sm py-1">
                            <div>
                              <span className="text-text-primary">{item.product?.name ?? item.name} × {item.item?.quantity ?? item.quantity}</span>
                              {getVariantLabel(item) && (
                                <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5">
                                  {getVariantLabel(item)}
                                </p>
                              )}
                              {(item.item?.giftWrapSelected || item.item?.sendAsGift) && (
                          <div className="flex gap-1 mt-0.5">
                            {item.item?.giftWrapSelected && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.giftWrap', 'تغليف')}</StoreBadge>}
                            {item.item?.sendAsGift && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.sendAsGift', 'هدية')}</StoreBadge>}
                          </div>
                              )}
                              {item.item?.giftMessage &&                       <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{item.item.giftMessage}</p>}
                            </div>
                            <span className="font-medium tabular-nums">{Number(item.item?.totalPrice ?? item.totalPrice).toFixed(2)} <SarIcon size="sm" /></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                  <div className="pt-4">
                    <p className="text-text-secondary mb-1 text-sm">{t('checkout.reviewPayment', 'طريقة الدفع')}</p>
                    <p className="font-medium text-sm">{paymentMethods.find(m => m.value === paymentMethod)?.label}</p>
                  </div>
                  {fulfillmentType === 'pickup' && selectedPickupLocationId && (
                    <div className="pt-4">
                      <p className="text-text-secondary mb-1 text-sm">{t('checkout.fulfillmentType', 'طريقة الاستلام')}</p>
                      <p className="font-medium text-sm">{t('checkout.pickup', 'استلام من الفرع')}</p>
                      {(() => {
                        const loc = pickupLocations.find(l => l.id === selectedPickupLocationId);
                        return loc ? <p className="text-xs text-text-tertiary">{loc.nameAr || loc.nameEn}</p> : null;
                      })()}
                    </div>
                  )}
                  {orderGift.sendAsGift && (
                    <div className="pt-4">
                      <p className="text-text-secondary mb-1 text-sm"><Icon icon={Gift} size="xs" className="inline align-middle ms-1" />{t('product.sendAsGift', 'إرسال كهدية')}</p>
                      {orderGift.message && <p className="text-sm text-text-primary">{orderGift.message}</p>}
                    </div>
                  )}
              </StoreCard>
            )}

            <div className="flex justify-between mt-6">
              {currentStep > 0 ? (
              <StoreButton variant="outline" onClick={prevStep} icon={<Icon icon={ArrowRight} size="xs" />}>
                {t('checkout.prev', 'السابق')}
              </StoreButton>
              ) : <div />}
              {currentStep < STEPS.length - 1 ? (
                <StoreButton onClick={nextStep}>
                  {t('checkout.next', 'التالي')}
                  <ArrowLeft className="h-4 w-4 me-1" />
                </StoreButton>
              ) : (
                <StoreButton onClick={handleConfirm} loading={confirming} disabled={fulfillmentType === 'shipping' ? !selectedShippingId : !selectedPickupLocationId}>
                  {confirming ? t('checkout.confirming') : t('checkout.confirm')}
                </StoreButton>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <StoreCard className="p-6 sticky top-24">
              <h3 className="font-bold mb-4">{t('checkout.sidebarSummary', 'ملخص الطلب')}</h3>
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                <div className="w-10 h-10 bg-surface-2 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product.images?.[0] ? (
                    <img width={400} height={400} src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <Icon icon={Package} size="xs" className="text-text-disabled" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-text-primary">{item.product.name}</p>
                  {getVariantLabel(item) && (
                    <p className="text-[var(--badge-font-size)] text-text-tertiary line-clamp-1">
                      {getVariantLabel(item)}
                    </p>
                  )}
                  <p className="text-xs text-text-tertiary">{item.quantity} × {Number(item.unitPrice).toFixed(2)} <SarIcon size="sm" /></p>
                  {item.notes && <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5">{item.notes}</p>}
                </div>
                    <p className="font-medium text-sm">{Number(item.totalPrice).toFixed(2)} <SarIcon size="sm" /></p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold text-base pt-3">
                <span>{t('checkout.total')}</span>
                <span className="text-primary-600">{total.toFixed(2)} <SarIcon size="md" /></span>
              </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary">
                  <Icon icon={ShieldCheck} size="xs" />
                  <span>{t('checkout.securePayment', 'دفع آمن ومحمي')}</span>
                </div>
            </StoreCard>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
