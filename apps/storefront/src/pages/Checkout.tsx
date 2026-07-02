import { useState, useEffect, useRef } from 'react';
import { buildCheckoutStepKeys, clampStepIndex, type CheckoutStepKey } from '@/lib/checkout-steps';
import { isSafeRedirectUrl } from '@/lib/safe-redirect';
import { saveTrackPhone } from '@/lib/order-track-storage';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useSharedCart } from '@/hooks/CartContext';
import { checkoutApi, featuresApi, pickupLocationsApi, giftOptionsApi, loyaltyApi, type ShippingRate, type PickupLocation, type GiftOptions, type PaymentMethodAvailability, type Cart, type LoyaltyBalanceResponse, ApiClientError } from '@/lib/api';
import { useSEO } from '@/hooks/useSEO';
// TASK-0035 sub-item 7: VAT-aware checkout summary
// 15% per ZATCA. The total displayed is inc-VAT; subtotal + VAT line
// are shown separately for transparency. See formatVatLine helper.
import { DEFAULT_VAT_RATE, formatVatLine, priceExVat } from '@haa/commerce-core/vat';
import {
  StoreContainer, StoreButton, StoreCard, StoreInput, StoreTextarea, StoreSkeleton,
  StoreStepIndicator, StoreAlert, StoreBadge,
} from '@/components/ui';
import { toast } from 'sonner';
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

type PaymentRecoveryState = {
  kind: 'payment_failed' | 'checkout_failed' | 'stock_unavailable';
  message: string;
  paymentMethod: string;
};

function isStockUnavailableError(err: unknown, message: string): boolean {
  const code = err instanceof ApiClientError ? err.code : '';
  const lowerMessage = message.toLowerCase();
  return code === 'INSUFFICIENT_STOCK' ||
    lowerMessage.includes('insufficient stock') ||
    message.includes('مخزون') ||
    message.includes('لم يعد متوفر');
}

