import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, signToken, requireAuth, getAuth } from '@haa/auth-core';
import { registerSchema, loginSchema, ROLE_PERMISSIONS } from '@haa/shared';
import { AuditLogService } from '@haa/integration-core';
import { env } from '../env.js';

function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const authRouter = new Hono();

// POST /auth/register
authRouter.post('/register', zValidator('json', registerSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient();

  try {
    const result = await db.transaction(async (tx) => {
      const existingUser = await tx.select().from(s.users).where(eq(s.users.email, body.email)).limit(1);
      if (existingUser.length > 0) {
        return { error: 'Email already registered' } as const;
      }

      const existingStore = await tx.select().from(s.stores).where(eq(s.stores.slug, body.storeSlug)).limit(1);
      if (existingStore.length > 0) {
        return { error: 'Store slug already taken' } as const;
      }

      const passwordHash = await hashPassword(body.password);

      const [user] = await tx.insert(s.users).values({
        name: body.name,
        email: body.email,
        passwordHash,
        phone: body.phone,
      }).returning();

      const [tenant] = await tx.insert(s.tenants).values({
        name: body.storeName,
        slug: body.storeSlug,
        email: body.email,
        phone: body.phone,
      }).returning();

      await tx.insert(s.tenantUsers).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      const [store] = await tx.insert(s.stores).values({
        tenantId: tenant.id,
        name: body.storeName,
        slug: body.storeSlug,
        email: body.email,
        phone: body.phone,
      }).returning();

      await tx.insert(s.storeSettings).values({ storeId: store.id });

      const token = signToken({
        userId: user.id,
        tenantId: tenant.id,
        activeStoreId: store.id,
        tokenVersion: user.tokenVersion,
        roles: ['owner'],
        permissions: getPermissionsForRole('owner'),
      });

      return { token, user: { id: user.id, name: user.name, email: user.email }, store: { id: store.id, name: store.name, slug: store.slug } } as const;
    });

    if ('error' in result) {
      return c.json({ success: false, error: { code: 'CONFLICT', message: result.error } }, 409);
    }

    return c.json({ success: true, data: result }, 201);
  } catch (err) {
    console.error('Registration error:', err);
    return c.json({ success: false, error: { code: 'INTERNAL', message: 'Registration failed' } }, 500);
  }
});

// POST /auth/login
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient();
  const audit = new AuditLogService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');

  try {
    const [user] = await db.select().from(s.users).where(eq(s.users.email, body.email)).limit(1);
    if (!user) {
      await audit.record({ action: 'failed_login', entityType: 'user', ipAddress, userAgent: c.req.header('user-agent') });
      return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      await audit.record({ actorUserId: user.id, action: 'failed_login', entityType: 'user', entityId: user.id, ipAddress, userAgent: c.req.header('user-agent') });
      return c.json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } }, 401);
    }

    const [tenantUser] = await db.select().from(s.tenantUsers).where(eq(s.tenantUsers.userId, user.id)).limit(1);
    if (!tenantUser) {
      await audit.record({ actorUserId: user.id, action: 'failed_login', entityType: 'tenant_user', entityId: user.id, ipAddress, userAgent: c.req.header('user-agent') });
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No tenant access' } }, 403);
    }

    const stores = await db.select().from(s.stores).where(eq(s.stores.tenantId, tenantUser.tenantId)).limit(10);
    const activeStore = stores[0];

    const token = signToken({
      userId: user.id,
      tenantId: tenantUser.tenantId,
      activeStoreId: activeStore?.id ?? 0,
      tokenVersion: user.tokenVersion,
      roles: [tenantUser.role],
      permissions: getPermissionsForRole(tenantUser.role),
    });

    await audit.record({ actorUserId: user.id, tenantId: tenantUser.tenantId, storeId: activeStore?.id, action: 'login', entityType: 'user', entityId: user.id, ipAddress, userAgent: c.req.header('user-agent') });

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          tenantId: tenantUser.tenantId,
          activeStoreId: activeStore?.id ?? 0,
          roles: [tenantUser.role],
        },
        store: activeStore ? { id: activeStore.id, name: activeStore.name, slug: activeStore.slug } : null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return c.json({ success: false, error: { code: 'INTERNAL', message: 'Login failed' } }, 500);
  }
});

// GET /auth/me
authRouter.get('/me', requireAuth(), async (c) => {
  const auth = getAuth(c)!;
  const db = createDbClient();

  const [user] = await db.select({
    id: s.users.id,
    name: s.users.name,
    email: s.users.email,
    phone: s.users.phone,
  }).from(s.users).where(eq(s.users.id, auth.userId)).limit(1);

  if (!user) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }, 404);
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
    },
  });
});

// POST /auth/logout
authRouter.post('/logout', requireAuth(), async (c) => {
  const auth = getAuth(c)!;
  const db = createDbClient();
  try {
    await db.update(s.users)
      .set({ tokenVersion: sql`${s.users.tokenVersion} + 1` })
      .where(eq(s.users.id, auth.userId));
    return c.json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (err) {
    console.error('Logout error:', err);
    return c.json({ success: false, error: { code: 'INTERNAL', message: 'Logout failed' } }, 500);
  }
});
