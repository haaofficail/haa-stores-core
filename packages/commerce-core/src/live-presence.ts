import { and, eq, gte, lte, sql, count, isNotNull } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { NormalizedDevice } from './device-normalization.js';
import type {
  HeartbeatPayload, LiveOverview, LivePages, LivePageInfo,
  LiveDevices, LiveSources, LiveFunnel, LiveAlert, LiveGeo,
} from '@haa/shared';

const ONLINE_TTL_SECONDS = 60;
const THIRTY_MINUTES = 30 * 60 * 1000;
const CLEANUP_OLDER_THAN_HOURS = 24;

function now(): Date {
  return new Date();
}

function thirtyMinAgo(): Date {
  return new Date(Date.now() - THIRTY_MINUTES);
}

function cleanupCutoff(): Date {
  return new Date(Date.now() - CLEANUP_OLDER_THAN_HOURS * 60 * 60 * 1000);
}

function onlineFilter(storeId: number) {
  return and(
    eq(s.livePresence.storeId, storeId),
    gte(s.livePresence.lastSeenAt, new Date(Date.now() - ONLINE_TTL_SECONDS * 1000)),
  );
}

export class LivePresenceService {
  constructor(private db: DbClient = createDbClient()) {}

  async heartbeat(storeId: number, payload: HeartbeatPayload): Promise<void> {
    const now_ = now();
    await this.db.insert(s.livePresence).values({
      storeId,
      sessionId: payload.sessionId,
      currentPath: payload.currentPath,
      currentPageType: payload.currentPageType,
      currentProductId: payload.currentProductId ?? null,
      currentCartId: payload.cartId ?? null,
      currentCartValue: payload.currentCartValue != null ? String(payload.currentCartValue) : null,
      isInCheckout: payload.isInCheckout,
      deviceType: payload.deviceType ?? null,
      os: payload.os ?? null,
      browser: payload.browser ?? null,
      screenSize: payload.screenSize ?? null,
      utmSource: payload.utmSource ?? null,
      utmMedium: payload.utmMedium ?? null,
      utmCampaign: payload.utmCampaign ?? null,
      countryCode: payload.countryCode ?? undefined,
      countryName: payload.countryName ?? undefined,
      regionName: payload.regionName ?? undefined,
      cityName: payload.cityName ?? undefined,
      geoAccuracy: payload.geoAccuracy ?? undefined,
      lastSeenAt: now_,
    }).onConflictDoUpdate({
      target: [s.livePresence.storeId, s.livePresence.sessionId],
      set: {
        currentPath: payload.currentPath,
        currentPageType: payload.currentPageType,
        currentProductId: payload.currentProductId ?? null,
        currentCartId: payload.cartId ?? null,
        currentCartValue: payload.currentCartValue != null ? String(payload.currentCartValue) : null,
        isInCheckout: payload.isInCheckout,
        deviceType: payload.deviceType ?? null,
        os: payload.os ?? null,
        browser: payload.browser ?? null,
        screenSize: payload.screenSize ?? null,
        utmSource: payload.utmSource ?? null,
        utmMedium: payload.utmMedium ?? null,
        utmCampaign: payload.utmCampaign ?? null,
        countryCode: payload.countryCode ?? undefined,
        countryName: payload.countryName ?? undefined,
        regionName: payload.regionName ?? undefined,
        cityName: payload.cityName ?? undefined,
        geoAccuracy: payload.geoAccuracy ?? undefined,
        lastSeenAt: now_,
      },
    });
  }

