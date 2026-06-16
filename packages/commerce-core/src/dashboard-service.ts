import { eq, and, count, sql, or, not, inArray } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

/**
 * DashboardService — owns the merchant dashboard aggregation
 * logic.
 *
 * Originally extracted from `apps/api/src/routes/dashboard.ts`
 * as part of Quality Pass 5, Route Migration 10/24.
 *
 * The dashboard summary is a single endpoint that aggregates
 * ~22 DB queries into the merchant's overview:
 *   - Product counts (total, active, low-stock, out-of-stock)
 *   - Order counts (total, new, paid, ready-to-ship, etc.)
 *   - Financial totals (paid orders SUM, wallet balances)
 *   - Action center counts (6 actionable work items)
 *   - Store readiness (12 checks, scored 0-100)
 *   - Recent actionable orders (top 5 by urgency)
 *
 * All KPI calculations and the readiness score formula live
 * here. The route is now pure transport.
 *
 * IMPORTANT: this is the largest single-endpoint migration.
 * The 22 queries and the urgency-case SQL are all business
 * logic that must be preserved exactly. The test in
 * tests/route-migration-10-dashboard.test.ts pins the
 * critical bits (urgency case, external filter, score
 * formula, readiness constants).
 */

// Readiness constants — must match the original route exactly
// to preserve the score formula.
const READINESS_TOTAL_CHECKS = 12;
const READINESS_MAX_ISSUES = 6;

// External marketplace sources excluded from the action
// center + recentActionableOrders (these are external,
// not merchant's own workflow).
const EXTERNAL_ORDER_SOURCES = ['salla', 'zid', 'noon', 'amazon'];

// Readiness issue thresholds
const LOW_STOCK_THRESHOLD = 5;

const REQUIRED_POLICIES = [
  { key: 'return_policy', type: 'returns', label: 'سياسة الاسترجاع' },
  { key: 'privacy_policy', type: 'privacy', label: 'سياسة الخصوصية' },
  { key: 'shipping_policy', type: 'shipping', label: 'سياسة الشحن' },
] as const;

export interface ReadinessIssue {
  key: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  actionLabel: string;
  href: string;
}

export interface RecentActionableOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  total: any;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  fulfillmentType: string | null;
  source: string;
  createdAt: Date;
}

export interface DashboardSummary {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  newOrders: number;
  totalSales: string;
  balance: string;
  availableBalance: string;
  pendingBalance: string;
  totalFees: string;
  activeShippingMethods: number;
  actionCenter: {
    newOrdersCount: number;
    readyToShipCount: number;
    readyForPickupCount: number;
    codCollectionCount: number;
    lowStockProductsCount: number;
    outOfStockProductsCount: number;
  };
  readiness: {
    score: number;
    totalChecks: number;
    passedChecks: number;
    issues: ReadinessIssue[];
  };
  recentActionableOrders: RecentActionableOrder[];
}

