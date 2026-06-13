import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { AbandonedCartsService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const abandonedCartsRouter = new Hono();

abandonedCartsRouter.use('*', requireAuth(), requireStoreAccess());

const hoursSchema = z.object({
  hours: z.coerce.number().int().positive().optional().default(24),
});

abandonedCartsRouter.get('/', requirePermission('orders:read'), zValidator('query', hoursSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { hours } = c.req.valid('query');
  const carts = await new AbandonedCartsService().list(storeId, hours);
  return c.json({ success: true, data: carts });
});

abandonedCartsRouter.get('/stats', requirePermission('orders:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const hours = Number(c.req.query('hours')) || 24;
  const service = new AbandonedCartsService();
  const [count, recoverableTotal] = await Promise.all([
    service.count(storeId, hours),
    service.recoverableTotal(storeId, hours),
  ]);
  return c.json({ success: true, data: { count, recoverableTotal } });
});

export { abandonedCartsRouter };
