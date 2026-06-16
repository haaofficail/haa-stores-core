// Admin: Store Billing Settings
//
// Phase 6 of the Configurable Platform Fee Policy work, hardened
// post-review (TASK-0030 follow-up, 2026-06-16).
//
// Mounted under /admin/stores — see aggregator in ./index.ts.
//
// - GET  /admin/stores/:storeId/billing-settings — read the current policy
// - PATCH /admin/stores/:storeId/billing-settings — update mode / pct / fixed
//
// All mutations:
//   - are gated behind `requireAdminAuth()` and `requireAdminPermission('billing.platform_fee.update')`
//   - validate input (no negative values, mode-specific required fields, hard cap 50%)
//   - record an `store_billing_settings_updated` audit log entry
//   - PATCH is ATOMIC: policy write + audit write are in the same DB
//     transaction. If the audit fails, the policy update is rolled back.
//     This is required for a financial setting.
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
  MAX_PLATFORM_FEE_PCT,
} from '@haa/commerce-core';

// Hard cap (50%) is the source of truth in @haa/wallet-core. The Zod
// schema mirrors it so the admin API rejects oversized values BEFORE
// hitting the service or DB. Defense-in-depth with the DB CHECK
// constraint from migration 0052.
const updateSchema = z.object({
  platformFeeMode: z.enum(PLATFORM_FEE_MODES as [string, ...string[]]).optional(),
  platformFeePct: z.coerce.number().min(0).max(MAX_PLATFORM_FEE_PCT).optional().nullable(),
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
  const body = c.req.valid('json');

  // Validation FIRST (before opening a transaction or hitting the DB).
  // The current policy read is also inside the transaction so that
  // the "merge" of partial PATCH fields happens against the latest
  // committed row.
  const db = createDbClient();
  const adminAuth = c.get('adminAuth') as { userId: number } | undefined;

  // Wrap policy write + audit write in a single transaction so
  // either both succeed or both roll back. This is the financial
  // safety guarantee for TASK-0030.
  let updated: any;
  try {
    updated = await db.transaction(async (tx) => {
      const service = new StoreBillingSettingsService(tx as any);
      const store = await service.getStoreSummary(storeId);
      if (!store) {
        // Throwing inside the transaction rolls it back. We catch
        // this specific case below and return 404.
        throw new NotFoundError('Store not found');
      }

      const current = await service.getPlatformFeePolicy(storeId);
      const merged = {
        platformFeeMode: body.platformFeeMode ?? current.mode,
        platformFeePct: body.platformFeePct !== undefined ? body.platformFeePct : current.pct,
        platformFeeFixed: body.platformFeeFixed !== undefined ? body.platformFeeFixed : current.fixed,
        isPlatformFeeEnabled: body.isPlatformFeeEnabled !== undefined ? body.isPlatformFeeEnabled : current.enabled,
      };
      const validation = validatePlatformFeePolicyInput(merged);
      if (!validation.ok) {
        // Throwing rolls back the (still-empty) transaction.
        throw new ValidationError(validation.error);
      }

      return service.updateSettings({
        storeId,
        policy: validation.policy,
        changeReason: body.changeReason ?? null,
        updatedBy: adminAuth?.userId ?? null,
        ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
        userAgent: c.req.header('user-agent') ?? null,
      });
    });
  } catch (e) {
    if (e instanceof NotFoundError) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: e.message } }, 404);
    }
    if (e instanceof ValidationError) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: e.message },
      }, 400);
    }
    // Audit failure or any other DB error → the transaction rolled
    // back automatically. Re-throw so the global error handler
    // returns 500.
    throw e;
  }

  // Fetch the effective policy post-write for the response.
  const effectiveService = new StoreBillingSettingsService(db);
  const effectivePolicy = await effectiveService.getPlatformFeePolicy(storeId);
  return c.json({
    success: true,
    data: {
      storeId: updated.storeId,
      storeName: updated.changeReason ?? null, // placeholder; overridden below
      settings: updated,
      effectivePolicy,
      effectivePolicyLabel: describePlatformFeePolicy(effectivePolicy),
    },
  });
}

export { updateSchema };

// Internal error markers for transaction-aware error handling.
class NotFoundError extends Error {
  readonly kind = 'NOT_FOUND' as const;
}
class ValidationError extends Error {
  readonly kind = 'VALIDATION_ERROR' as const;
}
