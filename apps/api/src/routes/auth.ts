import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth, getAuth, signToken } from '@haa/auth-core';
import { registerSchema, loginSchema, getPermissionsForRole, type UserRole } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';
import { AuthFlowService } from '@haa/commerce-core';

export const authRouter = new Hono();

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');
  const service = new AuthFlowService();

  try {
    const result = await service.register({
      name: body.name,
      email: body.email,
      password: body.password,
      phone: body.phone,
      storeName: body.storeName,
      storeSlug: body.storeSlug,
    });

    if ('kind' in result) {
      // Both `email_taken` and `slug_taken` are 409 Conflicts.
      return c.json(
        { success: false, error: { code: 'CONFLICT', message: result.message } },
        409,
      );
    }

    // Mint the JWT in the transport layer. Service returns the data
    // needed; the route decides how to encode it.
    const token = signToken({
      userId: result.userId,
      tenantId: result.tenantId,
      activeStoreId: result.storeId,
      tokenVersion: result.userTokenVersion,
      roles: [result.role],
      permissions: getPermissionsForRole(result.role),
    });

    return c.json(
      {
        success: true,
        data: {
          token,
          user: { id: result.userId, name: result.userName, email: result.userEmail },
          store: { id: result.storeId, name: result.storeName, slug: result.storeSlug },
        },
      },
      201,
    );
  } catch (err) {
    console.error('Registration error:', err);
    return c.json(
      { success: false, error: { code: 'INTERNAL', message: 'Registration failed' } },
      500,
    );
  }
});

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');
  const service = new AuthFlowService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');

  try {
    const result = await service.login(
      { email: body.email, password: body.password, ipAddress, userAgent },
      new AuditLogService(),
    );

    if ('kind' in result) {
      if (result.kind === 'no_tenant') {
        return c.json(
          { success: false, error: { code: 'FORBIDDEN', message: result.message } },
          403,
        );
      }
      return c.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: result.message } },
        401,
      );
    }

    // Mint the JWT in the transport layer.
    const role = result.role as UserRole;
    const permissions = getPermissionsForRole(role);
    const token = signToken({
      userId: result.userId,
      tenantId: result.tenantId,
      activeStoreId: result.storeId,
      tokenVersion: result.userTokenVersion,
      roles: [result.role],
      permissions,
    });

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: result.userId,
          name: result.userName,
          email: result.userEmail,
          phone: result.userPhone,
          tenantId: result.tenantId,
          activeStoreId: result.storeId,
          roles: [result.role],
          permissions,
        },
        store:
          result.storeName && result.storeSlug
            ? { id: result.storeId, name: result.storeName, slug: result.storeSlug }
            : null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return c.json(
      { success: false, error: { code: 'INTERNAL', message: 'Login failed' } },
      500,
    );
  }
});

// GET /auth/me
authRouter.get('/me', requireAuth(), async (c) => {
  const auth = getAuth(c)!;
  const service = new AuthFlowService();

  const user = await service.getMe(auth.userId);
  if (!user) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
      404,
    );
  }

  return c.json({
    success: true,
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      tenantId: auth.tenantId,
      activeStoreId: auth.activeStoreId,
      roles: auth.roles,
      permissions: auth.permissions,
    },
  });
});

// POST /auth/logout
authRouter.post('/logout', requireAuth(), async (c) => {
  const auth = getAuth(c)!;
  const service = new AuthFlowService();
  try {
    await service.logout(auth.userId);
    return c.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    console.error('Logout error:', err);
    return c.json(
      { success: false, error: { code: 'INTERNAL', message: 'Logout failed' } },
      500,
    );
  }
});
