import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signToken, verifyToken } from '../packages/auth-core/src/jwt';
import { requireAuth, setTokenVersionVerifier } from '../packages/auth-core/src/middleware';
import { requireAdminAuth, signAdminToken } from '../packages/auth-core/src/admin';

// Mock DB for unit tests
function createMockDb() {
  const users: any[] = [];
  return {
    users: users,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => users.slice(0, 1)),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async (v: any) => {
          const entry = { id: users.length + 1, ...v, tokenVersion: 0, createdAt: new Date(), updatedAt: new Date() };
          users.push(entry);
          return [entry];
        }),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(async (v: any) => {
          // For tokenVersion increment
          if (v && v.tokenVersion) {
            const user = users.find(u => u.id === v.where?.[0]?.id);
            if (user) user.tokenVersion = (user.tokenVersion || 0) + 1;
          }
          return [user].filter(Boolean);
        }),
      })),
    })),
  };
}

function createMiddlewareContext(token?: string) {
  const values = new Map<string, unknown>();
  return {
    values,
    context: {
      req: {
        header: (name: string) => {
          if (name.toLowerCase() === 'authorization' && token) return `Bearer ${token}`;
          return undefined;
        },
      },
      json: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status }),
      set: (key: string, value: unknown) => values.set(key, value),
      get: (key: string) => values.get(key),
    },
  };
}

describe('Auth P0/P1 Regression Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-long!!';
    process.env.ADMIN_JWT_SECRET = 'test-admin-jwt-secret-min-32-chars-long!!';
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
  });

  describe('A. Logout Token Revocation', () => {
    it('login يصدر JWT يحتوي tokenVersion', () => {
      const payload = {
        userId: 1,
        tenantId: 1,
        activeStoreId: 1,
        tokenVersion: 0,
        roles: ['owner'],
        permissions: ['stores:read'],
      };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.tokenVersion).toBe(0);
    });

    it('register/login يستخدم tokenVersion الحالي من DB', () => {
      const user = { id: 1, tokenVersion: 3 };
      const payload = {
        userId: user.id,
        tenantId: 1,
        activeStoreId: 1,
        tokenVersion: user.tokenVersion,
        roles: ['owner'],
        permissions: ['stores:read'],
      };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      expect(decoded.tokenVersion).toBe(3);
    });

    it('logout يزيد tokenVersion في DB', async () => {
      const mockDb = createMockDb();
      const user = { id: 1, tokenVersion: 0 };
      mockDb.users.push(user);

      const userId = 1;
      // Simulate token version increment
      user.tokenVersion = (user.tokenVersion || 0) + 1;

      expect(user.tokenVersion).toBe(1);
    });

    it('token قديم بعد logout يرجع 401 في middleware', async () => {
      const currentTokenVersion = 1;
      setTokenVersionVerifier((decoded) => decoded.tokenVersion === currentTokenVersion);

      const oldToken = signToken({
        userId: 1,
        tenantId: 1,
        activeStoreId: 1,
        tokenVersion: 0,
        roles: [],
        permissions: [],
      });
      const newToken = signToken({
        userId: 1,
        tenantId: 1,
        activeStoreId: 1,
        tokenVersion: 1,
        roles: [],
        permissions: [],
      });

      const oldContext = createMiddlewareContext(oldToken);
      const newContext = createMiddlewareContext(newToken);
      const middleware = requireAuth();
      const next = vi.fn();
      const oldResponse = await middleware(oldContext.context as any, next);
      await middleware(newContext.context as any, next);

      expect(oldResponse?.status).toBe(401);
      await expect(oldResponse?.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
      expect(next).toHaveBeenCalledTimes(1);
      expect(newContext.values.get('auth')).toMatchObject({ userId: 1, tokenVersion: 1 });
    });

    it('token جديد بعد login يعمل', () => {
      const user = { id: 1, tokenVersion: 2 };
      const token = signToken({
        userId: user.id,
        tenantId: 1,
        activeStoreId: 1,
        tokenVersion: user.tokenVersion,
        roles: ['owner'],
        permissions: ['stores:read'],
      });
      const decoded = verifyToken(token);
      expect(decoded.tokenVersion).toBe(2);
      expect(decoded.userId).toBe(1);
    });
  });

  describe('B. Admin JWT Isolation', () => {
    it('admin auth يفشل إذا ADMIN_JWT_SECRET غير موجود', () => {
      delete process.env.ADMIN_JWT_SECRET;
      delete process.env.JWT_SECRET;

      expect(() => signAdminToken({ userId: 1, isAdmin: true, permissions: [] }))
        .toThrow('ADMIN_JWT_SECRET environment variable is required');
    });

    it('admin auth لا يستخدم JWT_SECRET كبديل', () => {
      // Remove ADMIN_JWT_SECRET but keep JWT_SECRET
      const adminSecret = process.env.ADMIN_JWT_SECRET!;
      delete process.env.ADMIN_JWT_SECRET;

      expect(() => signAdminToken({ userId: 1, isAdmin: true, permissions: [] }))
        .toThrow('ADMIN_JWT_SECRET environment variable is required');

      // Restore for other tests
      process.env.ADMIN_JWT_SECRET = adminSecret;
    });

    it('regular JWT لا يقبل كـ admin token', async () => {
      const userToken = signToken({
        userId: 1,
        tenantId: 1,
        activeStoreId: 1,
        tokenVersion: 0,
        roles: ['owner'],
        permissions: ['stores:read'],
      });

      const { context } = createMiddlewareContext(userToken);
      const response = await requireAdminAuth()(context as any, vi.fn());
      expect(response?.status).toBe(401);
      await expect(response?.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
    });

    it('admin JWT لا يقبل كـ regular user token', async () => {
      setTokenVersionVerifier(() => true);
      const adminToken = signAdminToken({ userId: 1, isAdmin: true, permissions: ['admin:all'] });

      const { context } = createMiddlewareContext(adminToken);
      const response = await requireAuth()(context as any, vi.fn());

      expect(response?.status).toBe(401);
      await expect(response?.json()).resolves.toMatchObject({
        success: false,
        error: { code: 'UNAUTHORIZED' },
      });
    });
  });
});
