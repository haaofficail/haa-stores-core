import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { OrdersService, PaymentService, createPaymentProvider, WalletPostingService, OutboundWebhookService } from '@haa/commerce-core';
import { WalletLedger } from '@haa/wallet-core';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { paginationSchema, updateOrderStatusSchema, ORDER_STATUS_TRANSITIONS, PREPARATION_STATUS_TRANSITIONS, type OrderStatus, type ProviderCode } from '@haa/shared';
import type { PreparationStatus } from '@haa/shared';
import { createDbClient } from '@haa/db';
import { idempotencyKey } from '../middleware/idempotency-key.js';

const ordersRouter = new Hono();

ordersRouter.use('*', requireAuth(), requireStoreAccess());

ordersRouter.get('/', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const query = paginationSchema.parse(c.req.query());
  const status = c.req.query('status');
  const paymentStatus = c.req.query('paymentStatus');
  const fulfillmentStatus = c.req.query('fulfillmentStatus');
  const search = c.req.query('search');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const source = c.req.query('source');
  const fulfillmentType = c.req.query('fulfillmentType');
  const paymentMethod = c.req.query('paymentMethod');
  const result = await new OrdersService().list(storeId, {
    ...query, status, paymentStatus, fulfillmentStatus, search, dateFrom, dateTo, source,
    fulfillmentType, paymentMethod,
  });
  return c.json({ success: true, data: result });
});

ordersRouter.get('/recent-items', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const limit = Number(c.req.query('limit')) || 5;
  const result = await new OrdersService().getRecentWithImages(storeId, limit);
  return c.json({ success: true, data: result });
});

ordersRouter.get('/:orderId', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const order = await new OrdersService().getById(storeId, orderId);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  const settlementInfo = await new WalletLedger().getOrderSettlementInfo(orderId, storeId);
  return c.json({ success: true, data: { ...order, settlementInfo: settlementInfo ?? null } });
});

ordersRouter.get('/:orderId/transitions', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const order = await new OrdersService().getById(storeId, orderId);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  const allowed = ORDER_STATUS_TRANSITIONS[order.status] ?? [];
  return c.json({ success: true, data: { currentStatus: order.status, allowedTransitions: allowed } });
});

