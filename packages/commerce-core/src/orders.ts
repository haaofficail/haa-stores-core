import { eq, and, count, sql, or, like, gte, lte, inArray, ne, asc } from 'drizzle-orm';
import { createDbClient, type DbOrTx } from '@haa/db';
import * as s from '@haa/db/schema';
import type { OrderStatus, PaymentStatus, FulfillmentStatus, PreparationStatus } from '@haa/shared';
import {
  ORDER_STATUS_TRANSITIONS,
  PREPARATION_STATUS_TRANSITIONS,
  PAYMENT_STATUS_TRANSITIONS,
  FULFILLMENT_STATUS_TRANSITIONS,
} from '@haa/shared';
import {
  NotificationService,
  SmtpEmailProvider,
  ResendEmailProvider,
  renderOrderCreatedEmail,
  renderOrderStatusChangeEmail,
  renderOrderRefundEmail,
  renderMerchantNewOrderEmail,
  type NotificationProvider,
  type OrderEmailContext,
  type OrderStatusChangeContext,
  type OrderRefundContext,
} from '@haa/notification-core';
import { AuditLogService } from '@haa/integration-core';
import { WalletLedger } from '@haa/wallet-core';
import { StoreBillingSettingsService } from './billing-settings-service.js';
import { WalletPostingService } from './wallet-posting-service.js';
import { LoyaltyService } from './loyalty.js';
import { sanitizeGiftMessage } from './gift-message-sanitizer.js';

/**
 * Discriminated union of order-email templates. `sendOrderEmail`
 * dispatches on `kind`, builds the subject/HTML via the matching
 * `@haa/notification-core` renderer, and hands the result to the
 * picked provider — fire-and-forget. Each variant carries its own
 * structured context plus the resolved recipient address.
 */
type OrderEmailTemplate =
  | { kind: 'order_created'; recipient: string; ctx: OrderEmailContext }
  | { kind: 'status_change'; recipient: string; ctx: OrderStatusChangeContext }
  | { kind: 'order_refund'; recipient: string; ctx: OrderRefundContext }
  | { kind: 'new_order'; recipient: string; ctx: OrderEmailContext & { merchantName: string } };

/**
 * Provider precedence mirrors `apps/api/src/routes/landing.ts`:
 * SMTP first (merchant owns deliverability via Hostinger/Workspace
 * /Outlook), Resend as a managed-API fallback. Returns null when
 * neither is configured so callers can no-op silently.
 */
function pickOrderEmailProvider(): NotificationProvider | null {
  const smtp = new SmtpEmailProvider();
  if (smtp.isAvailable) return smtp;
  const resend = new ResendEmailProvider();
  if (resend.isAvailable) return resend;
  return null;
}

export class OrdersService {
  constructor(private db: DbOrTx = createDbClient()) {}

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
    const rawItems = await this.db.select().from(s.orderItems)
      .where(eq(s.orderItems.orderId, orderId));
    // Enrich items with the primary product image so the fulfillment view can
    // show a thumbnail next to the SKU (mirrors getRecentWithImages).
    const productIds = [...new Set(rawItems.map(i => i.productId))];
    const images = productIds.length > 0
      ? await this.db.select().from(s.productImages)
          .where(inArray(s.productImages.productId, productIds))
      : [];
    const imageMap = new Map<number, string>();
    for (const img of images) {
      if (!imageMap.has(img.productId)) imageMap.set(img.productId, img.thumbUrl ?? img.url);
    }
    const items = rawItems.map(item => ({
      ...item,
      productImageUrl: imageMap.get(item.productId) ?? null,
    }));
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

