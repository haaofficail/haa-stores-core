import { and, eq, gte, lte, sql, count, sum } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

const PURCHASE_EVENT = 'payment_succeeded';

type AnyRecord = Record<string, unknown>;

export interface OverviewMetrics {
  totalEvents: number;
  sessionsCount: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  purchases: number;
  cartToCheckoutRate: number | null;
  checkoutToPurchaseRate: number | null;
  estimatedAbandonmentRate: number | null;
  period: { dateFrom: string; dateTo: string };
}

export interface ProductMetrics {
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string | null;
  views: number;
  addToCarts: number;
  purchases: number;
  conversionRate: number | null;
  cartRate: number | null;
}

export interface SourceMetrics {
  source: string;
  sessions: number;
  orders: number;
  revenue: string;
}

export interface CampaignMetrics {
  campaign: string;
  sessions: number;
  orders: number;
  revenue: string;
}

export interface GrowthInsight {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  entityType: 'product' | 'campaign' | 'source' | 'funnel';
  entityId: string;
  metric: string;
  recommendation: string;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export class GrowthAggregationService {
  constructor(private db: DbClient = createDbClient()) {}

  async aggregateProductPerformance(storeId: number, dateFrom?: string, dateTo?: string): Promise<void> {
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(endDate);
    if (!dateFrom) {
      startDate.setDate(startDate.getDate() - 1);
    }

    const current = new Date(startDate);
    while (current <= endDate) {
      const dayStr = toDateString(current);
      const dayStart = new Date(dayStr + 'T00:00:00Z');
      const dayEnd = new Date(dayStr + 'T23:59:59Z');

      const baseTimeFilter = and(
        eq(s.marketingEvents.storeId, storeId),
        gte(s.marketingEvents.createdAt, dayStart),
        lte(s.marketingEvents.createdAt, dayEnd),
      );

      const viewedProductIds = await this.db
        .select({ productId: s.marketingEvents.productId })
        .from(s.marketingEvents)
        .where(and(baseTimeFilter, eq(s.marketingEvents.eventType, 'view_product')))
        .groupBy(s.marketingEvents.productId);

      const purchasedProductIds = await this.db
        .select({ productId: s.orderItems.productId })
        .from(s.marketingEvents)
        .innerJoin(s.orderItems, eq(s.marketingEvents.orderId, s.orderItems.orderId))
        .where(and(baseTimeFilter, eq(s.marketingEvents.eventType, PURCHASE_EVENT)))
        .groupBy(s.orderItems.productId);

      const allProductIds = [
        ...new Set([
          ...viewedProductIds.map(r => r.productId).filter(Boolean) as number[],
          ...purchasedProductIds.map(r => r.productId).filter(Boolean) as number[],
        ]),
      ];

      for (const pid of allProductIds) {
        const [viewsResult] = await this.db
          .select({ count: count() })
          .from(s.marketingEvents)
          .where(
            and(
              baseTimeFilter,
              eq(s.marketingEvents.eventType, 'view_product'),
              eq(s.marketingEvents.productId, pid),
            ),
          );

        const [addToCartResult] = await this.db
          .select({ count: count() })
          .from(s.marketingEvents)
          .where(
            and(
              baseTimeFilter,
              eq(s.marketingEvents.eventType, 'add_to_cart'),
              eq(s.marketingEvents.productId, pid),
            ),
          );

        const [purchaseResult] = await this.db
          .select({ count: count(), totalRevenue: sum(s.orderItems.totalPrice) })
          .from(s.marketingEvents)
          .innerJoin(s.orderItems, eq(s.marketingEvents.orderId, s.orderItems.orderId))
          .where(
            and(
              baseTimeFilter,
              eq(s.marketingEvents.eventType, PURCHASE_EVENT),
              eq(s.orderItems.productId, pid),
            ),
          );

        const views = Number(viewsResult?.count ?? 0);
        const addToCarts = Number(addToCartResult?.count ?? 0);
        const purchases = Number(purchaseResult?.count ?? 0);
        const revenue = String(purchaseResult?.totalRevenue ?? '0');

        await this.db
          .insert(s.productPerformanceDaily)
          .values({
            storeId,
            productId: pid,
            date: dayStr,
            views,
            addToCarts,
            purchases,
            revenue,
          })
          .onConflictDoUpdate({
            target: [s.productPerformanceDaily.storeId, s.productPerformanceDaily.productId, s.productPerformanceDaily.date],
            set: {
              views,
              addToCarts,
              purchases,
              revenue,
              updatedAt: new Date(),
            },
          });
      }

      current.setDate(current.getDate() + 1);
    }
  }

  async getOverview(storeId: number, dateFrom?: string, dateTo?: string): Promise<OverviewMetrics> {
    const endDate = dateTo || toDateString(new Date());
    const startDate = dateFrom || toDateString(new Date(new Date().setDate(new Date().getDate() - 30)));

    const baseFilter = and(
      eq(s.marketingEvents.storeId, storeId),
      gte(s.marketingEvents.createdAt, new Date(startDate + 'T00:00:00Z')),
      lte(s.marketingEvents.createdAt, new Date(endDate + 'T23:59:59Z')),
    );

    const [totalEventsResult] = await this.db
      .select({ count: count() })
      .from(s.marketingEvents)
      .where(baseFilter);

    const [sessionsResult] = await this.db
      .select({ count: count() })
      .from(s.marketingSessions)
      .where(
        and(
          eq(s.marketingSessions.storeId, storeId),
          gte(s.marketingSessions.firstEventAt, new Date(startDate + 'T00:00:00Z')),
          lte(s.marketingSessions.firstEventAt, new Date(endDate + 'T23:59:59Z')),
        ),
      );

    const [productViewsResult] = await this.db
      .select({ count: count() })
      .from(s.marketingEvents)
      .where(and(baseFilter, eq(s.marketingEvents.eventType, 'view_product')));

    const [addToCartsResult] = await this.db
      .select({ count: count() })
      .from(s.marketingEvents)
      .where(and(baseFilter, eq(s.marketingEvents.eventType, 'add_to_cart')));

    const [checkoutStartsResult] = await this.db
      .select({ count: count() })
      .from(s.marketingEvents)
      .where(and(baseFilter, eq(s.marketingEvents.eventType, 'begin_checkout')));

    const [purchasesResult] = await this.db
      .select({ count: count() })
      .from(s.marketingEvents)
      .where(and(baseFilter, eq(s.marketingEvents.eventType, PURCHASE_EVENT)));

    const totalEvents = Number(totalEventsResult?.count ?? 0);
    const sessionsCount = Number(sessionsResult?.count ?? 0);
    const productViews = Number(productViewsResult?.count ?? 0);
    const addToCarts = Number(addToCartsResult?.count ?? 0);
    const checkoutStarts = Number(checkoutStartsResult?.count ?? 0);
    const purchases = Number(purchasesResult?.count ?? 0);

    const cartToCheckoutRate = addToCarts > 0 ? checkoutStarts / addToCarts : null;
    const checkoutToPurchaseRate = checkoutStarts > 0 ? purchases / checkoutStarts : null;
    const estimatedAbandonmentRate = checkoutStarts > 0 ? (checkoutStarts - purchases) / checkoutStarts : null;

    return {
      totalEvents,
      sessionsCount,
      productViews,
      addToCarts,
      checkoutStarts,
      purchases,
      cartToCheckoutRate: cartToCheckoutRate !== null ? Math.round(cartToCheckoutRate * 10000) / 10000 : null,
      checkoutToPurchaseRate: checkoutToPurchaseRate !== null ? Math.round(checkoutToPurchaseRate * 10000) / 10000 : null,
      estimatedAbandonmentRate: estimatedAbandonmentRate !== null ? Math.round(estimatedAbandonmentRate * 10000) / 10000 : null,
      period: { dateFrom: startDate, dateTo: endDate },
    };
  }

  async getProductMetrics(storeId: number, dateFrom?: string, dateTo?: string): Promise<{
    mostViewed: ProductMetrics[];
    highViewsLowPurchases: ProductMetrics[];
    mostAddedToCart: ProductMetrics[];
    highestConversion: ProductMetrics[];
  }> {
    const endDate = dateTo || toDateString(new Date());
    const startDate = dateFrom || toDateString(new Date(new Date().setDate(new Date().getDate() - 30)));

    const eventsFilter = and(
      eq(s.marketingEvents.storeId, storeId),
      gte(s.marketingEvents.createdAt, new Date(startDate + 'T00:00:00Z')),
      lte(s.marketingEvents.createdAt, new Date(endDate + 'T23:59:59Z')),
    );

    const viewEvents = await this.db
      .select({
        productId: s.marketingEvents.productId,
        count: count(),
      })
      .from(s.marketingEvents)
      .where(and(eventsFilter, eq(s.marketingEvents.eventType, 'view_product'), sql`${s.marketingEvents.productId} IS NOT NULL`))
      .groupBy(s.marketingEvents.productId)
      .orderBy(sql`count DESC`)
      .limit(50);

    const addToCartEvents = await this.db
      .select({
        productId: s.marketingEvents.productId,
        count: count(),
      })
      .from(s.marketingEvents)
      .where(and(eventsFilter, eq(s.marketingEvents.eventType, 'add_to_cart'), sql`${s.marketingEvents.productId} IS NOT NULL`))
      .groupBy(s.marketingEvents.productId);

    const purchaseEvents = await this.db
      .select({
        productId: s.orderItems.productId,
        count: count(),
      })
      .from(s.marketingEvents)
      .innerJoin(s.orderItems, eq(s.marketingEvents.orderId, s.orderItems.orderId))
      .where(and(eventsFilter, eq(s.marketingEvents.eventType, PURCHASE_EVENT), sql`${s.orderItems.productId} IS NOT NULL`))
      .groupBy(s.orderItems.productId);

    const cartMap = new Map<number, number>();
    for (const row of addToCartEvents) {
      if (row.productId) cartMap.set(row.productId, Number(row.count));
    }
    const purchaseMap = new Map<number, number>();
    for (const row of purchaseEvents) {
      if (row.productId) purchaseMap.set(row.productId, Number(row.count));
    }

    const productIds = [...new Set(viewEvents.map(e => e.productId).filter(Boolean))] as number[];
    const products: AnyRecord[] = [];
    if (productIds.length > 0) {
      const productRecords = await this.db
        .select({ id: s.products.id, name: s.products.name, slug: s.products.slug })
        .from(s.products)
        .where(and(eq(s.products.storeId, storeId), sql`${s.products.id} = ANY(ARRAY[${sql.join(productIds, sql`, `)}]::int[])`));
      products.push(...productRecords);
    }
    const productMap = new Map<number, AnyRecord>();
    for (const p of products) {
      productMap.set(Number(p.id), p);
    }

    const allMetrics: ProductMetrics[] = [];
    for (const row of viewEvents) {
      const pid = row.productId;
      if (!pid) continue;
      const views = Number(row.count);
      const addToCarts = cartMap.get(pid) ?? 0;
      const purchases = purchaseMap.get(pid) ?? 0;
      const prod = productMap.get(pid);
      allMetrics.push({
        productId: pid,
        productName: String(prod?.name ?? `Product #${pid}`),
        productSlug: String(prod?.slug ?? ''),
        productImage: null,
        views,
        addToCarts,
        purchases,
        conversionRate: views > 0 ? Math.round((purchases / views) * 10000) / 10000 : null,
        cartRate: views > 0 ? Math.round((addToCarts / views) * 10000) / 10000 : null,
      });
    }

    const mostViewed = [...allMetrics].sort((a, b) => b.views - a.views).slice(0, 10);
    const highViewsLowPurchases = [...allMetrics]
      .filter(p => p.views >= 50 && (p.conversionRate === null || p.conversionRate < 0.02))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    const mostAddedToCart = [...allMetrics].sort((a, b) => b.addToCarts - a.addToCarts).slice(0, 10);
    const highestConversion = [...allMetrics]
      .filter(p => p.views >= 10 && p.conversionRate !== null)
      .sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))
      .slice(0, 10);

