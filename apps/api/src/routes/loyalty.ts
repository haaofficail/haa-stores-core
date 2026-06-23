import { Hono } from 'hono';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { LoyaltyService } from '@haa/commerce-core';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { idempotencyKey } from '../middleware/idempotency-key.js';

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

// ──────────────────────────────────────────────────────────────────────
// L-PR-2 — Manual earn / redeem / transactions (admin-only).
// Per audit gaps L-001, L-002, L-005. Idempotency-Key required on POSTs;
// the global middleware caches the response so retries return the same
// outcome without double-crediting points. Auto-earn from order
// completion lives in payment-webhook-service.ts (paid path) +
// orders.ts (COD collection); both rely on the partial unique index
// loyalty_tx_earn_order_uniq for DB-level idempotency.
// ──────────────────────────────────────────────────────────────────────

const earnSchema = z.object({
  points: z.number().int().positive().max(1_000_000),
  reason: z.string().min(1).max(500),
});

const redeemSchema = z.object({
  points: z.number().int().positive().max(1_000_000),
  orderTotal: z.number().nonnegative().optional(),
  orderId: z.number().int().positive().optional(),
  orderNumber: z.string().max(50).optional(),
});

const transactionsQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// POST /merchant/:storeId/loyalty/customers/:customerId/earn — manual admin grant
loyaltyRouter.post(
  '/customers/:customerId/earn',
  requirePermission('promotions:update'),
  idempotencyKey(),
  zValidator('json', earnSchema),
  async (c) => {
    const storeId = Number(c.req.param('storeId'));
    const customerId = Number(c.req.param('customerId'));
    const body = c.req.valid('json');
    const auth = getAuth(c);
    const result = await new LoyaltyService().adjustPoints({
      storeId, customerId, points: body.points, reason: body.reason, actorUserId: auth?.userId,
    });
    if (result.reason === 'rules_disabled') {
      return c.json({ success: false, error: { code: 'RULES_DISABLED', message: 'Loyalty is disabled for this store' } }, 400);
    }
    if (result.reason === 'invalid_points') {
      return c.json({ success: false, error: { code: 'INVALID_POINTS', message: 'Points must be a positive integer' } }, 400);
    }
    return c.json({ success: true, data: { points: result.points, balance: result.balance } });
  },
);

// POST /merchant/:storeId/loyalty/customers/:customerId/redeem — manual redeem
loyaltyRouter.post(
  '/customers/:customerId/redeem',
  requirePermission('promotions:update'),
  idempotencyKey(),
  zValidator('json', redeemSchema),
  async (c) => {
    const storeId = Number(c.req.param('storeId'));
    const customerId = Number(c.req.param('customerId'));
    const body = c.req.valid('json');
    const svc = new LoyaltyService();
    // Resolve orderTotal: explicit body wins, otherwise large sentinel
    // so computeRedemption only caps by balance/min/maxPercent. We
    // pass MAX_SAFE/2 as "no cap from order side" since maxRedeemPercent
    // multiplied by it still safely floors to balance.
    const orderTotal = body.orderTotal ?? Number.MAX_SAFE_INTEGER / 2;
    const result = await svc.redeem({
      storeId, customerId, requestedPoints: body.points, orderTotal,
      referenceId: body.orderId, orderNumber: body.orderNumber,
    });
    if (result.points <= 0) {
      const codeMap: Record<string, { code: string; message: string; status: 400 | 422 }> = {
        disabled: { code: 'RULES_DISABLED', message: 'Loyalty is disabled for this store', status: 400 },
        below_min: { code: 'BELOW_MIN_REDEEM', message: 'Requested points below the minimum redeem threshold', status: 422 },
        insufficient_balance: { code: 'INSUFFICIENT_BALANCE', message: 'Customer balance is below the minimum redeem threshold', status: 422 },
        no_redeemable_value: { code: 'NO_REDEEMABLE_VALUE', message: 'Redemption value would be zero', status: 422 },
      };
      const reason = result.reason ?? 'no_redeemable_value';
      const mapped = codeMap[reason] ?? { code: 'REDEEM_FAILED', message: 'Redemption failed', status: 422 as const };
      return c.json({ success: false, error: { code: mapped.code, message: mapped.message } }, mapped.status);
    }
    return c.json({ success: true, data: { points: result.points, value: result.value } });
  },
);

// GET /merchant/:storeId/loyalty/customers/:customerId/transactions — paginated ledger
loyaltyRouter.get(
  '/customers/:customerId/transactions',
  requirePermission('promotions:read'),
  zValidator('query', transactionsQuerySchema),
  async (c) => {
    const storeId = Number(c.req.param('storeId'));
    const customerId = Number(c.req.param('customerId'));
    const { cursor, limit } = c.req.valid('query');
    const page = await new LoyaltyService().listTransactionsPaginated(storeId, customerId, { cursor, limit });
    return c.json({ success: true, data: page });
  },
);

// L-PR-9 — GET /merchant/:storeId/loyalty/analytics
// Read-only aggregates for the dashboard Loyalty tab. Pure SUM/COUNT
// over loyalty_accounts; no joins, no per-row scan; safe for the hot
// path. `reports:read` so it appears for the same role as Reports.tsx.
loyaltyRouter.get('/analytics', requirePermission('reports:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const data = await new LoyaltyService().getAnalytics(storeId);
  return c.json({ success: true, data });
});
