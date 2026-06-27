import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { orderApi, pickupLocationsApi, type PublicOrder, type PickupLocation } from '@/lib/api';
import { formatOrderStatus, formatPaymentStatus, formatFulfillmentStatus } from '@/lib/order-status';
import { getTrackPhone, saveTrackPhone } from '@/lib/order-track-storage';
import {
  StoreContainer, StoreButton, StoreCard, StoreBadge, StoreSkeleton,
  StoreInput,
} from '@/components/ui';
import { Icon, type IconName } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { toast } from 'sonner';
import { useSEO } from '@/hooks/useSEO';

// Per ISSUE-0009 / P1-#5 the storefront resolves icons by name through the
// Icon registry instead of importing lucide directly. Map each order status
// to its registered icon name; rendered as <Icon name=… size="xs" /> (16px).
const statusIconNames: Record<string, IconName> = {
  draft: 'Clock',
  checkout_started: 'CreditCard',
  pending_payment: 'Clock',
  payment_failed: 'Package',
  confirmed: 'CheckCircle',
  processing: 'Clock',
  ready_to_ship: 'ShoppingBag',
  ready_for_pickup: 'Store',
  shipped: 'Truck',
  delivered: 'CheckCircle',
  picked_up: 'CheckCircle',
  completed: 'CheckCircle',
  cancelled: 'Package',
  returned: 'Package',
  refunded: 'CreditCard',
  partially_refunded: 'CreditCard',
};


