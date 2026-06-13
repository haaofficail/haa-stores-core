import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SubscriptionService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const subscriptionsRouter = new Hono();

subscriptionsRouter.use('*', requireAuth(), requireStoreAccess());

subscriptionsRouter.get('/', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const subscription = await new SubscriptionService().getCurrentSubscription(storeId);
  return c.json({ success: true, data: subscription });
});

subscriptionsRouter.get('/current', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const subscription = await new SubscriptionService().getCurrentSubscription(storeId);
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
  const limits = await new SubscriptionService().checkPlanLimits(storeId);
  return c.json({ success: true, data: limits });
});

export { subscriptionsRouter };
