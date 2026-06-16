// StoreBillingSettingsService — owns reads and writes of the per-store
// platform-fee policy.
//
// Reads are used at checkout (Phase 4) and by the merchant wallet (Phase 7).
// Writes are gated to admin-only and record an audit log entry on every
// successful change (Phase 11).
//
// Lives in `commerce-core` because it depends on `@haa/integration-core`
// (AuditLogService). The pure calculation (`calcPlatformFee` etc.) lives in
// `@haa/wallet-core` and is re-exported from there for direct use in routes
// that don't need DB access.

import { eq } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { AuditLogService } from '@haa/integration-core';
import {
  DEFAULT_PLATFORM_FEE_POLICY,
  PlatformFeePolicy,
  normalizePlatformFeePolicy,
} from '@haa/wallet-core';

export class StoreBillingSettingsService {
  constructor(private db: DbClient = createDbClient()) {}

  /**
   * Read the platform-fee policy for a store. Returns the default
   * `DEFAULT_PLATFORM_FEE_POLICY` (2% percentage) if no row exists yet,
   * so checkout never breaks for a fresh tenant.
   */
  async getPlatformFeePolicy(storeId: number): Promise<PlatformFeePolicy> {
    const [row] = await this.db
      .select()
      .from(s.storeBillingSettings)
      .where(eq(s.storeBillingSettings.storeId, storeId))
      .limit(1);
    if (!row) return { ...DEFAULT_PLATFORM_FEE_POLICY };
    return normalizePlatformFeePolicy(row);
  }

  /**
   * Read the raw row, including audit fields. Returns null if no row.
   * Used by the admin GET endpoint and the merchant read-only response.
   */
  async getRawSettings(storeId: number) {
    const [row] = await this.db
      .select()
      .from(s.storeBillingSettings)
      .where(eq(s.storeBillingSettings.storeId, storeId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Light existence check for a store by id. Returns the store's
   * `{ id, name }` row, or null if not found. Centralized here so route
   * handlers don't need to import drizzle-orm directly.
   */
  async getStoreSummary(storeId: number): Promise<{ id: number; name: string } | null> {
    const [row] = await this.db
      .select({ id: s.stores.id, name: s.stores.name })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);
    return row ?? null;
  }

  /**
   * Create or update a store's billing settings. Always records an audit
   * log entry with the before/after diff and the change reason.
   *
   * - Upserts the row by `store_id`.
   * - If no row exists, seeds `updated_by` and `change_reason` from the
   *   admin actor + supplied reason.
   */
  async updateSettings(input: {
    storeId: number;
    policy: PlatformFeePolicy;
    changeReason?: string | null;
    updatedBy: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    const { storeId, policy, changeReason, updatedBy, ipAddress, userAgent } = input;
    const existing = await this.getRawSettings(storeId);

    const patch = {
      platformFeeMode: policy.mode,
      platformFeePct: policy.pct != null ? policy.pct.toString() : null,
      platformFeeFixed: policy.fixed != null ? policy.fixed.toString() : null,
      isPlatformFeeEnabled: policy.enabled,
      effectiveFrom: new Date(),
      updatedAt: new Date(),
      updatedBy: updatedBy ?? null,
      changeReason: changeReason ?? null,
    };

    let row;
    if (!existing) {
      [row] = await this.db
        .insert(s.storeBillingSettings)
        .values({ storeId, ...patch })
        .returning();
    } else {
      [row] = await this.db
        .update(s.storeBillingSettings)
        .set(patch)
        .where(eq(s.storeBillingSettings.storeId, storeId))
        .returning();
    }

    // Always record an audit log entry, even on first-time creation.
    try {
      const audit = new AuditLogService(this.db);
      await audit.record({
        actorUserId: updatedBy ?? null,
        storeId,
        action: 'store_billing_settings_updated',
        entityType: 'store',
        entityId: storeId,
        oldValue: existing ? {
          platformFeeMode: existing.platformFeeMode,
          platformFeePct: existing.platformFeePct,
          platformFeeFixed: existing.platformFeeFixed,
          isPlatformFeeEnabled: existing.isPlatformFeeEnabled,
        } : null,
        newValue: {
          platformFeeMode: policy.mode,
          platformFeePct: policy.pct,
          platformFeeFixed: policy.fixed,
          isPlatformFeeEnabled: policy.enabled,
          changeReason: changeReason ?? null,
        },
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      });
    } catch {
      // Audit log failures should never block the policy update itself.
      // Errors are surfaced through the existing observability pipeline.
    }

    return row;
  }
}
