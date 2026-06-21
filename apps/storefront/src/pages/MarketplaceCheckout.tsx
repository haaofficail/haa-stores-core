import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Package, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { cartApi, checkoutApi, haaMarketplaceApi, type CheckoutConfirm } from '@/lib/api';
import { marketplaceCart, type MarketplaceCartItem } from '@/lib/marketplace-cart';
import { StoreAlert, StoreButton, StoreCard, StoreContainer, StoreInput, StoreTextarea } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { useSEO } from '@/hooks/useSEO';

// بوّابة: checkout الماركتبليس متعدّد المتاجر يُنسّق per-store من الواجهة (خطر طلبات يتيمة عند
// الفشل الجزئي). معطّل في الإنتاج حتى يُبنى endpoint backend موحّد (QA B3/MC6). راجع docs/ops/QA_AUDIT.
const MARKETPLACE_CHECKOUT_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_MARKETPLACE_CHECKOUT === 'true';

function generateIdempotencyKey(): string {
  try { return crypto.randomUUID(); } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-0000-4000-8000-000000000000`;
  }
}

function groupByStore(items: MarketplaceCartItem[]) {
  const groups = new Map<string, MarketplaceCartItem[]>();
  items.forEach((item) => {
    const key = item.product.store.slug;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return [...groups.entries()].map(([slug, storeItems]) => ({
    slug,
    store: storeItems[0].product.store,
    items: storeItems,
    subtotal: storeItems.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
  }));
}

export default function MarketplaceCheckout() {
  const navigate = useNavigate();
  const [items] = useState<MarketplaceCartItem[]>(() => marketplaceCart.list());
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [address, setAddress] = useState({ city: '', district: '', street: '' });
  const [paymentMethod, setPaymentMethod] = useState<'fake_card_success' | 'bank_transfer' | 'cash_on_delivery'>(import.meta.env.DEV ? 'fake_card_success' : 'cash_on_delivery');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [marketplaceOrderNumber, setMarketplaceOrderNumber] = useState('');
  const [marketplaceAccessToken, setMarketplaceAccessToken] = useState('');
  const [orders, setOrders] = useState<Array<{ storeName: string; storeSlug: string; orderNumber: string }>>([]);
  const [checkoutIdempotencyKey] = useState(() => generateIdempotencyKey());

  const groups = useMemo(() => groupByStore(items), [items]);
  const subtotal = marketplaceCart.subtotal(items);

  useSEO({ title: 'إتمام طلب سوق هاء', noIndex: true });

  const submit = async () => {
    if (!MARKETPLACE_CHECKOUT_ENABLED) return; // production-safe gate (QA B3) — defensive; render is gated below
    if (submitting) return;
    if (!customer.name.trim() || !customer.phone.trim() || !address.city.trim()) {
      toast.error('أدخل الاسم والجوال والمدينة');
      return;
    }

    if (items.length === 0) {
      navigate('/marketplace/cart');
      return;
    }

    setSubmitting(true);
    const createdOrders: Array<{ storeName: string; storeSlug: string; orderNumber: string }> = [];
    try {
      for (const group of groups) {
        const cart = await cartApi.create(group.slug);
        let activeCart = cart;
        for (const item of group.items) {
          activeCart = await cartApi.addItem(
            group.slug,
            activeCart.id,
            item.product.id,
            item.quantity,
            undefined,
            undefined,
            undefined,
            'haa_marketplace',
          );
        }

        const rates = await checkoutApi.getShippingRates(group.slug, activeCart.id, address.city);
        const selectedRate = rates[0];
        if (!selectedRate) throw new Error(`لا توجد طريقة شحن متاحة من متجر ${group.store.name} إلى ${address.city}`);

        const session = await checkoutApi.createSession(group.slug, {
          cartId: activeCart.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || undefined,
          shippingAddress: {
            city: address.city,
            district: address.district || undefined,
            street: address.street || undefined,
            country: 'Saudi Arabia',
          },
          shippingMethodId: selectedRate.shippingMethodId,
          paymentMethod,
          notes: notes || 'طلب من سوق هاء العام',
          idempotencyKey: `${checkoutIdempotencyKey}:${group.slug}`,
        });

        const confirmed: CheckoutConfirm = await checkoutApi.confirm(group.slug, session.id);
        createdOrders.push({
          storeName: group.store.name,
          storeSlug: group.slug,
          orderNumber: confirmed.order.orderNumber,
        });
      }

      const marketplaceOrder = await haaMarketplaceApi.createOrder({
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || undefined,
        shippingAddress: {
          city: address.city,
          district: address.district || undefined,
          street: address.street || undefined,
          country: 'Saudi Arabia',
        },
        paymentMethod,
        notes: notes || undefined,
        subOrders: createdOrders.map((order) => ({
          storeSlug: order.storeSlug,
          orderNumber: order.orderNumber,
        })),
      });

      marketplaceCart.clear();
      setMarketplaceOrderNumber(marketplaceOrder.marketplaceOrderNumber);
      // TASK-0040 Track 1B — P0-3. Capture accessToken for tracking link.
      // The MarketplaceOrderTrack page also reads from API response.
      if (marketplaceOrder.accessToken) {
        setMarketplaceAccessToken(marketplaceOrder.accessToken);
        try {
          sessionStorage.setItem(
            `haa.marketplace.order.token.${marketplaceOrder.marketplaceOrderNumber}`,
            marketplaceOrder.accessToken,
          );
        } catch {
          // ignore storage failures (private mode, quota, etc.)
        }
      }
      setOrders(createdOrders);
      toast.success('تم إنشاء طلبات السوق بنجاح');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'تعذر إتمام طلب السوق';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // Production-safe gate (QA B3 / marketplace blocker): when the unified
  // marketplace checkout is disabled, never render the form OR the submit
  // button — show a disabled notice instead. This is a RENDER-level early
  // return (the previous gate sat inside the submit handler and returned JSX
  // that was never displayed, so the form shipped to production).
  if (!MARKETPLACE_CHECKOUT_ENABLED) {
    return (
      <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-surface-2 overflow-x-hidden">
        <StoreContainer className="py-10">
          <StoreAlert variant="info" title="الدفع من السوق غير متاح حالياً">
            نعمل على تجهيز الدفع الموحّد عبر سوق هاء. يمكنك الشراء مباشرةً من صفحة كل متجر الآن.
          </StoreAlert>
          <StoreButton href="/marketplace" className="mt-4">تصفّح السوق</StoreButton>
        </StoreContainer>
      </main>
    );
  }

  if (orders.length > 0) {
    return (
      <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-surface-2 overflow-x-hidden">
        <StoreContainer className="py-10">
          <StoreCard className="mx-auto max-w-2xl p-6 text-center">
            <Icon icon={CheckCircle2} size="xl" className="mx-auto text-success" />
            <h1 className="mt-4 text-2xl font-bold text-text-primary">تم إنشاء طلب سوق هاء</h1>
            <p className="mt-2 text-sm text-text-secondary">رقم الطلب الموحد: <span className="font-bold text-primary-600">{marketplaceOrderNumber}</span></p>
            <StoreAlert variant="info" title="التنفيذ من المتاجر" className="mt-5 text-start">
              كل متجر مسؤول عن شحن وتنفيذ الجزء الخاص به من الطلب. سوق هاء يجمع الطلبات ويوفر رقم تتبع موحد فقط.
            </StoreAlert>
            <div className="mt-5 space-y-2 text-start">
              {orders.map((order) => (
                <Link
                  key={`${order.storeSlug}-${order.orderNumber}`}
                  to={`/s/${order.storeSlug}/order/${order.orderNumber}`}
                  className="flex items-center justify-between rounded-[8px] border border-border bg-surface-2 px-3 py-2 text-sm hover:bg-surface-1"
                >
                  <span>{order.storeName}</span>
                  <span className="font-semibold text-primary-600">{order.orderNumber}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <StoreButton href={`/marketplace/order/${marketplaceOrderNumber}${marketplaceAccessToken ? `?access_token=${encodeURIComponent(marketplaceAccessToken)}` : ''}`}>تتبع الطلب الموحد</StoreButton>
              <StoreButton href="/marketplace" variant="outline">العودة لسوق هاء</StoreButton>
            </div>
          </StoreCard>
        </StoreContainer>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-surface-2 overflow-x-hidden">
        <StoreContainer className="py-10">
          <StoreAlert variant="warning" title="السلة فارغة">أضف منتجات من سوق هاء قبل إتمام الطلب.</StoreAlert>
          <StoreButton href="/marketplace" className="mt-4">العودة للسوق</StoreButton>
        </StoreContainer>
      </main>
    );
  }

  return (
    <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-surface-2 overflow-x-hidden">
      <StoreContainer className="py-6">
        <div className="mb-5 flex items-center gap-3">
          <Link to="/marketplace/cart" className="flex h-10 w-10 items-center justify-center rounded-[8px] hover:bg-surface-1" aria-label="رجوع">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">إتمام طلب سوق هاء</h1>
            <p className="mt-1 text-sm text-text-secondary">الدفع الموحد، والتنفيذ والشحن من كل متجر على حدة.</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <StoreCard className="p-5">
              <h2 className="mb-4 text-base font-bold text-text-primary">بيانات العميل</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <StoreInput label="الاسم *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
                <StoreInput label="الجوال *" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} dir="ltr" className="text-start" />
                <StoreInput label="البريد الإلكتروني" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} dir="ltr" className="text-start sm:col-span-2" />
              </div>
            </StoreCard>

            <StoreCard className="p-5">
              <h2 className="mb-4 text-base font-bold text-text-primary">عنوان الشحن</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <StoreInput label="المدينة *" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                <StoreInput label="الحي" value={address.district} onChange={(e) => setAddress({ ...address, district: e.target.value })} />
                <StoreInput label="الشارع" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} className="sm:col-span-2" />
              </div>
            </StoreCard>

            <StoreCard className="p-5">
              <h2 className="mb-4 text-base font-bold text-text-primary">الدفع والملاحظات</h2>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  ...(import.meta.env.DEV ? [['fake_card_success', 'بطاقة تجريبية']] : []),
                  ['bank_transfer', 'تحويل بنكي'],
                  ['cash_on_delivery', 'الدفع عند الاستلام'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value as typeof paymentMethod)}
                    className={`rounded-[8px] border px-3 py-3 text-sm font-semibold transition-colors ${
                      paymentMethod === value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-border bg-surface-1 text-text-secondary hover:bg-surface-2'
                    }`}
                  >
                    <CreditCard className="mx-auto mb-1 h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <StoreTextarea label="ملاحظات" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-4" />
            </StoreCard>
          </div>

          <aside className="h-fit rounded-[8px] border border-border bg-surface-1 p-4 shadow-card">
            <h2 className="text-base font-bold text-text-primary">تقسيم الطلب</h2>
            <StoreAlert variant="info" title="الشحن من التاجر" className="mt-3">
              يتم حساب الشحن حسب إعدادات كل متجر، ويتولى التاجر إجراءات التجهيز والتوصيل والدعم بعد الطلب.
            </StoreAlert>
            <div className="mt-4 space-y-3">
              {groups.map((group) => (
                <div key={group.slug} className="rounded-[8px] bg-surface-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{group.store.name}</span>
                    <span className="text-xs text-text-tertiary">{group.items.length} منتج</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {group.items.map((item) => (
                      <div key={item.product.id} className="flex items-center gap-2 text-xs text-text-secondary">
                        <Icon icon={Package} size="2xs" />
                        <span className="flex-1 truncate">{item.product.name}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs font-bold text-text-primary">
                    {group.subtotal.toFixed(2)} <SarIcon size="md" />
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-sm text-text-secondary">الإجمالي قبل الشحن</span>
              <span className="font-bold">{subtotal.toFixed(2)} <SarIcon size="md" /></span>
            </div>
            <StoreButton onClick={submit} loading={submitting} className="mt-5 w-full" iconStart={<Icon icon={ShoppingBag} size="xs" />}>
              إنشاء طلبات السوق
            </StoreButton>
          </aside>
        </div>
      </StoreContainer>
    </main>
  );
}
