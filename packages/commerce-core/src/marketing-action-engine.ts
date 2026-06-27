import { and, eq, gte, lte, sql, count, desc } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { DEFAULT_THRESHOLDS } from '@haa/shared';
import type {
  MarketingActionType,
  MarketingActionThresholds,
  MarketingActionState,
} from '@haa/shared';

const THIRTY_MINUTES = 30 * 60 * 1000;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const __ACTION_TYPES: MarketingActionType[] = [
  'high_views_low_add_to_cart',
  'active_carts_no_checkout',
  'checkout_no_payment',
  'payment_failures_spike',
  'source_visits_no_purchases',
  'mobile_weak_conversion',
];

function generateFingerprint(storeId: number, type: MarketingActionType, entityId?: string | number): string {
  const base = `${storeId}:${type}`;
  return entityId != null ? `${base}:${entityId}` : base;
}

function _toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapActionRow(row: typeof s.marketingActionStates.$inferSelect): MarketingActionState {
  // The DB columns are plain `varchar`, but the application contract
  // narrows them to literal unions. The schema-level CHECK constraint
  // (when present) or the writer-side enum coercion guarantees the
  // string is one of the valid variants.
  return {
    id: row.id,
    storeId: row.storeId,
    actionFingerprint: row.actionFingerprint,
    actionType: row.actionType as MarketingActionType,
    status: row.status as MarketingActionState['status'],
    snoozedUntil: row.snoozedUntil ? String(row.snoozedUntil) : undefined,
    dismissedAt: row.dismissedAt ? String(row.dismissedAt) : undefined,
    doneAt: row.doneAt ? String(row.doneAt) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function dateRange7d(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(Date.now() - SEVEN_DAYS);
  return { start, end };
}

export interface GeneratedAction {
  type: MarketingActionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  titleAr: string;
  descriptionAr: string;
  recommendationAr: string;
  metric: string;
  relatedProductId?: number;
  relatedSource?: string;
  relatedPath?: string;
  fingerprint: string;
}

export interface ActionListOptions {
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export interface ActionListResult {
  data: MarketingActionState[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class MarketingActionService {
  constructor(private db: DbClient = createDbClient()) {}

  async getSettings(storeId: number): Promise<Record<string, unknown>> {
    const rows = await this.db
      .select()
      .from(s.marketingActionSettings)
      .where(eq(s.marketingActionSettings.storeId, storeId));

    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      settings[row.key] = row.valueJson;
    }
    return settings;
  }

  async getSetting(storeId: number, key: string): Promise<unknown | null> {
    const [row] = await this.db
      .select()
      .from(s.marketingActionSettings)
      .where(and(
        eq(s.marketingActionSettings.storeId, storeId),
        eq(s.marketingActionSettings.key, key),
      ));
    return row?.valueJson ?? null;
  }

  async updateSetting(storeId: number, key: string, valueJson: Record<string, unknown>): Promise<void> {
    await this.db
      .insert(s.marketingActionSettings)
      .values({ storeId, key, valueJson })
      .onConflictDoUpdate({
        target: [s.marketingActionSettings.storeId, s.marketingActionSettings.key],
        set: { valueJson, updatedAt: new Date() },
      });
  }

  async getThresholds(storeId: number): Promise<MarketingActionThresholds> {
    const stored = await this.getSetting(storeId, 'thresholds') as MarketingActionThresholds | null;
    if (stored && typeof stored === 'object') {
      return { ...DEFAULT_THRESHOLDS, ...stored };
    }
    return { ...DEFAULT_THRESHOLDS };
  }

  async getActions(storeId: number, options: ActionListOptions = {}): Promise<ActionListResult> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const offset = (page - 1) * limit;

    const conditions = [eq(s.marketingActionStates.storeId, storeId)];
    if (options.status) {
      conditions.push(eq(s.marketingActionStates.status, options.status));
    }
    if (options.type) {
      conditions.push(eq(s.marketingActionStates.actionType, options.type));
    }

    const where = and(...conditions);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(s.marketingActionStates)
      .where(where);

    const rows = await this.db
      .select()
      .from(s.marketingActionStates)
      .where(where)
      .orderBy(desc(s.marketingActionStates.createdAt))
      .limit(limit)
      .offset(offset);

    const total = Number(totalResult?.count ?? 0);

    return {
      data: rows.map(mapActionRow),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getActionById(storeId: number, id: number): Promise<MarketingActionState | null> {
    const [row] = await this.db
      .select()
      .from(s.marketingActionStates)
      .where(and(
        eq(s.marketingActionStates.storeId, storeId),
        eq(s.marketingActionStates.id, id),
      ));
    return row ? mapActionRow(row) : null;
  }

  async updateActionState(
    storeId: number,
    id: number,
    update: { status: string; snoozedUntil?: string },
  ): Promise<MarketingActionState | null> {
    const existing = await this.getActionById(storeId, id);
    if (!existing) return null;

    const setFields: Record<string, unknown> = {
      status: update.status,
      updatedAt: new Date(),
    };

    if (update.status === 'dismissed') {
      setFields.dismissedAt = new Date();
    } else if (update.status === 'done') {
      setFields.doneAt = new Date();
    } else if (update.status === 'snoozed') {
      setFields.snoozedUntil = update.snoozedUntil ? new Date(update.snoozedUntil) : null;
    }

    await this.db
      .update(s.marketingActionStates)
      .set(setFields)
      .where(and(
        eq(s.marketingActionStates.storeId, storeId),
        eq(s.marketingActionStates.id, id),
      ));

    await this.logAction(storeId, id, existing.actionFingerprint, existing.actionType, update.status, {
      previousStatus: existing.status,
      snoozedUntil: update.snoozedUntil,
    });

    return this.getActionById(storeId, id);
  }

  private async logAction(
    storeId: number,
    actionId: number | null,
    fingerprint: string,
    actionType: string,
    event: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.insert(s.marketingActionLogs).values({
      storeId,
      actionId,
      actionFingerprint: fingerprint,
      actionType,
      event,
      metadata: metadata ?? null,
    });
  }

  async getLogs(storeId: number, fingerprint: string): Promise<unknown[]> {
    return this.db
      .select()
      .from(s.marketingActionLogs)
      .where(and(
        eq(s.marketingActionLogs.storeId, storeId),
        eq(s.marketingActionLogs.actionFingerprint, fingerprint),
      ))
      .orderBy(desc(s.marketingActionLogs.createdAt));
  }

  async generateActions(storeId: number): Promise<GeneratedAction[]> {
    const thresholds = await this.getThresholds(storeId);
    const generated: GeneratedAction[] = [];

    const products = await this.checkHighViewsLowCart(storeId, thresholds);
    generated.push(...products);

    const carts = await this.checkActiveCartsNoCheckout(storeId, thresholds);
    generated.push(...carts);

    const checkout = await this.checkCheckoutNoPayment(storeId, thresholds);
    generated.push(...checkout);

    const failures = await this.checkPaymentFailures(storeId, thresholds);
    generated.push(...failures);

    const sources = await this.checkSourceNoPurchases(storeId, thresholds);
    generated.push(...sources);

    const mobile = await this.checkMobileWeakConversion(storeId, thresholds);
    generated.push(...mobile);

    await this.upsertActions(storeId, generated);

    return generated;
  }

  private async upsertActions(storeId: number, actions: GeneratedAction[]): Promise<void> {
    for (const action of actions) {
      const [existing] = await this.db
        .select()
        .from(s.marketingActionStates)
        .where(and(
          eq(s.marketingActionStates.storeId, storeId),
          eq(s.marketingActionStates.actionFingerprint, action.fingerprint),
        ));

      if (!existing) {
        await this.db.insert(s.marketingActionStates).values({
          storeId,
          actionFingerprint: action.fingerprint,
          actionType: action.type,
          status: 'active',
        });
        await this.logAction(storeId, null, action.fingerprint, action.type, 'created');
      } else if (existing.status === 'snoozed' && existing.snoozedUntil && existing.snoozedUntil < new Date()) {
        await this.db
          .update(s.marketingActionStates)
          .set({ status: 'active', snoozedUntil: null, updatedAt: new Date() })
          .where(eq(s.marketingActionStates.id, existing.id));
        await this.logAction(storeId, existing.id, action.fingerprint, action.type, 'reactivated', {
          reason: 'snooze_expired',
        });
      }
    }

    const activeFingerprints = new Set(actions.map(a => a.fingerprint));
    const activeStates = await this.db
      .select()
      .from(s.marketingActionStates)
      .where(and(
        eq(s.marketingActionStates.storeId, storeId),
        eq(s.marketingActionStates.status, 'active'),
      ));

    for (const state of activeStates) {
      if (!activeFingerprints.has(state.actionFingerprint)) {
        await this.db
          .update(s.marketingActionStates)
          .set({ status: 'done', doneAt: new Date(), updatedAt: new Date() })
          .where(eq(s.marketingActionStates.id, state.id));
        await this.logAction(storeId, state.id, state.actionFingerprint, state.actionType, 'auto_done', {
          reason: 'condition_no_longer_met',
        });
      }
    }
  }

  private async checkHighViewsLowCart(storeId: number, thresholds: MarketingActionThresholds): Promise<GeneratedAction[]> {
    const { start, end } = dateRange7d();

    const viewCounts = await this.db
      .select({
        productId: s.marketingEvents.productId,
        views: count(),
      })
      .from(s.marketingEvents)
      .where(and(
        eq(s.marketingEvents.storeId, storeId),
        eq(s.marketingEvents.eventType, 'view_product'),
        gte(s.marketingEvents.createdAt, start),
        lte(s.marketingEvents.createdAt, end),
        sql`${s.marketingEvents.productId} IS NOT NULL`,
      ))
      .groupBy(s.marketingEvents.productId);

    const cartCounts = await this.db
      .select({
        productId: s.marketingEvents.productId,
        carts: count(),
      })
      .from(s.marketingEvents)
      .where(and(
        eq(s.marketingEvents.storeId, storeId),
        eq(s.marketingEvents.eventType, 'add_to_cart'),
        gte(s.marketingEvents.createdAt, start),
        lte(s.marketingEvents.createdAt, end),
        sql`${s.marketingEvents.productId} IS NOT NULL`,
      ))
      .groupBy(s.marketingEvents.productId);

    const cartMap = new Map<number, number>();
    for (const row of cartCounts) {
      if (row.productId) cartMap.set(row.productId, Number(row.carts));
    }

    const results: GeneratedAction[] = [];
    for (const row of viewCounts) {
      const pid = row.productId;
      if (!pid) continue;
      const views = Number(row.views);
      const carts = cartMap.get(pid) ?? 0;
      const cartRate = views > 0 ? carts / views : 0;

      if (views >= thresholds.minimumProductViews && cartRate < thresholds.lowAddToCartRateThreshold) {
        const [product] = await this.db
          .select({ id: s.products.id, name: s.products.name })
          .from(s.products)
          .where(and(eq(s.products.storeId, storeId), eq(s.products.id, pid)))
          .limit(1);

        const productName = product?.name ?? `#${pid}`;
        const severity = cartRate < 0.01 ? 'critical' : cartRate < 0.03 ? 'high' : 'medium';

        results.push({
          type: 'high_views_low_add_to_cart',
          severity,
          titleAr: `منتج "${productName}" يحصل على مشاهدات عالية لكن إضافاته للسلة منخفضة`,
          descriptionAr: `${views} مشاهدة مع ${carts} إضافة للسلة (${(cartRate * 100).toFixed(1)}%)`,
          recommendationAr: 'راجع صور المنتج، الوصف، والسعر. أضف مراجعات أو عروضاً محدودة الوقت',
          metric: `cartRate=${(cartRate * 100).toFixed(1)}% (${carts}/${views})`,
          relatedProductId: pid,
          fingerprint: generateFingerprint(storeId, 'high_views_low_add_to_cart', pid),
        });
      }
    }

    return results;
  }

  private async checkActiveCartsNoCheckout(storeId: number, thresholds: MarketingActionThresholds): Promise<GeneratedAction[]> {
    const cutoff = new Date(Date.now() - thresholds.activeCartAgeMinutes * 60 * 1000);

    const [result] = await this.db
      .select({ count: count() })
      .from(s.livePresence)
      .where(and(
        eq(s.livePresence.storeId, storeId),
        sql`${s.livePresence.currentCartId} IS NOT NULL`,
        eq(s.livePresence.isInCheckout, false),
        lte(s.livePresence.lastSeenAt, cutoff),
      ));

    const stalledCarts = Number(result?.count ?? 0);
    if (stalledCarts < 3) return [];

    const severity = stalledCarts >= 10 ? 'critical' : stalledCarts >= 5 ? 'high' : 'medium';

    return [{
      type: 'active_carts_no_checkout',
      severity,
      titleAr: `${stalledCarts} سلة نشطة منذ فترة طويلة دون انتقال للدفع`,
      descriptionAr: `هناك ${stalledCarts} سلة لم يتم الانتقال بها لعملية الدفع منذ أكثر من ${thresholds.activeCartAgeMinutes} دقيقة`,
      recommendationAr: 'أرسل تذكيرات تلقائية للعملاء الذين لديهم سلات مهجورة. عرض شحن مجاني أو خصم محدود',
      metric: `stalledCarts=${stalledCarts}`,
      fingerprint: generateFingerprint(storeId, 'active_carts_no_checkout'),
    }];
  }

  private async checkCheckoutNoPayment(storeId: number, thresholds: MarketingActionThresholds): Promise<GeneratedAction[]> {
    const cutoff = new Date(Date.now() - thresholds.checkoutNoPaymentMinutes * 60 * 1000);

    const [result] = await this.db
      .select({ count: count() })
      .from(s.livePresence)
      .where(and(
        eq(s.livePresence.storeId, storeId),
        eq(s.livePresence.isInCheckout, true),
        lte(s.livePresence.lastSeenAt, cutoff),
      ));

    const stuckCheckouts = Number(result?.count ?? 0);
    if (stuckCheckouts < 2) return [];

    const severity = stuckCheckouts >= 5 ? 'critical' : stuckCheckouts >= 3 ? 'high' : 'medium';

    return [{
      type: 'checkout_no_payment',
      severity,
      titleAr: `${stuckCheckouts} مستخدم في الدفع دون إتمام`,
      descriptionAr: `${stuckCheckouts} مستخدم في صفحة الدفع منذ أكثر من ${thresholds.checkoutNoPaymentMinutes} دقيقة ولم يكملوا`,
      recommendationAr: 'تأكد من عدم وجود أخطاء في بوابة الدفع. بسّط خطوات الدفع. وفر طرق دفع بديلة',
      metric: `stuckCheckouts=${stuckCheckouts}`,
      fingerprint: generateFingerprint(storeId, 'checkout_no_payment'),
    }];
  }

  private async checkPaymentFailures(storeId: number, thresholds: MarketingActionThresholds): Promise<GeneratedAction[]> {
    const thirtyAgo = new Date(Date.now() - THIRTY_MINUTES);

    const [result] = await this.db
      .select({ count: count() })
      .from(s.orders)
      .where(and(
        eq(s.orders.storeId, storeId),
        eq(s.orders.paymentStatus, 'failed'),
        gte(s.orders.createdAt, thirtyAgo),
      ));

    const failures = Number(result?.count ?? 0);
    if (failures < thresholds.paymentFailureThreshold) return [];

    const severity = failures >= 10 ? 'critical' : failures >= 5 ? 'high' : 'medium';

    return [{
      type: 'payment_failures_spike',
      severity,
      titleAr: `${failures} حالات فشل دفع في آخر 30 دقيقة`,
      descriptionAr: `هناك ${failures} عملية دفع فاشلة خلال آخر 30 دقيقة، وهو يفوق الحد المسموح (${thresholds.paymentFailureThreshold})`,
      recommendationAr: 'راجع سجل الدفع للتحقق من أخطاء البوابة. تواصل مع مزود الدفع إذا لزم الأمر',
      metric: `paymentFailures=${failures}`,
      fingerprint: generateFingerprint(storeId, 'payment_failures_spike'),
    }];
  }

  private async checkSourceNoPurchases(storeId: number, thresholds: MarketingActionThresholds): Promise<GeneratedAction[]> {
    const { start, end } = dateRange7d();

    const sessions = await this.db
      .select()
      .from(s.marketingSessions)
      .where(and(
        eq(s.marketingSessions.storeId, storeId),
        gte(s.marketingSessions.firstEventAt, start),
        lte(s.marketingSessions.firstEventAt, end),
      ));

    const sourceStats = new Map<string, { sessions: number; orders: Set<number> }>();
    for (const sess of sessions) {
      const source = sess.utmSource || 'direct';
      if (!sourceStats.has(source)) {
        sourceStats.set(source, { sessions: 0, orders: new Set() });
      }
      const stats = sourceStats.get(source)!;
      stats.sessions++;
      if (sess.orderId) stats.orders.add(sess.orderId);
    }

    const results: GeneratedAction[] = [];
    for (const [source, stats] of sourceStats) {
      if (stats.sessions >= thresholds.sourceNoPurchaseVisitThreshold && stats.orders.size === 0) {
        const severity = stats.sessions >= 100 ? 'high' : 'medium';
        results.push({
          type: 'source_visits_no_purchases',
          severity,
          titleAr: `مصدر "${source}" يجلب ${stats.sessions} زيارة بدون مشتريات`,
          descriptionAr: `مصدر الزيارات "${source}" حقق ${stats.sessions} جلسة خلال 7 أيام بدون أي طلب مشتريات`,
          recommendationAr: 'راجع صفحة الهبوط لهذا المصدر. تأكد من استهداف الجمهور الصحيح. جرب عروضاً مخصصة لهذا المصدر',
          metric: `sourceVisits=${stats.sessions}, purchases=0`,
          relatedSource: source,
          fingerprint: generateFingerprint(storeId, 'source_visits_no_purchases', source),
        });
      }
    }

    return results;
  }

  private async checkMobileWeakConversion(storeId: number, thresholds: MarketingActionThresholds): Promise<GeneratedAction[]> {
    const thirtyAgo = new Date(Date.now() - THIRTY_MINUTES);

    const [mobileVisitors] = await this.db
      .select({ count: count() })
      .from(s.livePresence)
      .where(and(
        eq(s.livePresence.storeId, storeId),
        eq(s.livePresence.deviceType, 'mobile'),
        gte(s.livePresence.lastSeenAt, thirtyAgo),
      ));

    const [mobileOrders] = await this.db
      .select({ count: count() })
      .from(s.orders)
      .where(and(
        eq(s.orders.storeId, storeId),
        gte(s.orders.createdAt, thirtyAgo),
      ));

    const visitors = Number(mobileVisitors?.count ?? 0);
    const orders = Number(mobileOrders?.count ?? 0);

    if (visitors < 20) return [];

    const conversionRate = visitors > 0 ? orders / visitors : 0;
    if (conversionRate >= thresholds.mobileWeakConversionThreshold) return [];

    const severity = conversionRate < 0.005 ? 'critical' : conversionRate < 0.01 ? 'high' : 'medium';

    return [{
      type: 'mobile_weak_conversion',
      severity,
      titleAr: `تحويل جوال ضعيف: ${(conversionRate * 100).toFixed(1)}% فقط`,
      descriptionAr: `الزوار من الجوال (${visitors}) حققوا ${orders} طلب فقط، بنسبة تحويل ${(conversionRate * 100).toFixed(1)}%`,
      recommendationAr: 'تحقق من تجربة الجوال. تأكد من سرعة التحميل، سهولة التنقل، وسهولة الدفع على الجوال',
      metric: `mobileConversion=${(conversionRate * 100).toFixed(1)}% (${orders}/${visitors})`,
      fingerprint: generateFingerprint(storeId, 'mobile_weak_conversion'),
    }];
  }
}

export async function runMarketingActionGeneration(storeId: number, db?: DbClient): Promise<GeneratedAction[]> {
  const service = new MarketingActionService(db);
  return service.generateActions(storeId);
}
