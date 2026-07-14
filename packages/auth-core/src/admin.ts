import jwt from 'jsonwebtoken';
import type { Context, Next } from 'hono';
import type { SignOptions } from 'jsonwebtoken';
import { eq, sql } from 'drizzle-orm';
import { createDbClient, type DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { isAdminTotpSchemaReadinessError } from './admin-totp.js';

function getSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET environment variable is required. Set it in .env (see .env.example). This is separate from JWT_SECRET for security isolation.');
  return secret;
}

export function signAdminToken(payload: {
  userId: number;
  isAdmin: boolean;
  permissions: string[];
  tokenVersion: number;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
}): string {
  const expiresIn = (process.env.ADMIN_JWT_EXPIRES_IN ?? '24h') as SignOptions['expiresIn'];
  return jwt.sign(payload, getSecret(), { expiresIn });
}

export interface AdminAuthContext {
  userId: number;
  isAdmin: boolean;
  permissions: string[];
  tokenVersion: number;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
}

export function requireAdminAuth(db?: DbClient) {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }, 401);
    }
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as AdminAuthContext;
      if (!decoded.isAdmin) {
        return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, 403);
      }

      if (db) {
        const client = db;
        const [user] = await client
          .select({ tokenVersion: s.users.tokenVersion })
          .from(s.users)
          .where(eq(s.users.id, decoded.userId))
          .limit(1);

        if (!user || user.tokenVersion !== decoded.tokenVersion) {
          return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token has been revoked' } }, 401);
        }
      }

      c.set('adminAuth', decoded);
      await next();
    } catch {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }
  };
}

export function requireAdminTwoFactorIfEnabled(db?: DbClient) {
  return async (c: Context, next: Next) => {
    const adminAuth = c.get('adminAuth') as AdminAuthContext | undefined;
    if (!adminAuth) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } }, 401);
    }

    let enabled = false;
    try {
      const client = db ?? createDbClient();
      const [user] = await client
        .select({ adminTotpEnabledAt: s.users.adminTotpEnabledAt })
        .from(s.users)
        .where(eq(s.users.id, adminAuth.userId))
        .limit(1);
      enabled = Boolean(user?.adminTotpEnabledAt);
    } catch (error) {
      if (isAdminTotpSchemaReadinessError(error)) {
        await next();
        return;
      }
      return c.json(
        {
          success: false,
          error: {
            code: 'ADMIN_2FA_READINESS_UNAVAILABLE',
            message: 'تعذر التحقق من حالة التحقق الثنائي. تأكد من تطبيق migration الخاص بالأدمن TOTP.',
          },
        },
        503,
      );
    }

    if (enabled && !adminAuth.twoFactorVerified) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ADMIN_2FA_REQUIRED',
            message: 'يلزم تسجيل الدخول برمز التحقق الثنائي قبل تنفيذ هذا الإجراء.',
          },
        },
        403,
      );
    }

    await next();
  };
}

export async function logoutAdmin(db: DbClient, userId: number): Promise<void> {
  await db
    .update(s.users)
    .set({ tokenVersion: sql`${s.users.tokenVersion} + 1` })
    .where(eq(s.users.id, userId))
    .execute();
}
