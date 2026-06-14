import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { PERMISSION_CATALOG, PermissionInfo, PERMISSION_PRESETS } from '@haa/shared';
import { ScopeType, ALLOWED_SCOPES } from '@haa/shared/permissions';
import { AuditLogService } from '@haa/integration-core';

const permissionsRouter = new Hono();

permissionsRouter.use('*', requireAuth(), requireStoreAccess());

const membershipPermissions = s.membershipPermissions;
const memberships = s.tenantUsers;
const stores = s.stores;

const upsertPermissionsSchema = z.object({
  permissions: z.array(z.object({
    permissionKey: z.string(),
    scopeType: z.enum(['store', 'branch', 'warehouse', 'channel'] as const),
    scopeId: z.number().optional(),
  })),
});

function auditMeta(c: any) {
  const auth = getAuth(c)!;
  return {
    actorUserId: auth.userId,
    tenantId: auth.tenantId,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
}

permissionsRouter.get('/permissions', requirePermission('employees:update'), async (c) => {
  const auth = getAuth(c)!;
  const storeId = auth.activeStoreId;
  const tenantId = auth.tenantId;
  const db = createDbClient();

  const grouped: Record<string, PermissionInfo[]> = {};
  PERMISSION_CATALOG.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });

  // This endpoint returns permissions grouped by category with default selection status
  // For a specific membership's permissions, use GET /memberships/:membershipId/permissions
  const permissionsWithDefaults = PERMISSION_CATALOG.map(p => ({
    key: p.key,
    labelAr: p.labelAr,
    descriptionAr: p.descriptionAr,
    category: p.category,
    riskLevel: p.riskLevel,
    allowedScopes: p.allowedScopes || ['store'],
    selected: false, // Default, actual membership permissions require membershipId
  }));

  return c.json({
    success: true,
    data: {
      permissions: permissionsWithDefaults,
      grouped,
    },
  });
});

permissionsRouter.get('/permission-presets', requirePermission('employees:update'), (c) => {
  return c.json({ success: true, data: PERMISSION_PRESETS });
});

permissionsRouter.get('/memberships/:membershipId/permissions', requirePermission('employees:update'), async (c) => {
  const auth = getAuth(c)!;
  const storeId = auth.activeStoreId;
  const tenantId = auth.tenantId;
  const membershipId = Number(c.req.param('membershipId'));
  const db = createDbClient();

  // Verify membership belongs to this store/tenant
  const [membership] = await db.select({
    id: memberships.id,
    userId: memberships.userId,
    role: memberships.role,
  })
  .from(memberships)
  .innerJoin(stores, eq(memberships.tenantId, stores.tenantId))
  .where(and(
    eq(stores.id, storeId),
    eq(memberships.id, membershipId),
  ))
  .limit(1);

  if (!membership) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'الموظف غير موجود في هذا المتجر' } }, 404);
  }

  const permissions = await db.select({
    permissionKey: membershipPermissions.permissionKey,
    scopeType: membershipPermissions.scopeType,
    scopeId: membershipPermissions.scopeId,
    createdAt: membershipPermissions.createdAt,
    createdByUserId: membershipPermissions.createdByUserId,
  })
  .from(membershipPermissions)
  .where(eq(membershipPermissions.membershipId, membershipId))
  .orderBy(membershipPermissions.createdAt);

  return c.json({
    success: true,
    data: {
      membershipId: membershipId,
      permissions: permissions,
    },
  });
});

