import { eq, and, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { PERMISSION_CATALOG, type UserRole } from '@haa/shared';
import { ALLOWED_SCOPES, type ScopeType } from '@haa/shared/permissions';
import { AuditLogService } from '@haa/integration-core';

/**
 * PermissionService — owns the membership-permission business logic.
 *
 * This service is the ONLY place in the project that is allowed to
 * touch the `membershipPermissions` table and the membership-tenant
 * join for permission-management purposes. The route layer is
 * transport-only.
 *
 * The service encapsulates:
 *   1. Looking up a membership in the context of a store/tenant
 *      (with a join to verify the membership belongs to the store)
 *   2. Reading the assigned permissions for a membership
 *   3. Upserting (delete + insert in a single transaction) the
 *      permissions for a membership — with all the business rules:
 *        - owner protection: can't demote the last owner
 *        - self-permission blocking: can't change your own perms
 *        - permission key validation
 *        - scope type validation
 *        - store-scope-only enforcement (no branch/warehouse yet)
 *   4. Recording the audit log entry with old + new permission keys
 *
 * Originally extracted from `apps/api/src/routes/permissions.ts` as
 * part of Quality Pass 5, Route Migration 5/24.
 *
 * Important: this service is for MEMBERSHIP PERMISSIONS (employee
 * RBAC). It must NOT be conflated with:
 *   - AuthFlowService (merchant login/register) in @haa/commerce-core
 *   - AdminAuthService (admin login) in @haa/auth-core/admin-auth-service
 */

export interface MembershipContext {
  storeId: number;
  tenantId: number;
  actorUserId: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface MembershipBasic {
  id: number;
  userId: number;
  role: UserRole | string;
}

export interface MembershipPermissionRow {
  permissionKey: string;
  scopeType: string;
  scopeId: number | null;
  createdAt?: Date;
  createdByUserId?: number | null;
}

export interface UpsertPermissionInput {
  permissionKey: string;
  scopeType: ScopeType;
  scopeId?: number | null;
}

export type GetMembershipError =
  | { kind: 'not_found'; message: string };

export type UpsertPermissionsError =
  | { kind: 'not_found'; message: string }
  | { kind: 'last_owner'; message: string }
  | { kind: 'self_modification'; message: string }
  | { kind: 'invalid_permission'; message: string; key: string }
  | { kind: 'invalid_scope'; message: string; scope: string }
  | { kind: 'scope_not_available'; message: string };

export interface UpsertPermissionsResult {
  membershipId: number;
  oldPermissionKeys: string[];
  newPermissions: MembershipPermissionRow[];
}

const NOT_FOUND_MESSAGE = 'الموظف غير موجود في هذا المتجر';
const LAST_OWNER_MESSAGE = 'لا يمكن تغيير صلاحيات آخر مالك';
const SELF_MODIFICATION_MESSAGE = 'لا يمكنك تغيير صلاحياتك';
const SCOPE_NOT_AVAILABLE_MESSAGE = 'الصلاحيات تعمل على مستوى المتجر فقط. النطاق المختار غير متاح حالياً';

export class PermissionService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
  ) {}

  /**
   * Find a membership by id, scoped to the store/tenant context.
   *
   * The join on `stores.tenantId` ensures the caller can't read
   * memberships from a different tenant by passing an arbitrary id.
   */
  async findMembership(
    ctx: MembershipContext,
    membershipId: number,
  ): Promise<MembershipBasic | GetMembershipError> {
    const [membership] = await this.db
      .select({
        id: s.tenantUsers.id,
        userId: s.tenantUsers.userId,
        role: s.tenantUsers.role,
      })
      .from(s.tenantUsers)
      .innerJoin(s.stores, eq(s.tenantUsers.tenantId, s.stores.tenantId))
      .where(and(eq(s.stores.id, ctx.storeId), eq(s.tenantUsers.id, membershipId)))
      .limit(1);

    if (!membership) {
      return { kind: 'not_found', message: NOT_FOUND_MESSAGE };
    }
    return membership;
  }

  /**
   * Read the current permissions assigned to a membership.
   * Caller is responsible for the membership-existence check via
   * `findMembership` first (this method does NOT verify).
   */
  async listMembershipPermissions(membershipId: number): Promise<MembershipPermissionRow[]> {
    return this.db
      .select({
        permissionKey: s.membershipPermissions.permissionKey,
        scopeType: s.membershipPermissions.scopeType,
        scopeId: s.membershipPermissions.scopeId,
        createdAt: s.membershipPermissions.createdAt,
        createdByUserId: s.membershipPermissions.createdByUserId,
      })
      .from(s.membershipPermissions)
      .where(eq(s.membershipPermissions.membershipId, membershipId))
      .orderBy(s.membershipPermissions.createdAt);
  }

  /**
   * Upsert (delete + insert in a single transaction) the permissions
   * for a membership. Enforces all business rules:
   *   - membership must exist in the store/tenant
   *   - can't modify own permissions
   *   - can't demote the last owner
   *   - permission keys must exist in the catalog
   *   - scope types must be in ALLOWED_SCOPES
   *   - only store-scope is currently accepted
   *   - audit log records old + new keys
   *
   * Returns the new permission set + the old keys so the caller
   * can shape the response.
   */
  async upsertMembershipPermissions(
    ctx: MembershipContext,
    membershipId: number,
    requested: UpsertPermissionInput[],
  ): Promise<UpsertPermissionsResult | UpsertPermissionsError> {
    // 1. Verify membership exists in this store/tenant
    const membership = await this.findMembership(ctx, membershipId);
    if ('kind' in membership) {
      return membership;
    }

    // 2. Owner protection: can't demote the last owner
    if (membership.role === 'owner') {
      const [ownerCount] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(s.tenantUsers)
        .where(and(
          eq(s.tenantUsers.tenantId, ctx.tenantId),
          eq(s.tenantUsers.role, 'owner'),
        ));

      if (ownerCount.total <= 1) {
        return { kind: 'last_owner', message: LAST_OWNER_MESSAGE };
      }
    }

    // 3. Self-permission blocking
    if (membership.userId === ctx.actorUserId) {
      return { kind: 'self_modification', message: SELF_MODIFICATION_MESSAGE };
    }

    // 4. Deduplicate input permissions
    const uniquePermissions = requested.filter(
      (p, index, self) =>
        index === self.findIndex(
          (t) => t.permissionKey === p.permissionKey && t.scopeType === t.scopeType && p.scopeId === t.scopeId,
        ),
    );

    // 5. Validate permission keys
    const invalidPermission = uniquePermissions.find(
      (p) => !PERMISSION_CATALOG.some((mp) => mp.key === p.permissionKey),
    );
    if (invalidPermission) {
      return {
        kind: 'invalid_permission',
        message: `مفتاح الصلاحية '${invalidPermission.permissionKey}' غير موجود`,
        key: invalidPermission.permissionKey,
      };
    }

    // 6. Validate scope types
    const invalidScope = uniquePermissions.find(
      (p) => !ALLOWED_SCOPES.some((ascope) => ascope.scopeType === p.scopeType),
    );
    if (invalidScope) {
      return {
        kind: 'invalid_scope',
        message: `النطاق '${invalidScope.scopeType}' غير متاح`,
        scope: invalidScope.scopeType,
      };
    }

    // 7. Only store scope is currently supported
    const storeScopePermissions = uniquePermissions.filter(
      (p) => p.scopeType === 'store' && (p.scopeId === null || p.scopeId === 0),
    );
    if (storeScopePermissions.length < uniquePermissions.length) {
      return { kind: 'scope_not_available', message: SCOPE_NOT_AVAILABLE_MESSAGE };
    }

    // 8. Read old permissions for the audit log (BEFORE the transaction
    //    so the tx stays focused on delete+insert+read-back).
    const oldPermissions = await this.listMembershipPermissions(membershipId);
    const oldPermissionKeys = oldPermissions.map((p) => p.permissionKey);

    // 9. Transaction: delete old, insert new, read back, audit
    return this.db.transaction(async (tx) => {
      // Delete existing permissions
      await tx
        .delete(s.membershipPermissions)
        .where(eq(s.membershipPermissions.membershipId, membershipId));

      // Insert new permissions (only the validated store-scope ones)
      const valuesToInsert = storeScopePermissions.map((p) => ({
        membershipId,
        permissionKey: p.permissionKey,
        scopeType: 'store' as const,
        scopeId: null,
        createdByUserId: ctx.actorUserId,
      }));

      if (valuesToInsert.length > 0) {
        await tx.insert(s.membershipPermissions).values(valuesToInsert);
      }

      // Read updated permissions
      const newPermissions = await tx
        .select({
          permissionKey: s.membershipPermissions.permissionKey,
          scopeType: s.membershipPermissions.scopeType,
          scopeId: s.membershipPermissions.scopeId,
          createdAt: s.membershipPermissions.createdAt,
          createdByUserId: s.membershipPermissions.createdByUserId,
        })
        .from(s.membershipPermissions)
        .where(eq(s.membershipPermissions.membershipId, membershipId))
        .orderBy(s.membershipPermissions.createdAt);

      // Audit log with old + new keys
      await this.audit.record({
        actorUserId: ctx.actorUserId,
        tenantId: ctx.tenantId,
        storeId: ctx.storeId,
        action: 'employee_permissions_updated',
        entityType: 'employee',
        entityId: membershipId,
        oldValue: {
          permissions: oldPermissionKeys,
          membershipId,
        },
        newValue: {
          permissions: newPermissions.map((p) => p.permissionKey),
          membershipId,
          changedByUserId: ctx.actorUserId,
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      return {
        membershipId,
        oldPermissionKeys,
        newPermissions,
      };
    });
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const permissionService = new PermissionService();
