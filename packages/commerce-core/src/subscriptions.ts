import { eq, and, desc, sql } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { isDemoStore } from '@haa/shared';

export class SubscriptionService {
  constructor(private db: DbClient = createDbClient(), private store?: { id: number; isDemo?: boolean | null }) {}

  /**
   * Static factory: resolve the store's id + isDemo flag and
   * return a SubscriptionService instance with the store info
   * pre-loaded. Routes use this instead of doing their own
   * Drizzle select on the stores table.
   *
   * Extracted from `apps/api/src/routes/subscriptions.ts` as
   * part of Quality Pass 5, Route Migration 19/24. The route
   * previously had a local `resolveStore()` helper that did
   * a direct db.select on stores; that helper is now this
   * factory.
   *
   * If no store is found for the given id, the factory still
   * returns a configured service (with store=undefined). The
   * downstream methods (getCurrentSubscription, checkPlanLimits)
   * will then return null or apply non-demo-store behavior,
   * letting the route map to a 404 / empty response as
   * appropriate. This matches the route's prior behavior of
   * `store ?? null` + null-checks.
   */
  static async forStore(storeId: number): Promise<SubscriptionService> {
    const db = createDbClient();
    const [store] = await db
      .select({ id: s.stores.id, isDemo: s.stores.isDemo })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    return new SubscriptionService(db, store ?? undefined);
  }

  async getPlans() {
    return this.db.select()
      .from(s.subscriptionPlans)
      .where(eq(s.subscriptionPlans.isActive, true))
      .orderBy(s.subscriptionPlans.sortOrder);
  }

  async getPlanById(planId: number) {
    const [plan] = await this.db.select()
      .from(s.subscriptionPlans)
      .where(eq(s.subscriptionPlans.id, planId))
      .limit(1);
    return plan ?? null;
  }

  async getAllPlans() {
    return this.db.select()
      .from(s.subscriptionPlans)
      .orderBy(s.subscriptionPlans.sortOrder);
  }

  async updatePlan(planId: number, data: {
    name?: string; code?: string; description?: string | null;
    priceMonthly?: string; priceAnnual?: string;
    productLimit?: number; staffLimit?: number;
    storageLimitMb?: number; orderLimit?: number;
    trialDays?: number; isActive?: boolean; sortOrder?: number;
  }) {
    const vals: Record<string, unknown> = {};
    if (data.name !== undefined) vals.name = data.name;
    if (data.code !== undefined) vals.code = data.code;
    if (data.description !== undefined) vals.description = data.description;
    if (data.priceMonthly !== undefined) vals.priceMonthly = data.priceMonthly;
    if (data.priceAnnual !== undefined) vals.priceAnnual = data.priceAnnual;
    if (data.productLimit !== undefined) vals.productLimit = data.productLimit;
    if (data.staffLimit !== undefined) vals.staffLimit = data.staffLimit;
    if (data.storageLimitMb !== undefined) vals.storageLimitMb = data.storageLimitMb;
    if (data.orderLimit !== undefined) vals.orderLimit = data.orderLimit;
    if (data.trialDays !== undefined) vals.trialDays = data.trialDays;
    if (data.isActive !== undefined) vals.isActive = data.isActive;
    if (data.sortOrder !== undefined) vals.sortOrder = data.sortOrder;

    if (Object.keys(vals).length === 0) {
      return this.getPlanById(planId);
    }

    const [plan] = await this.db.update(s.subscriptionPlans)
      .set(vals)
      .where(eq(s.subscriptionPlans.id, planId))
      .returning();
    return plan;
  }

  async getCurrentSubscription(storeId: number) {
    const rows = await this.db.select({
      id: s.merchantSubscriptions.id,
      storeId: s.merchantSubscriptions.storeId,
      planId: s.merchantSubscriptions.planId,
      status: s.merchantSubscriptions.status,
      billingCycle: s.merchantSubscriptions.billingCycle,
      currentPeriodStart: s.merchantSubscriptions.currentPeriodStart,
      currentPeriodEnd: s.merchantSubscriptions.currentPeriodEnd,
      trialEnd: s.merchantSubscriptions.trialEnd,
      createdAt: s.merchantSubscriptions.createdAt,
      updatedAt: s.merchantSubscriptions.updatedAt,
      planName: s.subscriptionPlans.name,
      planCode: s.subscriptionPlans.code,
      planDescription: s.subscriptionPlans.description,
      priceMonthly: s.subscriptionPlans.priceMonthly,
      priceAnnual: s.subscriptionPlans.priceAnnual,
      productLimit: s.subscriptionPlans.productLimit,
      staffLimit: s.subscriptionPlans.staffLimit,
      storageLimitMb: s.subscriptionPlans.storageLimitMb,
      orderLimit: s.subscriptionPlans.orderLimit,
      trialDays: s.subscriptionPlans.trialDays,
    })
      .from(s.merchantSubscriptions)
      .innerJoin(s.subscriptionPlans, eq(s.merchantSubscriptions.planId, s.subscriptionPlans.id))
      .where(eq(s.merchantSubscriptions.storeId, storeId))
      .limit(1);
    return rows[0] ?? null;
  }

  async subscribe(storeId: number, planId: number, billingCycle: string = 'monthly') {
    const plan = await this.getPlanById(planId);
    if (!plan) return null;

    const [existing] = await this.db.select()
      .from(s.merchantSubscriptions)
      .where(eq(s.merchantSubscriptions.storeId, storeId))
      .limit(1);

    if (existing) return null;

    const now = new Date();
    const periodEnd = billingCycle === 'annual'
      ? new Date(now.getTime() + 365 * 86400000)
      : new Date(now.getTime() + 30 * 86400000);

    const trialDays = plan.trialDays ?? 0;
    const status = trialDays > 0 ? 'trialing' : 'active';
    const trialEnd = trialDays > 0
      ? new Date(now.getTime() + trialDays * 86400000)
      : null;

    const [subscription] = await this.db.insert(s.merchantSubscriptions).values({
      storeId,
      planId,
      status,
      billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialEnd,
    }).returning();

    return subscription;
  }