permissionsRouter.patch('/memberships/:membershipId/permissions', requirePermission('employees:manage_permissions'), zValidator('json', upsertPermissionsSchema), async (c) => {
  const auth = getAuth(c)!;
  const storeId = auth.activeStoreId;
  const tenantId = auth.tenantId;
  const membershipId = Number(c.req.param('membershipId'));
  const { permissions: requestedPermissions } = c.req.valid('json');
  const db = createDbClient();

  // Verify membership belongs to this store/tenant
  const [membership] = await db.select({
    id: memberships.id,
    userId: memberships.userId,
    role: memberships.role,
  })
  .from(memberships)
  .innerJoin(stores, eq(memberships.tenantId, stores.tenantId))
  .where(and(
    eq(stores.id, storeId),
    eq(memberships.id, membershipId),
  ))
  .limit(1);

  if (!membership) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'الموظف غير موجود في هذا المتجر' } }, 404);
  }

  // Owner protection: if target is owner, check if this is the last owner
  if (membership.role === 'owner') {
    const [ownerCount] = await db.select({ total: sql<number>`count(*)::int` })
      .from(memberships)
      .where(and(
        eq(memberships.tenantId, tenantId),
        eq(memberships.role, 'owner'),
      ));

    if (ownerCount.total <= 1) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكن تغيير صلاحيات آخر مالك' } }, 403);
    }
  }

  // Self-permission blocking
  if (membership.userId === auth.userId) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'لا يمكنك تغيير صلاحياتك' } }, 403);
  }

  // Deduplicate input permissions
  const uniquePermissions = requestedPermissions.filter(
    (p, index, self) =>
      index === self.findIndex(
        (t) => t.permissionKey === p.permissionKey && t.scopeType === p.scopeType && t.scopeId === p.scopeId
      )
  );

  // Validate permission keys
  const invalidPermissions = uniquePermissions.filter(p => !PERMISSION_CATALOG.some(mp => mp.key === p.permissionKey));
  if (invalidPermissions.length > 0) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_PERMISSION',
        message: `مفتاح الصلاحية '${invalidPermissions[0].permissionKey}' غير موجود`,
      },
    }, 400);
  }

  // Validate scope types
  const invalidScopes = uniquePermissions.filter(p => !ALLOWED_SCOPES.some(ascope => ascope.scopeType === p.scopeType));
  if (invalidScopes.length > 0) {
    return c.json({
      success: false,
      error: {
        code: 'INVALID_SCOPE',
        message: `النطاق '${invalidScopes[0].scopeType}' غير متاح`,
      },
    }, 400);
  }

  // Currently only store scope is allowed
  const storeScopePermissions = uniquePermissions.filter(p => p.scopeType === 'store' && (p.scopeId === null || p.scopeId === 0));
  if (storeScopePermissions.length < uniquePermissions.length) {
    return c.json({
      success: false,
      error: {
        code: 'SCOPE_NOT_AVAILABLE',
        message: 'الصلاحيات تعمل على مستوى المتجر فقط. النطاق المختار غير متاح حالياً',
      },
    }, 400);
  }

  // Read old permissions for audit log
  const oldPermissions = await db.select({
    permissionKey: membershipPermissions.permissionKey,
    scopeType: membershipPermissions.scopeType,
    scopeId: membershipPermissions.scopeId,
  })
  .from(membershipPermissions)
  .where(eq(membershipPermissions.membershipId, membershipId))
  .orderBy(membershipPermissions.createdAt);

  const oldPermissionKeys = oldPermissions.map(p => p.permissionKey);

  // Transaction: delete old, insert new, read back, audit
  await db.transaction(async (tx) => {
    // Delete existing permissions
    await tx.delete(membershipPermissions).where(eq(membershipPermissions.membershipId, membershipId));

    // Insert new permissions
    const valuesToInsert = storeScopePermissions.map(p => ({
      membershipId: membershipId,
      permissionKey: p.permissionKey,
      scopeType: 'store',
      scopeId: null,
      createdByUserId: auth.userId,
    }));

    if (valuesToInsert.length > 0) {
      await tx.insert(membershipPermissions).values(valuesToInsert);
    }

    // Read updated permissions
    const newPermissions = await tx.select({
      permissionKey: membershipPermissions.permissionKey,
      scopeType: membershipPermissions.scopeType,
      scopeId: membershipPermissions.scopeId,
      createdAt: membershipPermissions.createdAt,
      createdByUserId: membershipPermissions.createdByUserId,
    })
    .from(membershipPermissions)
    .where(eq(membershipPermissions.membershipId, membershipId))
    .orderBy(membershipPermissions.createdAt);

    // Audit log with full old/new values
    await new AuditLogService().record({
      ...auditMeta(c),
      storeId: storeId,
      action: 'employee_permissions_updated',
      entityType: 'employee',
      entityId: membershipId,
      oldValue: {
        permissions: oldPermissionKeys,
        membershipId: membershipId,
      },
      newValue: {
        permissions: newPermissions.map(p => p.permissionKey),
        membershipId: membershipId,
        changedByUserId: auth.userId,
      },
    });

    // Return new permissions
    return c.json({
      success: true,
      data: {
        membershipId: membershipId,
        permissions: newPermissions,
      },
    });
  });
});

export { permissionsRouter };