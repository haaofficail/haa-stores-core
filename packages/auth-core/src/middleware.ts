import type { Context, Next } from 'hono';
import { verifyToken } from './jwt.js';
import type { AuthContext, Permission, JwtPayload } from '@haa/shared';

export interface Variables {
  auth: AuthContext;
}

type TokenVersionVerifier = (decoded: JwtPayload) => Promise<boolean> | boolean;
type StoreTenantResolver = (storeId: number) => Promise<number | null>;

let _tokenVersionVerifier: TokenVersionVerifier | null = null;
let _storeTenantResolver: StoreTenantResolver | null = null;

export function setTokenVersionVerifier(fn: TokenVersionVerifier): void {
  _tokenVersionVerifier = fn;
}

/**
 * Set the store→tenantId resolver function.
 * Implemented in the API layer to avoid circular dependencies.
 *
 * @example
 * ```ts
 * import { setStoreTenantResolver } from '@haa/auth-core';
 * import { createDbClient } from '@haa/db';
 * import * as s from '@haa/db/schema';
 * import { eq } from 'drizzle-orm';
 *
 * setStoreTenantResolver(async (storeId) => {
 *   const db = createDbClient();
 *   const [store] = await db.select({ tenantId: s.stores.tenantId })
 *     .from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
 *   return store?.tenantId ?? null;
 * });
 * ```
 */
export function setStoreTenantResolver(fn: StoreTenantResolver): void {
  _storeTenantResolver = fn;
}

export function getAuth(c: Context): AuthContext | null {
  const auth = c.get('auth') as AuthContext | undefined;
  return auth ?? null;
}

function extractToken(c: Context): string | null {
  // 1. Authorization header (existing SPAs, API clients, file-download pages)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  // 2. HttpOnly cookie (new path — browser sends automatically after login)
  const cookieHeader = c.req.header('cookie') || '';
  const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('haa_auth='));
  if (match) return match.slice('haa_auth='.length);

  return null;
}

export function requireAuth() {
  return async (c: Context, next: Next) => {
    const token = extractToken(c);
    if (!token) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }, 401);
    }

    try {
      const decoded = verifyToken(token);

      if (_tokenVersionVerifier) {
        const valid = await _tokenVersionVerifier(decoded);
        if (!valid) {
          return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Token has been revoked. Please log in again.' } }, 401);
        }
      }

      c.set('auth', {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        activeStoreId: decoded.activeStoreId,
        tokenVersion: decoded.tokenVersion,
        roles: decoded.roles,
        permissions: decoded.permissions,
      });
      await next();
    } catch {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, 401);
    }
  };
}

/**
 * BOLA/IDOR Defense: Verifies the requested store belongs to the user's tenant.
 *
 * THREE-LAYER CHECK:
 * 1. Authentication — user must be logged in (have JWT with tenantId)
 * 2. Tenant Boundary — the requested storeId must belong to the user's tenantId
 * 3. Store Exists — the store must exist in the database
 *
 * This prevents:
 * - Cross-tenant store access (attacker modifies storeId in URL)
 * - Access to deleted/non-existent stores
 * - Tenant impersonation via storeId manipulation
 */
export function requireStoreAccess() {
  return async (c: Context, next: Next) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const paramStoreId = c.req.param('storeId');
    if (!paramStoreId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'No store specified' } }, 403);
    }

    const storeId = Number(paramStoreId);
    if (isNaN(storeId) || storeId < 1) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Invalid store ID' } }, 403);
    }

    // Check tenant boundary: does this store belong to the user's tenant?
    if (!_storeTenantResolver) {
      return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Store tenant resolver not configured' } }, 500);
    }

    const storeTenantId = await _storeTenantResolver(storeId);
    if (storeTenantId === null) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
    }

    if (storeTenantId !== auth.tenantId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Store access denied' } }, 403);
    }

    await next();
  };
}

export function requirePermission(...permissions: Permission[]) {
  return async (c: Context, next: Next) => {
    const auth = getAuth(c);
    if (!auth) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, 401);
    }

    const hasPermission = permissions.every((p) => auth.permissions.includes(p));
    if (!hasPermission) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }, 403);
    }

    await next();
  };
}
