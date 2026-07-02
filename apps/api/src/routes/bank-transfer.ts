import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { OrdersService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

// P0-1 audit fix: bank_transfer orders are created with paymentStatus='pending'
// (checkout.ts no longer auto-marks them 'paid'). These routes let the
// merchant confirm the transfer actually landed before any wallet credit
// is posted — mirrors apps/api/src/routes/cod.ts.
const bankTransferRouter = new Hono();

bankTransferRouter.use('*', requireAuth(), requireStoreAccess());

const reasonSchema = z.object({
  reason: z.string().max(500).optional(),
});

// POST /merchant/:storeId/orders/:orderId/bank-transfer/confirm
bankTransferRouter.post('/:orderId/bank-transfer/confirm', requirePermission('orders:update_status'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const auth = getAuth(c);
  try {
    const order = await new OrdersService().confirmBankTransfer(storeId, orderId, auth?.userId);
    return c.json({ success: true, data: order });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bank transfer confirmation failed';
    return c.json({ success: false, error: { code: 'BANK_TRANSFER_ERROR', message } }, 400);
  }
});

// POST /merchant/:storeId/orders/:orderId/bank-transfer/failed
bankTransferRouter.post('/:orderId/bank-transfer/failed', requirePermission('orders:update_status'), zValidator('json', reasonSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const body = c.req.valid('json');
  const auth = getAuth(c);
  try {
    await new OrdersService().markBankTransferFailed(storeId, orderId, body.reason, auth?.userId);
    return c.json({ success: true, data: { confirmed: false } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Bank transfer failure recording failed';
    return c.json({ success: false, error: { code: 'BANK_TRANSFER_ERROR', message } }, 400);
  }
});

export { bankTransferRouter };
