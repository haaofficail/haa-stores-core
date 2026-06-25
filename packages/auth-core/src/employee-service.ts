import { eq, and, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { hashPassword } from './password.js';
import { getPermissionsForRole, ROLE_PERMISSIONS, type UserRole } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';
import { countTenantOwners } from './tenant-owners-helper.js';

/**
 * EmployeeService — owns the employee-membership business logic.
 *
 * This service is the ONLY place in the project that is allowed to
 * touch the `tenantUsers` and `users` tables for employee
 * management purposes. The route is transport-only.
 *
 * Encapsulates:
 *   1. Listing the employees in a tenant (with their role +
 *      permission mapping)
 *   2. Inviting a new employee (check existing user → create user
 *      if needed → link to tenant → audit)
 *   3. Updating an employee's role + isActive (with full
 *      business rules: last-owner, self-modification,
 *      owner-only owner-assignment, role-rank check)
 *   4. Soft-revoking an employee (delete membership + disable
 *      user) with all business rules
 *
 * Originally extracted from `apps/api/src/routes/employees.ts` as
 * part of Quality Pass 5, Route Migration 6/24.
 *
 * Important: this service is for EMPLOYEE management. It must NOT
 * be conflated with:
 *   - AuthFlowService (merchant login/register) in @haa/commerce-core
 *   - AdminAuthService (admin login) in @haa/auth-core
 *   - PermissionService (membership permission assignments) in
 *     @haa/auth-core — that service owns the membershipPermissions
 *     table; this one owns the tenantUsers table.
 */

export interface EmployeeContext {
  tenantId: number;
  storeId?: number;
  actorUserId: number;
  actorRoles: string[];
  actorPermissions: string[];
  ipAddress?: string;
  userAgent?: string;
}

export interface EmployeeRow {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: UserRole | string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissions: string[];
}

export interface InviteEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: UserRole | string;
}

export type InviteEmployeeError =
  | { kind: 'owner_requires_manage_permissions'; message: string }
  | { kind: 'duplicate'; message: string };

export type ListEmployeesResult = EmployeeRow[];

export type GetEmployeeError = { kind: 'not_found'; message: string };

export interface UpdateEmployeeInput {
  role?: UserRole | string;
  isActive?: boolean;
}

export type UpdateEmployeeError =
  | { kind: 'not_found'; message: string }
  | { kind: 'last_owner'; message: string }
  | { kind: 'self_modification'; message: string; requestedRole: string; currentRole: string }
  | { kind: 'owner_requires_manage_permissions'; message: string }
  | { kind: 'cannot_grant_higher_role'; message: string };

export type RevokeEmployeeError =
  | { kind: 'not_found'; message: string }
  | { kind: 'last_owner'; message: string }
  | { kind: 'self_modification'; message: string };

const VALID_ROLES = Object.keys(ROLE_PERMISSIONS) as UserRole[];

export class EmployeeService {
  constructor(
    private db: DbClient = createDbClient(),
    private audit: AuditLogService = new AuditLogService(),
  ) {}

