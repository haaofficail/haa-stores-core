// "طلباتي" — customer order history by phone.
//
// Replaces the dead-end customers hit on /track when they forget their
// orderNumber. Enter the phone they checked out with → see the last 50
// orders, newest first → click any order to drill into the existing
// /track/:orderNumber detail page.
//
// Same trust model as /track: phone alone is the proof of ownership.
// Unknown phone returns an empty list (no enumeration leak).

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router-dom';
import { orderApi, type MyOrderListItem, ApiClientError } from '@/lib/api';
import {
  StoreContainer, StoreCard, StoreInput, StoreButton, StoreBadge, StoreSkeleton,
} from '@/components/ui';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- icons fed into <Icon icon={…}> per repo convention; lucide migration tracked separately
import { Package, ArrowLeft, Calendar, ChevronLeft } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { toast } from 'sonner';

const PHONE_STORAGE_KEY = 'my_orders_phone';

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  draft: { label: 'مسودة', variant: 'neutral' },
  checkout_started: { label: 'بدء الدفع', variant: 'info' },
  pending_payment: { label: 'بانتظار الدفع', variant: 'warning' },
  confirmed: { label: 'مؤكد', variant: 'info' },
  processing: { label: 'قيد التجهيز', variant: 'info' },
  ready_to_ship: { label: 'جاهز للشحن', variant: 'info' },
  ready_for_pickup: { label: 'جاهز للاستلام', variant: 'info' },
  shipped: { label: 'تم الشحن', variant: 'info' },
  delivered: { label: 'تم التسليم', variant: 'success' },
  picked_up: { label: 'تم الاستلام', variant: 'success' },
  completed: { label: 'مكتمل', variant: 'success' },
  cancelled: { label: 'ملغي', variant: 'danger' },
  returned: { label: 'مُرتجع', variant: 'warning' },
  refunded: { label: 'مسترد', variant: 'danger' },
  partially_refunded: { label: 'مسترد جزئيًا', variant: 'warning' },
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

export default function MyOrders() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  useSEO({ title: t('pageTitle.myOrders', 'طلباتي'), noIndex: true });

  // Phone is persisted in sessionStorage so a hard refresh doesn't
  // force the customer to re-enter it.
  const [phone, setPhone] = useState<string>(() =>
    sessionStorage.getItem(PHONE_STORAGE_KEY) ?? '',
  );
  const [orders, setOrders] = useState<MyOrderListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadOrders = async (p: string) => {
    if (!slug || !p.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const list = await orderApi.listByPhone(slug, p.trim());
      setOrders(list);
      sessionStorage.setItem(PHONE_STORAGE_KEY, p.trim());
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : t('myOrders.fetchFailed', 'تعذّر جلب الطلبات');
      toast.error(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load if a previous session left a phone in storage.
  useEffect(() => {
    if (phone && !hasSearched) {
      void loadOrders(phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slug+phone bootstrap only
  }, [slug]);

  return (
    <div id="storefront-scope" data-theme-scope="storefront" className="animate-fade-in overflow-x-hidden">
      <section className="bg-gradient-to-bl from-primary-50 via-white to-primary-50/30 py-12 sm:py-16">
        <StoreContainer className="text-center">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
            <Icon icon={Package} size="sm" className="text-primary-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3">
            {t('myOrders.title', 'طلباتي')}
          </h1>
          <p className="text-base text-text-secondary max-w-md mx-auto">
            {t('myOrders.description', 'أدخل رقم الجوال الذي استخدمته في الطلب لعرض كل طلباتك من هذا المتجر.')}
          </p>
        </StoreContainer>
      </section>

      <StoreContainer className="py-8 sm:py-10">
        <div className="max-w-2xl mx-auto">
          <StoreCard className="p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <StoreInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void loadOrders(phone); }}
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="text-start flex-1"
                aria-label={t('myOrders.phoneInput', 'رقم الجوال')}
              />
              <StoreButton
                onClick={() => void loadOrders(phone)}
                disabled={!phone.trim() || loading}
                size="lg"
              >
                {loading ? t('common.loading', 'جاري التحميل…') : t('myOrders.search', 'بحث')}
              </StoreButton>
            </div>
          </StoreCard>

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <StoreSkeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          )}

          {!loading && orders && orders.length === 0 && hasSearched && (
            <StoreCard className="p-8 text-center">
              <p className="text-text-secondary">
                {t('myOrders.empty', 'لا توجد طلبات لهذا الرقم في هذا المتجر.')}
              </p>
              <p className="text-text-tertiary text-sm mt-2">
                {t('myOrders.emptyHint', 'تأكد من رقم الجوال أو ابدأ التسوّق الآن.')}
              </p>
            </StoreCard>
          )}

          {!loading && orders && orders.length > 0 && (
            <ul className="space-y-3" data-testid="my-orders-list">
              {orders.map((order) => {
                const badge = STATUS_BADGE[order.status] ?? { label: order.status, variant: 'neutral' as const };
                return (
                  <li key={order.id}>
                    <Link
                      to={`/s/${slug}/track/${encodeURIComponent(order.orderNumber)}`}
                      className="block"
                      onClick={() => {
                        // Pre-seed the TrackOrderResult phone cache so it loads without re-prompting.
                        sessionStorage.setItem(`track_phone_${slug}_${order.orderNumber}`, phone.trim());
                      }}
                    >
                      <StoreCard className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-text-primary truncate" dir="ltr">
                                {order.orderNumber}
                              </span>
                              <StoreBadge variant={badge.variant}>{badge.label}</StoreBadge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-text-tertiary">
                              <span className="inline-flex items-center gap-1">
                                <Icon icon={Calendar} size="xs" />
                                {formatDate(order.createdAt)}
                              </span>
                              <span className="font-semibold text-text-primary" dir="ltr">
                                {Number(order.total).toFixed(2)} {order.currency}
                              </span>
                            </div>
                          </div>
                          <Icon icon={ChevronLeft} size="sm" className="text-text-tertiary shrink-0" />
                        </div>
                      </StoreCard>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="text-center mt-8">
            <Link to={slug ? `/s/${slug}` : '/'} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Icon icon={ArrowLeft} size="xs" />
              {t('order.backToStore', 'العودة للمتجر')}
            </Link>
          </div>
        </div>
      </StoreContainer>
    </div>
  );
}
