import jwt from 'jsonwebtoken';
import type { Context, Next } from 'hono';

function getSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error('ADMIN_JWT_SECRET environment variable is required. Set it in .env (see .env.example). This is separate from JWT_SECRET for security isolation.');
  return secret;
}

export function signAdminToken(payload: { userId: number; isAdmin: boolean; permissions: string[] }): string {
  const expiresIn = process.env.ADMIN_JWT_EXPIRES_IN ?? '24h';
  return jwt.sign(payload, getSecret(), { expiresIn } as any);
}

export interface AdminAuthContext {
  userId: number;
  isAdmin: boolean;
  permissions: string[];
}

export function requireAdminAuth() {
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
      c.set('adminAuth', decoded);
      await next();
    } catch {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }
  };
}
