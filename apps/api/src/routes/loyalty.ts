import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { LoyaltyService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const loyaltyRouter = new Hono();
loyaltyRouter.use('*', requireAuth(), requireStoreAccess());

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  earnRatePerCurrency: z.number().min(0).max(1000).optional(),
  redeemValuePerPoint: z.number().min(0).max(1000).optional(),
  minRedeemPoints: z.number().int().min(0).optional(),
  maxRedeemPercent: z.number().min(0).max(1).optional(),
  pointsExpiryMonths: z.number().int().min(0).max(120).optional(),
  earnOnTax: z.boolean().optional(),
  earnOnShipping: z.boolean().optional(),
  minOrderForEarn: z.number().min(0).optional(),
});

// GET /merchant/:storeId/loyalty/settings
loyaltyRouter.get('/settings', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const rules = await new LoyaltyService().getRules(storeId);
  return c.json({ success: true, data: rules });
});

// PUT /merchant/:storeId/loyalty/settings
loyaltyRouter.put('/settings', requirePermission('promotions:update'), zValidator('json', settingsSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const patch = c.req.valid('json');
  const rules = await new LoyaltyService().updateRules(storeId, patch);
  return c.json({ success: true, data: rules });
});

// GET /merchant/:storeId/loyalty/customers/:customerId — balance + value + recent ledger
loyaltyRouter.get('/customers/:customerId', requirePermission('promotions:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const customerId = Number(c.req.param('customerId'));
  const svc = new LoyaltyService();
  const [balance, value, transactions] = await Promise.all([
    svc.getBalance(storeId, customerId),
    svc.balanceValue(storeId, customerId),
    svc.listTransactions(storeId, customerId, 50),
  ]);
  return c.json({ success: true, data: { balance, value, transactions } });
});

// POST /merchant/:storeId/loyalty/customers/:customerId/expire — sweep expired points
loyaltyRouter.post('/customers/:customerId/expire', requirePermission('promotions:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const customerId = Number(c.req.param('customerId'));
  const expired = await new LoyaltyService().expireAccount(storeId, customerId);
  return c.json({ success: true, data: { expired } });
});
