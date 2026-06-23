import { and, eq, gte, sql, count, desc, lt } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type {
  CustomerSegmentType,
  CustomerSegment,
  CustomerSegmentMember,
  CustomerSegmentSummary,
  CustomerSegmentThresholds,
  CustomerSegmentListResponse,
} from '@haa/shared';
import { DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS } from '@haa/shared';

const ALL_SEGMENTS: CustomerSegmentType[] = [
  'high_value',
  'repeat_buyers',
  'new_customers',
  'inactive',
  'cart_abandoners',
  'at_risk',
  'one_time_buyers',
  'coupon_users',
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export class CustomerSegmentationService {
  constructor(private db: DbClient = createDbClient()) {}

  async getThresholds(storeId: number): Promise<CustomerSegmentThresholds> {
    const [row] = await this.db
      .select()
      .from(s.marketingActionSettings)
      .where(and(
        eq(s.marketingActionSettings.storeId, storeId),
        eq(s.marketingActionSettings.key, 'customerSegmentThresholds'),
      ));
    if (row?.valueJson && typeof row.valueJson === 'object') {
      return { ...DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS, ...(row.valueJson as Record<string, number>) };
    }
    return { ...DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS };
  }

  async updateThresholds(storeId: number, thresholds: Partial<CustomerSegmentThresholds>): Promise<void> {
    const current = await this.getThresholds(storeId);
    const merged = { ...current, ...thresholds };
    await this.db
      .insert(s.marketingActionSettings)
      .values({ storeId, key: 'customerSegmentThresholds', valueJson: merged })
      .onConflictDoUpdate({
        target: [s.marketingActionSettings.storeId, s.marketingActionSettings.key],
        set: { valueJson: merged, updatedAt: new Date() },
      });
  }

  async getSummary(storeId: number): Promise<CustomerSegmentSummary> {
    const thresholds = await this.getThresholds(storeId);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(s.customers)
      .where(eq(s.customers.storeId, storeId));

    const totalCustomers = Number(totalResult?.count ?? 0);

    const segments: CustomerSegment[] = [];
    for (const type of ALL_SEGMENTS) {
      const seg = await this.computeSegment(storeId, type, thresholds);
      segments.push(seg);
    }

    return {
      totalCustomers,
      segments,
      computedAt: new Date().toISOString(),
    };
  }

  async getSegmentMembers(
    storeId: number,
    type: CustomerSegmentType,
    options: { page?: number; limit?: number } = {},
  ): Promise<CustomerSegmentListResponse> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const offset = (page - 1) * limit;
    const thresholds = await this.getThresholds(storeId);

    const where = this.buildSegmentWhere(storeId, type, thresholds);

    const [totalResult] = await this.db
      .select({ count: count() })
      .from(s.customers)
      .where(where);

    const rows = await this.db
      .select({
        id: s.customers.id,
        name: s.customers.name,
        phone: s.customers.phone,
        email: s.customers.email,
        totalOrders: s.customers.totalOrders,
        totalSpent: s.customers.totalSpent,
        createdAt: s.customers.createdAt,
        updatedAt: s.customers.updatedAt,
      })
      .from(s.customers)
      .where(where)
      .orderBy(desc(s.customers.totalSpent))
      .limit(limit)
      .offset(offset);

    const customerIds = rows.map(r => r.id);
    const lastOrders = await this.getLastOrders(storeId, customerIds);
    const lastSessions = await this.getLastSessions(storeId, customerIds);

    const data: CustomerSegmentMember[] = rows.map(row => ({
      customerId: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      totalOrders: row.totalOrders,
      totalSpent: String(row.totalSpent),
      lastOrderAt: lastOrders.get(row.id) ?? null,
      lastSeenAt: lastSessions.get(row.id) ?? null,
      segmentType: type,
    }));

    const total = Number(totalResult?.count ?? 0);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async computeSegment(
    storeId: number,
    type: CustomerSegmentType,
    thresholds: CustomerSegmentThresholds,
  ): Promise<CustomerSegment> {
    const where = this.buildSegmentWhere(storeId, type, thresholds);

    const [countResult] = await this.db
      .select({ count: count() })
      .from(s.customers)
      .where(where);

    const cnt = Number(countResult?.count ?? 0);

    const [spendResult] = await this.db
      .select({
        // Drizzle infers `sql\`...\`` as SQL<unknown>; we know the
        // expression returns a numeric (COALESCE forces 0 when null),
        // so annotate it explicitly with sql<string> — postgres returns
        // numerics as strings to preserve precision.
        total: sql<string>`COALESCE(SUM(${s.customers.totalSpent}::numeric), 0)`,
        avg: sql<string>`COALESCE(AVG(${s.customers.totalSpent}::numeric), 0)`,
      })
      .from(s.customers)
      .where(where);

    return {
      type,
      labelAr: this.getSegmentLabel(type),
      descriptionAr: this.getSegmentDescription(type),
      count: cnt,
      totalSpent: String(spendResult?.total ?? '0'),
      avgOrderValue: cnt > 0 ? String(spendResult?.avg ?? '0') : '0',
    };
  }

  private buildSegmentWhere(storeId: number, type: CustomerSegmentType, thresholds: CustomerSegmentThresholds) {
    const conditions = [eq(s.customers.storeId, storeId)];

    switch (type) {
      case 'high_value':
        conditions.push(gte(s.customers.totalSpent, String(thresholds.highValueMinSpent)));
        break;
      case 'repeat_buyers':
        conditions.push(gte(s.customers.totalOrders, 2));
        break;
      case 'one_time_buyers':
        conditions.push(eq(s.customers.totalOrders, 1));
        break;
      case 'new_customers':
        conditions.push(gte(s.customers.createdAt, daysAgo(thresholds.newCustomerDays)));
        break;
      case 'inactive':
        conditions.push(lt(s.customers.updatedAt, daysAgo(thresholds.inactiveDays)));
        conditions.push(gte(s.customers.totalOrders, 1));
        break;
      case 'at_risk':
        conditions.push(lt(s.customers.updatedAt, daysAgo(thresholds.atRiskDays)));
        conditions.push(gte(s.customers.totalOrders, 1));
        conditions.push(gte(s.customers.totalSpent, '100'));
        break;
      case 'coupon_users':
        break;
      case 'cart_abandoners':
        break;
    }

    return and(...conditions);
  }

  private async getLastOrders(storeId: number, customerIds: number[]): Promise<Map<number, string>> {
    if (customerIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        customerId: s.orders.customerId,
        createdAt: s.orders.createdAt,
      })
      .from(s.orders)
      .where(and(
        eq(s.orders.storeId, storeId),
        sql`${s.orders.customerId} = ANY(ARRAY[${sql.join(customerIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
        eq(s.orders.paymentStatus, 'paid'),
      ))
      .orderBy(desc(s.orders.createdAt));

    const map = new Map<number, string>();
    for (const row of rows) {
      if (row.customerId && !map.has(row.customerId)) {
        map.set(row.customerId, String(row.createdAt));
      }
    }
    return map;
  }

  private async getLastSessions(storeId: number, customerIds: number[]): Promise<Map<number, string>> {
    if (customerIds.length === 0) return new Map();

    const rows = await this.db
      .select({
        customerId: s.marketingSessions.customerId,
        lastEventAt: s.marketingSessions.lastEventAt,
      })
      .from(s.marketingSessions)
      .where(and(
        eq(s.marketingSessions.storeId, storeId),
        sql`${s.marketingSessions.customerId} = ANY(ARRAY[${sql.join(customerIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
      ))
      .orderBy(desc(s.marketingSessions.lastEventAt));

    const map = new Map<number, string>();
    for (const row of rows) {
      if (row.customerId && !map.has(row.customerId)) {
        map.set(row.customerId, String(row.lastEventAt));
      }
    }
    return map;
  }

  private getSegmentLabel(type: CustomerSegmentType): string {
    const labels: Record<CustomerSegmentType, string> = {
      high_value: 'عملاء ذوو قيمة عالية',
      repeat_buyers: 'مشترين متكررين',
      new_customers: 'عملاء جدد',
      inactive: 'عملاء غير نشطين',
      cart_abandoners: 'مهملو السلة',
      at_risk: 'عملاء معرضون للخطر',
      one_time_buyers: 'مشترو مرة واحدة',
      coupon_users: 'مستخدمو الكوبونات',
    };
    return labels[type];
  }

  private getSegmentDescription(type: CustomerSegmentType): string {
    const descriptions: Record<CustomerSegmentType, string> = {
      high_value: 'عملاء أكملوا مشتريات بقيمة مرتفعة',
      repeat_buyers: 'عملاء أكملوا أكثر من طلب واحد',
      new_customers: 'عملاء أكملوا أول طلب خلال آخر 30 يوم',
      inactive: 'عملاء لم يشتروا منذ أكثر من 90 يوم',
      cart_abandoners: 'عملاء أضافوا منتجات للسلة لكن لم يكملوا الشراء',
      at_risk: 'عملاء كانوا نشطين لكن لم يزوروا المتجر منذ 30+ يوم',
      one_time_buyers: 'عملاء أكملوا طلب واحد فقط',
      coupon_users: 'عملاء استخدموا كوبونات خصم في مشترياتهم',
    };
    return descriptions[type];
  }
}

export async function runCustomerSegmentationSummary(storeId: number, db?: DbClient): Promise<CustomerSegmentSummary> {
  const service = new CustomerSegmentationService(db);
  return service.getSummary(storeId);
}
