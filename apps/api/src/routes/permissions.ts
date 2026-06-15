import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { PERMISSION_CATALOG, type PermissionInfo, PERMISSION_PRESETS } from '@haa/shared';
import { PermissionService } from '@haa/auth-core';

const permissionsRouter = new Hono();

permissionsRouter.use('*', requireAuth(), requireStoreAccess());

const upsertPermissionsSchema = z.object({
  permissions: z.array(z.object({
    permissionKey: z.string(),
    scopeType: z.enum(['store', 'branch', 'warehouse', 'channel'] as const),
    scopeId: z.number().optional(),
  })),
});

permissionsRouter.get('/permissions', requirePermission('employees:update'), async (c) => {
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
  const membershipId = Number(c.req.param('membershipId'));
  const service = new PermissionService();

  // Verify membership belongs to this store/tenant
  const membership = await service.findMembership(
    { storeId, tenantId: auth.tenantId, actorUserId: auth.userId },
    membershipId,
  );

  if ('kind' in membership) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: membership.message } },
      404,
    );
  }

  const permissions = await service.listMembershipPermissions(membershipId);

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
  const membershipId = Number(c.req.param('membershipId'));
  const { permissions: requestedPermissions } = c.req.valid('json');
  const service = new PermissionService();

  const result = await service.upsertMembershipPermissions(
    {
      storeId,
      tenantId: auth.tenantId,
      actorUserId: auth.userId,
      ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
      userAgent: c.req.header('user-agent'),
    },
    membershipId,
    requestedPermissions,
  );

  if ('kind' in result) {
    // Map error kinds to HTTP status codes (matches original route behavior).
    switch (result.kind) {
      case 'not_found':
        return c.json(
          { success: false, error: { code: 'NOT_FOUND', message: result.message } },
          404,
        );
      case 'last_owner':
      case 'self_modification':
        return c.json(
          { success: false, error: { code: 'FORBIDDEN', message: result.message } },
          403,
        );
      case 'invalid_permission':
        return c.json(
          {
            success: false,
            error: { code: 'INVALID_PERMISSION', message: result.message },
          },
          400,
        );
      case 'invalid_scope':
        return c.json(
          {
            success: false,
            error: { code: 'INVALID_SCOPE', message: result.message },
          },
          400,
        );
      case 'scope_not_available':
        return c.json(
          {
            success: false,
            error: { code: 'SCOPE_NOT_AVAILABLE', message: result.message },
          },
          400,
        );
    }
  }

  return c.json({
    success: true,
    data: {
      membershipId: result.membershipId,
      permissions: result.newPermissions,
    },
  });
});

export { permissionsRouter };