    return { mostViewed, highViewsLowPurchases, mostAddedToCart, highestConversion };
  }

  async getSourceMetrics(storeId: number, dateFrom?: string, dateTo?: string): Promise<{
    bySource: SourceMetrics[];
    byCampaign: CampaignMetrics[];
    bestCampaigns: CampaignMetrics[];
    highVisitsLowConversion: CampaignMetrics[];
  }> {
    const endDate = dateTo || toDateString(new Date());
    const startDate = dateFrom || toDateString(new Date(new Date().setDate(new Date().getDate() - 30)));

    const baseFilter = and(
      eq(s.marketingSessions.storeId, storeId),
      gte(s.marketingSessions.firstEventAt, new Date(startDate + 'T00:00:00Z')),
      lte(s.marketingSessions.firstEventAt, new Date(endDate + 'T23:59:59Z')),
    );

    const sessions = await this.db
      .select()
      .from(s.marketingSessions)
      .where(baseFilter);

    const sourceMap = new Map<string, { sessions: number; orders: Set<number>; revenue: number }>();
    const campaignMap = new Map<string, { sessions: number; orders: Set<number>; revenue: number }>();

    const sessionIdsWithOrders = new Set<number>();
    for (const sess of sessions) {
      if (sess.orderId) sessionIdsWithOrders.add(sess.orderId);
    }

    const orderRevenues = new Map<number, number>();
    if (sessionIdsWithOrders.size > 0) {
      const orderIds = [...sessionIdsWithOrders];
      const orders = await this.db
        .select({ id: s.orders.id, total: s.orders.total })
        .from(s.orders)
        .where(and(eq(s.orders.storeId, storeId), sql`${s.orders.id} = ANY(ARRAY[${sql.join(orderIds, sql`, `)}]::int[])`));
      for (const o of orders) {
        orderRevenues.set(o.id, Number(o.total));
      }
    }

    for (const sess of sessions) {
      const source = sess.utmSource || 'direct';
      const campaign = sess.utmCampaign || 'untagged';

      if (!sourceMap.has(source)) {
        sourceMap.set(source, { sessions: 0, orders: new Set(), revenue: 0 });
      }
      const sEntry = sourceMap.get(source)!;
      sEntry.sessions++;
      if (sess.orderId) {
        sEntry.orders.add(sess.orderId);
        sEntry.revenue += orderRevenues.get(sess.orderId) ?? 0;
      }

      if (!campaignMap.has(campaign)) {
        campaignMap.set(campaign, { sessions: 0, orders: new Set(), revenue: 0 });
      }
      const cEntry = campaignMap.get(campaign)!;
      cEntry.sessions++;
      if (sess.orderId) {
        cEntry.orders.add(sess.orderId);
        cEntry.revenue += orderRevenues.get(sess.orderId) ?? 0;
      }
    }

    const bySource: SourceMetrics[] = [];
    for (const [source, data] of sourceMap) {
      bySource.push({
        source,
        sessions: data.sessions,
        orders: data.orders.size,
        revenue: data.revenue.toFixed(2),
      });
    }
    bySource.sort((a, b) => b.sessions - a.sessions);

    const byCampaign: CampaignMetrics[] = [];
    for (const [campaign, data] of campaignMap) {
      byCampaign.push({
        campaign,
        sessions: data.sessions,
        orders: data.orders.size,
        revenue: data.revenue.toFixed(2),
      });
    }
    byCampaign.sort((a, b) => b.sessions - a.sessions);

    const bestCampaigns = [...byCampaign]
      .filter(c => c.orders > 0)
      .sort((a, b) => (b.orders / Math.max(b.sessions, 1)) - (a.orders / Math.max(a.sessions, 1)))
      .slice(0, 5);

    const highVisitsLowConversion = [...byCampaign]
      .filter(c => c.sessions >= 20 && (c.orders / Math.max(c.sessions, 1)) < 0.05)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 5);

    return { bySource, byCampaign, bestCampaigns, highVisitsLowConversion };
  }

  async getInsights(storeId: number, dateFrom?: string, dateTo?: string): Promise<GrowthInsight[]> {
    const insights: GrowthInsight[] = [];

    const overview = await this.getOverview(storeId, dateFrom, dateTo);
    const productMetrics = await this.getProductMetrics(storeId, dateFrom, dateTo);
    const sourceMetrics = await this.getSourceMetrics(storeId, dateFrom, dateTo);

    if (overview.estimatedAbandonmentRate !== null && overview.estimatedAbandonmentRate > 0.7) {
      insights.push({
        type: 'high_abandonment_rate',
        severity: 'warning',
        title: 'نسبة ترك مرتفعة',
        description: `${Math.round(overview.estimatedAbandonmentRate * 100)}% من العملاء يبدأون الدفع لكن لا يكملون الشراء`,
        entityType: 'funnel',
        entityId: 'checkout',
        metric: 'abandonmentRate',
        recommendation: 'حسّن تجربة الدفع، أضف خيارات دفع أكثر، أو قدّم شحن مجاني',
      });
    }

    if (overview.checkoutToPurchaseRate !== null && overview.checkoutToPurchaseRate < 0.3 && overview.checkoutStarts > 10) {
      insights.push({
        type: 'low_checkout_conversion',
        severity: 'warning',
        title: 'تحويل دفع منخفض',
        description: `فقط ${Math.round(overview.checkoutToPurchaseRate * 100)}% من جلسات الدفع تتحول لطلبات`,
        entityType: 'funnel',
        entityId: 'checkout_conversion',
        metric: 'checkoutToPurchaseRate',
        recommendation: 'تأكد من عدم وجود أخطاء في الدفع، وقدّم طرق دفع متعددة',
      });
    }

    if (overview.cartToCheckoutRate !== null && overview.cartToCheckoutRate < 0.3 && overview.addToCarts > 10) {
      insights.push({
        type: 'low_cart_to_checkout',
        severity: 'warning',
        title: 'نسبة انتقال من السلة للدفع منخفضة',
        description: `فقط ${Math.round(overview.cartToCheckoutRate * 100)}% من الإضافات للسلة تتحول لبدء دفع`,
        entityType: 'funnel',
        entityId: 'cart_checkout',
        metric: 'cartToCheckoutRate',
        recommendation: 'أضف عروض شحن مجاني أو خصومات عند checkout لتحفيز العملاء',
      });
    }

    for (const product of productMetrics.highViewsLowPurchases.slice(0, 5)) {
      insights.push({
        type: 'product_low_conversion',
        severity: 'warning',
        title: `منتج ذو مشاهدات عالية ومبيعات منخفضة`,
        description: `منتج "${product.productName}" لديه ${product.views} مشاهدة ولكن ${product.purchases} مشتريات فقط (نسبة تحويل ${product.conversionRate !== null ? Math.round(product.conversionRate * 100) + '%' : 'N/A'})`,
        entityType: 'product',
        entityId: String(product.productId),
        metric: 'conversionRate',
        recommendation: 'حسّن وصف المنتج أو أضف صوراً أفضل أو خفّض السعر',
      });
    }

    for (const campaign of sourceMetrics.highVisitsLowConversion) {
      const convRate = campaign.sessions > 0 ? (campaign.orders / campaign.sessions) : 0;
      insights.push({
        type: 'campaign_low_conversion',
        severity: 'info',
        title: `حملة ذات زيارات عالية وتحويل ضعيف`,
        description: `حملة "${campaign.campaign}" لديها ${campaign.sessions} زيارة ولكن ${campaign.orders} طلب فقط (نسبة تحويل ${Math.round(convRate * 100)}%)`,
        entityType: 'campaign',
        entityId: campaign.campaign,
        metric: 'conversionRate',
        recommendation: 'راجع استهداف الحملة أو عرض الإعلان لتحسين جودة الزوار',
      });
    }

    if (sourceMetrics.bestCampaigns.length > 0) {
      const best = sourceMetrics.bestCampaigns[0];
      const convRate = best.sessions > 0 ? (best.orders / best.sessions) : 0;
      insights.push({
        type: 'best_performing_campaign',
        severity: 'info',
        title: 'أفضل حملة أداءً',
        description: `حملة "${best.campaign}" تحقق أعلى تحويل بنسبة ${Math.round(convRate * 100)}% (${best.orders} طلب من ${best.sessions} زيارة)`,
        entityType: 'campaign',
        entityId: best.campaign,
        metric: 'conversionRate',
        recommendation: 'زد ميزانية هذه الحملة أو وسّع نطاق استهدافها',
      });
    }

    return insights;
  }
}
