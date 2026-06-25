import { eq, and, sql, type SQL } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

/**
 * countTenantOwners — count how many `owner` memberships exist for a
 * given tenant + store scope, optionally excluding one user.
 *
 * Shared between PermissionService (which uses it to refuse demoting
 * the last owner) and EmployeeService (which uses it to refuse
 * deleting/demoting the last owner). Extracted as a standalone helper
 * so the rule lives in one place and the two services stay in sync.
 *
 * Audit P0 (2026-06-25): pre-migration 0087 this helper counted
 * owners by tenant ONLY. With multiple stores under one tenant, that
 * meant store A's "last owner" check could see store B's owner and
 * wrongly allow the demotion of store A's actual sole owner —
 * leaving store A without an owner. The helper now takes a storeId
 * so each store's last-owner protection is independent.
 *
 * Tenant-wide memberships (storeId IS NULL) count toward EVERY
 * store's owner count — they're cross-store admins.
 *
 * Exported standalone (not as a class method) so it can be used both
 * by services that take a DbClient via DI and by ad-hoc callers with
 * the default `createDbClient()`.
 */
export async function countTenantOwners(
  db: DbClient = createDbClient(),
  tenantId: number,
  excludeUserId?: number,
  storeId?: number,
): Promise<number> {
  const filters: SQL[] = [
    eq(s.tenantUsers.tenantId, tenantId),
    eq(s.tenantUsers.role, 'owner'),
  ];
  if (excludeUserId !== undefined) {
    filters.push(sql`${s.tenantUsers.userId} != ${excludeUserId}`);
  }
  if (storeId !== undefined) {
    // Cross-store admins (storeId IS NULL) count toward every store's
    // owner pool. Store-scoped owners only count for their own store.
    filters.push(sql`(${s.tenantUsers.storeId} IS NULL OR ${s.tenantUsers.storeId} = ${storeId})`);
  }

  const [result] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(s.tenantUsers)
    .where(and(...filters));

  return result?.total ?? 0;
}
