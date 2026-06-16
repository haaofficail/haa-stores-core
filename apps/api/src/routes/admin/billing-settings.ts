// Admin: Store Billing Settings
//
// Phase 6 of the Configurable Platform Fee Policy work.
//
// Mounted under /admin/stores — see aggregator in ./index.ts.
//
// - GET  /admin/stores/:storeId/billing-settings — read the current policy
// - PATCH /admin/stores/:storeId/billing-settings — update mode / pct / fixed
//
// All mutations:
//   - are gated behind `requireAdminAuth()` and `requireAdminPermission('billing.platform_fee.update')`
//   - validate input (no negative values, mode-specific required fields)
//   - record an `store_billing_settings_updated` audit log entry (Phase 11)
//
// Merchants cannot call these endpoints — only admins. The merchant wallet
// uses a separate read-only surface (see wallet.ts).

import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createDbClient } from '@haa/db';
import {
  StoreBillingSettingsService,
  validatePlatformFeePolicyInput,
  describePlatformFeePolicy,
  PLATFORM_FEE_MODES,
} from '@haa/commerce-core';

const updateSchema = z.object({
  platformFeeMode: z.enum(PLATFORM_FEE_MODES as [string, ...string[]]).optional(),
  platformFeePct: z.coerce.number().min(0).max(1).optional().nullable(),
  platformFeeFixed: z.coerce.number().min(0).optional().nullable(),
  isPlatformFeeEnabled: z.boolean().optional().nullable(),
  effectiveFrom: z.coerce.date().optional().nullable(),
  changeReason: z.string().max(500).optional().nullable(),
});

export async function getBillingSettings(c: any) {
  const storeId = Number(c.req.param('storeId'));
  if (!Number.isFinite(storeId) || storeId <= 0) {
    return c.json({ success: false, error: { code: 'INVALID_STORE_ID', message: 'Invalid store id' } }, 400);
  }
  const db = createDbClient();
  const service = new StoreBillingSettingsService(db);
  const store = await service.getStoreSummary(storeId);
  if (!store) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  }
  const row = await service.getRawSettings(storeId);
  const effective = await service.getPlatformFeePolicy(storeId);
  return c.json({
    success: true,
    data: {
      storeId: store.id,
      storeName: store.name,
      settings: row ?? null,
      effectivePolicy: effective,
      effectivePolicyLabel: describePlatformFeePolicy(effective),
    },
  });
}

export async function patchBillingSettings(c: any) {
  const storeId = Number(c.req.param('storeId'));
  if (!Number.isFinite(storeId) || storeId <= 0) {
    return c.json({ success: false, error: { code: 'INVALID_STORE_ID', message: 'Invalid store id' } }, 400);
  }
  const db = createDbClient();
  const service = new StoreBillingSettingsService(db);
  const store = await service.getStoreSummary(storeId);
  if (!store) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  }
  const body = c.req.valid('json');

  // Read current policy first so partial PATCHes inherit the existing values.
  const current = await service.getPlatformFeePolicy(storeId);
  const merged = {
    platformFeeMode: body.platformFeeMode ?? current.mode,
    platformFeePct: body.platformFeePct !== undefined ? body.platformFeePct : current.pct,
    platformFeeFixed: body.platformFeeFixed !== undefined ? body.platformFeeFixed : current.fixed,
    isPlatformFeeEnabled: body.isPlatformFeeEnabled !== undefined ? body.isPlatformFeeEnabled : current.enabled,
  };
  const validation = validatePlatformFeePolicyInput(merged);
  if (!validation.ok) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: validation.error },
    }, 400);
  }

  const adminAuth = c.get('adminAuth') as { userId: number } | undefined;
  const updated = await service.updateSettings({
    storeId,
    policy: validation.policy,
    changeReason: body.changeReason ?? null,
    updatedBy: adminAuth?.userId ?? null,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });

  return c.json({
    success: true,
    data: {
      storeId: store.id,
      storeName: store.name,
      settings: updated,
      effectivePolicy: validation.policy,
      effectivePolicyLabel: describePlatformFeePolicy(validation.policy),
    },
  });
}

export { updateSchema };
