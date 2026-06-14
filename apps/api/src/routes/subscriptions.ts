import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { SubscriptionService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

async function resolveStore(storeId: number) {
  const db = createDbClient();
  const [store] = await db.select({ id: s.stores.id, isDemo: s.stores.isDemo })
    .from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
  return store ?? null;
}

const subscriptionsRouter = new Hono();

subscriptionsRouter.use('*', requireAuth(), requireStoreAccess());

subscriptionsRouter.get('/', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const store = await resolveStore(storeId);
  const subscription = await new SubscriptionService(undefined, store).getCurrentSubscription(storeId);
  return c.json({ success: true, data: subscription });
});

subscriptionsRouter.get('/current', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const store = await resolveStore(storeId);
  const subscription = await new SubscriptionService(undefined, store).getCurrentSubscription(storeId);
  return c.json({ success: true, data: subscription });
});

subscriptionsRouter.get('/plans', requirePermission('subscriptions:view'), async (c) => {
  const plans = await new SubscriptionService().getPlans();
  return c.json({ success: true, data: plans });
});

subscriptionsRouter.post('/subscribe', requirePermission('subscriptions:manage'), zValidator('json', z.object({
  planId: z.coerce.number().int().positive(),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { planId, billingCycle } = c.req.valid('json');

  const subscription = await new SubscriptionService().subscribe(storeId, planId, billingCycle);
  if (!subscription) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'Store already has a subscription or invalid plan' } }, 409);
  }

  return c.json({ success: true, data: subscription }, 201);
});

subscriptionsRouter.post('/upgrade', requirePermission('subscriptions:manage'), zValidator('json', z.object({
  planId: z.coerce.number().int().positive(),
  billingCycle: z.enum(['monthly', 'annual']).optional(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { planId, billingCycle } = c.req.valid('json');

  const subscription = await new SubscriptionService().upgrade(storeId, planId, billingCycle);
  if (!subscription) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found or invalid plan' } }, 404);
  }

  return c.json({ success: true, data: subscription });
});

subscriptionsRouter.post('/downgrade', requirePermission('subscriptions:manage'), zValidator('json', z.object({
  planId: z.coerce.number().int().positive(),
})), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const { planId } = c.req.valid('json');

  const subscription = await new SubscriptionService().downgrade(storeId, planId);
  if (!subscription) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Subscription not found or invalid plan' } }, 404);
  }

  return c.json({ success: true, data: subscription });
});

subscriptionsRouter.get('/invoices', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const invoices = await new SubscriptionService().getInvoices(storeId);
  return c.json({ success: true, data: invoices });
});

subscriptionsRouter.get('/limits', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const store = await resolveStore(storeId);
  const limits = await new SubscriptionService(undefined, store).checkPlanLimits(storeId);
  return c.json({ success: true, data: limits });
});

export { subscriptionsRouter };
