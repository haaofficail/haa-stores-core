import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, requireStoreAccess, requirePermission, getAuth } from '@haa/auth-core';
import { EmployeeService } from '@haa/auth-core';
import { ROLE_PERMISSIONS, type UserRole } from '@haa/shared';

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

function buildCtx(c: Context) {
  const auth = getAuth(c)!;
  // storeId MUST come from the URL path, not from `auth.activeStoreId`
  // — the latter is the user's currently-active store in the JWT,
  // which may be a different store than the one this route operates
  // on. `requireStoreAccess()` (above) already verified the user has
  // access to this specific store, so the path param is the correct
  // and authoritative source for store-scoping employee queries.
  // Audit P0 (2026-06-25): pre-migration 0087 storeId was ignored
  // entirely; using activeStoreId here would silently let a user
  // operate on store A while their JWT said B (or vice-versa).
  const storeIdRaw = c.req.param('storeId');
  const storeId = storeIdRaw ? Number(storeIdRaw) : undefined;
  return {
    tenantId: auth.tenantId,
    storeId: Number.isFinite(storeId) ? storeId : auth.activeStoreId,
    actorUserId: auth.userId,
    actorRoles: auth.roles,
    actorPermissions: auth.permissions,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
}

employeesRouter.get('/', requirePermission('employees:view'), async (c) => {
  const ctx = buildCtx(c);
  const service = new EmployeeService();
  const employees = await service.list(ctx);
  return c.json({ success: true, data: employees });
});

employeesRouter.post('/invite', requirePermission('employees:invite'), zValidator('json', inviteSchema), async (c) => {
  const ctx = buildCtx(c);
  const body = c.req.valid('json');
  const service = new EmployeeService();

  const result = await service.invite(ctx, {
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role,
  });

  if ('kind' in result) {
    if (result.kind === 'duplicate') {
      return c.json(
        { success: false, error: { code: 'CONFLICT', message: result.message } },
        409,
      );
    }
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: result.message } },
      403,
    );
  }

  return c.json({ success: true, data: result }, 201);
});

employeesRouter.patch('/:employeeId', requirePermission('employees:update'), zValidator('json', updateEmployeeSchema), async (c) => {
  const ctx = buildCtx(c);
  const employeeId = Number(c.req.param('employeeId'));
  const body = c.req.valid('json');
  const service = new EmployeeService();

  const result = await service.update(ctx, employeeId, {
    role: body.role,
    isActive: body.isActive,
  });

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
      case 'owner_requires_manage_permissions':
      case 'cannot_grant_higher_role':
        return c.json(
          { success: false, error: { code: 'FORBIDDEN', message: result.message } },
          403,
        );
    }
  }

  return c.json({ success: true, data: result });
});

employeesRouter.delete('/:employeeId', requirePermission('employees:delete'), async (c) => {
  const ctx = buildCtx(c);
  const employeeId = Number(c.req.param('employeeId'));
  const service = new EmployeeService();

  const result = await service.revoke(ctx, employeeId);

  if ('kind' in result) {
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
    }
  }

  return c.json({ success: true, data: { success: true } });
});

export { employeesRouter };