  async upgrade(storeId: number, newPlanId: number, billingCycle?: string) {
    const subscription = await this.getCurrentSubscription(storeId);
    if (!subscription) return null;

    const newPlan = await this.getPlanById(newPlanId);
    if (!newPlan) return null;

    const currentCycle = billingCycle ?? subscription.billingCycle;

    const now = new Date();
    const periodEnd = currentCycle === 'annual'
      ? new Date(now.getTime() + 365 * 86400000)
      : new Date(now.getTime() + 30 * 86400000);

    const [updated] = await this.db.update(s.merchantSubscriptions)
      .set({
        planId: newPlanId,
        billingCycle: currentCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        status: 'active',
        trialEnd: null,
        updatedAt: now,
      })
      .where(eq(s.merchantSubscriptions.storeId, storeId))
      .returning();

    const oldPrice = currentCycle === 'annual'
      ? Number(subscription.priceAnnual)
      : Number(subscription.priceMonthly);

    const newPrice = currentCycle === 'annual'
      ? Number(newPlan.priceAnnual)
      : Number(newPlan.priceMonthly);

    if (newPrice > oldPrice) {
      const proratedAmount = ((newPrice - oldPrice) / 2).toFixed(2);
      if (Number(proratedAmount) > 0) {
        const invoiceNumber = `INV-${Date.now()}`;
        await this.db.insert(s.subscriptionInvoices).values({
          subscriptionId: updated.id,
          storeId,
          invoiceNumber,
          amount: proratedAmount,
          vatAmount: '0',
          total: proratedAmount,
          status: 'pending',
          billingPeriod: `${now.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}`,
          dueDate: new Date(now.getTime() + 7 * 86400000),
        });
      }
    }

    return updated;
  }

  async downgrade(storeId: number, newPlanId: number) {
    const subscription = await this.getCurrentSubscription(storeId);
    if (!subscription) return null;

    const newPlan = await this.getPlanById(newPlanId);
    if (!newPlan) return null;

    const [updated] = await this.db.update(s.merchantSubscriptions)
      .set({
        planId: newPlanId,
        updatedAt: new Date(),
      })
      .where(eq(s.merchantSubscriptions.storeId, storeId))
      .returning();

    return updated;
  }

  async cancelSubscription(storeId: number) {
    const [subscription] = await this.db.select()
      .from(s.merchantSubscriptions)
      .where(eq(s.merchantSubscriptions.storeId, storeId))
      .limit(1);

    if (!subscription) return null;

    const [cancelled] = await this.db.update(s.merchantSubscriptions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(s.merchantSubscriptions.id, subscription.id))
      .returning();

    return cancelled;
  }

  async getInvoices(storeId: number) {
    return this.db.select()
      .from(s.subscriptionInvoices)
      .where(eq(s.subscriptionInvoices.storeId, storeId))
      .orderBy(desc(s.subscriptionInvoices.createdAt));
  }

  async checkPlanLimits(storeId: number) {
    // Demo stores bypass all plan limits
    if (isDemoStore(this.store)) {
      return {
        subscription: { planName: 'Demo', planCode: 'demo', status: 'active', billingCycle: 'monthly', currentPeriodStart: new Date(), currentPeriodEnd: new Date(Date.now() + 365 * 86400000), trialEnd: null },
        usage: { products: 0, staff: 0, orders: 0 },
        limits: { products: -1, staff: -1, storageMb: 99999, orders: -1 },
      };
    }

    const subscription = await this.getCurrentSubscription(storeId);
    if (!subscription) return { subscription: null, usage: null, limits: null };

    const [productCount] = await this.db.select({ count: sql<number>`count(*)` })
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        eq(s.products.status, 'active'),
      ));

    const [staffCount] = await this.db.select({ count: sql<number>`count(*)` })
      .from(s.userStoreRoles)
      .where(eq(s.userStoreRoles.storeId, storeId));

    const [orderCount] = await this.db.select({ count: sql<number>`count(*)` })
      .from(s.orders)
      .where(eq(s.orders.storeId, storeId));

    const productLimit = subscription.productLimit ?? -1;
    const staffLimit = subscription.staffLimit ?? 1;
    const orderLimit = subscription.orderLimit ?? -1;

    return {
      subscription: {
        planName: subscription.planName,
        planCode: subscription.planCode,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEnd: subscription.trialEnd,
      },
      usage: {
        products: Number(productCount.count),
        staff: Number(staffCount.count),
        orders: Number(orderCount.count),
      },
      limits: {
        products: productLimit,
        staff: staffLimit,
        storageMb: subscription.storageLimitMb ?? 100,
        orders: orderLimit,
      },
    };
  }

  async canCreateProduct(storeId: number): Promise<boolean> {
    if (isDemoStore(this.store)) return true;
    const limits = await this.checkPlanLimits(storeId);
    if (!limits.limits) return false;
    if (limits.limits.products === -1) return true;
    return limits.usage!.products < limits.limits.products;
  }

  async canAddStaff(storeId: number): Promise<boolean> {
    if (isDemoStore(this.store)) return true;
    const limits = await this.checkPlanLimits(storeId);
    if (!limits.limits) return false;
    if (limits.limits.staff === -1) return true;
    return limits.usage!.staff < limits.limits.staff;
  }
}
