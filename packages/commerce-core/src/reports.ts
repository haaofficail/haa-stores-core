import { eq, and, count, sql, gte, lte, desc, sum } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = rows.map(row =>
    headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(','),
  );
  return [headers.join(','), ...lines].join('\n');
}

export class ReportsService {
  constructor(private db: DbClient = createDbClient()) {}

  private orderDateConditions(storeId: number, dateFrom?: string, dateTo?: string) {
    const conditions = [eq(s.orders.storeId, storeId)];
    if (dateFrom) conditions.push(gte(s.orders.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, end));
    }
    return conditions;
  }

  async deepReport(storeId: number, dateFrom?: string, dateTo?: string) {
    const [
      financialBreakdown,
      orderDetails,
      productPerformance,
      settlementReconciliation,
      customerInsights,
      refundsAndDisputes,
      codAndShipping,
    ] = await Promise.all([
      this.financialBreakdown(storeId, dateFrom, dateTo),
      this.orderDetails(storeId, dateFrom, dateTo),
      this.productPerformance(storeId, dateFrom, dateTo),
      this.settlementReconciliation(storeId, dateFrom, dateTo),
      this.customerInsights(storeId, dateFrom, dateTo),
      this.refundsAndDisputes(storeId, dateFrom, dateTo),
      this.codAndShipping(storeId, dateFrom, dateTo),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      financialBreakdown,
      orderDetails,
      productPerformance,
      settlementReconciliation,
      customerInsights,
      refundsAndDisputes,
      codAndShipping,
    };
  }

  async exportSalesReport(storeId: number, dateFrom?: string, dateTo?: string): Promise<string> {
    const summary = await this.salesSummary(storeId, dateFrom, dateTo);
    const products = await this.topProducts(storeId, 100, dateFrom, dateTo);
    const ordersByStatus = await this.ordersByStatus(storeId, dateFrom, dateTo);
    const cities = await this.salesByCity(storeId, dateFrom, dateTo);
    const lowStockItems = await this.lowStock(storeId);
    const wallet = await this.walletSummary(storeId, dateFrom, dateTo);

    const sections: string[] = [];

    sections.push('--- ملخص المبيعات ---');
    sections.push(toCsv([
      { البيان: 'إجمالي المبيعات', القيمة: `${Number(summary.totalSales).toFixed(2)} ر.س` },
      { البيان: 'إجمالي الطلبات', القيمة: String(summary.totalOrders) },
      { البيان: 'متوسط قيمة الطلب', القيمة: `${Number(summary.averageOrderValue).toFixed(2)} ر.س` },
      { البيان: 'صافي المحفظة', القيمة: `${Number(wallet.netBalance).toFixed(2)} ر.س` },
    ]));

    sections.push('');
    sections.push('--- أفضل المنتجات مبيعاً ---');
    sections.push(toCsv(products.map(p => ({
      'اسم المنتج': p.name,
      SKU: p.sku || '',
      الكمية: String(p.totalQuantity),
      الإيرادات: `${Number(p.totalRevenue).toFixed(2)} ر.س`,
    }))));

    sections.push('');
    sections.push('--- الطلبات حسب الحالة ---');
    sections.push(toCsv(ordersByStatus.map(o => ({
      الحالة: o.status,
      العدد: String(o.count),
    }))));

    sections.push('');
    sections.push('--- المبيعات حسب المدينة ---');
    sections.push(toCsv(cities.map(c => ({
      المدينة: c.city || 'غير محدد',
      الطلبات: String(c.orders),
      المبيعات: `${Number(c.sales).toFixed(2)} ر.س`,
    }))));

    sections.push('');
    sections.push('--- المنتجات منخفضة المخزون ---');
    sections.push(toCsv(lowStockItems.map(p => ({
      'اسم المنتج': p.name,
      SKU: p.sku || '',
      المخزون: String(p.stockQuantity),
    }))));

    const deep = await this.deepReport(storeId, dateFrom, dateTo);

    sections.push('');
    sections.push('--- تفصيل مالي محاسبي ---');
    sections.push(toCsv([{
      'إجمالي الطلبات': deep.financialBreakdown.grossSales,
      'المبيعات الصافية': deep.financialBreakdown.netSales,
      الضرائب: deep.financialBreakdown.taxAmount,
      الشحن: deep.financialBreakdown.shippingRevenue,
      الخصومات: deep.financialBreakdown.discounts,
      الاستردادات: deep.financialBreakdown.refunds,
      'رسوم الدفع': deep.financialBreakdown.paymentFees,
      'رسوم المنصة': deep.financialBreakdown.platformFees,
      'صافي المحفظة': deep.financialBreakdown.walletNet,
    }]));

    sections.push('');
    sections.push('--- تفاصيل الطلبات ---');
    sections.push(toCsv(deep.orderDetails.map(o => ({
      'رقم الطلب': o.orderNumber,
      التاريخ: o.createdAt,
      الحالة: o.status,
      الدفع: o.paymentStatus,
      'طريقة الدفع': o.paymentMethod,
      العميل: o.customerName,
      المدينة: o.city,
      الإجمالي: o.total,
      الضريبة: o.taxAmount,
      الشحن: o.shippingCost,
      الخصم: o.couponDiscount,
    }))));

    sections.push('');
    sections.push('--- أداء المنتجات التفصيلي ---');
    sections.push(toCsv(deep.productPerformance.map(p => ({
      المنتج: p.name,
      SKU: p.sku,
      الكمية: p.quantitySold,
      الإيرادات: p.revenue,
      الطلبات: p.orderCount,
      المخزون: p.stockQuantity,
      التصنيف: p.categoryName,
    }))));

    sections.push('');
    sections.push('--- التسويات والمطابقة ---');
    sections.push(toCsv(deep.settlementReconciliation.map(r => ({
      المرجع: r.providerTransactionId,
      الطلب: r.orderNumber,
      الحالة: r.reconciliationStatus,
      المبلغ: r.amount,
      'رسوم البوابة': r.gatewayFees,
      'رسوم المنصة': r.platformFees,
      'مستحق التاجر': r.merchantPayable,
      الدفعة: r.settlementBatchId ?? '',
    }))));

    sections.push('');
    sections.push('--- العملاء ---');
    sections.push(toCsv(deep.customerInsights.map(c => ({
      العميل: c.name,
      الطلبات: c.orderCount,
      الإنفاق: c.totalSpent,
      'متوسط الطلب': c.averageOrderValue,
      'آخر طلب': c.lastOrderAt,
    }))));

    sections.push('');
    sections.push('--- الاستردادات والنزاعات ---');
    sections.push(toCsv(deep.refundsAndDisputes.map(r => ({
      النوع: r.type,
      الحالة: r.status,
      المبلغ: r.amount,
      الطلب: r.orderNumber,
      المرجع: r.providerReference,
      التاريخ: r.createdAt,
    }))));

    sections.push('');
    sections.push('--- الدفع عند الاستلام والشحن ---');
    sections.push(toCsv([{
      'طلبات COD': deep.codAndShipping.codOrders,
      'COD محصل': deep.codAndShipping.codCollected,
      'COD معلق': deep.codAndShipping.codPending,
      'إيراد الشحن': deep.codAndShipping.shippingRevenue,
      'تكلفة الشحن': deep.codAndShipping.shippingCost,
      'هامش الشحن': deep.codAndShipping.shippingMargin,
      'الشحنات المفتوحة': deep.codAndShipping.openShipments,
      'الشحنات المسلمة': deep.codAndShipping.deliveredShipments,
    }]));

    return sections.join('\n');
  }

  async financialBreakdown(storeId: number, dateFrom?: string, dateTo?: string) {
    const conditions = this.orderDateConditions(storeId, dateFrom, dateTo);
    const activeConditions = [...conditions, sql`${s.orders.status} NOT IN ('cancelled', 'refunded')`];

    const [ordersAgg] = await this.db.select({
      grossSales: sql<string>`COALESCE(SUM(${s.orders.total}), 0)`,
      subtotal: sql<string>`COALESCE(SUM(${s.orders.subtotal}), 0)`,
      taxAmount: sql<string>`COALESCE(SUM(${s.orders.taxAmount}), 0)`,
      shippingRevenue: sql<string>`COALESCE(SUM(${s.orders.shippingCost}), 0)`,
      discounts: sql<string>`COALESCE(SUM(${s.orders.couponDiscount}), 0)`,
      orderCount: count(),
    }).from(s.orders).where(and(...activeConditions));

    const wallet = await this.walletSummary(storeId, dateFrom, dateTo);

    const refunds = await this.db.select({
      total: sql<string>`COALESCE(SUM(${s.paymentTransactions.amount}), 0)`,
    }).from(s.paymentTransactions)
      .innerJoin(s.payments, eq(s.paymentTransactions.paymentId, s.payments.id))
      .where(and(
        eq(s.payments.storeId, storeId),
        eq(s.paymentTransactions.type, 'refund'),
      ));

    return {
      grossSales: ordersAgg?.grossSales ?? '0',
      subtotal: ordersAgg?.subtotal ?? '0',
      netSales: (Number(ordersAgg?.grossSales ?? 0) - Number(refunds[0]?.total ?? 0)).toFixed(2),
      taxAmount: ordersAgg?.taxAmount ?? '0',
      shippingRevenue: ordersAgg?.shippingRevenue ?? '0',
      discounts: ordersAgg?.discounts ?? '0',
      refunds: refunds[0]?.total ?? '0',
      paymentFees: wallet.paymentFees ?? '0',
      platformFees: wallet.platformFees ?? '0',
      walletNet: wallet.netBalance,
      orderCount: Number(ordersAgg?.orderCount ?? 0),
    };
  }

  async orderDetails(storeId: number, dateFrom?: string, dateTo?: string, limit = 200) {
    const rows = await this.db.select({
      id: s.orders.id,
      orderNumber: s.orders.orderNumber,
      status: s.orders.status,
      paymentStatus: s.orders.paymentStatus,
      fulfillmentStatus: s.orders.fulfillmentStatus,
      paymentMethod: s.orders.paymentMethod,
      customerName: s.orders.customerName,
      city: sql<string>`${s.orders.shippingAddress}->>'city'`,
      subtotal: s.orders.subtotal,
      taxAmount: s.orders.taxAmount,
      shippingCost: s.orders.shippingCost,
      couponCode: s.orders.couponCode,
      couponDiscount: s.orders.couponDiscount,
      total: s.orders.total,
      paidAmount: s.orders.paidAmount,
      createdAt: s.orders.createdAt,
    }).from(s.orders)
      .where(and(...this.orderDateConditions(storeId, dateFrom, dateTo)))
      .orderBy(desc(s.orders.createdAt))
      .limit(limit);

    return rows.map(row => ({
      ...row,
      city: row.city ?? '',
      paymentMethod: row.paymentMethod ?? '',
      shippingCost: row.shippingCost ?? '0',
      couponCode: row.couponCode ?? '',
      couponDiscount: row.couponDiscount ?? '0',
      taxAmount: row.taxAmount ?? '0',
      paidAmount: row.paidAmount ?? '0',
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async productPerformance(storeId: number, dateFrom?: string, dateTo?: string, limit = 100) {
    const conditions = this.orderDateConditions(storeId, dateFrom, dateTo);
    const rows = await this.db.select({
      productId: s.orderItems.productId,
      name: s.orderItems.name,
      sku: s.orderItems.sku,
      categoryName: s.categories.name,
      quantitySold: sql<number>`CAST(COALESCE(SUM(${s.orderItems.quantity}), 0) AS INTEGER)`,
      revenue: sql<string>`COALESCE(SUM(${s.orderItems.totalPrice}), 0)`,
      orderCount: sql<number>`CAST(COUNT(DISTINCT ${s.orderItems.orderId}) AS INTEGER)`,
      stockQuantity: s.products.stockQuantity,
    }).from(s.orderItems)
      .innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
      .leftJoin(s.products, eq(s.orderItems.productId, s.products.id))
      .leftJoin(s.productCategories, eq(s.products.id, s.productCategories.productId))
      .leftJoin(s.categories, eq(s.productCategories.categoryId, s.categories.id))
      .where(and(...conditions, sql`${s.orders.status} NOT IN ('cancelled', 'refunded')`))
      .groupBy(s.orderItems.productId, s.orderItems.name, s.orderItems.sku, s.categories.name, s.products.stockQuantity)
      .orderBy(desc(sql`SUM(${s.orderItems.totalPrice})`))
      .limit(limit);

    return rows.map(row => ({
      productId: row.productId,
      name: row.name,
      sku: row.sku ?? '',
      categoryName: row.categoryName ?? '',
      quantitySold: Number(row.quantitySold),
      revenue: row.revenue ?? '0',
      orderCount: Number(row.orderCount),
      stockQuantity: row.stockQuantity ?? 0,
    }));
  }

  async settlementReconciliation(storeId: number, dateFrom?: string, dateTo?: string, limit = 200) {
    const conditions = [eq(s.paymentProviderTransactions.storeId, storeId)];
    if (dateFrom) conditions.push(gte(s.paymentProviderTransactions.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.paymentProviderTransactions.createdAt, end));
    }

    const rows = await this.db.select({
      id: s.paymentProviderTransactions.id,
      provider: s.paymentProviderTransactions.provider,
      providerTransactionId: s.paymentProviderTransactions.providerTransactionId,
      settlementBatchId: s.paymentProviderTransactions.settlementBatchId,
      orderNumber: s.paymentProviderTransactions.orderNumber,
      amount: s.paymentProviderTransactions.amount,
      gatewayFees: s.paymentProviderTransactions.gatewayFees,
      platformFees: s.paymentProviderTransactions.platformFees,
      merchantPayable: s.paymentProviderTransactions.merchantPayable,
      status: s.paymentProviderTransactions.status,
      reconciliationStatus: s.paymentProviderTransactions.reconciliationStatus,
      createdAt: s.paymentProviderTransactions.createdAt,
    }).from(s.paymentProviderTransactions)
      .where(and(...conditions))
      .orderBy(desc(s.paymentProviderTransactions.createdAt))
      .limit(limit);

    return rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  async customerInsights(storeId: number, dateFrom?: string, dateTo?: string, limit = 100) {
    const rows = await this.db.select({
      customerId: s.orders.customerId,
      name: s.orders.customerName,
      orderCount: sql<number>`CAST(COUNT(${s.orders.id}) AS INTEGER)`,
      totalSpent: sql<string>`COALESCE(SUM(${s.orders.total}), 0)`,
      averageOrderValue: sql<string>`COALESCE(AVG(${s.orders.total}::numeric), 0)`,
      lastOrderAt: sql<string>`MAX(${s.orders.createdAt})`,
    }).from(s.orders)
      .where(and(...this.orderDateConditions(storeId, dateFrom, dateTo), sql`${s.orders.status} NOT IN ('cancelled', 'refunded')`))
      .groupBy(s.orders.customerId, s.orders.customerName)
      .orderBy(desc(sql`SUM(${s.orders.total})`))
      .limit(limit);

    return rows.map(row => ({
      customerId: row.customerId,
      name: row.name,
      orderCount: Number(row.orderCount),
      totalSpent: row.totalSpent ?? '0',
      averageOrderValue: row.averageOrderValue ?? '0',
      lastOrderAt: row.lastOrderAt,
    }));
  }

  async refundsAndDisputes(storeId: number, dateFrom?: string, dateTo?: string, limit = 100) {
    const conditions = [
      eq(s.payments.storeId, storeId),
      sql`${s.paymentTransactions.type} IN ('refund', 'chargeback')`,
    ];
    if (dateFrom) conditions.push(gte(s.paymentTransactions.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.paymentTransactions.createdAt, end));
    }

    const rows = await this.db.select({
      id: s.paymentTransactions.id,
      type: s.paymentTransactions.type,
      status: s.paymentTransactions.status,
      amount: s.paymentTransactions.amount,
      providerReference: s.paymentTransactions.providerReference,
      orderNumber: s.orders.orderNumber,
      createdAt: s.paymentTransactions.createdAt,
    }).from(s.paymentTransactions)
      .innerJoin(s.payments, eq(s.paymentTransactions.paymentId, s.payments.id))
      .leftJoin(s.orders, eq(s.payments.orderId, s.orders.id))
      .where(and(...conditions))
      .orderBy(desc(s.paymentTransactions.createdAt))
      .limit(limit);

    return rows.map(row => ({
      ...row,
      providerReference: row.providerReference ?? '',
      orderNumber: row.orderNumber ?? '',
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async codAndShipping(storeId: number, dateFrom?: string, dateTo?: string) {
    const orderConditions = this.orderDateConditions(storeId, dateFrom, dateTo);
    const [cod] = await this.db.select({
      codOrders: count(),
      codCollected: sql<string>`COALESCE(SUM(CASE WHEN ${s.orders.paymentStatus} = 'paid' THEN ${s.orders.total}::numeric ELSE 0 END), 0)`,
      codPending: sql<string>`COALESCE(SUM(CASE WHEN ${s.orders.paymentStatus} <> 'paid' THEN ${s.orders.total}::numeric ELSE 0 END), 0)`,
    }).from(s.orders)
      .where(and(...orderConditions, eq(s.orders.paymentMethod, 'cash_on_delivery')));

    const shipmentConditions = [eq(s.shipments.storeId, storeId)];
    if (dateFrom) shipmentConditions.push(gte(s.shipments.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      shipmentConditions.push(lte(s.shipments.createdAt, end));
    }

    const [shipping] = await this.db.select({
      shippingCost: sql<string>`COALESCE(SUM(${s.shipments.shippingCost}), 0)`,
      merchantCost: sql<string>`COALESCE(SUM(${s.shipments.merchantCost}), 0)`,
      deliveredShipments: sql<number>`CAST(SUM(CASE WHEN ${s.shipments.status} = 'delivered' THEN 1 ELSE 0 END) AS INTEGER)`,
      openShipments: sql<number>`CAST(SUM(CASE WHEN ${s.shipments.status} NOT IN ('delivered', 'cancelled', 'returned') THEN 1 ELSE 0 END) AS INTEGER)`,
    }).from(s.shipments)
      .where(and(...shipmentConditions));

    const [shippingRevenue] = await this.db.select({
      total: sql<string>`COALESCE(SUM(${s.orders.shippingCost}), 0)`,
    }).from(s.orders).where(and(...orderConditions));

    return {
      codOrders: Number(cod?.codOrders ?? 0),
      codCollected: cod?.codCollected ?? '0',
      codPending: cod?.codPending ?? '0',
      shippingRevenue: shippingRevenue?.total ?? '0',
      shippingCost: shipping?.shippingCost ?? '0',
      merchantShippingCost: shipping?.merchantCost ?? '0',
      shippingMargin: (Number(shippingRevenue?.total ?? 0) - Number(shipping?.merchantCost ?? shipping?.shippingCost ?? 0)).toFixed(2),
      deliveredShipments: Number(shipping?.deliveredShipments ?? 0),
      openShipments: Number(shipping?.openShipments ?? 0),
    };
  }

  async salesSummary(storeId: number, dateFrom?: string, dateTo?: string) {
    const conditions = [
      eq(s.orders.storeId, storeId),
      sql`${s.orders.status} NOT IN ('cancelled', 'refunded')`,
    ];
    if (dateFrom) conditions.push(gte(s.orders.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, end));
    }

    const where = and(...conditions);

    const [aggregate] = await this.db.select({
      totalSales: sum(s.orders.total),
      totalOrders: count(),
      averageOrderValue: sql<string>`COALESCE(AVG(${s.orders.total}::numeric), 0)`,
    }).from(s.orders).where(where);

    const salesByDay = await this.db.select({
      date: sql<string>`DATE(${s.orders.createdAt})`,
      sales: sum(s.orders.total),
      orders: count(),
    }).from(s.orders).where(where)
      .groupBy(sql`DATE(${s.orders.createdAt})`)
      .orderBy(sql`DATE(${s.orders.createdAt})`);

    return {
      totalSales: aggregate?.totalSales ?? '0',
      totalOrders: Number(aggregate?.totalOrders ?? 0),
      averageOrderValue: aggregate?.averageOrderValue ?? '0',
      salesByDay: salesByDay.map(d => ({
        date: d.date,
        sales: d.sales ?? '0',
        orders: Number(d.orders),
      })),
    };
  }

  async topProducts(storeId: number, limit = 10, dateFrom?: string, dateTo?: string) {
    const conditions = [
      eq(s.orders.storeId, storeId),
      sql`${s.orders.status} NOT IN ('cancelled', 'refunded')`,
    ];
    if (dateFrom) conditions.push(gte(s.orders.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, end));
    }

    const items = await this.db.select({
      productId: s.orderItems.productId,
      name: s.orderItems.name,
      sku: s.orderItems.sku,
      totalQuantity: sql<number>`CAST(SUM(${s.orderItems.quantity}) AS INTEGER)`,
      totalRevenue: sum(s.orderItems.totalPrice),
    }).from(s.orderItems)
      .innerJoin(s.orders, eq(s.orderItems.orderId, s.orders.id))
      .where(and(...conditions))
      .groupBy(s.orderItems.productId, s.orderItems.name, s.orderItems.sku)
      .orderBy(desc(sql`SUM(${s.orderItems.quantity})`))
      .limit(limit);

    return items.map(i => ({
      productId: i.productId,
      name: i.name,
      sku: i.sku,
      totalQuantity: i.totalQuantity,
      totalRevenue: i.totalRevenue ?? '0',
    }));
  }

  async ordersByStatus(storeId: number, dateFrom?: string, dateTo?: string) {
    const conditions = [eq(s.orders.storeId, storeId)];
    if (dateFrom) conditions.push(gte(s.orders.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, end));
    }

    const result = await this.db.select({
      status: s.orders.status,
      count: count(),
    }).from(s.orders)
      .where(and(...conditions))
      .groupBy(s.orders.status)
      .orderBy(s.orders.status);

    return result.map(r => ({ status: r.status, count: Number(r.count) }));
  }

  async salesByCity(storeId: number, dateFrom?: string, dateTo?: string) {
    const conditions = [
      eq(s.orders.storeId, storeId),
      sql`${s.orders.status} NOT IN ('cancelled', 'refunded')`,
      sql`${s.orders.shippingAddress} IS NOT NULL`,
    ];
    if (dateFrom) conditions.push(gte(s.orders.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, end));
    }

    const result = await this.db.select({
      city: sql<string>`${s.orders.shippingAddress}->>'city'`,
      sales: sum(s.orders.total),
      orders: count(),
    }).from(s.orders)
      .where(and(...conditions))
      .groupBy(sql`${s.orders.shippingAddress}->>'city'`)
      .orderBy(desc(sql`SUM(${s.orders.total})`));

    return result.map(r => ({
      city: r.city,
      sales: r.sales ?? '0',
      orders: Number(r.orders),
    }));
  }

  async lowStock(storeId: number, threshold = 5) {
    const items = await this.db.select()
      .from(s.products)
      .where(and(
        eq(s.products.storeId, storeId),
        sql`${s.products.stockQuantity} <= ${threshold}`,
      ))
      .orderBy(s.products.stockQuantity);

    return items;
  }

  async walletSummary(storeId: number, dateFrom?: string, dateTo?: string) {
    const conditions = [eq(s.walletEntries.storeId, storeId)];
    if (dateFrom) conditions.push(gte(s.walletEntries.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.walletEntries.createdAt, end));
    }

    const byDirection = await this.db.select({
      direction: s.walletEntries.direction,
      total: sum(s.walletEntries.amount),
    }).from(s.walletEntries)
      .where(and(...conditions))
      .groupBy(s.walletEntries.direction);

    const [feeResult] = await this.db.select({
      total: sum(s.walletEntries.amount),
    }).from(s.walletEntries)
      .where(and(...conditions, sql`${s.walletEntries.type} IN ('payment_fee', 'platform_fee', 'shipping_fee')`));
    const [paymentFeesResult] = await this.db.select({
      total: sum(s.walletEntries.amount),
    }).from(s.walletEntries)
      .where(and(...conditions, eq(s.walletEntries.type, 'payment_fee')));
    const [platformFeesResult] = await this.db.select({
      total: sum(s.walletEntries.amount),
    }).from(s.walletEntries)
      .where(and(...conditions, eq(s.walletEntries.type, 'platform_fee')));

    let totalSales = '0';
    let totalOut = '0';
    for (const row of byDirection) {
      if (row.direction === 'credit') totalSales = row.total ?? '0';
      if (row.direction === 'debit') totalOut = row.total ?? '0';
    }

    const totalFees = feeResult?.total ?? '0';
    const netBalance = (Number(totalSales) - Number(totalOut)).toFixed(2);

    return {
      totalSales,
      totalFees,
      paymentFees: paymentFeesResult?.total ?? '0',
      platformFees: platformFeesResult?.total ?? '0',
      netBalance,
    };
  }
}