export default function Checkout() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const couponCode = searchParams.get('coupon') || undefined;
  const navigate = useNavigate();
  const { cart, loading: cartLoading, clearLocalCart } = useSharedCart();

  const [currentStep, setCurrentStep] = useState(0);
  const [confirming, setConfirming] = useState(false);
  // مفتاح idempotency ثابت لكل محاولة checkout — لا يتغيّر مع كل ضغطة/إعادة محاولة (QA CO4)
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());
  const shippingReqRef = useRef(0); // حارس سباق جلب طرق الشحن

  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState({ city: '', district: '', street: '', details: '' });
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedShippingId, setSelectedShippingId] = useState<number | null>(null);
  // طريقة الدفع التجريبية متاحة في التطوير فقط؛ الإنتاج يبدأ بالدفع عند الاستلام (QA S7).
  const FAKE_PAYMENTS_ENABLED = import.meta.env.DEV;
  const [paymentMethod, setPaymentMethod] = useState(import.meta.env.DEV ? 'fake_card_success' : 'cash_on_delivery');
  const [shippingLoading, setShippingLoading] = useState(false);

  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);
  const [storeGiftOptions, setStoreGiftOptions] = useState<GiftOptions | null>(null);
  const [fulfillmentType, setFulfillmentType] = useState<'shipping' | 'pickup'>('shipping');
  const [selectedPickupLocationId, setSelectedPickupLocationId] = useState<number | null>(null);
  const [orderGift, setOrderGift] = useState<{ sendAsGift: boolean; message: string }>({ sendAsGift: false, message: '' });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentRecovery, setPaymentRecovery] = useState<PaymentRecoveryState | null>(null);
  const [bnplMethods, setBnplMethods] = useState<PaymentMethodAvailability[]>([]);
  // L-PR-6 — loyalty balance + redeem widget state.
  // The server is the SINGLE source of truth for the redemption value:
  // the widget shows whatever `loyaltyApi.quoteRedeem` returns and never
  // recomputes points → SAR on the client.
  const [loyaltyBalance, setLoyaltyBalance] = useState<LoyaltyBalanceResponse | null>(null);
  const [redeemPoints, setRedeemPoints] = useState<number>(0);
  const [redeemQuote, setRedeemQuote] = useState<{ points: number; value: number } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  // P1-6 fix: couponCode arrives via ?coupon= from the Cart page, but its
  // discount VALUE never made it here — the displayed total silently
  // ignored a coupon the server would still apply on confirm. Re-validate
  // (server-authoritative, same endpoint Cart.tsx uses) so the reviewed
  // total matches what gets charged.
  const [couponDiscount, setCouponDiscount] = useState<number>(0);

  useSEO({ title: t('checkout.title', 'إتمام الطلب'), noIndex: true });

  // Check for BNPL callback return (orderNumber in URL)
  const callbackOrderNumber = searchParams.get('orderNumber');
  useEffect(() => {
    if (callbackOrderNumber && slug) {
      clearLocalCart(); // الدفع اكتمل والطلب موجود — آمن لمسح السلة الآن (QA CO5)
      navigate(`/s/${slug}/order/${callbackOrderNumber}`, { replace: true });
    }
  }, [callbackOrderNumber, slug, navigate, clearLocalCart]);

  useEffect(() => {
    if (!slug) return;
    featuresApi.get(slug).then(setFeatures).catch(() => {});
    pickupLocationsApi.list(slug).then(setPickupLocations).catch(() => {});
    giftOptionsApi.get(slug).then(setStoreGiftOptions).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!slug || !cart) return;
    checkoutApi.getPaymentMethods(slug, cart.id).then((res) => {
      const methods = Array.isArray(res?.methods) ? res.methods : [];
      setBnplMethods(methods.filter(m => m.provider === 'tabby' || m.provider === 'tamara'));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, cart?.id, cart?.items?.length]);

  useEffect(() => {
    if (address.city.trim() && cart && slug) {
      // حارس سباق: تغيّر المدينة بسرعة قد يُرجع استجابة مدينة قديمة بعد الجديدة.
      // نطبّق أحدث طلب فقط عبر معرّف تصاعدي.
      const reqId = ++shippingReqRef.current;
      setShippingLoading(true);
      checkoutApi.getShippingRates(slug, cart.id, address.city)
        .then((rates) => {
          if (reqId !== shippingReqRef.current) return; // استجابة قديمة → تجاهل
          setShippingRates(rates);
          // أبقِ اختيار العميل إن كان لا يزال متاحاً؛ وإلا اختر أول طريقة كافتراضي
          setSelectedShippingId((cur) =>
            cur && rates.some((r) => r.shippingMethodId === cur)
              ? cur
              : rates[0]?.shippingMethodId ?? null,
          );
        })
        .catch(() => { if (reqId === shippingReqRef.current) toast.error(t('common.error', 'فشل تحميل طرق الشحن')); })
        .finally(() => { if (reqId === shippingReqRef.current) setShippingLoading(false); });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.city]);

  // L-PR-6 — fetch loyalty balance once the customer's phone is valid.
  // The endpoint returns `{ enabled: false }` when the store has loyalty
  // off, which we treat as "hide the widget". 404 / network errors also
  // hide the widget rather than blocking checkout (defensive default).
  useEffect(() => {
    const phone = customer.phone.trim();
    if (!slug || phone.length < 8) { setLoyaltyBalance(null); return; }
    let cancelled = false;
    loyaltyApi.getBalance(slug, phone)
      .then((res) => { if (!cancelled) setLoyaltyBalance(res); })
      .catch(() => { if (!cancelled) setLoyaltyBalance(null); });
    return () => { cancelled = true; };
  }, [slug, customer.phone]);

  // P1-6 fix: re-validate the coupon from ?coupon= against the CURRENT
  // subtotal/shipping so the reviewed total reflects the discount the
  // server will actually apply on confirm. Uses shippingRates/
  // selectedShippingId directly (not the post-guard `shippingCost`
  // const below) since hooks must run unconditionally before the
  // `!cart` early return.
  useEffect(() => {
    if (!slug || !couponCode || !cart) { setCouponDiscount(0); return; }
    let cancelled = false;
    const rate = shippingRates.find((r) => r.shippingMethodId === selectedShippingId);
    checkoutApi.validateCoupon(slug, couponCode, toMoneyNumber(cart.subtotal), toMoneyNumber(rate?.baseRate))
      .then((res) => { if (!cancelled) setCouponDiscount(res.valid ? toMoneyNumber(res.discount) : 0); })
      .catch(() => { if (!cancelled) setCouponDiscount(0); });
    return () => { cancelled = true; };
  }, [slug, couponCode, cart, shippingRates, selectedShippingId]);

  // Safety clamp: when fulfillmentType changes, the dynamic step list
  // shrinks/grows; ensure currentStep never points past the last step.
  useEffect(() => {
    const stepCount = buildCheckoutStepKeys(fulfillmentType).length;
    setCurrentStep((s) => clampStepIndex(s, stepCount));
  }, [fulfillmentType]);

  // خطوات ديناميكية بمفاتيح ثابتة — pickup يحذف خطوة الشحن دون كسر الفهارس (QA CO3).
  const STEP_LABELS: Record<CheckoutStepKey, string> = {
    customer: t('checkout.stepCustomer', 'بيانات العميل'),
    fulfillment: t('checkout.stepFulfillment', 'طريقة الاستلام'),
    shipping: t('checkout.stepShipping', 'الشحن'),
    payment: t('checkout.stepPayment', 'الدفع'),
    review: t('checkout.stepReview', 'المراجعة'),
  };
  const stepKeys = buildCheckoutStepKeys(fulfillmentType);
  const steps = stepKeys.map((key) => ({ key, label: STEP_LABELS[key] }));
  const STEPS = steps.map((st) => st.label);
  const activeStep = steps[currentStep]?.key;

  const validateStep = (step: number): boolean => {
    const errs: Record<string, string> = {};
    switch (steps[step]?.key) {
      case 'customer':
        if (!customer.name.trim()) errs.name = t('checkout.errNameRequired', 'الاسم مطلوب');
        if (!customer.phone.trim()) errs.phone = t('checkout.errPhoneRequired', 'رقم الجوال مطلوب');
        else if (!/^[0-9+\-\s]{8,20}$/.test(customer.phone.trim())) errs.phone = t('checkout.errPhoneInvalid', 'رقم جوال غير صالح');
        if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) errs.email = t('checkout.errEmailInvalid', 'بريد إلكتروني غير صالح');
        break;
      case 'fulfillment':
        if (fulfillmentType === 'shipping') {
          if (!address.city.trim()) errs.city = t('checkout.errCityRequired', 'المدينة مطلوبة');
        } else {
          if (!selectedPickupLocationId) errs.fulfillment = t('checkout.errPickupLocationRequired', 'اختر فرع الاستلام');
        }
        break;
      case 'shipping':
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

  const goToStep = (key: CheckoutStepKey) => {
    const targetStep = steps.findIndex((step) => step.key === key);
    if (targetStep >= 0) setCurrentStep(targetStep);
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value);
    setPaymentRecovery(null);
  };

  const handleChangePaymentAfterFailure = () => {
    setPaymentRecovery(null);
    setErrors({});
    goToStep('payment');
  };

  const handleRetryPayment = () => {
    setPaymentRecovery(null);
    void handleConfirm();
  };

  const isBNPL = paymentMethod === 'tabby_installments' || paymentMethod === 'tamara_installments';

  // L-PR-6 — server-authoritative redeem preview. Called on apply; never
  // computed client-side. Returns the value (SAR) to deduct from the
  // order total — the widget displays only what the server allows.
  const requestRedeemQuote = async (orderTotal: number) => {
    if (!slug) return;
    const phone = customer.phone.trim();
    if (!loyaltyBalance?.enabled) return;
    if (!Number.isFinite(redeemPoints) || redeemPoints <= 0) {
      setRedeemQuote(null);
      setRedeemError(null);
      return;
    }
    setQuoteLoading(true);
    setRedeemError(null);
    try {
      const res = await loyaltyApi.quoteRedeem(slug, { phone, points: redeemPoints, orderTotal });
      if (res.points <= 0 || res.value <= 0) {
        setRedeemQuote(null);
        setRedeemError(res.reason || t('checkout.redeemRejected', 'لا يمكن استخدام هذا العدد من النقاط الآن.'));
      } else {
        setRedeemQuote({ points: res.points, value: res.value });
      }
    } catch (err) {
      setRedeemQuote(null);
      setRedeemError(err instanceof ApiClientError ? err.message : t('checkout.redeemError', 'تعذّر استبدال النقاط.'));
    } finally {
      setQuoteLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (confirming) return; // امنع الإرسال المزدوج فعلياً (QA CO4)
    if (!slug || !cart) return;
    if (fulfillmentType === 'shipping' && !selectedShippingId) return;
    if (fulfillmentType === 'pickup' && !selectedPickupLocationId) return;
    setConfirming(true);
    setPaymentRecovery(null);
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
        idempotencyKey: idempotencyKeyRef.current,
        couponCode,
        // P0-2 fix: the server re-validates this against the current
        // balance/rules (never trusts redeemQuote.value directly) — see
        // CheckoutService.createSession in packages/commerce-core.
        redeemPoints: redeemQuote && redeemQuote.points > 0 ? redeemQuote.points : undefined,
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
        // لا نمسح السلة قبل تأكيد الدفع — تُمسح عند العودة بـ orderNumber (QA CO5)
        if (!isSafeRedirectUrl(bnplResult.redirectUrl)) {
          const message = t('checkout.paymentError', 'تعذّر بدء الدفع.');
          setPaymentRecovery({ kind: 'payment_failed', message, paymentMethod });
          toast.error(message);
          setConfirming(false);
          return;
        }
        tracker.trackPurchase(slug, bnplResult.order.id, cart.id, { orderNumber: bnplResult.order.orderNumber, paymentMethod: 'bnpl' });
        if (couponCode) {
          tracker.trackCouponApplied(slug, couponCode, cart.id);
        }
        // Persist the buyer's phone so the order page auto-loads on return
        // from the BNPL provider without re-asking for it (same-origin).
        saveTrackPhone(bnplResult.order.orderNumber, customer.phone);
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
        // لا نمسح السلة قبل اكتمال تحدّي 3DS — تُمسح عند العودة المؤكّدة (QA CO5)
        if (!isSafeRedirectUrl(result.redirectUrl)) {
          const message = t('checkout.paymentError', 'تعذّر بدء التحقق من الدفع.');
          setPaymentRecovery({ kind: 'payment_failed', message, paymentMethod });
          toast.error(message);
          setConfirming(false);
          return;
        }
        tracker.trackPurchase(slug, result.order.id, cart.id, { orderNumber: result.order.orderNumber, paymentMethod: '3ds_pending' });
        // Persist phone before the 3DS redirect so the order page auto-loads
        // when the issuer returns the customer to the callback.
        saveTrackPhone(result.order.orderNumber, customer.phone);
        toast.info(t('checkout.threeDsRedirect', 'جاري التحقق من بطاقتك…'));
        // Use a relative path for the fake provider's local 3DS page;
        // for real providers, redirectUrl is an absolute issuer URL.
        window.location.href = result.redirectUrl;
        return;
      }
      // P1 fix (flagged by review): confirm() never throws for a failed
      // payment — it always resolves 200 with paymentStatus reflecting the
      // outcome (see CheckoutService.confirm). Before this check, every
      // non-3DS response fell through to the success path below, so a
      // declined card or a provider exception (caught server-side and
      // turned into paymentStatus='failed') was shown to the customer as a
      // completed order. Only 'paid', or 'pending' for the two
      // pay-on-collection methods, is an actual success.
      const isPendingCollectionMethod = paymentMethod === 'cash_on_delivery' || paymentMethod === 'bank_transfer';
      const paymentSucceeded = result.paymentStatus === 'paid'
        || (result.paymentStatus === 'pending' && isPendingCollectionMethod);
      if (!paymentSucceeded) {
        const message = t('checkout.paymentError', 'تعذّر إتمام الدفع.');
        setPaymentRecovery({ kind: 'payment_failed', message, paymentMethod });
        toast.error(message);
        setConfirming(false);
        return;
      }
      clearLocalCart();
      tracker.trackPurchase(slug, result.order.id, cart.id, { orderNumber: result.order.orderNumber });
      if (couponCode) {
        tracker.trackCouponApplied(slug, couponCode, cart.id);
      }
      toast.success(t('checkout.success'));
      // Persist the buyer's phone so the confirmation page loads the order
      // immediately instead of showing the "enter phone to track" gate.
      saveTrackPhone(result.order.orderNumber, customer.phone);
      navigate(`/s/${slug}/order/${result.order.orderNumber}`);
    } catch (err: unknown) {
      const msg = (err as { message?: string } | null)?.message || t('checkout.error');
      const lowerMsg = msg.toLowerCase();
      if (isStockUnavailableError(err, msg)) {
        const stockMessage = err instanceof ApiClientError
          ? err.message
          : t('checkout.stockRecoveryMessage', 'أحد المنتجات في السلة لم يعد متوفرًا بالكمية المطلوبة. راجع السلة قبل إعادة المحاولة.');
        setPaymentRecovery({
          kind: 'stock_unavailable',
          message: stockMessage,
          paymentMethod,
        });
        toast.error(stockMessage);
        return;
      }
      const paymentFailed =
        msg.includes('فشلت') ||
        msg.includes('دفع') ||
        lowerMsg.includes('fail') ||
        lowerMsg.includes('payment') ||
        lowerMsg.includes('declined');
      const recoveryMessage = paymentFailed ? t('checkout.paymentError', 'تعذّر إتمام الدفع.') : msg;
      setPaymentRecovery({
        kind: paymentFailed ? 'payment_failed' : 'checkout_failed',
        message: recoveryMessage,
        paymentMethod,
      });
      if (paymentFailed) {
        toast.error(recoveryMessage);
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
  // L-PR-6 — server-validated redeem discount. ONLY applied when the
  // server quote returned points > 0 and value > 0. The displayed total
  // mirrors what the order will be charged; the actual deduction is
  // re-validated server-side on confirm (defense in depth).
  const loyaltyDiscount = redeemQuote ? Math.max(0, redeemQuote.value) : 0;
  const total = Math.max(0, subtotal + shippingCost - couponDiscount - loyaltyDiscount);


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
    ...(FAKE_PAYMENTS_ENABLED ? [{ value: 'fake_card_success', label: t('checkout.payCard'), icon: <Icon name="CreditCard" size="xs" />, desc: t('checkout.payCardDesc', 'تجريبي — سينجح الدفع') }] : []),
    { value: 'bank_transfer', label: t('checkout.payBankTransfer'), icon: <Icon name="Building" size="xs" />, desc: t('checkout.payBankTransferDesc', 'تحويل بنكي مباشر') },
    { value: 'cash_on_delivery', label: t('checkout.payCash'), icon: <Icon name="Banknote" size="xs" />, desc: t('checkout.payCashDesc', 'ادفع عند استلام طلبك') },
    ...bnplOptions,
  ];
  let paymentRecoveryTitle = '';
  if (paymentRecovery?.kind === 'stock_unavailable') {
    paymentRecoveryTitle = t('checkout.stockRecoveryTitle', 'تغير توفر المنتجات');
  } else if (paymentRecovery?.kind === 'payment_failed') {
    paymentRecoveryTitle = t('checkout.paymentRecoveryTitle', 'لم يكتمل الدفع');
  } else if (paymentRecovery) {
    paymentRecoveryTitle = t('checkout.checkoutRecoveryTitle', 'لم يكتمل الطلب');
  }

  return (
    <div className="animate-fade-in overflow-x-hidden" id="main-content">
      <StoreContainer className="py-3 sm:py-4">
        <div className="flex items-center gap-3 mb-6">
          <Link to={`/s/${slug}/cart`} className="p-2 rounded-lg hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400" aria-label={t('common.back')}>
            <Icon name="ArrowLeft" size="xs" className="text-text-secondary" />
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{t('checkout.title')}</h1>
        </div>

        <StoreStepIndicator steps={STEPS} currentStep={currentStep} />

        {paymentRecovery && (
          <div className="mb-6" data-testid="checkout-payment-recovery">
            <StoreAlert
              variant="danger"
              title={paymentRecoveryTitle}
            >
              <div className="space-y-3">
                <p>
                  {paymentRecovery.message}{' '}
                  {paymentRecovery.kind === 'stock_unavailable'
                    ? t('checkout.stockRecoveryHelp', 'ارجع إلى السلة لتحديث الكميات أو إزالة المنتج غير المتاح قبل إعادة إتمام الطلب.')
                    : t('checkout.paymentRecoveryHelp', 'يمكنك إعادة المحاولة، تغيير طريقة الدفع، أو التواصل مع الدعم بدون فقدان السلة.')}
                </p>
                {paymentRecovery.kind !== 'stock_unavailable' && (
                  <p className="text-xs opacity-90" dir="ltr">
                    {paymentRecovery.paymentMethod}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-2">
                  {paymentRecovery.kind === 'stock_unavailable' ? (
                    <StoreButton
                      size="sm"
                      href={`/s/${slug}/cart`}
                      iconStart={<Icon name="ShoppingCart" size="2xs" />}
                    >
                      {t('checkout.returnToCart', 'العودة للسلة')}
                    </StoreButton>
                  ) : (
                    <>
                      <StoreButton
                        type="button"
                        size="sm"
                        onClick={handleRetryPayment}
                        loading={confirming}
                        iconStart={<Icon name="RefreshCw" size="2xs" />}
                      >
                        {t('checkout.retryPayment', 'إعادة المحاولة')}
                      </StoreButton>
                      <StoreButton
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleChangePaymentAfterFailure}
                        iconStart={<Icon name="CreditCard" size="2xs" />}
                      >
                        {t('checkout.changePaymentMethod', 'تغيير طريقة الدفع')}
                      </StoreButton>
                    </>
                  )}
                  <StoreButton
                    size="sm"
                    variant="outline"
                    href={`/s/${slug}/support`}
                    iconStart={<Icon name="Phone" size="2xs" />}
                  >
                    {t('checkout.contactSupport', 'تواصل مع الدعم')}
                  </StoreButton>
                </div>
              </div>
            </StoreAlert>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2">
            {activeStep === 'customer' && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.customerInfo')}</h2>
                <div className="space-y-4">
                  <StoreInput label={`${t('checkout.name')} *`} value={customer.name} onChange={(e) => { setCustomer({ ...customer, name: e.target.value }); setErrors({}); }} error={errors.name} placeholder={t('checkout.placeholderFullName', 'الاسم الكامل')} />
                  <StoreInput label={`${t('checkout.phone')} *`} type="tel" inputMode="tel" autoComplete="tel" value={customer.phone} onChange={(e) => { setCustomer({ ...customer, phone: e.target.value }); setErrors({}); }} error={errors.phone} placeholder="05xxxxxxxx" dir="ltr" className="text-start" />
                  <StoreInput label={t('checkout.email')} value={customer.email} onChange={(e) => { setCustomer({ ...customer, email: e.target.value }); setErrors({}); }} error={errors.email} placeholder={t('checkout.placeholderEmail', 'email@example.com (اختياري)')} dir="ltr" className="text-start" />
                </div>
              </StoreCard>
            )}

            {activeStep === 'fulfillment' && (
              <StoreCard className="p-6">
                <h2 className="font-bold text-lg mb-4">{t('checkout.fulfillmentType', 'طريقة الاستلام')}</h2>
                {(features?.pickup !== false) && pickupLocations.length > 0 && (
                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => { setFulfillmentType('shipping'); setSelectedPickupLocationId(null); }}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        fulfillmentType === 'shipping' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border hover:border-border-hover'
                      }`}>
                      <Icon name="Truck" size="xs" />{t('checkout.shipping', 'شحن')}
                    </button>
                    <button type="button" onClick={() => { setFulfillmentType('pickup'); setSelectedShippingId(null); }}
                      className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        fulfillmentType === 'pickup' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border hover:border-border-hover'
                      }`}>
                      <Icon name="MapPin" size="xs" />{t('checkout.pickup', 'استلام')}
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
                          {loc.phone && <p className="text-xs text-text-tertiary mt-0.5" dir="ltr"><Icon name="Phone" size="2xs" className="inline align-middle ms-0.5" />{loc.phone}</p>}
                          {loc.hours && typeof loc.hours === 'object' && (
                            <p className="text-xs text-text-tertiary mt-0.5">
                              <Icon name="Clock" size="2xs" className="inline align-middle ms-0.5" />{Object.entries(loc.hours as Record<string, string>).map(([d, h]) => `${d}: ${h}`).join(' | ')}
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

            {activeStep === 'shipping' && (
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

            {activeStep === 'payment' && (
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
                        onChange={() => handlePaymentMethodChange(method.value)}
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
                {FAKE_PAYMENTS_ENABLED && (
                  <StoreAlert variant="warning" className="mt-4">
                    <p className="text-xs">{t('checkout.localTestWarning', 'هذه نسخة تجريبية محلية. لن يتم خصم أي مبالغ حقيقية.')}</p>
                  </StoreAlert>
                )}
              </StoreCard>
            )}

            {activeStep === 'review' && (
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
                        {cart.items.map((item: Cart['items'][number] & {
                          name?: string;
                          item?: { quantity?: number; giftWrapSelected?: boolean; sendAsGift?: boolean; giftMessage?: string; totalPrice?: number | string };
                        }, idx: number) => (
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
                            {item.item?.giftWrapSelected && <StoreBadge variant="info" size="sm"><Icon name="Gift" size="2xs" className="inline align-middle ms-0.5" />{t('cart.giftWrap', 'تغليف')}</StoreBadge>}
                            {item.item?.sendAsGift && <StoreBadge variant="info" size="sm"><Icon name="Gift" size="2xs" className="inline align-middle ms-0.5" />{t('cart.sendAsGift', 'هدية')}</StoreBadge>}
                          </div>
                              )}
                              {item.item?.giftMessage &&                       <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5"><Icon name="Gift" size="2xs" className="inline align-middle ms-0.5" />{item.item.giftMessage}</p>}
                            </div>
                            <span className="font-medium tabular-nums">{toMoneyNumber(item.item?.totalPrice ?? item.totalPrice).toFixed(2)} <SarIcon size="sm" /></span>
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
                      <p className="text-text-secondary mb-1 text-sm"><Icon name="Gift" size="xs" className="inline align-middle ms-1" />{t('product.sendAsGift', 'إرسال كهدية')}</p>
                      {orderGift.message && <p className="text-sm text-text-primary">{orderGift.message}</p>}
                    </div>
                  )}

                  {/* L-PR-6 — loyalty redeem widget. Visible only when the
                      store has loyalty enabled AND the customer's balance
                      meets the minRedeemPoints floor. The discount value
                      is SERVER-AUTHORITATIVE — the UI only displays the
                      `value` returned by quoteRedeem. */}
                  {loyaltyBalance?.enabled && loyaltyBalance.balance >= (loyaltyBalance.rules?.minRedeemPoints ?? 0) && loyaltyBalance.balance > 0 && (
                    <div className="pt-4 border-t border-border" data-testid="loyalty-redeem-widget">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-primary-50 text-primary-600">
                          <Icon name="Coins" size="xs" />
                        </span>
                        <h3 className="font-semibold text-sm text-text-primary">
                          {t('checkout.useLoyaltyPoints', 'استبدال نقاط الولاء')}
                        </h3>
                      </div>
                      <p className="text-xs text-text-secondary mb-2" dir="ltr" data-testid="loyalty-redeem-available">
                        {t('checkout.loyaltyAvailable', 'لديك {{n}} نقطة', { n: loyaltyBalance.balance.toLocaleString('en-US') })}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={loyaltyBalance.rules?.minRedeemPoints ?? 1}
                          max={loyaltyBalance.balance}
                          step={1}
                          value={redeemPoints || ''}
                          onChange={(e) => {
                            const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                            setRedeemPoints(n);
                            setRedeemQuote(null);
                            setRedeemError(null);
                          }}
                          placeholder={String(loyaltyBalance.rules?.minRedeemPoints ?? 0)}
                          className="flex-1 h-9 text-sm rounded-lg border border-border px-3 focus:outline-none focus:ring-1 focus:ring-primary-400"
                          dir="ltr"
                          data-testid="loyalty-redeem-points-input"
                          aria-label={t('checkout.loyaltyPointsAria', 'عدد النقاط للاستبدال')}
                        />
                        <StoreButton
                          type="button"
                          variant="outline"
                          onClick={() => requestRedeemQuote(Math.max(0, subtotal + shippingCost - couponDiscount))}
                          disabled={quoteLoading || redeemPoints <= 0}
                          data-testid="loyalty-redeem-apply"
                        >
                          {quoteLoading ? t('common.loading', 'جارٍ…') : t('checkout.applyPoints', 'تطبيق')}
                        </StoreButton>
                      </div>
                      {redeemError && (
                        <p className="text-xs text-danger mt-2" data-testid="loyalty-redeem-error">{redeemError}</p>
                      )}
                      {redeemQuote && (
                        <StoreAlert variant="success" className="mt-3" data-testid="loyalty-redeem-success">
                          <p className="text-xs" dir="ltr">
                            {t('checkout.loyaltyAppliedFmt', 'سيتم خصم {{points}} نقطة = {{value}} ر.س', {
                              points: redeemQuote.points.toLocaleString('en-US'),
                              value: redeemQuote.value.toFixed(2),
                            })}
                          </p>
                        </StoreAlert>
                      )}
                    </div>
                  )}
              </StoreCard>
            )}

            <div className="flex justify-between mt-6">
              {currentStep > 0 ? (
              <StoreButton variant="outline" onClick={prevStep} icon={<Icon name="ArrowRight" size="xs" />}>
                {t('checkout.prev', 'السابق')}
              </StoreButton>
              ) : <div />}
              {currentStep < STEPS.length - 1 ? (
                <StoreButton onClick={nextStep}>
                  {t('checkout.next', 'التالي')}
                  <Icon name="ArrowLeft" size="xs" className="me-1" />
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
                    <Icon name="Package" size="xs" className="text-text-disabled" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="line-clamp-1 text-text-primary">{item.product.name}</p>
                  {getVariantLabel(item) && (
                    <p className="text-[var(--badge-font-size)] text-text-tertiary line-clamp-1">
                      {getVariantLabel(item)}
                    </p>
                  )}
                  <p className="text-xs text-text-tertiary">{item.quantity} × {toMoneyNumber(item.unitPrice).toFixed(2)} <SarIcon size="sm" /></p>
                  {item.notes && <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5">{item.notes}</p>}
                </div>
                    <p className="font-medium text-sm">{toMoneyNumber(item.totalPrice).toFixed(2)} <SarIcon size="sm" /></p>
                  </div>
                ))}
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm pt-3 text-success" data-testid="coupon-discount-line">
                  <span>{t('checkout.couponDiscount', 'خصم كود الخصم')}</span>
                  <span dir="ltr">-{couponDiscount.toFixed(2)} <SarIcon size="sm" /></span>
                </div>
              )}
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm pt-3 text-success" data-testid="loyalty-discount-line">
                  <span>{t('checkout.loyaltyDiscount', 'خصم نقاط الولاء')}</span>
                  <span dir="ltr">-{loyaltyDiscount.toFixed(2)} <SarIcon size="sm" /></span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-3">
                <span>{t('checkout.total')}</span>
                <span className="text-primary-600">{total.toFixed(2)} <SarIcon size="md" /></span>
              </div>
              {(() => {
                // TASK-0035 sub-item 7: VAT-aware pricing transparency
                // The displayed `total` is inc-VAT. Show subtotal (ex-VAT)
                // and VAT line separately so the customer sees the
                // 15% ZATCA VAT clearly (SAMA-mandated transparency).
                // Uses DEFAULT_VAT_RATE (or env override) from @haa/commerce-core.
                const vatRate = DEFAULT_VAT_RATE;
                const subtotal = priceExVat(Number(total), vatRate);
                const locale = (i18n?.language === 'ar' ? 'ar' : 'en') as 'ar' | 'en';
                const vatLine = formatVatLine(subtotal, vatRate, locale);
                return (
                  <div className="mt-2 space-y-1 text-xs text-text-tertiary">
                    <div className="flex justify-between">
                      <span>{t('checkout.subtotalExVat', 'المجموع قبل الضريبة')}</span>
                      <span dir="ltr">{subtotal.toFixed(2)} <SarIcon size="sm" /></span>
                    </div>
                    <div className="flex justify-between" data-testid="vat-line">
                      <span>{vatLine}</span>
                    </div>
                    <div className="text-xs text-text-tertiary leading-relaxed pt-1">
                      {t('checkout.vatNote', 'شامل ضريبة القيمة المضافة (15%) — فاتورة ضريبية مبسطة')}
                    </div>
                  </div>
                );
              })()}
                <div className="mt-4 flex items-center gap-2 text-xs text-text-tertiary">
                  <Icon name="ShieldCheck" size="xs" />
                  <span>{t('checkout.securePayment', 'دفع آمن ومحمي')}</span>
                </div>
            </StoreCard>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