  /**
   * Public "my orders" lookup by phone. Returns the customer's last
   * `limit` orders for this store, newest first. No order items — this
   * is the LIST view; the storefront drills down to a single order via
   * `getByOrderNumberPublic(orderNumber, phone)` for full detail.
   *
   * Phone match is exact — the storefront is responsible for normalizing
   * (the same phone the customer used at checkout). Empty/invalid phone
   * returns an empty array (no enumeration leak: every unknown phone
   * looks identical to a brand-new customer with no orders).
   */
  async listForCustomerPhonePublic(
    storeId: number,
    phone: string,
    limit = 50,
  ): Promise<Array<typeof s.orders.$inferSelect>> {
    const normalized = phone.trim();
    if (!normalized) return [];
    const safeLimit = Math.min(Math.max(1, limit), 100);
    return this.db.select().from(s.orders)
      .where(and(eq(s.orders.storeId, storeId), eq(s.orders.customerPhone, normalized)))
      .orderBy(sql`${s.orders.createdAt} DESC`)
      .limit(safeLimit);
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
      const sanitizedGiftOptions = data.giftOptions
        ? {
            ...data.giftOptions,
            message: sanitizeGiftMessage(data.giftOptions.message) ?? undefined,
          }
        : null;

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
        giftOptions: sanitizedGiftOptions,
        metadata: data.metadata ?? null,
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
          giftMessage: sanitizeGiftMessage(item.giftMessage) ?? null,
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
    // Validate + write inside a single transaction so the
    // read-then-write window is closed. The previous row was
    // fetched OUTSIDE the tx which left a small TOCTOU gap
    // (two concurrent status changes could both see the same
    // `from` and both pass the guard).
    const result = await this.db.transaction(async (tx) => {
      const [order] = await tx.select().from(s.orders)
        .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).limit(1);
      if (!order) return { updated: null, previousStatus: null, idempotent: false };

      // Idempotent same-status writes — no history row, no email.
      if (newStatus === order.status) {
        return { updated: order, previousStatus: order.status, idempotent: true };
      }

      const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(`Cannot transition from '${order.status}' to '${newStatus}'`);
      }

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

      return { updated, previousStatus: order.status, idempotent: false };
    });

    if (!result.updated) return null;
    const { updated, previousStatus, idempotent } = result;
    if (idempotent) return updated;

    // Notification hook — fire-and-forget: never blocks status change
    if (newStatus === 'ready_for_pickup') {
      this.fireReadyForPickupNotification(storeId, updated, updated).catch(() => {});
    }

    // Transactional email — fire-and-forget. The refund flow has its
    // own dedicated email path; when a cancelled order also triggers
    // a refund we let the refund email speak instead of double-notifying.
    // Wrapped in an async IIFE + .catch so the context build and the
    // provider call never block (or fail) the calling status change.
    if (newStatus !== 'cancelled' || updated.paymentStatus !== 'refunded') {
      void (async () => {
        const ctx = await this.buildOrderEmailContext(storeId, updated);
        if (!ctx) return;
        await this.sendOrderEmail({
          kind: 'status_change',
          recipient: updated.customerEmail ?? '',
          ctx: { ...ctx, oldStatus: previousStatus ?? '', newStatus, reasonNote: reason },
        });
      })().catch(() => {
        // Email path is non-blocking; never let it surface.
      });
    }

    return updated;
  }

  private async fireReadyForPickupNotification(
    storeId: number,
    _order: typeof s.orders.$inferSelect,
    updated: typeof s.orders.$inferSelect,
  ) {
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
    // Read + validate + write inside the transaction so the
    // transition guard cannot race against concurrent webhook
    // replays. We also need `previous.paymentStatus` to:
    //   1. detect first-paid (for the order_created email),
    //   2. populate the `from:` half of the history row,
    //   3. enforce PAYMENT_STATUS_TRANSITIONS.
    const result = await this.db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(s.orders)
        .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId)))
        .limit(1);
      if (!previous) {
        return { updated: null, previousPaymentStatus: null, idempotent: false };
      }

      // Idempotent webhook replays — same status, no history row,
      // no email side effects. Return the existing row as-is.
      if (paymentStatus === previous.paymentStatus) {
        return { updated: previous, previousPaymentStatus: previous.paymentStatus, idempotent: true };
      }

      const allowed = PAYMENT_STATUS_TRANSITIONS[previous.paymentStatus] ?? [];
      if (!allowed.includes(paymentStatus)) {
        throw new Error(
          `Cannot transition payment status from '${previous.paymentStatus}' to '${paymentStatus}'`,
        );
      }

      const updateData: Record<string, unknown> = { paymentStatus, updatedAt: new Date() };
      if (paidAmount !== undefined) updateData.paidAmount = paidAmount.toString();

      const [updated] = await tx.update(s.orders).set(updateData)
        .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId))).returning();

      await tx.insert(s.orderStatusHistory).values({
        orderId,
        fromStatus: `payment:${previous.paymentStatus}`,
        toStatus: `payment:${paymentStatus}`,
      });

      return { updated, previousPaymentStatus: previous.paymentStatus, idempotent: false };
    });

    if (!result.updated) return null;
    const { updated, previousPaymentStatus, idempotent } = result;
    // Idempotent replays — skip ALL email side effects.
    if (idempotent) return updated;

    const wasAlreadyPaid = previousPaymentStatus === 'paid';

    // Transactional emails — fire-and-forget. Each branch builds its
    // own context lazily so we pay nothing when no provider is
    // configured / no transition of interest happens. The whole
    // IIFE is .catch-wrapped so the email path can never break the
    // calling payment-status update.
    if (paymentStatus === 'paid' && !wasAlreadyPaid) {
      void (async () => {
        const ctx = await this.buildOrderEmailContext(storeId, updated);
        if (!ctx) return;
        await this.sendOrderEmail({
          kind: 'order_created',
          recipient: updated.customerEmail ?? '',
          ctx,
        });
        const merchant = await this.resolveMerchantContact(storeId);
        if (merchant) {
          await this.sendOrderEmail({
            kind: 'new_order',
            recipient: merchant.email,
            ctx: { ...ctx, merchantName: merchant.name },
          });
        }
      })().catch(() => {});
    } else if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
      const isFull = paymentStatus === 'refunded';
      void (async () => {
        const ctx = await this.buildOrderEmailContext(storeId, updated);
        if (!ctx) return;
        const refundAmount = isFull
          ? ctx.total
          : `${Number(paidAmount ?? updated.paidAmount ?? updated.total).toFixed(2)} ر.س`;
        await this.sendOrderEmail({
          kind: 'order_refund',
          recipient: updated.customerEmail ?? '',
          ctx: { ...ctx, refundAmount, isFullRefund: isFull },
        });
      })().catch(() => {});
    }

    return updated;
  }

  async updateFulfillmentStatus(storeId: number, orderId: number, fulfillmentStatus: FulfillmentStatus) {
    // Same hardening pattern as updatePaymentStatus / changeStatus:
    // read + validate + write inside a single transaction, with an
    // idempotent same-status fast path and a transition guard
    // against FULFILLMENT_STATUS_TRANSITIONS.
    return this.db.transaction(async (tx) => {
      const [previous] = await tx
        .select()
        .from(s.orders)
        .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId)))
        .limit(1);
      if (!previous) return null;

      if (fulfillmentStatus === previous.fulfillmentStatus) {
        return previous;
      }

      const allowed = FULFILLMENT_STATUS_TRANSITIONS[previous.fulfillmentStatus] ?? [];
      if (!allowed.includes(fulfillmentStatus)) {
        throw new Error(
          `Cannot transition fulfillment status from '${previous.fulfillmentStatus}' to '${fulfillmentStatus}'`,
        );
      }

      const [updated] = await tx.update(s.orders)
        .set({ fulfillmentStatus, updatedAt: new Date() })
        .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId)))
        .returning();

      await tx.insert(s.orderStatusHistory).values({
        orderId,
        fromStatus: `fulfillment:${previous.fulfillmentStatus}`,
        toStatus: `fulfillment:${fulfillmentStatus}`,
      });

      return updated;
    });
  }

  /**
   * Change the packing/preparation state for a delivery order.
   *
   * Forward transitions follow PREPARATION_STATUS_TRANSITIONS (not_started → preparing → prepared → packed).
   * Reverse transitions (packed → any, etc.) require isAdminOverride=true + a non-empty reason.
   * Every change is recorded in orderStatusHistory with the synthetic key `prep:<from>→<to>`.
   */
  async changePreparationStatus(
    storeId: number,
    orderId: number,
    newStatus: PreparationStatus,
    opts?: { userId?: number; reason?: string; isAdminOverride?: boolean },
  ) {
    const order = await this.getById(storeId, orderId);
    if (!order) return null;

    const current = (order.preparationStatus ?? 'not_started') as PreparationStatus;
    if (current === newStatus) return order;

    const allowed = PREPARATION_STATUS_TRANSITIONS[current] ?? [];
    const isForward = allowed.includes(newStatus);

    if (!isForward) {
      if (!opts?.isAdminOverride) {
        throw new Error(
          `Cannot transition preparationStatus from '${current}' to '${newStatus}' without admin override`,
        );
      }
      if (!opts?.reason?.trim()) {
        throw new Error('A reason is required for reverse preparation status changes');
      }
    }

    const [updated] = await this.db.update(s.orders)
      .set({ preparationStatus: newStatus, updatedAt: new Date() })
      .where(and(eq(s.orders.id, orderId), eq(s.orders.storeId, storeId)))
      .returning();

    await this.db.insert(s.orderStatusHistory).values({
      orderId,
      fromStatus: `prep:${current}`,
      toStatus: `prep:${newStatus}`,
      changedByUserId: opts?.userId ?? null,
      reason: opts?.reason ?? null,
    });

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

    const updated = await this.db.transaction(async (tx) => {
      const txOrders = new OrdersService(tx);
      const collected = await txOrders.updatePaymentStatus(storeId, orderId, 'paid', Number(order.total));

      // Read the per-store COD-fee policy at collection time. The policy
      // is then snapshotted onto the `cod_fee` wallet entry for
      // historical immutability — see TASK-0032 + TASK-0033.
      const txBilling = new StoreBillingSettingsService(tx);
      const codPolicy = await txBilling.getCodFeePolicy(storeId);

      // Centralize wallet entry creation via WalletPostingService
      // (TASK-0033). This replaces the previous inline `recordEntry`
      // call sites with a single, idempotent, auditable surface.
      const txPosting = new WalletPostingService(tx);
      const txWallet = new WalletLedger(tx);

      const saleResult = await txPosting.postSale({
        storeId,
        orderId: order.id,
        orderTotal: Number(order.total),
        orderNumber: order.orderNumber,
        method: 'cod',
      });
      await txWallet.recordEntry({
        storeId, type: saleResult.entryType, direction: 'credit',
        amount: saleResult.amount,
        referenceType: 'order', referenceId: order.id,
        description: `COD collection for order ${order.orderNumber}`,
        status: 'available',
      });

      const codResult = await txPosting.postCodFee({
        storeId,
        orderId: order.id,
        orderTotal: Number(order.total),
        orderNumber: order.orderNumber,
        policy: codPolicy,
      });
      await txWallet.recordEntry({
        storeId, type: codResult.entryType, direction: 'debit',
        amount: codResult.amount,
        referenceType: 'order', referenceId: order.id,
        description: `COD fee (${codResult.policyDescription}) for order ${order.orderNumber}`,
        status: 'available',
      });

      const txAudit = new AuditLogService(tx);
      await txAudit.record({
        actorUserId: userId ?? null, storeId, action: 'payment_status_changed',
        entityType: 'order', entityId: order.id,
        newValue: { paymentStatus: 'paid', method: 'cash_on_delivery', orderNumber: order.orderNumber },
      });

      return collected;
    });

    // اكسب نقاط الولاء بعد تحصيل COD — خارج المعاملة، idempotent، best-effort
    // فلا يُفشل التحصيل لو تعثّر الولاء.
    if (order.customerId) {
      await new LoyaltyService(this.db).earnFromOrder({
        storeId,
        customerId: order.customerId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amounts: {
          subtotal: Number(order.subtotal),
          tax: Number(order.taxAmount ?? 0),
          shipping: Number(order.shippingCost ?? 0),
        },
      }).catch((err) => {
        console.error(`[loyalty] COD earn failed for order ${order.id}:`, err);
      });
    }

    return updated;
  }

  async markCODFailed(storeId: number, orderId: number, reason?: string, userId?: number) {
    const order = await this.getById(storeId, orderId);
    if (!order) throw new Error('Order not found');
    if (order.paymentMethod !== 'cash_on_delivery') throw new Error('Not a COD order');
    if (order.paymentStatus === 'paid') throw new Error('COD already collected');

    const txAudit = new AuditLogService(this.db);
    await txAudit.record({
      actorUserId: userId ?? null, storeId, action: 'payment_status_changed',
      entityType: 'order', entityId: order.id,
      newValue: { paymentStatus: order.paymentStatus, method: 'cash_on_delivery', failure: true, reason, orderNumber: order.orderNumber },
    });

    return true;
  }

  /**
   * Send a transactional order email. Fire-and-forget: never
   * throws and never blocks the calling order flow. The email is
   * a courtesy — if delivery fails for any reason (no provider
   * configured, SMTP down, missing recipient address) we swallow
   * the error and log a non-PII trace.
   *
   * Callers SHOULD `void this.sendOrderEmail(...)` rather than
   * await it; the method intentionally returns void.
   */
  private async sendOrderEmail(template: OrderEmailTemplate): Promise<void> {
    try {
      const recipient = template.recipient?.trim();
      if (!recipient) return;

      const provider = pickOrderEmailProvider();
      if (!provider) return;

      let subject: string;
      let html: string;
      if (template.kind === 'order_created') {
        ({ subject, html } = renderOrderCreatedEmail(template.ctx));
      } else if (template.kind === 'status_change') {
        ({ subject, html } = renderOrderStatusChangeEmail(template.ctx));
      } else if (template.kind === 'order_refund') {
        ({ subject, html } = renderOrderRefundEmail(template.ctx));
      } else {
        ({ subject, html } = renderMerchantNewOrderEmail(template.ctx));
      }

      const result = await provider.send({
        recipient,
        subject,
        body: html,
        metadata: { source: 'order_email', kind: template.kind },
      });
      if (!result.success) {
        // Log without PII — recipient + customer name omitted.
        console.warn(`[order-email] kind=${template.kind} send failed`);
      }
    } catch {
      // Swallow — the order flow must never fail because of an email.
      console.warn(`[order-email] kind=${template.kind} dispatch error`);
    }
  }

  /**
   * Resolve the storefront base URL for an order. We don't have a
   * shared `buildStoreUrl` helper, so we mirror the subdomain
   * pattern used in `apps/storefront/src/lib/custom-host.ts`:
   * `https://<slug>.haastores.com`. `STOREFRONT_URL` may override
   * the apex when running on staging (`staging.haastores.com`).
   */
  private buildStoreBaseUrl(slug: string): string {
    const apex = (process.env.STOREFRONT_APEX_DOMAIN || 'haastores.com').replace(/^https?:\/\//, '');
    return `https://${slug}.${apex}`;
  }

  /**
   * Look up the contact email for the merchant who should be
   * notified about a new order. Strategy:
   *   1. If the store row carries a public `email`, use it.
   *   2. Otherwise pick the FIRST tenant owner by `users.created_at`
   *      ascending (alphabetical by created_at, oldest first).
   * Returns `{ email, name }` or null when no recipient resolvable.
   */
  private async resolveMerchantContact(
    storeId: number,
  ): Promise<{ email: string; name: string } | null> {
    const [store] = await this.db
      .select({ tenantId: s.stores.tenantId, email: s.stores.email, name: s.stores.name })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (!store) return null;

    if (store.email) {
      return { email: store.email, name: store.name };
    }

    const owners = await this.db
      .select({ email: s.users.email, name: s.users.name, createdAt: s.users.createdAt })
      .from(s.tenantUsers)
      .innerJoin(s.users, eq(s.users.id, s.tenantUsers.userId))
      .where(eq(s.tenantUsers.tenantId, store.tenantId))
      .orderBy(asc(s.users.createdAt))
      .limit(1);

    const first = owners[0];
    if (!first) return null;
    return { email: first.email, name: first.name };
  }

  /**
   * Build the structured email context from an order row + its
   * items. Pure data transformation — the result is what the
   * `renderXxxEmail` builders consume.
   */
  private async buildOrderEmailContext(
    storeId: number,
    order: typeof s.orders.$inferSelect,
  ): Promise<OrderEmailContext | null> {
    const [store] = await this.db
      .select({ slug: s.stores.slug, name: s.stores.name })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    if (!store) return null;

    const items = await this.db
      .select()
      .from(s.orderItems)
      .where(eq(s.orderItems.orderId, order.id));

    const itemsLines = items.map((item) => {
      const qty = Number(item.quantity);
      const total = Number(item.totalPrice).toFixed(2);
      return `× ${qty}  ${item.name} — ${total} ر.س`;
    });

    const shipping = (order.shippingAddress ?? null) as { city?: string } | null;

    return {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      total: `${Number(order.total).toFixed(2)} ر.س`,
      paymentMethod: order.paymentMethod ?? undefined,
      shippingAddressCity: shipping?.city,
      itemsLines,
      storeName: store.name,
      storeUrl: this.buildStoreBaseUrl(store.slug),
    };
  }

  async markCODRefused(storeId: number, orderId: number, userId?: number) {
    const order = await this.getById(storeId, orderId);
    if (!order) throw new Error('Order not found');
    if (order.paymentMethod !== 'cash_on_delivery') throw new Error('Not a COD order');
    if (order.paymentStatus === 'paid') throw new Error('COD already collected');

    const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes('returned')) throw new Error(`Cannot return order from '${order.status}'`);

    return this.db.transaction(async (tx) => {
      const txOrders = new OrdersService(tx);
      const updated = await txOrders.changeStatus(storeId, orderId, 'returned', userId, 'customer refused to pay');

      const txAudit = new AuditLogService(tx);
      await txAudit.record({
        actorUserId: userId ?? null, storeId, action: 'order_status_changed',
        entityType: 'order', entityId: order.id,
        newValue: { status: 'returned', reason: 'customer refused to pay', orderNumber: order.orderNumber },
      });

      return updated;
    });
  }
}