export class DashboardService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Get the full dashboard summary for a store. All KPIs,
   * counts, and the readiness score are computed here. The
   * shape of the returned object matches the original route's
   * response exactly (every key, every default value).
   */
  async getSummary(storeId: number): Promise<DashboardSummary> {
    // ── Top-level counts (products + orders + wallet + shipping) ──

    const products = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(eq(s.products.storeId, storeId));
    const activeProducts = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(eq(s.products.storeId, storeId), eq(s.products.status, 'active')));
    const lowStockProducts = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        eq(s.products.trackInventory, true),
        sql`${s.products.stockQuantity} <= ${LOW_STOCK_THRESHOLD}`,
      ));

    const orders = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(eq(s.orders.storeId, storeId));
    const newOrders = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.status, 'pending_payment')));

    const paidOrdersTotal = await this.db
      .select({ total: sql<string>`COALESCE(SUM(${s.orders.total}), 0)` })
      .from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.paymentStatus, 'paid')));

    const wallet = await this.db
      .select()
      .from(s.walletAccounts)
      .where(eq(s.walletAccounts.storeId, storeId))
      .limit(1);
    const account = wallet[0];

    const shippingMethods = await this.db
      .select({ total: count() })
      .from(s.shippingMethods)
      .where(and(eq(s.shippingMethods.storeId, storeId), eq(s.shippingMethods.isActive, true)));

    // ── Action Center counts ─────────────────────────────────────

    const storeFilter = eq(s.orders.storeId, storeId);
    const notExternal = not(inArray(s.orders.source, EXTERNAL_ORDER_SOURCES));

    const newOrdersCount = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(and(
        storeFilter,
        or(eq(s.orders.status, 'pending_payment'), eq(s.orders.status, 'confirmed')),
      ));
    const readyToShipCount = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(and(
        storeFilter,
        eq(s.orders.status, 'ready_to_ship'),
        not(eq(s.orders.fulfillmentType, 'local_pickup')),
        notExternal,
      ));
    const readyForPickupCount = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(and(
        storeFilter,
        eq(s.orders.status, 'ready_for_pickup'),
        eq(s.orders.fulfillmentType, 'local_pickup'),
        notExternal,
      ));
    const codCollectionCount = await this.db
      .select({ total: count() })
      .from(s.orders)
      .where(and(
        storeFilter,
        eq(s.orders.paymentMethod, 'cash_on_delivery'),
        eq(s.orders.paymentStatus, 'pending'),
        or(eq(s.orders.status, 'delivered'), eq(s.orders.status, 'picked_up')),
      ));
    const outOfStockCount = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        eq(s.products.trackInventory, true),
        sql`${s.products.stockQuantity} <= 0`,
      ));
    const lowStockOnlyCount = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        eq(s.products.trackInventory, true),
        sql`${s.products.stockQuantity} > 0`,
        sql`${s.products.stockQuantity} <= ${LOW_STOCK_THRESHOLD}`,
      ));

    // ── Recent Actionable Orders (top 5 by urgency) ───────────

    const urgencyCase = sql`CASE
      WHEN ${s.orders.status} = 'delivered' AND ${s.orders.paymentMethod} = 'cash_on_delivery' AND ${s.orders.paymentStatus} = 'pending' THEN 1
      WHEN ${s.orders.status} = 'picked_up' AND ${s.orders.paymentMethod} = 'cash_on_delivery' AND ${s.orders.paymentStatus} = 'pending' THEN 2
      WHEN ${s.orders.status} = 'ready_to_ship' AND ${s.orders.fulfillmentType} != 'local_pickup' THEN 3
      WHEN ${s.orders.status} = 'ready_for_pickup' AND ${s.orders.fulfillmentType} = 'local_pickup' THEN 4
      WHEN ${s.orders.status} = 'pending_payment' THEN 5
      WHEN ${s.orders.status} = 'confirmed' THEN 6
      WHEN ${s.orders.status} = 'processing' THEN 7
      WHEN ${s.orders.status} = 'shipped' THEN 8
      ELSE 99
    END`;

    const actionableOrders = await this.db
      .select({
        id: s.orders.id,
        orderNumber: s.orders.orderNumber,
        customerName: s.orders.customerName,
        total: s.orders.total,
        status: s.orders.status,
        paymentStatus: s.orders.paymentStatus,
        paymentMethod: s.orders.paymentMethod,
        fulfillmentType: s.orders.fulfillmentType,
        source: s.orders.source,
        createdAt: s.orders.createdAt,
      })
      .from(s.orders)
      .where(and(
        storeFilter,
        notExternal,
        or(
          inArray(s.orders.status, ['pending_payment', 'confirmed', 'processing', 'ready_to_ship', 'shipped', 'ready_for_pickup']),
          and(
            inArray(s.orders.status, ['delivered', 'picked_up']),
            eq(s.orders.paymentMethod, 'cash_on_delivery'),
            eq(s.orders.paymentStatus, 'pending'),
          ),
        ),
      ))
      .orderBy(sql`${urgencyCase} ASC, ${s.orders.createdAt} DESC`)
      .limit(5);

    // ── Store Readiness Checks (12 issues) ─────────────────────

    const [store] = await this.db
      .select()
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);

    const [activePaymentProviders] = await this.db
      .select({ total: count() })
      .from(s.merchantPaymentProviderSettings)
      .where(and(
        eq(s.merchantPaymentProviderSettings.storeId, storeId),
        eq(s.merchantPaymentProviderSettings.enabled, true),
      ));
    const [activePickupLocations] = await this.db
      .select({ total: count() })
      .from(s.pickupLocations)
      .where(and(
        eq(s.pickupLocations.storeId, storeId),
        eq(s.pickupLocations.isActive, true),
      ));
    const [activeShippingMethodsCount] = await this.db
      .select({ total: count() })
      .from(s.shippingMethods)
      .where(and(
        eq(s.shippingMethods.storeId, storeId),
        eq(s.shippingMethods.isActive, true),
      ));
    const [draftProductsCnt] = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        eq(s.products.status, 'draft'),
      ));
    const productsWithoutImagesRow = await this.db
      .select({ total: count() })
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        eq(s.products.status, 'active'),
        sql`NOT EXISTS (SELECT 1 FROM ${s.productImages} WHERE ${s.productImages.productId} = ${s.products.id})`,
      ));
    const productsWithoutImagesCount = productsWithoutImagesRow[0]?.total ?? 0;

    const [kycProfile] = await this.db
      .select({ status: s.kycProfiles.status })
      .from(s.kycProfiles)
      .where(eq(s.kycProfiles.storeId, storeId))
      .limit(1);

    const policies = await this.db
      .select({ type: s.storePolicies.type, isPublished: s.storePolicies.isPublished })
      .from(s.storePolicies)
      .where(and(
        eq(s.storePolicies.storeId, storeId),
        eq(s.storePolicies.isPublished, true),
      ));
    const publishedPolicyTypes = new Set(policies.map((p) => p.type));

    // ── Build issues (12 checks) ───────────────────────────────

    const issues: ReadinessIssue[] = [];

    // 1. Payment readiness
    if (Number(activePaymentProviders.total) === 0) {
      issues.push({
        key: 'no_payment_provider',
        severity: 'critical',
        title: 'بوابة الدفع غير مفعلة',
        description: 'لا توجد طريقة دفع مفعلة في المتجر. الطلبات لن تتمكن من إتمام الدفع.',
        actionLabel: 'إعداد الدفع',
        href: '/settings?tab=payment',
      });
    }
    // 2. Shipping readiness
    if (Number(activeShippingMethodsCount.total) === 0) {
      issues.push({
        key: 'no_shipping_method',
        severity: 'critical',
        title: 'لا توجد طريقة شحن مفعلة',
        description: 'يجب تفعيل طريقة شحن واحدة على الأقل ليتمكن العملاء من الطلب.',
        actionLabel: 'إعداد الشحن',
        href: '/shipping',
      });
    }
    // 3. Pickup readiness
    if (Number(activePickupLocations.total) === 0) {
      issues.push({
        key: 'no_pickup_location',
        severity: 'warning',
        title: 'لا توجد نقاط استلام',
        description: 'إذا كنت تقدم خيار الاستلام من الفرع، أضف نقطة استلام واحدة على الأقل.',
        actionLabel: 'إضافة نقطة استلام',
        href: '/settings?tab=pickup',
      });
    }
    // 4. KYC readiness
    if (!kycProfile || kycProfile.status !== 'approved') {
      issues.push({
        key: 'kyc_not_approved',
        severity: 'warning',
        title: 'بيانات الامتثال غير مكتملة',
        description: 'بيانات التاجر تحتاج اكتمال أو اعتماد لتشغيل المعاملات المالية.',
        actionLabel: 'إكمال البيانات',
        href: '/settings?tab=compliance',
      });
    }
    // 5. Products without images
    if (Number(productsWithoutImagesCount) > 0) {
      issues.push({
        key: 'products_without_images',
        severity: 'warning',
        title: `${Number(productsWithoutImagesCount)} منتجات بدون صور`,
        description: 'المنتجات النشطة بدون صور تقلل ثقة العميل وتضعف المبيعات.',
        actionLabel: 'عرض المنتجات',
        href: '/products',
      });
    }
    // 6. Out of stock
    const outOfStockNum = Number(outOfStockCount[0]?.total ?? 0);
    if (outOfStockNum > 0) {
      issues.push({
        key: 'out_of_stock_products',
        severity: 'warning',
        title: `${outOfStockNum} منتجات نفدت من المخزون`,
        description: 'منتجات نفدت من المخزون وتحتاج توريد لتتمكن من البيع.',
        actionLabel: 'عرض المنتجات',
        href: '/products',
      });
    }
    // 7. Draft products
    const draftNum = Number(draftProductsCnt.total);
    if (draftNum > 0) {
      issues.push({
        key: 'draft_products',
        severity: 'info',
        title: `${draftNum} منتجات مسودة`,
        description: 'منتجات لم تنشر بعد. أكمل بياناتها وانشرها للبيع.',
        actionLabel: 'عرض المنتجات',
        href: '/products',
      });
    }
    // 8-10. Missing policies (one issue per missing policy)
    for (const pol of REQUIRED_POLICIES) {
      if (!publishedPolicyTypes.has(pol.type)) {
        issues.push({
          key: `missing_${pol.key}`,
          severity: 'warning',
          title: `${pol.label} غير منشورة`,
          description: 'سياسات المتجر مهمة لثقة العميل والامتثال القانوني.',
          actionLabel: 'إعداد السياسات',
          href: '/settings?tab=policies',
        });
      }
    }
    // 11. Store name
    if (!store?.name) {
      issues.push({
        key: 'store_name',
        severity: 'info',
        title: 'اسم المتجر غير محدد',
        description: 'اسم المتجر يظهر للعملاء ويساعد في بناء العلامة التجارية.',
        actionLabel: 'الإعدادات',
        href: '/settings',
      });
    }
    // 12. No active products
    const activeNum = Number(activeProducts[0].total);
    if (activeNum === 0) {
      issues.push({
        key: 'no_active_products',
        severity: 'critical',
        title: 'لا توجد منتجات نشطة',
        description: 'المتجر لا يحتوي على أي منتجات منشورة للبيع.',
        actionLabel: 'إضافة منتجات',
        href: '/products',
      });
    }

    // Score: preserved exactly. passedChecks = READINESS_TOTAL_CHECKS - issues.length.
    // Note: the original route has a known minor quirk (if 2+
    // conditions of the same check fire, passedChecks goes
    // negative). We preserve that behavior for byte-identical
    // responses.
    const totalChecks = READINESS_TOTAL_CHECKS;
    const maxIssues = READINESS_MAX_ISSUES;
    const allIssues = issues.slice(0, maxIssues);
    const passedChecks = totalChecks - issues.length;
    const score = Math.round((passedChecks / totalChecks) * 100);

    return {
      totalProducts: Number(products[0].total),
      activeProducts: Number(activeProducts[0].total),
      lowStockProducts: Number(lowStockProducts[0].total),
      totalOrders: Number(orders[0].total),
      newOrders: Number(newOrders[0].total),
      totalSales: paidOrdersTotal[0]?.total ?? '0',
      balance: account?.balance ?? '0',
      availableBalance: account?.availableBalance ?? '0',
      pendingBalance: account?.pendingBalance ?? '0',
      totalFees: account?.totalFees ?? '0',
      activeShippingMethods: Number(shippingMethods[0].total),
      actionCenter: {
        newOrdersCount: Number(newOrdersCount[0].total),
        readyToShipCount: Number(readyToShipCount[0].total),
        readyForPickupCount: Number(readyForPickupCount[0].total),
        codCollectionCount: Number(codCollectionCount[0].total),
        lowStockProductsCount: Number(lowStockOnlyCount[0].total),
        outOfStockProductsCount: Number(outOfStockCount[0].total),
      },
      readiness: {
        score,
        totalChecks,
        passedChecks,
        issues: allIssues,
      },
      recentActionableOrders: actionableOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        total: o.total,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        fulfillmentType: o.fulfillmentType,
        source: o.source,
        createdAt: o.createdAt,
      })),
    };
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const dashboardService = new DashboardService();
