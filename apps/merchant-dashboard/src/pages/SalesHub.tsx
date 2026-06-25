// Sales Hub — overview landing page for /sales (IA W2).
//
// Composes existing endpoints (orders, customers, abandoned-carts,
// shipping, channels) into a single "what's happening in operations"
// view. Promise.allSettled keeps the page usable when one card is
// degraded.

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import {
  ShoppingCart, Users, ShoppingBag, Truck, Store, Package,
  ClipboardList,
} from 'lucide-react';
import { ordersApi, customersApi, abandonedCartsApi, marketplaceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { HubHeader, MetricGrid, MetricTile, HubCard } from '@/components/hub/HubShell';

interface Counts {
  pendingOrders: number | null;
  totalCustomers: number | null;
  abandonedCarts: number | null;
  recoverableTotal: string | null;
  connectedChannels: number | null;
}

export default function SalesHub() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Counts>({
    pendingOrders: null,
    totalCustomers: null,
    abandonedCarts: null,
    recoverableTotal: null,
    connectedChannels: null,
  });

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    Promise.allSettled([
      ordersApi.list(storeId, { status: 'pending_payment', page: 1, limit: 1 }),
      customersApi.list(storeId, { page: 1, limit: 1 }),
      abandonedCartsApi.stats(storeId, 24),
      marketplaceApi.hub(storeId),
    ]).then(([orders, customers, carts, channels]) => {
      setCounts({
        pendingOrders:
          orders.status === 'fulfilled'
            ? (orders.value as { total?: number })?.total ?? 0
            : null,
        totalCustomers:
          customers.status === 'fulfilled'
            ? (customers.value as { total?: number })?.total ?? 0
            : null,
        abandonedCarts:
          carts.status === 'fulfilled'
            ? (carts.value as { count?: number })?.count ?? 0
            : null,
        recoverableTotal:
          carts.status === 'fulfilled'
            ? (carts.value as { recoverableTotal?: string })?.recoverableTotal ?? '0'
            : null,
        connectedChannels:
          channels.status === 'fulfilled'
            ? (channels.value as { summary?: { connectedCount?: number } })?.summary?.connectedCount ?? 0
            : null,
      });
    }).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <HubHeader
        tagIcon={<ClipboardList className="h-5 w-5 text-primary-500" />}
        tagLabel={t('sales.hub.tagline', 'مركز البيع')}
        title={t('sales.hub.title', 'إدارة طلبات متجرك في مكان واحد')}
        description={t(
          'sales.hub.description',
          'الطلبات، العملاء، السلال المتروكة، الشحن، وقنوات البيع — كلها تحت سقف واحد. ابدأ بنظرة عامة ثم تعمّق حيث يحتاج العمل اهتمامك.',
        )}
      />

      <MetricGrid loading={loading}>
        <MetricTile
          label={t('sales.hub.kpi.pendingOrders', 'طلبات بانتظار الدفع')}
          value={counts.pendingOrders}
        />
        <MetricTile
          label={t('sales.hub.kpi.totalCustomers', 'إجمالي العملاء')}
          value={counts.totalCustomers}
        />
        <MetricTile
          label={t('sales.hub.kpi.abandonedCarts', 'سلال متروكة (24س)')}
          value={counts.abandonedCarts}
          trend={
            counts.recoverableTotal
              ? `${formatCurrency(counts.recoverableTotal)} ر.س`
              : undefined
          }
        />
        <MetricTile
          label={t('sales.hub.kpi.connectedChannels', 'قنوات مفعّلة')}
          value={counts.connectedChannels}
        />
      </MetricGrid>

      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {t('sales.hub.tools.heading', 'أدوات البيع')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HubCard
            icon={ShoppingCart}
            iconClass="bg-primary-50 text-primary-600"
            title={t('sales.hub.tools.orders.title', 'معالجة الطلبات')}
            description={t(
              'sales.hub.tools.orders.description',
              'كل الطلبات الواردة — تأكيد، تجهيز، شحن، استرداد — مع تصفية حسب الحالة والقناة.',
            )}
            to="/orders"
            cta={t('sales.hub.tools.orders.cta', 'فتح الطلبات')}
          />
          <HubCard
            icon={Users}
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('sales.hub.tools.customers.title', 'إدارة العملاء')}
            description={t(
              'sales.hub.tools.customers.description',
              'سجلّ كل عميل اشترى من متجرك — مع بحث، شرائح، ورصيد ولاء.',
            )}
            to="/customers"
            cta={t('sales.hub.tools.customers.cta', 'فتح العملاء')}
          />
          <HubCard
            icon={ShoppingBag}
            iconClass="bg-rose-50 text-rose-600"
            title={t('sales.hub.tools.abandoned.title', 'العربات المتروكة')}
            description={t(
              'sales.hub.tools.abandoned.description',
              'العملاء الذين تركوا سلالهم — تابعهم تلقائياً عبر بريد الاسترداد.',
            )}
            to="/abandoned-carts"
            cta={t('sales.hub.tools.abandoned.cta', 'عرض السلال')}
          />
          <HubCard
            icon={Truck}
            iconClass="bg-amber-50 text-amber-600"
            title={t('sales.hub.tools.shipping.title', 'إدارة الشحن')}
            description={t(
              'sales.hub.tools.shipping.description',
              'طرق الشحن، نطاقات التغطية، الشحنات، وأسعار الشركات.',
            )}
            to="/shipping"
            cta={t('sales.hub.tools.shipping.cta', 'فتح الشحن')}
          />
          <HubCard
            icon={Store}
            iconClass="bg-purple-50 text-purple-600"
            title={t('sales.hub.tools.channels.title', 'قنوات البيع')}
            description={t(
              'sales.hub.tools.channels.description',
              'اربط متجرك بسلة وزد ونون وأمازون — مزامنة المنتجات والطلبات.',
            )}
            to="/channels"
            cta={t('sales.hub.tools.channels.cta', 'فتح القنوات')}
          />
          <HubCard
            icon={Package}
            iconClass="bg-cyan-50 text-cyan-600"
            title={t('sales.hub.tools.catalog.title', 'الكتالوج')}
            description={t(
              'sales.hub.tools.catalog.description',
              'المنتجات والتصنيفات — مدخل سريع لمن يحتاج تعديل الكتالوج من سياق الطلبات.',
            )}
            to="/products"
            cta={t('sales.hub.tools.catalog.cta', 'فتح الكتالوج')}
          />
        </div>
      </div>
    </div>
  );
}