ordersRouter.patch('/:orderId/status', requirePermission('orders:update_status'), zValidator('json', updateOrderStatusSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const body = c.req.valid('json');
  const auth = getAuth(c);
  // Capture the previous status for the audit trail. The service
  // returns the updated order on success, but we need the prior
  // value for the oldValue field.
  let prevStatus: string | null = null;
  try {
    const existing = await new OrdersService().getById(storeId, orderId);
    if (!existing) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
    prevStatus = existing.status;
    const order = await new OrdersService().changeStatus(storeId, orderId, body.status as OrderStatus, auth?.userId, body.reason);
    if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
    await new AuditLogService().record({
      actorUserId: auth?.userId,
      storeId,
      action: 'order_status_changed',
      entityType: 'order',
      entityId: orderId,
      oldValue: { status: prevStatus },
      newValue: { status: order.status, reason: body.reason },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    // Emit outbound webhook for status transitions (best-effort)
    const webhookEvent = `order.${order.status}` as const;
    new OutboundWebhookService().emit(storeId, webhookEvent, {
      orderId,
      status: order.status,
      previousStatus: prevStatus,
    }).catch(() => null);
    return c.json({ success: true, data: order });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Status change failed';
    return c.json({ success: false, error: { code: 'STATUS_ERROR', message } }, 400);
  }
});

// PATCH /:orderId/payment-status — disabled in Phase 2+
// Payment status must only change via PaymentProvider/webhook, never manual merchant override.
// This route is intentionally removed for safety in sandbox/live modes.
// In local/fake mode, use the checkout confirm endpoint instead.

ordersRouter.post('/:orderId/refund', requirePermission('orders:refund'), idempotencyKey(), zValidator('json', z.object({
  amount: z.number().positive().optional(),
  reason: z.string().max(500).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const body = c.req.valid('json');
  const auth = getAuth(c);
  const db = createDbClient();

  try {
    const order = await new OrdersService(db).getById(storeId, orderId);
    if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
    if (order.paymentStatus !== 'paid') return c.json({ success: false, error: { code: 'NOT_PAID', message: 'Order is not paid' } }, 400);

    const payments = await new PaymentService(db).getPaymentsByOrder(orderId);
    const paidPayment = payments.find(p => p.status === 'paid');
    if (!paidPayment) return c.json({ success: false, error: { code: 'NO_PAYMENT', message: 'No paid payment found for this order' } }, 400);

    const refundAmount = body.amount ?? Number(paidPayment.amount);
    if (refundAmount > Number(paidPayment.amount)) {
      return c.json({ success: false, error: { code: 'REFUND_EXCEEDS', message: 'Refund amount exceeds paid amount' } }, 400);
    }

    const provider = createPaymentProvider(paidPayment.provider as ProviderCode);
    const result = await provider.refundPayment(paidPayment.id, refundAmount, db);

    if (result.success) {
      // Update order payment status
      const isFullRefund = refundAmount >= Number(paidPayment.amount);
      await new OrdersService(db).updatePaymentStatus(storeId, orderId, isFullRefund ? 'refunded' : 'partially_refunded');

      // Centralize wallet entry creation via WalletPostingService
      // (TASK-0033 + TASK-0034 sub-item 4). This replaces the previous
      // inline `recordEntry` call site — the last one in apps/api.
      // The service gives us the entry type + amount; the actual DB
      // write is delegated to WalletLedger (preserves the
      // status='available' + description semantics the rest of the
      // codebase uses).
      const postingService = new WalletPostingService(db);
      const walletLedger = new WalletLedger(db);
      const refundResult = await postingService.postRefund({
        storeId,
        orderId,
        amount: refundAmount,
        orderNumber: order.orderNumber,
        // body.reason is free-text (max 500 chars). The service's
        // `reason` field is a strict 4-value union for analytics; we
        // map to 'customer_request' as the safe default and preserve
        // the original wording in the wallet entry description below.
        reason: 'customer_request',
      });
      await walletLedger.recordEntry({
        storeId,
        type: refundResult.entryType,
        direction: 'debit',
        amount: refundResult.amount,
        referenceType: 'order',
        referenceId: orderId,
        description: body.reason || `Refund for order ${order.orderNumber}`,
        status: 'available',
      });

      // If full refund, change order status
      if (isFullRefund) {
        await new OrdersService(db).changeStatus(storeId, orderId, 'refunded', auth?.userId, body.reason);
      }

      await new AuditLogService().record({
        actorUserId: auth?.userId,
        storeId,
        action: 'refund_processed',
        entityType: 'order',
        entityId: orderId,
        oldValue: { paymentStatus: order.paymentStatus },
        newValue: { refundAmount, isFullRefund, reason: body.reason },
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
        userAgent: c.req.header('user-agent'),
      });
    }

    return c.json({ success: true, data: result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Refund failed';
    return c.json({ success: false, error: { code: 'REFUND_ERROR', message } }, 400);
  }
});

ordersRouter.patch('/:orderId/preparation-status', requirePermission('orders:update_status'), zValidator('json', z.object({
  status: z.enum(['not_started', 'preparing', 'prepared', 'packed']),
  reason: z.string().max(500).optional(),
  isAdminOverride: z.boolean().optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const body = c.req.valid('json');
  const auth = getAuth(c);
  try {
    const existing = await new OrdersService().getById(storeId, orderId);
    if (!existing) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
    const prevPrep = existing.preparationStatus ?? 'not_started';
    const newStatus = body.status as PreparationStatus;
    const allowed = PREPARATION_STATUS_TRANSITIONS[prevPrep] ?? [];
    const isForward = allowed.includes(newStatus);
    if (!isForward && !body.isAdminOverride) {
      return c.json({ success: false, error: { code: 'INVALID_TRANSITION', message: `لا يمكن الانتقال من '${prevPrep}' إلى '${newStatus}' بدون صلاحية مدير` } }, 400);
    }
    const order = await new OrdersService().changePreparationStatus(storeId, orderId, newStatus, {
      userId: auth?.userId,
      reason: body.reason,
      isAdminOverride: body.isAdminOverride ?? false,
    });
    if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
    await new AuditLogService().record({
      actorUserId: auth?.userId,
      storeId,
      action: 'order_preparation_status_changed',
      entityType: 'order',
      entityId: orderId,
      oldValue: { preparationStatus: prevPrep },
      newValue: { preparationStatus: order.preparationStatus, reason: body.reason },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: order });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Preparation status change failed';
    return c.json({ success: false, error: { code: 'PREP_STATUS_ERROR', message } }, 400);
  }
});

ordersRouter.get('/number/:orderNumber', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderNumber = c.req.param('orderNumber') ?? '';
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number is required' } }, 400);
  const order = await new OrdersService().getByOrderNumber(storeId, orderNumber);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: order });
});

export { ordersRouter };
