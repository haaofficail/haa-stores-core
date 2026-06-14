import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Package, Search, Store } from 'lucide-react';
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

export default function MarketplaceOrderTrack() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [lookupOrderNumber, setLookupOrderNumber] = useState(orderNumber ?? '');
  const [phone, setPhone] = useState(searchParams.get('phone') ?? '');
  const [order, setOrder] = useState<MarketplaceOrder | null>(null);
  const [loading, setLoading] = useState(Boolean(orderNumber && phone));
  const [error, setError] = useState('');

  useSEO({ title: `تتبع طلب سوق هاء ${orderNumber ?? ''}`, noIndex: true });

  const load = useCallback(async (nextPhone = phone) => {
    if (!orderNumber || !nextPhone.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await haaMarketplaceApi.getOrder(orderNumber, nextPhone.trim());
      setOrder(result);
      const next = new URLSearchParams();
      next.set('phone', nextPhone.trim());
      setSearchParams(next, { replace: true });
    } catch {
      setOrder(null);
      setError('لم يتم العثور على طلب سوق بهذا الرقم والجوال.');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, phone, setSearchParams]);

  useEffect(() => {
    if (orderNumber && phone) load(phone);
  }, [orderNumber, phone, load]);

  const submitLookup = () => {
    if (!lookupOrderNumber.trim() || !phone.trim()) {
      setError('أدخل رقم طلب السوق ورقم الجوال للاستعلام.');
      return;
    }
    navigate(`/marketplace/order/${encodeURIComponent(lookupOrderNumber.trim())}?phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <main className="min-h-screen bg-surface-2">
      <StoreContainer className="py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">استعلام وتتبع طلبات سوق هاء</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {orderNumber || 'أدخل رقم طلب السوق والجوال لعرض الطلبات التي تمت من السوق.'}
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
              label="رقم الجوال"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05xxxxxxxx"
              dir="ltr"
              className="text-start"
            />
            <StoreButton type="button" onClick={orderNumber ? () => load() : submitLookup} loading={loading} className="self-end" iconStart={<Icon icon={Search} size="xs" />}>
              استعلام وتتبع
            </StoreButton>
          </div>
          <StoreAlert variant="info" title="دور السوق بعد الطلب" className="mt-4">
            سوق هاء يستعلم ويتابع الطلبات التي تمت من طرفه فقط. بعد الشراء يتحول كل جزء إلى طلب تاجر عادي وتكتمل إجراءاته من المتجر.
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
                    {Number(subOrder.total).toFixed(2)} <SarIcon size="md" />
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
                  <span className="text-text-secondary">المنتجات</span>
                  <span className="font-semibold">{statusLabel(order.fulfillmentStatus)}</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">الإجمالي</span>
                    <span className="font-bold">{Number(order.total).toFixed(2)} <SarIcon size="md" /></span>
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
