import { eq, and, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

/**
 * countTenantOwners — count how many `owner` memberships exist
 * in a tenant, optionally excluding one user.
 *
 * Shared between PermissionService (which uses it to refuse
 * demoting the last owner) and EmployeeService (which uses it
 * to refuse deleting/demoting the last owner). Extracted as a
 * standalone helper so the rule lives in one place and the two
 * services stay in sync.
 *
 * Exported standalone (not as a class method) so it can be used
 * both by services that take a DbClient via DI and by ad-hoc
 * callers with the default `createDbClient()`.
 */
export async function countTenantOwners(
  db: DbClient = createDbClient(),
  tenantId: number,
  excludeUserId?: number,
): Promise<number> {
  const conditions = excludeUserId !== undefined
    ? and(
        eq(s.tenantUsers.tenantId, tenantId),
        eq(s.tenantUsers.role, 'owner'),
        sql`${s.tenantUsers.userId} != ${excludeUserId}`,
      )
    : and(
        eq(s.tenantUsers.tenantId, tenantId),
        eq(s.tenantUsers.role, 'owner'),
      );

  const [result] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(s.tenantUsers)
    .where(conditions);

  return result?.total ?? 0;
}
