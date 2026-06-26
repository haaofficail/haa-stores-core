import { sql } from 'drizzle-orm';
import type { DbClient, DbOrTx } from './index.js';

/**
 * Sets the Postgres session tenant context used by the RLS policies in
 * `manual-migrations/002-rls-tenant-isolation.sql`. Must run inside the same
 * transaction as the queries it should scope — `set_config(..., TRUE)` is
 * transaction-local. Prefer {@link withTenantContext} over calling this
 * directly.
 */
export async function setRlsContext(
  db: DbOrTx,
  storeId: number,
  tenantId: number,
): Promise<void> {
  await db.execute(
    sql`SELECT set_tenant_context(${storeId}, ${tenantId})`,
  );
}

export function clearRlsContext(): string {
  return 'SELECT set_config(\'app.current_store_id\', \'0\', TRUE), set_config(\'app.current_tenant_id\', \'0\', TRUE)';
}

export interface TenantContext {
  storeId: number;
  tenantId: number;
}

/**
 * RLS-001 defense-in-depth tenant-isolation wrapper.
 *
 * Behaviour is gated on the `RLS_ENFORCE` environment variable so this change
 * is **non-breaking by default**:
 *
 * - `RLS_ENFORCE` unset/anything-but-`'on'` (CURRENT default — migration 002
 *   is a manual, owner-gated migration that is not applied to dev/prod yet, so
 *   the `set_tenant_context` function may not exist): transparent pass-through.
 *   The callback receives the same client and behaviour is byte-for-byte the
 *   existing application-layer-only isolation (`requireStoreAccess()` +
 *   `where(storeId)`). No transaction, no RLS call, no risk of breaking a DB
 *   that lacks the function.
 *
 * - `RLS_ENFORCE === 'on'` (test fixtures today; future production once the
 *   owner applies migrations 002+003 and flips the flag): the callback runs
 *   inside a transaction whose session has `app.current_store_id` /
 *   `app.current_tenant_id` set, so Postgres RLS enforces tenant isolation
 *   even if an application-level `where(storeId)` filter is missing.
 *
 * This is the second layer only — the application-layer filter remains the
 * first, audited line of defense (see docs/security/DATA_ISOLATION_AUDIT.md).
 */
export async function withTenantContext<T>(
  db: DbClient,
  ctx: TenantContext,
  fn: (tx: DbOrTx) => Promise<T>,
): Promise<T> {
  if (process.env.RLS_ENFORCE !== 'on') {
    return fn(db);
  }
  return db.transaction(async (tx) => {
    await setRlsContext(tx, ctx.storeId, ctx.tenantId);
    return fn(tx);
  });
}