  /**
   * Map a tenantUsers + users join row to the public EmployeeRow
   * shape (with the role's permissions attached).
   */
  private toEmployeeRow(row: {
    id: number;
    userId: number;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  }): EmployeeRow {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      permissions: getPermissionsForRole(row.role as UserRole),
    };
  }

  /**
   * Build the store-scoping clause: matches members whose storeId is
   * NULL (tenant-wide role) OR equals the caller's storeId.
   *
   * Before migration 0087 this scoping did not exist and the
   * Employees page leaked owners of OTHER stores in the same tenant.
   * The clause MUST be applied to every read/write in this service
   * — adding a method without it reopens the leak. See
   * `tests/employees-cross-store-isolation.test.ts`.
   */
  private storeScopeClause(ctx: Pick<EmployeeContext, 'storeId'>) {
    if (ctx.storeId === undefined) {
      // No storeId in context = caller is platform-admin (no merchant
      // dashboard request). Return a no-op clause.
      return sql`TRUE`;
    }
    return sql`(${s.tenantUsers.storeId} IS NULL OR ${s.tenantUsers.storeId} = ${ctx.storeId})`;
  }

  /**
   * Read a membership + its user record, scoped to the tenant AND
   * the caller's store. Returns `null` if the membership does not
   * exist in this (tenant, store) pair.
   */
  private async findEmployee(ctx: Pick<EmployeeContext, 'tenantId' | 'storeId'>, employeeId: number) {
    const [row] = await this.db
      .select({
        id: s.tenantUsers.id,
        storeId: s.tenantUsers.storeId,
        userId: s.users.id,
        name: s.users.name,
        email: s.users.email,
        role: s.tenantUsers.role,
        // Per-membership active flag (post-migration 0087). The
        // previous code used s.users.isActive which is a GLOBAL
        // flag — flipping it off here would lock the user out of
        // every other tenant they belong to.
        isActive: s.tenantUsers.isActive,
        lastLoginAt: s.users.lastLoginAt,
        createdAt: s.tenantUsers.createdAt,
      })
      .from(s.tenantUsers)
      .innerJoin(s.users, eq(s.tenantUsers.userId, s.users.id))
      .where(and(
        eq(s.tenantUsers.id, employeeId),
        eq(s.tenantUsers.tenantId, ctx.tenantId),
        this.storeScopeClause(ctx),
      ))
      .limit(1);
    return row ?? null;
  }

  /** List all employees of a store inside the tenant. */
  async list(ctx: Pick<EmployeeContext, 'tenantId' | 'storeId'>): Promise<ListEmployeesResult> {
    const rows = await this.db
      .select({
        id: s.tenantUsers.id,
        storeId: s.tenantUsers.storeId,
        userId: s.users.id,
        name: s.users.name,
        email: s.users.email,
        role: s.tenantUsers.role,
        // Per-membership active flag (post-migration 0087). The
        // previous code used s.users.isActive which is a GLOBAL
        // flag — flipping it off here would lock the user out of
        // every other tenant they belong to.
        isActive: s.tenantUsers.isActive,
        lastLoginAt: s.users.lastLoginAt,
        createdAt: s.tenantUsers.createdAt,
      })
      .from(s.tenantUsers)
      .innerJoin(s.users, eq(s.tenantUsers.userId, s.users.id))
      .where(and(
        eq(s.tenantUsers.tenantId, ctx.tenantId),
        this.storeScopeClause(ctx),
      ))
      .orderBy(s.tenantUsers.createdAt);

    return rows.map((r) => this.toEmployeeRow(r));
  }

  /**
   * Invite a new employee. If the email already exists in the
   * system, link the existing user to the tenant (refusing if
   * they're already linked). Otherwise create a new user.
   */
  async invite(
    ctx: EmployeeContext,
    input: InviteEmployeeInput,
  ): Promise<EmployeeRow | InviteEmployeeError> {
    // 1. Only members with employees:manage_permissions may assign the owner role
    if (input.role === 'owner' && !ctx.actorPermissions.includes('employees:manage_permissions')) {
      return { kind: 'owner_requires_manage_permissions', message: 'فقط المالك يمكنه تعيين مالك جديد' };
    }

    // 2. Check if user already exists
    const existingUser = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.email, input.email))
      .limit(1);

    let userId: number;

    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      // Check if the user is already linked to THIS (tenant, store)
      // pair. A user CAN hold memberships in two different stores of
      // the same tenant (multi-store franchise pattern), so we scope
      // the duplicate check to the caller's store.
      const existingLink = await this.db
        .select()
        .from(s.tenantUsers)
        .where(and(
          eq(s.tenantUsers.tenantId, ctx.tenantId),
          eq(s.tenantUsers.userId, userId),
          this.storeScopeClause(ctx),
        ))
        .limit(1);
      if (existingLink.length > 0) {
        await this.audit.record({
          actorUserId: ctx.actorUserId,
          tenantId: ctx.tenantId,
          storeId: ctx.storeId,
          action: 'employee_duplicate_rejected',
          entityType: 'employee',
          newValue: { email: input.email },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
        return { kind: 'duplicate', message: 'هذا المستخدم موجود بالفعل في هذا المتجر' };
      }
    } else {
      // 3. Create a new user
      const passwordHash = await hashPassword(input.password);
      const [user] = await this.db
        .insert(s.users)
        .values({ name: input.name, email: input.email, passwordHash })
        .returning();
      userId = user.id;
    }

    // 4. Create the tenant link, scoped to the caller's store.
    // `storeId: ctx.storeId ?? null` keeps the tenant-wide branch open
    // for platform-level invites (no store in context) and pins
    // merchant-dashboard invites to the merchant's active store.
    const [tenantUser] = await this.db
      .insert(s.tenantUsers)
      .values({ tenantId: ctx.tenantId, storeId: ctx.storeId ?? null, userId, role: input.role })
      .returning();

    // 5. Read back the user record for the response
    const [userRecord] = await this.db
      .select()
      .from(s.users)
      .where(eq(s.users.id, userId))
      .limit(1);

    // 6. Audit
    await this.audit.record({
      actorUserId: ctx.actorUserId,
      tenantId: ctx.tenantId,
      storeId: ctx.storeId,
      action: 'employee_invited',
      entityType: 'employee',
      entityId: tenantUser.id,
      newValue: { userId, name: userRecord.name, email: userRecord.email, role: input.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toEmployeeRow({
      id: tenantUser.id,
      userId: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: tenantUser.role,
      isActive: userRecord.isActive,
      lastLoginAt: userRecord.lastLoginAt,
      createdAt: tenantUser.createdAt,
    });
  }

  /**
   * Update an employee's role and/or isActive. Enforces all
   * business rules: last-owner, self-modification, owner-only
   * owner-assignment, and the non-owner role-rank check.
   */
  async update(
    ctx: EmployeeContext,
    employeeId: number,
    input: UpdateEmployeeInput,
  ): Promise<EmployeeRow | UpdateEmployeeError> {
    // 1. Read existing
    const existing = await this.findEmployee(ctx, employeeId);
    if (!existing) {
      return { kind: 'not_found', message: 'الموظف غير موجود' };
    }

    // 2. Role change rules (only run if the role is actually changing)
    if (input.role && input.role !== existing.role) {
      // 2a. Last-owner check (uses the shared helper)
      if (existing.role === 'owner') {
        const remainingOwners = await countTenantOwners(this.db, ctx.tenantId, existing.userId, ctx.storeId);
        if (remainingOwners < 1) {
          return { kind: 'last_owner', message: 'لا يمكن تخفيض آخر مالك. قم بتعيين مالك آخر أولاً.' };
        }
      }

      // 2b. Self-modification block
      if (existing.userId === ctx.actorUserId) {
        await this.audit.record({
          actorUserId: ctx.actorUserId,
          tenantId: ctx.tenantId,
          storeId: ctx.storeId,
          action: 'employee_self_restriction_blocked',
          entityType: 'employee',
          entityId: employeeId,
          newValue: { requestedRole: input.role, currentRole: existing.role },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
        return {
          kind: 'self_modification',
          message: 'لا يمكنك تغيير دورك بنفسك',
          requestedRole: input.role,
          currentRole: existing.role,
        };
      }

      // 2c. Only members with employees:manage_permissions may assign the owner role
      if (input.role === 'owner' && !ctx.actorPermissions.includes('employees:manage_permissions')) {
        return { kind: 'owner_requires_manage_permissions', message: 'فقط المالك يمكنه تعيين مالك جديد' };
      }

      // 2d. Non-owners cannot grant a role higher than their own
      if (!ctx.actorRoles.includes('owner')) {
        const existingRank = VALID_ROLES.indexOf(existing.role as UserRole);
        const requestedRank = VALID_ROLES.indexOf(input.role as UserRole);
        if (requestedRank < existingRank) {
          return { kind: 'cannot_grant_higher_role', message: 'لا يمكنك منح دور أعلى من دورك' };
        }
      }

      // 2e. Apply the role change
      await this.db
        .update(s.tenantUsers)
        .set({ role: input.role })
        .where(eq(s.tenantUsers.id, employeeId));
    }

    // 3. isActive change — scoped to this MEMBERSHIP, not the global
    // user record. Pre-fix this called `db.update(users).set({isActive})`
    // — a user who was a member of multiple tenants got locked out
    // of every tenant when removed from any one. Audit P0 (2026-06-25).
    if (input.isActive !== undefined) {
      // Defensive: include tenantId in the WHERE so a malicious
      // employeeId from another tenant cannot be touched even if it
      // somehow slipped past findEmployee.
      await this.db
        .update(s.tenantUsers)
        .set({
          isActive: input.isActive,
          revokedAt: input.isActive ? null : new Date(),
          revokedByUserId: input.isActive ? null : ctx.actorUserId,
        })
        .where(and(
          eq(s.tenantUsers.id, employeeId),
          eq(s.tenantUsers.tenantId, ctx.tenantId),
        ));
    }

    // 4. Read back the updated record
    const updated = await this.findEmployee(ctx, employeeId);
    if (!updated) {
      // Shouldn't happen — we just updated it. Map to not_found to
      // satisfy the type, then return as last resort.
      return { kind: 'not_found', message: 'الموظف غير موجود' };
    }

    // 5. Audit (only if something actually changed)
    if (input.role && existing.role !== updated.role) {
      await this.audit.record({
        actorUserId: ctx.actorUserId,
        tenantId: ctx.tenantId,
        storeId: ctx.storeId,
        action: 'employee_role_changed',
        entityType: 'employee',
        entityId: employeeId,
        oldValue: { role: existing.role },
        newValue: { role: updated.role },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }

    if (input.isActive !== undefined && existing.isActive !== updated.isActive) {
      const action = updated.isActive ? 'employee_status_changed' : 'employee_removed';
      await this.audit.record({
        actorUserId: ctx.actorUserId,
        tenantId: ctx.tenantId,
        storeId: ctx.storeId,
        action,
        entityType: 'employee',
        entityId: employeeId,
        oldValue: { isActive: existing.isActive },
        newValue: { isActive: updated.isActive },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
    }

    return this.toEmployeeRow(updated);
  }

  /**
   * Soft-revoke an employee: delete the tenantUsers link and
   * disable the user record. Enforces last-owner + self-mod
   * protections.
   */
  async revoke(
    ctx: EmployeeContext,
    employeeId: number,
  ): Promise<{ success: true } | RevokeEmployeeError> {
    // 1. Read existing
    const [existing] = await this.db
      .select({
        id: s.tenantUsers.id,
        userId: s.users.id,
        role: s.tenantUsers.role,
      })
      .from(s.tenantUsers)
      .where(and(
        eq(s.tenantUsers.id, employeeId),
        eq(s.tenantUsers.tenantId, ctx.tenantId),
        this.storeScopeClause(ctx),
      ))
      .limit(1);

    if (!existing) {
      return { kind: 'not_found', message: 'الموظف غير موجود' };
    }

    // 2. Last-owner check (store-scoped — see countTenantOwners doc).
    if (existing.role === 'owner') {
      const remainingOwners = await countTenantOwners(this.db, ctx.tenantId, existing.userId, ctx.storeId);
      if (remainingOwners < 1) {
        await this.audit.record({
          actorUserId: ctx.actorUserId,
          tenantId: ctx.tenantId,
          storeId: ctx.storeId,
          action: 'employee_last_owner_blocked',
          entityType: 'employee',
          entityId: employeeId,
          oldValue: { userId: existing.userId, role: existing.role },
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        });
        return { kind: 'last_owner', message: 'لا يمكن حذف آخر مالك' };
      }
    }

    // 3. Self-modification block
    if (existing.userId === ctx.actorUserId) {
      await this.audit.record({
        actorUserId: ctx.actorUserId,
        tenantId: ctx.tenantId,
        storeId: ctx.storeId,
        action: 'employee_self_restriction_blocked',
        entityType: 'employee',
        entityId: employeeId,
        oldValue: { userId: existing.userId, role: existing.role },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });
      return { kind: 'self_modification', message: 'لا يمكنك حذف نفسك' };
    }

    // 4. Soft-revoke at the MEMBERSHIP level only. We do NOT delete
    // the row (we want the audit history) and we do NOT touch
    // `users.isActive` — that would lock the user out of any OTHER
    // tenant they belong to. Audit P0 (2026-06-25).
    //
    // The defensive WHERE on tenant_id prevents a malicious caller
    // from passing a tenant_users.id that belongs to a different
    // tenant — even if the caller bypassed the read above somehow.
    await this.db.update(s.tenantUsers)
      .set({
        isActive: false,
        revokedAt: new Date(),
        revokedByUserId: ctx.actorUserId,
      })
      .where(and(
        eq(s.tenantUsers.id, employeeId),
        eq(s.tenantUsers.tenantId, ctx.tenantId),
      ));

    // 5. Audit
    await this.audit.record({
      actorUserId: ctx.actorUserId,
      tenantId: ctx.tenantId,
      storeId: ctx.storeId,
      action: 'employee_removed',
      entityType: 'employee',
      entityId: employeeId,
      oldValue: { userId: existing.userId, role: existing.role },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { success: true };
  }
}

/** Shared default instance for ad-hoc callers (most code uses DI). */
export const employeeService = new EmployeeService();
