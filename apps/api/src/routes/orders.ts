import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { OrdersService, PaymentService, createPaymentProvider } from '@haa/commerce-core';
import { WalletLedger } from '@haa/wallet-core';
import { AuditLogService } from '@haa/integration-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { paginationSchema, updateOrderStatusSchema, ORDER_STATUS_TRANSITIONS } from '@haa/shared';
import { createDbClient } from '@haa/db';

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
  } as any);
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
  try {
    const order = await new OrdersService().changeStatus(storeId, orderId, body.status as any, auth?.userId, body.reason);
    if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
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

ordersRouter.post('/:orderId/refund', requirePermission('orders:refund'), zValidator('json', z.object({
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

    const provider = createPaymentProvider(paidPayment.provider as any);
    const result = await provider.refundPayment(paidPayment.id, refundAmount, db);

    if (result.success) {
      // Update order payment status
      const isFullRefund = refundAmount >= Number(paidPayment.amount);
      await new OrdersService(db).updatePaymentStatus(storeId, orderId, isFullRefund ? 'refunded' : 'partially_refunded');

      // Record wallet reversal
      const walletLedger = new WalletLedger(db);
      await walletLedger.recordEntry({
        storeId,
        type: 'refund',
        direction: 'debit',
        amount: refundAmount,
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

ordersRouter.get('/number/:orderNumber', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderNumber = c.req.param('orderNumber') ?? '';
  if (!orderNumber) return c.json({ success: false, error: { code: 'BAD_REQUEST', message: 'Order number is required' } }, 400);
  const order = await new OrdersService().getByOrderNumber(storeId, orderNumber);
  if (!order) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }, 404);
  return c.json({ success: true, data: order });
});

export { ordersRouter };