  async getOverview(storeId: number): Promise<LiveOverview> {
    const online = onlineFilter(storeId);

    const [visitors] = await this.db.select({ count: count() }).from(s.livePresence).where(online);
    const [productViewers] = await this.db.select({ count: count() }).from(s.livePresence)
      .where(and(online, eq(s.livePresence.currentPageType, 'product')));
    const [cartUsers] = await this.db.select({ count: count() }).from(s.livePresence)
      .where(and(online, isNotNull(s.livePresence.currentCartId)));
    const [checkoutUsers] = await this.db.select({ count: count() }).from(s.livePresence)
      .where(and(online, eq(s.livePresence.isInCheckout, true)));

    const [cartValueResult] = await this.db
      .select({ total: sql`COALESCE(SUM(${s.livePresence.currentCartValue}::numeric), 0)` as any })
      .from(s.livePresence)
      .where(and(online, isNotNull(s.livePresence.currentCartValue)));

    const thirtyAgo = thirtyMinAgo();
    const [ordersCount] = await this.db
      .select({ count: count() })
      .from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), gte(s.orders.createdAt, thirtyAgo)));
    const [paidOrdersCount] = await this.db
      .select({ count: count() })
      .from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.paymentStatus, 'paid'), gte(s.orders.createdAt, thirtyAgo)));
    const [revenueResult] = await this.db
      .select({ total: sql`COALESCE(SUM(${s.orders.total}::numeric), 0)` as any })
      .from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.paymentStatus, 'paid'), gte(s.orders.createdAt, thirtyAgo)));

    const [paymentFailures] = await this.db
      .select({ count: count() })
      .from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.paymentStatus, 'failed'), gte(s.orders.createdAt, thirtyAgo)));

    return {
      onlineVisitors: Number(visitors?.count ?? 0),
      activeProductViewers: Number(productViewers?.count ?? 0),
      activeCarts: Number(cartUsers?.count ?? 0),
      activeCheckouts: Number(checkoutUsers?.count ?? 0),
      currentCartValueTotal: String(cartValueResult?.total ?? '0'),
      ordersLast30Min: Number(ordersCount?.count ?? 0),
      paidOrdersLast30Min: Number(paidOrdersCount?.count ?? 0),
      revenueLast30Min: String(revenueResult?.total ?? '0'),
      paymentFailuresLast30Min: Number(paymentFailures?.count ?? 0),
      updatedAt: now().toISOString(),
    };
  }

  async getPages(storeId: number): Promise<LivePages> {
    const online = onlineFilter(storeId);

    const activePagesRaw = await this.db
      .select({
        path: s.livePresence.currentPath,
        pageType: s.livePresence.currentPageType,
        count: count(),
      })
      .from(s.livePresence)
      .where(and(online, isNotNull(s.livePresence.currentPath)))
      .groupBy(s.livePresence.currentPath, s.livePresence.currentPageType)
      .orderBy(sql`count DESC`);

    const activePages: LivePageInfo[] = activePagesRaw.map((r) => ({
      path: r.path ?? '',
      pageType: r.pageType ?? 'unknown',
      visitorCount: Number(r.count),
    }));

    const activeProductPages = activePages.filter((p) => p.pageType === 'product');

    const topViewedProductsRaw = await this.db
      .select({
        productId: s.livePresence.currentProductId,
        count: count(),
      })
      .from(s.livePresence)
      .where(and(online, eq(s.livePresence.currentPageType, 'product'), isNotNull(s.livePresence.currentProductId)))
      .groupBy(s.livePresence.currentProductId)
      .orderBy(sql`count DESC`)
      .limit(10);

    const productIds = topViewedProductsRaw.map((r) => r.productId).filter(Boolean) as number[];
    const productNames = new Map<number, string>();
    if (productIds.length > 0) {
      const products = await this.db
        .select({ id: s.products.id, name: s.products.name })
        .from(s.products)
        .where(and(eq(s.products.storeId, storeId), sql`${s.products.id} = ANY(ARRAY[${sql.join(productIds, sql`, `)}]::int[])`));
      for (const p of products) productNames.set(p.id, p.name);
    }

    const topViewedProductsNow = topViewedProductsRaw.map((r) => ({
      productId: r.productId as number,
      productName: productNames.get(r.productId as number) ?? `#${r.productId}`,
      viewers: Number(r.count),
    }));

    return { activePages, activeProductPages, topViewedProductsNow };
  }

  private async groupByColumn(column: any, online: any, fallback: string): Promise<{ label: string; count: number }[]> {
    const rows = await this.db
      .select({ label: column, count: count() })
      .from(s.livePresence)
      .where(and(online, isNotNull(column)))
      .groupBy(column as any)
      .orderBy(sql`count DESC`);
    const result = rows.map((r) => ({ label: r.label ?? fallback, count: Number(r.count) }));
    if (result.length === 0) result.push({ label: fallback, count: 0 });
    return result;
  }

  async getDevices(storeId: number): Promise<LiveDevices> {
    const online = onlineFilter(storeId);

    const [visitorsByDeviceType, visitorsByOs, visitorsByBrowser, visitorsByScreenSize] = await Promise.all([
      this.groupByColumn(s.livePresence.deviceType, online, 'unknown'),
      this.groupByColumn(s.livePresence.os, online, 'unknown'),
      this.groupByColumn(s.livePresence.browser, online, 'unknown'),
      this.groupByColumn(s.livePresence.screenSize, online, 'unknown'),
    ]);

    return { visitorsByDeviceType, visitorsByOs, visitorsByBrowser, visitorsByScreenSize };
  }

  async getSources(storeId: number): Promise<LiveSources> {
    const online = onlineFilter(storeId);

    const [visitorsByUtmSource, visitorsByUtmCampaign, visitorsByReferrer] = await Promise.all([
      this.groupByColumn(s.livePresence.utmSource, online, 'direct'),
      this.groupByColumn(s.livePresence.utmCampaign, online, 'untagged'),
      this.groupByColumn(s.livePresence.referrer, online, 'direct'),
    ]);

    return { visitorsByUtmSource, visitorsByUtmCampaign, visitorsByReferrer };
  }

  async getGeo(storeId: number): Promise<LiveGeo> {
    const online = onlineFilter(storeId);

    const countriesRaw = await this.db
      .select({
        countryCode: s.livePresence.countryCode,
        countryName: s.livePresence.countryName,
        count: count(),
      })
      .from(s.livePresence)
      .where(and(online, isNotNull(s.livePresence.countryCode)))
      .groupBy(s.livePresence.countryCode, s.livePresence.countryName)
      .orderBy(sql`count DESC`);

    const citiesRaw = await this.db
      .select({
        countryCode: s.livePresence.countryCode,
        countryName: s.livePresence.countryName,
        cityName: s.livePresence.cityName,
        count: count(),
      })
      .from(s.livePresence)
      .where(and(online, isNotNull(s.livePresence.cityName)))
      .groupBy(s.livePresence.countryCode, s.livePresence.countryName, s.livePresence.cityName)
      .orderBy(sql`count DESC`)
      .limit(50);

    const countries = countriesRaw
      .filter((r) => r.countryCode)
      .map((r) => ({
        countryCode: r.countryCode!,
        countryName: r.countryName ?? r.countryCode!,
        count: Number(r.count),
      }));

    const cities = citiesRaw
      .filter((r) => r.cityName)
      .map((r) => ({
        countryCode: r.countryCode ?? 'unknown',
        countryName: r.countryName ?? r.countryCode ?? 'unknown',
        cityName: r.cityName!,
        count: Number(r.count),
      }));

    return { countries, cities, updatedAt: now().toISOString() };
  }

  async getFunnel(storeId: number): Promise<LiveFunnel> {
    const online = onlineFilter(storeId);

    const [visitorsResult] = await this.db.select({ count: count() }).from(s.livePresence).where(online);
    const onlineVisitors = Number(visitorsResult?.count ?? 0);

    const [productViewersResult] = await this.db.select({ count: count() }).from(s.livePresence)
      .where(and(online, eq(s.livePresence.currentPageType, 'product')));
    const productViewers = Number(productViewersResult?.count ?? 0);

    const [cartUsersResult] = await this.db.select({ count: count() }).from(s.livePresence)
      .where(and(online, isNotNull(s.livePresence.currentCartId)));
    const cartUsers = Number(cartUsersResult?.count ?? 0);

    const [checkoutUsersResult] = await this.db.select({ count: count() }).from(s.livePresence)
      .where(and(online, eq(s.livePresence.isInCheckout, true)));
    const checkoutUsers = Number(checkoutUsersResult?.count ?? 0);

    const thirtyAgo = thirtyMinAgo();
    const [ordersCount] = await this.db.select({ count: count() }).from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), gte(s.orders.createdAt, thirtyAgo)));
    const [paidOrdersCount] = await this.db.select({ count: count() }).from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.paymentStatus, 'paid'), gte(s.orders.createdAt, thirtyAgo)));

    const dropOffSignals: { stage: string; count: number }[] = [];
    if (productViewers > 0 && cartUsers < productViewers) {
      dropOffSignals.push({ stage: 'منتج ← سلة', count: productViewers - cartUsers });
    }
    if (cartUsers > 0 && checkoutUsers < cartUsers) {
      dropOffSignals.push({ stage: 'سلة ← دفع', count: cartUsers - checkoutUsers });
    }

    return {
      onlineVisitors,
      productViewers,
      cartUsers,
      checkoutUsers,
      ordersLast30Min: Number(ordersCount?.count ?? 0),
      paidOrdersLast30Min: Number(paidOrdersCount?.count ?? 0),
      dropOffSignals,
    };
  }

  async getAlerts(storeId: number): Promise<LiveAlert[]> {
    const alerts: LiveAlert[] = [];
    const overview = await this.getOverview(storeId);

    if (overview.activeProductViewers > 5 && overview.activeCarts < 2) {
      alerts.push({
        type: 'product_high_attention_low_cart',
        severity: 'warning',
        title: 'اهتمام عالي بدون سلات',
        description: `هناك ${overview.activeProductViewers} زائر يشاهد منتجات لكن ${overview.activeCarts} فقط لديهم سلات`,
        metric: 'cartRate',
        recommendation: 'أضف عروضًا أو خصومات لحظية لتحفيز إضافة المنتجات للسلة',
      });
    }

    if (overview.activeCarts > 3 && overview.activeCheckouts < 1) {
      alerts.push({
        type: 'many_carts_stalled',
        severity: 'warning',
        title: 'سلات متوقفة',
        description: `هناك ${overview.activeCarts} سلة نشطة لكن لا أحد في الدفع`,
        metric: 'checkoutRate',
        recommendation: 'أرسل تذكيراً للعملاء الذين لديهم سلات متروكة',
      });
    }

    if (overview.activeCheckouts > 2 && overview.paidOrdersLast30Min === 0) {
      alerts.push({
        type: 'high_checkout_low_payment',
        severity: 'warning',
        title: 'دفع بدون إتمام',
        description: `${overview.activeCheckouts} في الدفع لكن لم يكتمل أي طلب مدفوع آخر 30 دقيقة`,
        metric: 'checkoutToPaid',
        recommendation: 'تأكد من طرق الدفع المتاحة وعدم وجود أخطاء',
      });
    }

    if (overview.paymentFailuresLast30Min > 3) {
      alerts.push({
        type: 'high_payment_failure',
        severity: 'critical',
        title: 'فشل في الدفع',
        description: `آخر 30 دقيقة: ${overview.paymentFailuresLast30Min} عملية دفع فاشلة`,
        metric: 'paymentFailures',
        recommendation: 'راجع سجل الدفع للتحقق من وجود مشكلة في بوابة الدفع',
      });
    }

    return alerts;
  }

  async cleanupOldPresence(): Promise<number> {
    const cutoff = cleanupCutoff();
    const result = await this.db
      .delete(s.livePresence)
      .where(lte(s.livePresence.lastSeenAt, cutoff));
    return Number((result as { rowCount?: number }).rowCount ?? 0);
  }
}

/**
 * Run cleanup job. Safe to call repeatedly (idempotent).
 * Returns number of deleted rows.
 */
export async function runLivePresenceCleanup(db?: DbClient): Promise<number> {
  const service = new LivePresenceService(db);
  return service.cleanupOldPresence();
}
