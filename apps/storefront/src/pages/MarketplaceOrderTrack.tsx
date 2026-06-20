import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { Copy, Package, Search, Store } from 'lucide-react';
import { haaMarketplaceApi, type MarketplaceOrder } from '@/lib/api';
import { StoreAlert, StoreButton, StoreCard, StoreContainer, StoreInput, StoreSkeleton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { useSEO } from '@/hooks/useSEO';

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    created: 'تم الإنشاء',
    draft: 'مسودة',
    pending_payment: 'بانتظار الدفع',
    confirmed: 'مؤكد',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
    paid: 'مدفوع',
    unpaid: 'غير مدفوع',
    pending: 'معلق',
    unfulfilled: 'لم يشحن',
    partial: 'جزئي',
    mixed: 'متعدد',
  };
  return labels[status] ?? status;
}

function formatAmount(value: unknown) {
  const a = Number(value);
  return Number.isFinite(a) ? a.toFixed(2) : '0.00';
}

// TASK-0040 Track 1B — P0-3. Persist the access token per-order in
// localStorage so customers don't have to re-enter it on every visit.
// Keyed by marketplaceOrderNumber to keep tokens isolated per order.
const TOKEN_STORAGE_PREFIX = 'haa.marketplace.order.token.';

export default function MarketplaceOrderTrack() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lookupOrderNumber, setLookupOrderNumber] = useState(orderNumber ?? '');
  // Prefer ?access_token= query param; fall back to localStorage; fall
  // back to legacy ?phone= (deprecated, see Plan §3 Track 1B).
  const readStoredToken = (key: string): string | null => {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  };
  const initialToken =
    searchParams.get('access_token') ??
    (orderNumber ? readStoredToken(TOKEN_STORAGE_PREFIX + orderNumber) : null);
  const [accessToken, setAccessToken] = useState(initialToken ?? '');
  const [legacyPhone] = useState(searchParams.get('phone') ?? '');
  const [order, setOrder] = useState<MarketplaceOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(orderNumber && (initialToken || legacyPhone)));
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const requestIdRef = useRef(0);

  useSEO({ title: `تتبع طلب سوق هاء ${orderNumber ?? ''}`, noIndex: true });

  const load = useCallback(async (token: string, phone: string) => {
    if (!orderNumber) return;
    if (!token.trim() && !phone.trim()) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');
    try {
      // Prefer token; fall back to legacy phone during transition window.
      const result = token.trim()
        ? await haaMarketplaceApi.getOrder(orderNumber, token.trim())
        : await haaMarketplaceApi.getOrderLegacy(orderNumber, phone.trim());
      if (requestId !== requestIdRef.current) return;
      setOrder(result);
      // Persist token for future visits (one-time read from API response
      // OR from URL query on first navigation).
      if (result.accessToken && orderNumber) {
        try {
          sessionStorage.setItem(TOKEN_STORAGE_PREFIX + orderNumber, result.accessToken);
        } catch {
          // Storage may be unavailable (private mode / quota); non-fatal.
        }
      }
      // Do not re-write the token back into the URL; clear query params once read.
      setSearchParams(new URLSearchParams(), { replace: true });
    } catch {
      if (requestId !== requestIdRef.current) return;
      setOrder(null);
      setError('لم يتم العثور على طلب سوق بهذا الرقم.');
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [orderNumber, setSearchParams]);

  useEffect(() => {
    if (orderNumber && (initialToken || legacyPhone)) load(initialToken ?? '', legacyPhone);
  }, [orderNumber, initialToken, legacyPhone, load]);

  useEffect(() => {
    setLookupOrderNumber(orderNumber ?? '');
  }, [orderNumber]);

  const submitLookup = () => {
    if (!lookupOrderNumber.trim() || !accessToken.trim()) {
      setError('أدخل رقم طلب السوق ورمز الدخول للاستعلام.');
      return;
    }
    navigate(`/marketplace/order/${encodeURIComponent(lookupOrderNumber.trim())}?access_token=${encodeURIComponent(accessToken.trim())}`);
  };

  const copyToken = async () => {
    if (!order?.accessToken) return;
    try {
      await navigator.clipboard.writeText(order.accessToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked; user can still copy manually.
    }
  };

  return (
    <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-surface-2 overflow-x-hidden">
      <StoreContainer className="py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">استعلام وتتبع طلبات سوق هاء</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {orderNumber || 'أدخل رقم طلب السوق ورمز الدخول لعرض الطلبات التي تمت من السوق.'}
            </p>
          </div>
          <StoreButton href="/marketplace" variant="outline">العودة للسوق</StoreButton>
        </div>

        <StoreCard className="mb-5 p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <StoreInput
              label="رقم طلب السوق"
              value={lookupOrderNumber}
              onChange={(e) => setLookupOrderNumber(e.target.value)}
              placeholder="MP-..."
              dir="ltr"
              className="text-start"
            />
            <StoreInput
              label="رمز الدخول"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="UUID من رسالة التأكيد"
              dir="ltr"
              className="text-start"
            />
            <StoreButton type="button" onClick={orderNumber ? () => {
              const typed = lookupOrderNumber.trim();
              const token = accessToken.trim();
              if (typed && typed !== orderNumber) {
                navigate(`/marketplace/order/${encodeURIComponent(typed)}?access_token=${encodeURIComponent(token)}`);
              } else {
                load(token, '');
              }
            } : submitLookup} loading={loading} className="self-end" iconStart={<Icon icon={Search} size="xs" />}>
              استعلام وتتبع
            </StoreButton>
          </div>
          <StoreAlert variant="info" title="دور السوق بعد الطلب" className="mt-4">
            سوق هاء يستعلم ويتابع الطلبات التي تمت من طرفه فقط. بعد الشراء يتحول كل جزء إلى طلب تاجر عادي وتكتمل إجراءاته من المتجر.
          </StoreAlert>
          <StoreAlert variant="warning" title="احتفظ برمز الدخول" className="mt-2">
            رمز الدخول يُعرض مرة واحدة عند إنشاء الطلب. إذا فقدته، تواصل مع دعم التاجر لإعادة الإرسال.
          </StoreAlert>
        </StoreCard>

        {loading && (
          <div className="space-y-3">
            <StoreSkeleton className="h-28" />
            <StoreSkeleton className="h-20" />
            <StoreSkeleton className="h-20" />
          </div>
        )}

        {!loading && error && <StoreAlert variant="danger" title="تعذر التتبع">{error}</StoreAlert>}

        {!loading && order && (
          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <div className="space-y-3">
              {order.subOrders.map((subOrder) => (
                <article key={`${subOrder.storeSlug}-${subOrder.orderNumber}`} className="rounded-[8px] border border-border bg-surface-1 p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                        <Icon icon={Store} size="xs" />
                        <span className="truncate">{subOrder.storeName}</span>
                      </div>
                      <p className="mt-1 text-xs text-text-tertiary">{subOrder.orderNumber}</p>
                    </div>
                    <Link to={`/s/${subOrder.storeSlug}/order/${subOrder.orderNumber}`} className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                      تفاصيل المتجر
                    </Link>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-[8px] bg-surface-2 p-2">
                      <p className="text-text-tertiary">الطلب</p>
                      <p className="mt-1 font-semibold">{statusLabel(subOrder.status)}</p>
                    </div>
                    <div className="rounded-[8px] bg-surface-2 p-2">
                      <p className="text-text-tertiary">الدفع</p>
                      <p className="mt-1 font-semibold">{statusLabel(subOrder.paymentStatus)}</p>
                    </div>
                    <div className="rounded-[8px] bg-surface-2 p-2">
                      <p className="text-text-tertiary">الشحن</p>
                      <p className="mt-1 font-semibold">{statusLabel(subOrder.fulfillmentStatus)}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-bold text-text-primary">
                    {formatAmount(subOrder.total)} <SarIcon size="md" />
                  </p>
                  <StoreAlert variant="info" title="يكتمل عند التاجر" className="mt-3">
                    هذا الطلب تحول داخليًا إلى طلب متجر عادي. الشحن والإرجاع والاستبدال والدعم تتم من صفحة طلب المتجر.
                  </StoreAlert>
                  <StoreButton href={`/s/${subOrder.storeSlug}/order/${subOrder.orderNumber}`} variant="outline" className="mt-3">
                    متابعة إجراءات الطلب عند التاجر
                  </StoreButton>
                </article>
              ))}
            </div>

            <aside className="h-fit rounded-[8px] border border-border bg-surface-1 p-4 shadow-card">
              <div className="flex items-center gap-2">
                <Icon icon={Package} size="sm" className="text-primary-600" />
                <h2 className="text-base font-bold text-text-primary">ملخص الطلب الموحد</h2>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <StoreAlert variant="info" title="دور سوق هاء">
                  السوق يعرض المنتجات ويجمع الطلب فقط. بعد إنشاء الطلب يتحول كل جزء إلى طلب تاجر عادي ويكتمل بنفس مسار المتجر.
                </StoreAlert>
                {order.accessToken && (
                  <div className="rounded-[8px] border border-border bg-surface-2 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-text-tertiary">رمز الدخول</p>
                        <p className="mt-1 truncate font-mono text-xs">{order.accessToken}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyToken}
                        className="flex items-center gap-1 rounded-[6px] bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700"
                        aria-label="نسخ رمز الدخول"
                      >
                        <Icon icon={Copy} size="xs" />
                        {copied ? 'تم النسخ' : 'نسخ'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-secondary">رقم الطلب</span>
                  <span className="font-semibold">{order.marketplaceOrderNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">حالة الدفع</span>
                  <span className="font-semibold">{statusLabel(order.paymentStatus)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">المتاجر</span>
                  <span className="font-semibold">{order.subOrders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">حالة التنفيذ</span>
                  <span className="font-semibold">{statusLabel(order.fulfillmentStatus)}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">الإجمالي</span>
                    <span className="font-bold">{formatAmount(order.total)} <SarIcon size="md" /></span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </StoreContainer>
    </main>
  );
}
