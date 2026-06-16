import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { SubscriptionService } from '@haa/commerce-core';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';

const subscriptionsRouter = new Hono();

subscriptionsRouter.use('*', requireAuth(), requireStoreAccess());

// GET /merchant/:storeId/subscriptions — list (backward-compat alias for /current)
subscriptionsRouter.get('/', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const subscription = await (await SubscriptionService.forStore(storeId)).getCurrentSubscription(storeId);
  return c.json({ success: true, data: subscription });
});

// GET /merchant/:storeId/subscriptions/current
subscriptionsRouter.get('/current', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const subscription = await (await SubscriptionService.forStore(storeId)).getCurrentSubscription(storeId);
  return c.json({ success: true, data: subscription });
});

// GET /merchant/:storeId/subscriptions/plans
subscriptionsRouter.get('/plans', requirePermission('subscriptions:view'), async (c) => {
  const plans = await new SubscriptionService().getPlans();
  return c.json({ success: true, data: plans });
});

// POST /merchant/:storeId/subscriptions/subscribe
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

// POST /merchant/:storeId/subscriptions/upgrade
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

// POST /merchant/:storeId/subscriptions/downgrade
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

// GET /merchant/:storeId/subscriptions/invoices
subscriptionsRouter.get('/invoices', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const invoices = await new SubscriptionService().getInvoices(storeId);
  return c.json({ success: true, data: invoices });
});

// GET /merchant/:storeId/subscriptions/limits
subscriptionsRouter.get('/limits', requirePermission('subscriptions:view'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const limits = await (await SubscriptionService.forStore(storeId)).checkPlanLimits(storeId);
  return c.json({ success: true, data: limits });
});

export { subscriptionsRouter };
