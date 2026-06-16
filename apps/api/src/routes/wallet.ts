import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { WalletLedger } from '@haa/wallet-core';
import { KycService, StoreBillingSettingsService, describePlatformFeePolicy } from '@haa/commerce-core';
import { AuditLogService } from '@haa/integration-core';
import { paginationSchema, type Permission } from '@haa/shared';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';

const walletRouter = new Hono();

function requireAnyPermission(...permissions: Permission[]) {
  return async (c: Context, next: Next) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }
    const hasPermission = permissions.some((permission) => auth.permissions.includes(permission));
    if (!hasPermission) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }
    await next();
  };
}

walletRouter.use('*', requireAuth(), requireStoreAccess());

walletRouter.get('/summary', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const summary = await new WalletLedger().getSummary(storeId);
  const kycStatus = await new KycService().getStatus(storeId);
  const kycApproved = new KycService().isKycApproved(kycStatus.status);
  // Phase 7: include the store's platform-fee policy as a read-only surface
  // so the merchant wallet can show the merchant how the platform fee is
  // calculated (transparency). Merchants cannot modify this — the PATCH
  // endpoint is admin-only.
  const policy = await new StoreBillingSettingsService().getPlatformFeePolicy(storeId);
  return c.json({
    success: true,
    data: {
      ...summary,
      kycApproved,
      kycStatus: kycStatus.status,
      platformFee: {
        mode: policy.mode,
        pct: policy.pct,
        fixed: policy.fixed,
        enabled: policy.enabled,
        label: describePlatformFeePolicy(policy),
      },
    },
  });
});

walletRouter.get('/entries', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const query = paginationSchema.parse(c.req.query());
  const type = c.req.query('type');
  const direction = c.req.query('direction');
  const status = c.req.query('status');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const search = c.req.query('search');
  const result = await new WalletLedger().getEntries(storeId, {
    ...query, type, direction, status, dateFrom, dateTo, search,
  });
  return c.json({ success: true, data: result });
});

walletRouter.get('/settlement-readiness', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const readiness = await new WalletLedger().getSettlementReadiness(storeId);
  return c.json({ success: true, data: readiness });
});

walletRouter.get('/payouts', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const payouts = await new WalletLedger().getPayouts(storeId);
  return c.json({ success: true, data: payouts });
});

walletRouter.get('/payouts/:payoutId', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const payoutId = Number(c.req.param('payoutId'));
  const payout = await new WalletLedger().getPayout(storeId, payoutId);
  if (!payout) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Payout not found' } }, 404);
  return c.json({ success: true, data: payout });
});

const payoutRequestSchema = z.object({
  amount: z.number().positive(),
});

walletRouter.post('/payouts/request', requireAnyPermission('wallet.payout.request', 'wallet:request_payout'), zValidator('json', payoutRequestSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const actorUserId = auth?.userId;
  const body = c.req.valid('json');
  try {
    const payout = await new WalletLedger().requestPayout(storeId, body.amount, actorUserId);
    await new AuditLogService().record({
      actorUserId: actorUserId ?? null,
      storeId,
      action: 'payout_requested',
      entityType: 'payout',
      entityId: payout.id,
      newValue: { amount: body.amount, status: payout.status },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: payout }, 201);
  } catch (e) {
    return c.json({
      success: false,
      error: { code: 'PAYOUT_NOT_READY', message: e instanceof Error ? e.message : 'Payout is not ready' },
    }, 400);
  }
});

walletRouter.post('/payouts', requireAnyPermission('wallet.payout.request', 'wallet:request_payout'), zValidator('json', payoutRequestSchema), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const auth = getAuth(c);
  const actorUserId = auth?.userId;
  const body = c.req.valid('json');
  try {
    const payout = await new WalletLedger().requestPayout(storeId, body.amount, actorUserId);
    await new AuditLogService().record({
      actorUserId: actorUserId ?? null,
      storeId,
      action: 'payout_requested',
      entityType: 'payout',
      entityId: payout.id,
      newValue: { amount: body.amount, status: payout.status },
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    });
    return c.json({ success: true, data: payout }, 201);
  } catch (e) {
    return c.json({
      success: false,
      error: { code: 'PAYOUT_NOT_READY', message: e instanceof Error ? e.message : 'Payout is not ready' },
    }, 400);
  }
});

walletRouter.get('/settlements', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const batches = await new WalletLedger().getSettlementBatches(storeId);
  return c.json({ success: true, data: batches });
});

walletRouter.get('/settlements/:batchId', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const batchId = Number(c.req.param('batchId'));
  const detail = await new WalletLedger().getSettlementBatchDetail(storeId, batchId);
  if (!detail) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Settlement batch not found' } }, 404);
  return c.json({ success: true, data: detail });
});

walletRouter.get('/settlement-transactions', requirePermission('wallet:read'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const transactions = await new WalletLedger().getSettlementTransactions(storeId);
  return c.json({ success: true, data: transactions });
});

export { walletRouter };
