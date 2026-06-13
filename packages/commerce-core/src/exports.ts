import { eq, and, gte, lte } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';

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

export class ExportsService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
  ) {}

  async exportProducts(storeId: number): Promise<string> {
    const products = await this.db.select({
      id: s.products.id,
      name: s.products.name,
      slug: s.products.slug,
      description: s.products.description,
      status: s.products.status,
      type: s.products.type,
      price: s.products.price,
      compareAtPrice: s.products.compareAtPrice,
      cost: s.products.cost,
      sku: s.products.sku,
      barcode: s.products.barcode,
      stockQuantity: s.products.stockQuantity,
      trackInventory: s.products.trackInventory,
      weightGrams: s.products.weightGrams,
      requiresShipping: s.products.requiresShipping,
      isFragile: s.products.isFragile,
      createdAt: s.products.createdAt,
      updatedAt: s.products.updatedAt,
    }).from(s.products)
      .where(eq(s.products.storeId, storeId))
      .orderBy(s.products.id);

    return toCsv(products as Record<string, unknown>[]);
  }

  async exportOrders(
    storeId: number,
    opts?: { status?: string; dateFrom?: string; dateTo?: string },
  ): Promise<string> {
    const conditions = [eq(s.orders.storeId, storeId)];
    if (opts?.status) conditions.push(eq(s.orders.status, opts.status));
    if (opts?.dateFrom) conditions.push(gte(s.orders.createdAt, new Date(opts.dateFrom)));
    if (opts?.dateTo) {
      const end = new Date(opts.dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, end));
    }

    const orders = await this.db.select({
      id: s.orders.id,
      orderNumber: s.orders.orderNumber,
      status: s.orders.status,
      paymentStatus: s.orders.paymentStatus,
      fulfillmentStatus: s.orders.fulfillmentStatus,
      customerName: s.orders.customerName,
      customerPhone: s.orders.customerPhone,
      customerEmail: s.orders.customerEmail,
      subtotal: s.orders.subtotal,
      taxAmount: s.orders.taxAmount,
      total: s.orders.total,
      paidAmount: s.orders.paidAmount,
      paymentMethod: s.orders.paymentMethod,
      notes: s.orders.notes,
      createdAt: s.orders.createdAt,
      updatedAt: s.orders.updatedAt,
    }).from(s.orders)
      .where(and(...conditions))
      .orderBy(s.orders.id);

    return toCsv(orders as Record<string, unknown>[]);
  }

  async exportCustomers(storeId: number): Promise<string> {
    const customers = await this.db.select({
      id: s.customers.id,
      name: s.customers.name,
      phone: s.customers.phone,
      email: s.customers.email,
      notes: s.customers.notes,
      totalOrders: s.customers.totalOrders,
      totalSpent: s.customers.totalSpent,
      createdAt: s.customers.createdAt,
      updatedAt: s.customers.updatedAt,
    }).from(s.customers)
      .where(eq(s.customers.storeId, storeId))
      .orderBy(s.customers.id);

    return toCsv(customers as Record<string, unknown>[]);
  }

  async exportWallet(
    storeId: number,
    opts?: { dateFrom?: string; dateTo?: string },
  ): Promise<string> {
    const conditions = [eq(s.walletEntries.storeId, storeId)];
    if (opts?.dateFrom) conditions.push(gte(s.walletEntries.createdAt, new Date(opts.dateFrom)));
    if (opts?.dateTo) {
      const end = new Date(opts.dateTo);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(s.walletEntries.createdAt, end));
    }

    const entries = await this.db.select({
      id: s.walletEntries.id,
      type: s.walletEntries.type,
      direction: s.walletEntries.direction,
      amount: s.walletEntries.amount,
      balanceBefore: s.walletEntries.balanceBefore,
      balanceAfter: s.walletEntries.balanceAfter,
      status: s.walletEntries.status,
      referenceType: s.walletEntries.referenceType,
      referenceId: s.walletEntries.referenceId,
      description: s.walletEntries.description,
      createdAt: s.walletEntries.createdAt,
    }).from(s.walletEntries)
      .where(and(...conditions))
      .orderBy(s.walletEntries.id);

    return toCsv(entries as Record<string, unknown>[]);
  }

  async logExport(storeId: number, userId: number, type: string, recordCount: number): Promise<void> {
    await this.audit.record({
      actorUserId: userId,
      storeId,
      action: `export_${type}` as any,
      entityType: 'export',
      newValue: { exportType: type, recordCount },
    });
  }
}
