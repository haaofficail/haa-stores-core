import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { OrdersService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const codRouter = new Hono();

codRouter.use('*', requireAuth(), requireStoreAccess());

const reasonSchema = z.object({
  reason: z.string().max(500).optional(),
});

// POST /merchant/:storeId/orders/:orderId/cod/collect
codRouter.post('/:orderId/cod/collect', requirePermission('orders:update_status'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const auth = getAuth(c);
  try {
    const order = await new OrdersService().collectCOD(storeId, orderId, auth?.userId);
    return c.json({ success: true, data: order });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'COD collection failed';
    return c.json({ success: false, error: { code: 'COD_ERROR', message } }, 400);
  }
});

// POST /merchant/:storeId/orders/:orderId/cod/failed
codRouter.post('/:orderId/cod/failed', requirePermission('orders:update_status'), zValidator('json', reasonSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const body = c.req.valid('json');
  const auth = getAuth(c);
  try {
    await new OrdersService().markCODFailed(storeId, orderId, body.reason, auth?.userId);
    return c.json({ success: true, data: { collected: false } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'COD failure recording failed';
    return c.json({ success: false, error: { code: 'COD_ERROR', message } }, 400);
  }
});

// POST /merchant/:storeId/orders/:orderId/cod/refused
codRouter.post('/:orderId/cod/refused', requirePermission('orders:update_status'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const orderId = Number(c.req.param('orderId'));
  const auth = getAuth(c);
  try {
    const order = await new OrdersService().markCODRefused(storeId, orderId, auth?.userId);
    return c.json({ success: true, data: order });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'COD refusal recording failed';
    return c.json({ success: false, error: { code: 'COD_ERROR', message } }, 400);
  }
});

export { codRouter };
