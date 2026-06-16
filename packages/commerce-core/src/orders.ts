import { eq, and, count, sql, or, like, gte, lte, inArray, ne } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { OrderStatus, PaymentStatus, FulfillmentStatus } from '@haa/shared';
import { ORDER_STATUS_TRANSITIONS } from '@haa/shared';
import { NotificationService } from '@haa/notification-core';
import { AuditLogService } from '@haa/integration-core';
import {
  WalletLedger,
  calcCodFee,
  describeCodFeePolicy,
} from '@haa/wallet-core';
import { StoreBillingSettingsService } from './billing-settings-service.js';

export class OrdersService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number, opts?: {
    page?: number; limit?: number;
    status?: string; paymentStatus?: string; fulfillmentStatus?: string;
    search?: string; dateFrom?: string; dateTo?: string; source?: string;
    fulfillmentType?: string; paymentMethod?: string;
  }) {
    const page = opts?.page ?? 1;
    const limit = opts?.limit ?? 20;
    const conditions = [eq(s.orders.storeId, storeId)];
    if (opts?.status) conditions.push(eq(s.orders.status, opts.status));
    if (opts?.paymentStatus) conditions.push(eq(s.orders.paymentStatus, opts.paymentStatus));
    if (opts?.fulfillmentStatus) conditions.push(eq(s.orders.fulfillmentStatus, opts.fulfillmentStatus));
    if (opts?.fulfillmentType) conditions.push(eq(s.orders.fulfillmentType, opts.fulfillmentType));
    if (opts?.paymentMethod === 'cash_on_delivery') {
      conditions.push(eq(s.orders.paymentMethod, 'cash_on_delivery'));
    } else if (opts?.paymentMethod === 'other') {
      conditions.push(ne(s.orders.paymentMethod, 'cash_on_delivery'));
    }
    if (opts?.source === 'storefront') {
      conditions.push(or(eq(s.orders.source, 'storefront'), sql`${s.orders.source} IS NULL`)!);
    } else if (opts?.source) {
      conditions.push(eq(s.orders.source, opts.source));
    }
    if (opts?.search) {
      const searchTerm = `%${opts.search}%`;
      conditions.push(or(
        like(s.orders.orderNumber, searchTerm),
        like(s.orders.customerName, searchTerm),
        like(s.orders.customerPhone, searchTerm),
      )!);
    }
    if (opts?.dateFrom) {
      conditions.push(gte(s.orders.createdAt, new Date(opts.dateFrom)));
    }
    if (opts?.dateTo) {
      const endDate = new Date(opts.dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(s.orders.createdAt, endDate));
    }

    const [totalResult] = await this.db.select({ total: count() }).from(s.orders).where(and(...conditions));
    const total = Number(totalResult.total);
    const items = await this.db.select().from(s.orders)
      .where(and(...conditions))
      .limit(limit).offset((page - 1) * limit)
      .orderBy(sql`${s.orders.createdAt} DESC`);

    return { data: items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getById(storeId: number, orderId: number) {
    const [order] = await this.db.select().from(s.orders)
      .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).limit(1);
    if (!order) return null;
    const items = await this.db.select().from(s.orderItems)
      .where(eq(s.orderItems.orderId, orderId));
    const history = await this.db.select().from(s.orderStatusHistory)
      .where(eq(s.orderStatusHistory.orderId, orderId))
      .orderBy(s.orderStatusHistory.createdAt);
    const [shipment] = await this.db.select().from(s.shipments)
      .where(eq(s.shipments.orderId, orderId)).limit(1);
    return { ...order, items, statusHistory: history, shipment: shipment ?? null };
  }

  async getRecentWithImages(storeId: number, limit: number = 5) {
    const orders = await this.db.select().from(s.orders)
      .where(eq(s.orders.storeId, storeId))
      .orderBy(sql`${s.orders.createdAt} DESC`)
      .limit(limit);

    if (orders.length === 0) return [];

    const orderIds = orders.map(o => o.id);
    const items = await this.db.select().from(s.orderItems)
      .where(inArray(s.orderItems.orderId, orderIds));

    const productIds = [...new Set(items.map(i => i.productId))];
    const allImages = productIds.length > 0
      ? await this.db.select().from(s.productImages)
          .where(inArray(s.productImages.productId, productIds))
      : [];

    const imageMap = new Map<number, { url: string; thumbUrl: string | null }>();
    for (const img of allImages) {
      if (!imageMap.has(img.productId)) {
        imageMap.set(img.productId, { url: img.url, thumbUrl: img.thumbUrl ?? null });
      }
    }

    return orders.map(order => ({
      ...order,
      items: items
        .filter(i => i.orderId === order.id)
        .map(item => ({
          ...item,
          productImageUrl: imageMap.get(item.productId)?.url ?? null,
          productThumbUrl: imageMap.get(item.productId)?.thumbUrl ?? null,
        })),
    }));
  }

  async getByOrderNumber(storeId: number, orderNumber: string) {
    const [order] = await this.db.select().from(s.orders)
      .where(and(eq(s.orders.orderNumber, orderNumber), eq(s.orders.storeId, storeId))).limit(1);
    if (!order) return null;
    const items = await this.db.select().from(s.orderItems)
      .where(eq(s.orderItems.orderId, order.id));
    return { ...order, items };
  }

  async getByOrderNumberPublic(orderNumber: string, phone: string) {
    const [order] = await this.db.select().from(s.orders)
      .where(and(eq(s.orders.orderNumber, orderNumber), eq(s.orders.customerPhone, phone))).limit(1);
    if (!order) return null;
    const items = await this.db.select().from(s.orderItems)
      .where(eq(s.orderItems.orderId, order.id));
    const history = await this.db.select().from(s.orderStatusHistory)
      .where(eq(s.orderStatusHistory.orderId, order.id))
      .orderBy(s.orderStatusHistory.createdAt);
    return { ...order, items, statusHistory: history };
  }

  async create(data: {
    storeId: number; customerId?: number; orderNumber: string;
    checkoutSessionId?: string; idempotencyKey?: string;
    customerName: string; customerPhone: string; customerEmail?: string;
    shippingAddress?: Record<string, unknown>; billingAddress?: Record<string, unknown>;
    shippingMethodId?: number; shippingCost?: number;
    couponCode?: string; couponDiscount?: number;
    subtotal: number; taxAmount?: number; total: number;
    paymentMethod?: string;
    fulfillmentType?: string;
    pickupLocationId?: number;
    giftOptions?: { sendAsGift?: boolean; message?: string } | null;
    source?: string;
    platformCommission?: number;
    items: Array<{ productId: number; variantId?: number | null; name: string; sku?: string; quantity: number; unitPrice: number; totalPrice: number; notes?: string; giftWrapSelected?: boolean; giftWrapPrice?: number; sendAsGift?: boolean; giftMessage?: string; source?: string; platformCommissionRate?: number; platformCommission?: number }>;
    notes?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.db.transaction(async (tx) => {
      const [order] = await tx.insert(s.orders).values({
        storeId: data.storeId,
        customerId: data.customerId ?? null,
        orderNumber: data.orderNumber,
        checkoutSessionId: data.checkoutSessionId ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
        status: 'draft',
        paymentStatus: 'unpaid',
        fulfillmentStatus: 'unfulfilled',
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail ?? null,
        shippingAddress: data.shippingAddress ?? null,
        billingAddress: data.billingAddress ?? null,
        shippingMethodId: data.shippingMethodId ?? null,
        shippingCost: data.shippingCost?.toString() ?? null,
        couponCode: data.couponCode ?? null,
        couponDiscount: data.couponDiscount?.toString() ?? null,
        subtotal: data.subtotal.toString(),
        taxAmount: (data.taxAmount ?? 0).toString(),
        total: data.total.toString(),
        paidAmount: null,
        paymentMethod: data.paymentMethod ?? null,
        notes: data.notes ?? null,
        source: data.source ?? 'storefront',
        platformCommission: data.platformCommission?.toString() ?? null,
        fulfillmentType: data.fulfillmentType ?? 'shipping',
        pickupLocationId: data.pickupLocationId ?? null,
        giftOptions: (data.giftOptions ?? null) as any,
        metadata: (data.metadata ?? null) as any,
      }).returning();

      for (const item of data.items) {
        await tx.insert(s.orderItems).values({
          orderId: order.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
          name: item.name,
          sku: item.sku ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString(),
          notes: item.notes ?? null,
          giftWrapSelected: item.giftWrapSelected ?? false,
          giftWrapPrice: item.giftWrapPrice?.toString() ?? null,
          sendAsGift: item.sendAsGift ?? false,
          giftMessage: item.giftMessage ?? null,
          source: item.source ?? 'storefront',
          platformCommissionRate: item.platformCommissionRate?.toString() ?? null,
          platformCommission: item.platformCommission?.toString() ?? null,
        });
      }

      await tx.insert(s.orderStatusHistory).values({
        orderId: order.id, toStatus: 'draft',
      });

      return order;
    });
  }

  async changeStatus(storeId: number, orderId: number, newStatus: OrderStatus, userId?: number, reason?: string) {
    const order = await this.getById(storeId, orderId);
    if (!order) return null;

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`Cannot transition from '${order.status}' to '${newStatus}'`);
    }

    const updated = await this.db.transaction(async (tx) => {
      const updateData: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
      if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancelledReason = reason ?? null;
      }
      if (newStatus === 'completed' || newStatus === 'picked_up') {
        updateData.completedAt = new Date();
        updateData.fulfillmentStatus = 'fulfilled';
      }

      const [updated] = await tx.update(s.orders).set(updateData)
        .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).returning();

      await tx.insert(s.orderStatusHistory).values({
        orderId, fromStatus: order.status, toStatus: newStatus,
        changedByUserId: userId ?? null, reason: reason ?? null,
      });

      return updated;
    });

    // Notification hook — fire-and-forget: never blocks status change
    if (newStatus === 'ready_for_pickup') {
      this.fireReadyForPickupNotification(storeId, order, updated).catch(() => {});
    }

    return updated;
  }

  private async fireReadyForPickupNotification(storeId: number, order: any, updated: any) {
    try {
      let branchName = '';
      if (updated.pickupLocationId) {
        const [loc] = await this.db.select().from(s.pickupLocations)
          .where(eq(s.pickupLocations.id, updated.pickupLocationId)).limit(1);
        branchName = loc?.nameAr ?? '';
      }
      const notifService = new NotificationService(this.db);
      await notifService.send(storeId, 'order_ready_for_pickup', {
        orderNumber: updated.orderNumber,
        branchName: branchName || 'الفرع',
      });
    } catch {
      // Notification failure must never break the status change
    }
  }

  async updatePaymentStatus(storeId: number, orderId: number, paymentStatus: PaymentStatus, paidAmount?: number) {
    const updateData: Record<string, unknown> = { paymentStatus, updatedAt: new Date() };
    if (paidAmount !== undefined) updateData.paidAmount = paidAmount.toString();

    const [updated] = await this.db.update(s.orders).set(updateData)
      .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).returning();

    await this.db.insert(s.orderStatusHistory).values({
      orderId, fromStatus: undefined, toStatus: `payment:${paymentStatus}`,
    });

    return updated;
  }

  async updateFulfillmentStatus(storeId: number, orderId: number, fulfillmentStatus: FulfillmentStatus) {
    const [updated] = await this.db.update(s.orders).set({ fulfillmentStatus, updatedAt: new Date() })
      .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).returning();
    return updated;
  }

  async generateOrderNumber(storeId: number): Promise<string> {
    const prefix = 'ORD-';
    const [result] = await this.db.select({ total: count() }).from(s.orders)
      .where(eq(s.orders.storeId, storeId));
    const next = Number(result.total) + 1;
    return `${prefix}${storeId}-${String(next).padStart(5, '0')}`;
  }

  async collectCOD(storeId: number, orderId: number, userId?: number) {
    const order = await this.getById(storeId, orderId);
    if (!order) throw new Error('Order not found');
    if (order.paymentMethod !== 'cash_on_delivery') throw new Error('Not a COD order');
    if (order.paymentStatus === 'paid') throw new Error('COD already collected');
    if (order.paymentStatus === 'refunded') throw new Error('Order already refunded');
    if (order.status === 'cancelled' || order.status === 'refunded') throw new Error('Order is cancelled or refunded');

    return this.db.transaction(async (tx) => {
      const txOrders = new OrdersService(tx as any);
      const updated = await txOrders.updatePaymentStatus(storeId, orderId, 'paid', Number(order.total));

      // Read the per-store COD-fee policy at collection time. The policy
      // is then snapshotted onto the `cod_fee` wallet entry for
      // historical immutability — see TASK-0032.
      const txBilling = new StoreBillingSettingsService(tx as any);
      const codPolicy = await txBilling.getCodFeePolicy(storeId);
      const codFeeAmount = calcCodFee(Number(order.total), codPolicy);
      const codPolicyDesc = describeCodFeePolicy(codPolicy);

      const txWallet = new WalletLedger(tx as any);
      await txWallet.recordEntry({
        storeId, type: 'sale', direction: 'credit',
        amount: Number(order.total),
        referenceType: 'order', referenceId: order.id,
        description: `COD collection for order ${order.orderNumber}`,
        status: 'available',
      });
      await txWallet.recordEntry({
        storeId, type: 'cod_fee', direction: 'debit',
        amount: codFeeAmount,
        referenceType: 'order', referenceId: order.id,
        description: `COD fee (${codPolicyDesc}) for order ${order.orderNumber}`,
        status: 'available',
      });

      const txAudit = new AuditLogService(tx as any);
      await txAudit.record({
        actorUserId: userId ?? null, storeId, action: 'payment_status_changed',
        entityType: 'order', entityId: order.id,
        newValue: { paymentStatus: 'paid', method: 'cash_on_delivery', orderNumber: order.orderNumber },
      });

      return updated;
    });
  }

  async markCODFailed(storeId: number, orderId: number, reason?: string, userId?: number) {
    const order = await this.getById(storeId, orderId);
    if (!order) throw new Error('Order not found');
    if (order.paymentMethod !== 'cash_on_delivery') throw new Error('Not a COD order');
    if (order.paymentStatus === 'paid') throw new Error('COD already collected');

    const txAudit = new AuditLogService(this.db as any);
    await txAudit.record({
      actorUserId: userId ?? null, storeId, action: 'payment_status_changed',
      entityType: 'order', entityId: order.id,
      newValue: { paymentStatus: order.paymentStatus, method: 'cash_on_delivery', failure: true, reason, orderNumber: order.orderNumber },
    });

    return true;
  }

  async markCODRefused(storeId: number, orderId: number, userId?: number) {
    const order = await this.getById(storeId, orderId);
    if (!order) throw new Error('Order not found');
    if (order.paymentMethod !== 'cash_on_delivery') throw new Error('Not a COD order');
    if (order.paymentStatus === 'paid') throw new Error('COD already collected');

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes('returned')) throw new Error(`Cannot return order from '${order.status}'`);

    return this.db.transaction(async (tx) => {
      const txOrders = new OrdersService(tx as any);
      const updated = await txOrders.changeStatus(storeId, orderId, 'returned', userId, 'customer refused to pay');

      const txAudit = new AuditLogService(tx as any);
      await txAudit.record({
        actorUserId: userId ?? null, storeId, action: 'order_status_changed',
        entityType: 'order', entityId: order.id,
        newValue: { status: 'returned', reason: 'customer refused to pay', orderNumber: order.orderNumber },
      });

      return updated;
    });
  }
}
