import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { orderApi, pickupLocationsApi, type PublicOrder, type PickupLocation } from '@/lib/api';
import {
  StoreContainer, StoreCard, StoreInput, StoreButton, StoreBadge,
  StoreSkeleton,
} from '@/components/ui';
// eslint-disable-next-line no-restricted-imports -- TODO: P1-#5 migration; lucide icons as plain JSX
import { Package, Truck, CheckCircle, Clock, ArrowLeft, MapPin, CreditCard, ShoppingBag, Store, Gift, Phone, FileText } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';

const statusIcons: Record<string, React.ReactNode> = {
  draft: <Clock className="h-4 w-4" />,
  checkout_started: <CreditCard className="h-4 w-4" />,
  pending_payment: <Clock className="h-4 w-4" />,
  payment_failed: <Package className="h-4 w-4" />,
  confirmed: <CheckCircle className="h-4 w-4" />,
  processing: <Clock className="h-4 w-4" />,
  ready_to_ship: <ShoppingBag className="h-4 w-4" />,
  ready_for_pickup: <Store className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle className="h-4 w-4" />,
  picked_up: <CheckCircle className="h-4 w-4" />,
  completed: <CheckCircle className="h-4 w-4" />,
  cancelled: <Package className="h-4 w-4" />,
  returned: <Package className="h-4 w-4" />,
  refunded: <CreditCard className="h-4 w-4" />,
  partially_refunded: <CreditCard className="h-4 w-4" />,
};

