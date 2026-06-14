import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, sql } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { hashPassword } from '@haa/auth-core';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { getPermissionsForRole, ROLE_PERMISSIONS, type UserRole } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';

const employeesRouter = new Hono();

employeesRouter.use('*', requireAuth(), requireStoreAccess());

const VALID_ROLES = Object.keys(ROLE_PERMISSIONS) as UserRole[];

const inviteSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  role: z.enum(VALID_ROLES as [string, ...string[]]).refine(
    (r): r is UserRole => VALID_ROLES.includes(r as UserRole),
    { message: 'Invalid role' },
  ),
});

const updateEmployeeSchema = z.object({
  role: z.enum(VALID_ROLES as [string, ...string[]]).refine(
    (r): r is UserRole => VALID_ROLES.includes(r as UserRole),
    { message: 'Invalid role' },
  ).optional(),
  isActive: z.boolean().optional(),
});

async function getTenantIdFromStore(storeId: number): Promise<number | null> {
  const db = createDbClient();
  const [store] = await db.select({ tenantId: s.stores.tenantId })
    .from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
  return store?.tenantId ?? null;
}

function auditMeta(c: any) {
  const auth = getAuth(c)!;
  return {
    actorUserId: auth.userId,
    tenantId: auth.tenantId,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
}

async function countOwnersInTenant(tenantId: number, excludeUserId?: number): Promise<number> {
  const db = createDbClient();
  const condition = excludeUserId !== undefined
    ? and(eq(s.tenantUsers.tenantId, tenantId), eq(s.tenantUsers.role, 'owner'), sql`${s.tenantUsers.userId} != ${excludeUserId}`)
    : and(eq(s.tenantUsers.tenantId, tenantId), eq(s.tenantUsers.role, 'owner'));
  const [result] = await db.select({ total: sql<number>`count(*)::int` }).from(s.tenantUsers).where(condition);
  return result?.total ?? 0;
}

employeesRouter.get('/', requirePermission('employees:view'), async (c) => {
  const auth = getAuth(c)!;
  const tenantId = auth.tenantId;
  const db = createDbClient();

  const rows = await db.select({
    id: s.tenantUsers.id,
    userId: s.users.id,
    name: s.users.name,
    email: s.users.email,
    role: s.tenantUsers.role,
    isActive: s.users.isActive,
    lastLoginAt: s.users.lastLoginAt,
    createdAt: s.tenantUsers.createdAt,
  })
    .from(s.tenantUsers)
    .innerJoin(s.users, eq(s.tenantUsers.userId, s.users.id))
    .where(eq(s.tenantUsers.tenantId, tenantId))
    .orderBy(s.tenantUsers.createdAt);

  const employees = rows.map(row => ({
    id: row.id,
    userId: row.userId,
    name: row.name,
    email: row.email,
    role: row.role as UserRole,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    permissions: getPermissionsForRole(row.role as UserRole),
  }));

  return c.json({ success: true, data: employees });
});

employeesRouter.post('/invite', requirePermission('employees:invite'), zValidator('json', inviteSchema), async (c) => {
  const auth = getAuth(c)!;
  const tenantId = auth.tenantId;
  const body = c.req.valid('json');
  const db = createDbClient();

  if (body.role === 'owner' && !auth.permissions.includes('employees:manage_permissions')) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'فقط المالك يمكنه تعيين مالك جديد' } }, 403);
  }

  const existingUser = await db.select().from(s.users).where(eq(s.users.email, body.email)).limit(1);

  let userId: number;

  if (existingUser.length > 0) {
    userId = existingUser[0].id;
    const existingLink = await db.select().from(s.tenantUsers)
      .where(and(eq(s.tenantUsers.tenantId, tenantId), eq(s.tenantUsers.userId, userId)))
      .limit(1);
    if (existingLink.length > 0) {
      await new AuditLogService().record({
        ...auditMeta(c),
        storeId: auth.activeStoreId,
        action: 'employee_duplicate_rejected',
        entityType: 'employee',
        newValue: { email: body.email },
      });
      return c.json({ success: false, error: { code: 'CONFLICT', message: 'هذا المستخدم موجود بالفعل في هذا المتجر' } }, 409);
    }
  } else {
    const passwordHash = await hashPassword(body.password);
    const [user] = await db.insert(s.users).values({
      name: body.name,
      email: body.email,
      passwordHash,
    }).returning();
    userId = user.id;
  }

  const [tenantUser] = await db.insert(s.tenantUsers).values({
    tenantId,
    userId,
    role: body.role,
  }).returning();

  const [userRecord] = await db.select().from(s.users).where(eq(s.users.id, userId)).limit(1);

  await new AuditLogService().record({
    ...auditMeta(c),
    storeId: auth.activeStoreId,
    action: 'employee_invited',
    entityType: 'employee',
    entityId: tenantUser.id,
    newValue: { userId, name: userRecord.name, email: userRecord.email, role: body.role },
  });

  return c.json({
    success: true,
    data: {
      id: tenantUser.id,
      userId: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      role: body.role,
      isActive: userRecord.isActive,
      lastLoginAt: userRecord.lastLoginAt?.toISOString() ?? null,
      createdAt: tenantUser.createdAt.toISOString(),
      permissions: getPermissionsForRole(body.role),
    },
  }, 201);
});