export default function OrderSuccess() {
  const { t } = useTranslation();
  const { slug, orderNumber } = useParams<{ slug: string; orderNumber: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [pickupLocations, setPickupLocations] = useState<PickupLocation[]>([]);

  useSEO({ title: t('pageTitle.orderSuccess', 'تأكيد الطلب'), noIndex: true });

  useEffect(() => {
    if (!slug || !orderNumber) return;
    pickupLocationsApi.list(slug).then(setPickupLocations).catch(() => {});
    const savedPhone = getTrackPhone(orderNumber);
    if (savedPhone) {
      setPhone(savedPhone);
      orderApi.getByOrderNumber(slug, orderNumber, savedPhone)
        .then(setOrder)
        .catch(() => toast.error(t('common.error', 'فشل تحميل الطلب')))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from useTranslation; effect intentionally runs on [slug, orderNumber] only
  }, [slug, orderNumber]);

  const handleFetch = async () => {
    if (!slug || !orderNumber || !phone.trim()) return;
    setLoading(true);
    try {
      const o = await orderApi.getByOrderNumber(slug, orderNumber, phone);
      setOrder(o);
      saveTrackPhone(orderNumber, phone);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <StoreContainer className="py-12">
        <div id="main-content" className="max-w-2xl mx-auto space-y-4 overflow-x-hidden">
          <StoreSkeleton className="h-20 w-full" />
          <StoreSkeleton className="h-40 w-full" />
        </div>
      </StoreContainer>
    );
  }

  if (!order) {
    return (
      <StoreContainer className="py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center mx-auto mb-3">
            <Icon name="Package" size="xs" className="text-text-tertiary" />
          </div>
          <h2 className="text-xl font-bold mb-2">{t('order.notFound')}</h2>
          <p className="text-sm text-text-secondary mb-6">{t('order.phoneRequired')}</p>
          <div className="flex gap-2">
            <StoreInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('track.phone')}
              dir="ltr"
              className="text-start flex-1"
            />
            <StoreButton onClick={handleFetch} disabled={!phone.trim()}>
              {t('track.track')}
            </StoreButton>
          </div>
          <div className="mt-6">
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
      <StoreContainer className="py-8 sm:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
          <div className="w-8 h-8 rounded-full bg-success-soft flex items-center justify-center mx-auto mb-3">
            <Icon name="CheckCircle" size="xs" className="text-success" />
          </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-2">{t('order.success')}</h1>
            <p className="text-text-secondary">
              {t('order.orderNumber')}: <span className="font-bold text-text-primary font-mono" dir="ltr">{order.orderNumber}</span>
            </p>
          </div>

          <StoreCard className="p-6 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-3 bg-surface-2 rounded-xl">
                <p className="text-xs text-text-secondary mb-1">{t('order.status')}</p>
                <StoreBadge variant="info" icon={statusIconNames[order.status] ? <Icon name={statusIconNames[order.status]} size="xs" /> : undefined}>
                  {t('status.' + order.status, formatOrderStatus(order.status))}
                </StoreBadge>
              </div>
              <div className="text-center p-3 bg-surface-2 rounded-xl">
                <p className="text-xs text-text-secondary mb-1">{t('order.paymentStatus')}</p>
                <StoreBadge variant={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'warning'}>
                  {formatPaymentStatus(order.paymentStatus)}
                </StoreBadge>
              </div>
              {order.fulfillmentStatus && (
                <div className="text-center p-3 bg-surface-2 rounded-xl">
                  <p className="text-xs text-text-secondary mb-1">{t('order.shipmentStatus')}</p>
                  <StoreBadge>{formatFulfillmentStatus(order.fulfillmentStatus)}</StoreBadge>
                </div>
              )}
            </div>

            {order.fulfillmentType === 'local_pickup' && order.pickupLocationId && (() => {
              const loc = pickupLocations.find(l => l.id === order.pickupLocationId);
              return (
                <div className="mb-4 p-3 bg-info-soft rounded-xl text-sm">
                  <p className="font-semibold text-info mb-1"><Icon name="MapPin" size="xs" className="inline align-middle ms-1" />{t('order.pickupLocation', 'موقع الاستلام')}</p>
                  <p className="text-info font-medium">{loc?.nameAr ?? t('order.pickupLocationId', 'رقم الفرع') + ': ' + order.pickupLocationId}</p>
                  {loc?.address && <p className="text-info text-xs mt-0.5">{loc.address}</p>}
                  {loc?.phone && <p className="text-info text-xs mt-0.5" dir="ltr"><Icon name="Phone" size="2xs" className="inline align-middle ms-0.5" />{loc.phone}</p>}
                  {loc?.hours && typeof loc.hours === 'object' && (
                    <p className="text-info mt-0.5" style={{ fontSize: 'var(--badge-font-size, 11px)' }}>
                      <Icon name="Clock" size="2xs" className="inline align-middle ms-0.5" />{Object.entries(loc.hours as Record<string, string>).map(([d, h]) => `${d}: ${h}`).join(' | ')}
                    </p>
                  )}
                  {loc?.mapsUrl && (
                    <a href={loc.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-info text-xs mt-1.5 underline">
                      <Icon name="MapPin" size="2xs" /> {t('checkout.viewOnMap', 'عرض على الخريطة')}
                    </a>
                  )}
                </div>
              );
            })()}
            {order.giftOptions?.sendAsGift && (
              <div className="mb-4 p-3 bg-info-soft rounded-xl text-sm">
                <p className="font-semibold text-info mb-1"><Icon name="Gift" size="xs" className="inline align-middle ms-1" />{t('order.sendAsGift', 'إرسال كهدية')}</p>
                {order.giftOptions.message && <p className="text-info text-xs">{order.giftOptions.message}</p>}
              </div>
            )}

            <h3 className="font-bold text-sm mb-3">{t('order.items')}</h3>
            <div className="space-y-2 mb-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                  <div>
                    <span className="text-text-primary">{item.name} × {item.quantity}</span>
                    {(item.giftWrapSelected || item.sendAsGift) && (
                      <div className="flex gap-1 mt-0.5">
                        {item.giftWrapSelected && <StoreBadge variant="info" size="sm"><Icon name="Gift" size="2xs" className="inline align-middle ms-0.5" />{t('cart.giftWrap', 'تغليف')}</StoreBadge>}
                        {item.sendAsGift && <StoreBadge variant="info" size="sm"><Icon name="Gift" size="2xs" className="inline align-middle ms-0.5" />{t('cart.sendAsGift', 'هدية')}</StoreBadge>}
                      </div>
                    )}
                    {item.giftMessage && <p className="text-[var(--badge-font-size)] text-text-tertiary mt-0.5"><Icon name="FileText" size="2xs" className="inline align-middle ms-0.5" />{item.giftMessage}</p>}
                  </div>
                  <span className="font-medium">{Number(item.totalPrice).toFixed(2)} <SarIcon size="sm" /></span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 flex justify-between items-center">
              <span className="font-bold text-lg">{t('order.total')}</span>
              <span className="font-bold text-xl text-primary-600">{Number(order.total).toFixed(2)} <SarIcon size="md" /></span>
            </div>
          </StoreCard>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <StoreButton href={`/s/${slug}/track/${order.orderNumber}`} icon={<Icon name="Truck" size="xs" />}>
              {t('order.trackOrder')}
            </StoreButton>
            <StoreButton variant="outline" href={`/s/${slug}`} icon={<Icon name="ArrowLeft" size="xs" />}>
              {t('order.backToStore')}
            </StoreButton>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