export default function TrackOrderResult() {
  const { t, i18n } = useTranslation();

  useSEO({ title: t('pageTitle.trackResult', 'نتيجة التتبع'), noIndex: true });
  const statusLabels: Record<string, string> = {
    draft: t('status.draft', 'مسودة'), checkout_started: t('status.checkout_started', 'بدء الدفع'), pending_payment: t('status.pending_payment', 'بانتظار الدفع'),
    payment_failed: t('status.payment_failed', 'فشل الدفع'), confirmed: t('status.confirmed', 'مؤكد'), processing: t('status.processing', 'قيد التجهيز'),
    ready_to_ship: t('status.ready_to_ship', 'جاهز للشحن'), shipped: t('status.shipped', 'تم الشحن'), delivered: t('status.delivered', 'تم التسليم'),
    completed: t('status.completed', 'مكتمل'), cancelled: t('status.cancelled', 'ملغي'), returned: t('status.returned', 'مُرتجع'),
    refunded: t('status.refunded', 'مسترد'), partially_refunded: t('status.partially_refunded', 'مسترد جزئيًا'),
    ready_for_pickup: t('status.ready_for_pickup', 'جاهز للاستلام'), picked_up: t('status.picked_up', 'تم الاستلام'),
  };
  const { slug, orderNumber } = useParams<{ slug: string; orderNumber: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState('');
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);

  useEffect(() => {
    if (!slug || !orderNumber) return;
    pickupLocationsApi.list(slug).then(setPickupLocations).catch(() => {});
    const savedPhone = sessionStorage.getItem(`track_phone_${orderNumber}`);
    if (savedPhone) {
      setPhoneInput(savedPhone);
      orderApi.track(slug, orderNumber, savedPhone)
        .then(setOrder)
        .catch(() => toast.error(t('common.error', 'فشل تتبع الطلب')))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [slug, orderNumber]);

  const handleTrack = async () => {
    if (!slug || !orderNumber || !phoneInput.trim()) return;
    setLoading(true);
    sessionStorage.setItem(`track_phone_${orderNumber}`, phoneInput.trim());
    try {
      const o = await orderApi.track(slug, orderNumber, phoneInput.trim());
      setOrder(o);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StoreContainer className="py-8">
        <div id="main-content" className="max-w-2xl mx-auto space-y-4 overflow-x-hidden">
          <StoreSkeleton className="h-8 w-48" />
          <StoreSkeleton className="h-40 w-full" />
          <StoreSkeleton className="h-60 w-full" />
        </div>
      </StoreContainer>
    );
  }

  if (!order) {
    return (
      <StoreContainer className="py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
            <Package className="h-4 w-4 text-text-tertiary" />
          </div>
          <h2 className="text-xl font-bold mb-2">{t('track.notFound')}</h2>
          <p className="text-sm text-text-secondary mb-6">{t('order.phoneRequired')}</p>
          <div className="flex gap-2 mb-6">
            <StoreInput
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={t('track.phone')}
              dir="ltr"
              className="text-start flex-1"
            />
            <StoreButton onClick={handleTrack} disabled={!phoneInput.trim()}>
              {t('track.track')}
            </StoreButton>
          </div>
          <div className="flex gap-3 justify-center">
            <Link to={`/s/${slug}/track`} className="text-sm text-primary-600 hover:underline">
              {t('track.title')}
            </Link>
            <Link to={`/s/${slug}`} className="text-sm text-primary-600 hover:underline">
              {t('order.backToStore')}
            </Link>
          </div>
        </div>
      </StoreContainer>
    );
  }

  return (
    <div className="animate-fade-in">
      <StoreContainer className="py-6 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link to={`/s/${slug}/track`} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-surface-2 transition-colors">
              <ArrowLeft className="h-4 w-4 text-text-secondary" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-text-primary">{t('track.orderTitle')}</h1>
              <p className="text-sm text-text-secondary font-mono" dir="ltr">{order.orderNumber}</p>
            </div>
          </div>

          <StoreCard className="p-6 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-surface-2 rounded-xl">
                <p className="text-xs text-text-secondary mb-1">{t('order.status')}</p>
                <StoreBadge variant="info" icon={statusIcons[order.status]}>
                  {statusLabels[order.status] ?? order.status}
                </StoreBadge>
              </div>
              <div className="text-center p-3 bg-surface-2 rounded-xl">
                <p className="text-xs text-text-secondary mb-1">{t('order.paymentStatus')}</p>
                <StoreBadge variant={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning'}>
                  {order.paymentStatus === 'paid' ? t('track.paid', 'مدفوع') : order.paymentStatus === 'unpaid' ? t('track.unpaid', 'غير مدفوع') : order.paymentStatus === 'failed' ? t('status.payment_failed', 'فشل الدفع') : order.paymentStatus}
                </StoreBadge>
              </div>
              {order.fulfillmentStatus && (
                <div className="text-center p-3 bg-surface-2 rounded-xl">
                  <p className="text-xs text-text-secondary mb-1">{t('order.shipmentStatus')}</p>
                  <StoreBadge>{order.fulfillmentStatus}</StoreBadge>
                </div>
              )}
            </div>

            {order.items && order.items.length > 0 && (
              <>
                {order.fulfillmentType === 'local_pickup' && order.pickupLocationId && (() => {
                  const loc = pickupLocations.find(l => l.id === order.pickupLocationId);
                  return (
                    <div className="mb-4 p-3 bg-info-soft rounded-xl text-sm">
                      <p className="font-semibold text-info mb-1"><Icon icon={MapPin} size="xs" className="inline align-middle ms-1" />{t('order.pickupLocation', 'موقع الاستلام')}</p>
                      <p className="text-info font-medium">{loc?.nameAr ?? t('order.pickupLocationId', 'رقم الفرع') + ': ' + order.pickupLocationId}</p>
                      {loc?.address && <p className="text-info text-xs mt-0.5">{loc.address}</p>}
                      {loc?.phone && <p className="text-info text-xs mt-0.5" dir="ltr"><Icon icon={Phone} size="2xs" className="inline align-middle ms-0.5" />{loc.phone}</p>}
                      {loc?.hours && typeof loc.hours === 'object' && (
                        <p className="text-info mt-0.5" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>
                          <Icon icon={Clock} size="2xs" className="inline align-middle ms-0.5" />{Object.entries(loc.hours as Record<string, string>).map(([d, h]) => `${d}: ${h}`).join(' | ')}
                        </p>
                      )}
                      {loc?.mapsUrl && (
                        <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-info text-xs mt-1.5 underline">
                          <Icon icon={MapPin} size="2xs" /> {t('checkout.viewOnMap', 'عرض على الخريطة')}
                        </a>
                      )}
                    </div>
                  );
                })()}
                {order.giftOptions?.sendAsGift && (
                  <div className="mb-4 p-3 bg-info-soft rounded-xl text-sm">
                    <p className="font-semibold text-info mb-1"><Icon icon={Gift} size="xs" className="inline align-middle ms-1" />{t('order.sendAsGift', 'إرسال كهدية')}</p>
                    {order.giftOptions.message && <p className="text-info text-xs">{order.giftOptions.message}</p>}
                  </div>
                )}
                <h3 className="font-bold text-sm mb-3">{t('order.items')}</h3>
                <div className="space-y-2 mb-4">
                  {order.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                      <div>
                        <span className="text-text-primary">{item.name} × {item.quantity}</span>
                        {(item.giftWrapSelected || item.sendAsGift) && (
                          <div className="flex gap-1 mt-0.5">
                            {item.giftWrapSelected && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.giftWrap', 'تغليف')}</StoreBadge>}
                            {item.sendAsGift && <StoreBadge variant="info" size="sm"><Icon icon={Gift} size="2xs" className="inline align-middle ms-0.5" />{t('cart.sendAsGift', 'هدية')}</StoreBadge>}
                          </div>
                        )}
                        {item.giftMessage && <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5"><Icon icon={FileText} size="2xs" className="inline align-middle ms-0.5" />{item.giftMessage}</p>}
                      </div>
                      <span className="font-medium">{Number(item.totalPrice).toFixed(2)} <SarIcon size="sm" /></span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 flex justify-between items-center">
                  <span className="font-bold">{t('order.total')}</span>
                  <span className="font-bold text-lg text-primary-600">{Number(order.total).toFixed(2)} <SarIcon size="md" /></span>
                </div>
              </>
            )}
          </StoreCard>

          {order.statusHistory && order.statusHistory.length > 0 && (
            <StoreCard className="p-6 mb-6">
              <h3 className="font-bold text-sm mb-4">{t('track.statusHistory', 'سجل الحالة')}</h3>
              <div className="relative">
                <div className="absolute end-4 top-0 bottom-0 w-px bg-border" />
                <div className="space-y-4">
                  {[...order.statusHistory].reverse().map((h: any, i: number) => (
                    <div key={h.id} className="flex items-start gap-3 relative">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center z-10 shrink-0 ${
                        i === 0 ? 'bg-primary-100 text-primary-600' : 'bg-surface-2 text-text-tertiary'
                      }`}>
                        {statusIcons[h.toStatus] ?? <Clock className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-medium text-text-primary">
                          {statusLabels[h.toStatus] ?? h.toStatus}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {new Date(h.createdAt).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : i18n.language)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StoreCard>
          )}

          <div className="flex gap-3 justify-center">
            <StoreButton variant="outline" href={`/s/${slug}/track`} icon={<Truck className="h-4 w-4" />}>
              {t('track.trackAnother', 'تتبع طلب آخر')}
            </StoreButton>
            <StoreButton variant="outline" href={`/s/${slug}`} icon={<ArrowLeft className="h-4 w-4" />}>
              {t('order.backToStore')}
            </StoreButton>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