employeesRouter.patch('/:employeeId', requirePermission('employees:update'), zValidator('json', updateEmployeeSchema), async (c) => {
  const auth = getAuth(c)!;
  const tenantId = auth.tenantId;
  const employeeId = Number(c.req.param('employeeId'));
  const body = c.req.valid('json');
  const db = createDbClient();

  const [existing] = await db.select({
    id: s.tenantUsers.id,
    userId: s.users.id,
    name: s.users.name,
    email: s.users.email,
    role: s.tenantUsers.role,
    isActive: s.users.isActive,
    lastLoginAt: s.users.lastLoginAt,
    createdAt: s.tenantUsers.createdAt,
  })
    .from(s.tenantUsers)
    .innerJoin(s.users, eq(s.tenantUsers.userId, s.users.id))
    .where(and(eq(s.tenantUsers.id, employeeId), eq(s.tenantUsers.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'الموظف غير موجود' } }, 404);
  }

  if (body.role && body.role !== existing.role) {
    const remainingOwners = await countOwnersInTenant(tenantId, existing.userId);

    if (existing.role === 'owner') {
      if (remainingOwners < 1) {
        return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكن تخفيض آخر مالك. قم بتعيين مالك آخر أولاً.' } }, 403);
      }
    }

    if (existing.userId === auth.userId) {
      await new AuditLogService().record({
        ...auditMeta(c),
        storeId: auth.activeStoreId,
        action: 'employee_self_restriction_blocked',
        entityType: 'employee',
        entityId: employeeId,
        newValue: { requestedRole: body.role, currentRole: existing.role },
      });
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكنك تغيير دورك بنفسك' } }, 403);
    }

    if (body.role === 'owner' && !auth.permissions.includes('employees:manage_permissions')) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'فقط المالك يمكنه تعيين مالك جديد' } }, 403);
    }

    const actorRoles = auth.roles;
    if (!actorRoles.includes('owner') && body.role !== existing.role) {
      const existingRank = VALID_ROLES.indexOf(existing.role as UserRole);
      const requestedRank = VALID_ROLES.indexOf(body.role);
      if (requestedRank < existingRank) {
        return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكنك منح دور أعلى من دورك' } }, 403);
      }
    }

    await db.update(s.tenantUsers).set({ role: body.role }).where(eq(s.tenantUsers.id, employeeId));
  }

  if (body.isActive !== undefined) {
    await db.update(s.users).set({ isActive: body.isActive }).where(eq(s.users.id, existing.userId));
  }

  const [updated] = await db.select({
    id: s.tenantUsers.id,
    userId: s.users.id,
    name: s.users.name,
    email: s.users.email,
    role: s.tenantUsers.role,
    isActive: s.users.isActive,
    lastLoginAt: s.users.lastLoginAt,
    createdAt: s.tenantUsers.createdAt,
  })
    .from(s.tenantUsers)
    .innerJoin(s.users, eq(s.tenantUsers.userId, s.users.id))
    .where(eq(s.tenantUsers.id, employeeId))
    .limit(1);

  const oldRole = existing.role;
  const newRole = updated.role;
  const oldActive = existing.isActive;
  const newActive = updated.isActive;

  if (oldRole !== newRole) {
    await new AuditLogService().record({
      ...auditMeta(c),
      storeId: auth.activeStoreId,
      action: 'employee_role_changed',
      entityType: 'employee',
      entityId: employeeId,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
    });
  }

  if (oldActive !== newActive) {
    const action = newActive ? 'employee_status_changed' : 'employee_removed';
    await new AuditLogService().record({
      ...auditMeta(c),
      storeId: auth.activeStoreId,
      action,
      entityType: 'employee',
      entityId: employeeId,
      oldValue: { isActive: oldActive },
      newValue: { isActive: newActive },
    });
  }

  return c.json({
    success: true,
    data: {
      id: updated.id,
      userId: updated.userId,
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      isActive: updated.isActive,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      permissions: getPermissionsForRole(updated.role as UserRole),
    },
  });
});

employeesRouter.delete('/:employeeId', requirePermission('employees:delete'), async (c) => {
  const auth = getAuth(c)!;
  const tenantId = auth.tenantId;
  const employeeId = Number(c.req.param('employeeId'));
  const db = createDbClient();

  const [existing] = await db.select({
    id: s.tenantUsers.id,
    userId: s.users.id,
    role: s.tenantUsers.role,
  })
    .from(s.tenantUsers)
    .where(and(eq(s.tenantUsers.id, employeeId), eq(s.tenantUsers.tenantId, tenantId)))
    .limit(1);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'الموظف غير موجود' } }, 404);
  }

  if (existing.role === 'owner') {
    const remainingOwners = await countOwnersInTenant(tenantId, existing.userId);
    if (remainingOwners < 1) {
      await new AuditLogService().record({
        ...auditMeta(c),
        storeId: auth.activeStoreId,
        action: 'employee_last_owner_blocked',
        entityType: 'employee',
        entityId: employeeId,
        oldValue: { userId: existing.userId, role: existing.role },
      });
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكن حذف آخر مالك' } }, 403);
    }
  }

  if (existing.userId === auth.userId) {
    await new AuditLogService().record({
      ...auditMeta(c),
      storeId: auth.activeStoreId,
      action: 'employee_self_restriction_blocked',
      entityType: 'employee',
      entityId: employeeId,
      oldValue: { userId: existing.userId, role: existing.role },
    });
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكنك حذف نفسك' } }, 403);
  }

  await db.delete(s.tenantUsers).where(eq(s.tenantUsers.id, employeeId));
  await db.update(s.users).set({ isActive: false }).where(eq(s.users.id, existing.userId));

  await new AuditLogService().record({
    ...auditMeta(c),
    storeId: auth.activeStoreId,
    action: 'employee_removed',
    entityType: 'employee',
    entityId: employeeId,
    oldValue: { userId: existing.userId, role: existing.role },
  });

  return c.json({ success: true, data: { success: true } });
});

export { employeesRouter };
