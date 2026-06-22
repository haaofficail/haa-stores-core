import type { Context, Next } from 'hono';
import { verifyToken } from './jwt.js';
import type { AuthContext, Permission, JwtPayload } from '@haa/shared';

export interface Variables {
  auth: AuthContext;
}

type TokenVersionVerifier = (decoded: JwtPayload) => Promise<boolean> | boolean;
type StoreTenantResolver = (storeId: number) => Promise<number | null>;

export type StoreAccessDenialReason =
  | 'no_store'
  | 'invalid_id'
  | 'not_found'
  | 'cross_tenant';

export interface StoreAccessFailureTrackerResult {
  blocked: boolean;
  retryAfterSec?: number;
}

export type StoreAccessFailureTracker = (
  c: Context,
  auth: AuthContext,
  reason: StoreAccessDenialReason,
) => Promise<StoreAccessFailureTrackerResult> | StoreAccessFailureTrackerResult;

let _tokenVersionVerifier: TokenVersionVerifier | null = null;
let _storeTenantResolver: StoreTenantResolver | null = null;
let _storeAccessFailureTracker: StoreAccessFailureTracker | null = null;

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

/**
 * Install a tracker invoked on every `requireStoreAccess` denial. If the
 * tracker returns `{ blocked: true }`, the middleware short-circuits with
 * 429 (and `Retry-After` if `retryAfterSec` is provided) instead of the
 * usual 403/404. This is the hook used to mitigate cross-tenant probing
 * (BOLA/IDOR scans) without leaking timing information.
 *
 * The tracker is invoked for ALL denial reasons (no_store, invalid_id,
 * not_found, cross_tenant) so the implementation can decide which ones
 * count against the budget. The default implementation in the API layer
 * focuses on `not_found` and `cross_tenant` since those reflect a probe
 * against an existing user's surface.
 */
export function setStoreAccessFailureTracker(
  fn: StoreAccessFailureTracker | null,
): void {
  _storeAccessFailureTracker = fn;
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

    const deny = async (
      reason: StoreAccessDenialReason,
      status: 403 | 404,
      code: 'FORBIDDEN' | 'NOT_FOUND',
      message: string,
    ) => {
      if (_storeAccessFailureTracker) {
        try {
          const result = await _storeAccessFailureTracker(c, auth, reason);
          if (result.blocked) {
            if (result.retryAfterSec && result.retryAfterSec > 0) {
              c.header('Retry-After', String(Math.ceil(result.retryAfterSec)));
            }
            return c.json(
              {
                success: false,
                error: {
                  code: 'RATE_LIMITED',
                  message: 'Too many denied store-access attempts. Try again later.',
                },
              },
              429,
            );
          }
        } catch {
          // Tracker failure must not block the normal denial path.
        }
      }
      return c.json({ success: false, error: { code, message } }, status);
    };

    const paramStoreId = c.req.param('storeId');
    if (!paramStoreId) {
      return deny('no_store', 403, 'FORBIDDEN', 'No store specified');
    }

    const storeId = Number(paramStoreId);
    if (isNaN(storeId) || storeId < 1) {
      return deny('invalid_id', 403, 'FORBIDDEN', 'Invalid store ID');
    }

    // Check tenant boundary: does this store belong to the user's tenant?
    if (!_storeTenantResolver) {
      return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Store tenant resolver not configured' } }, 500);
    }

    const storeTenantId = await _storeTenantResolver(storeId);
    if (storeTenantId === null) {
      return deny('not_found', 404, 'NOT_FOUND', 'Store not found');
    }

    if (storeTenantId !== auth.tenantId) {
      return deny('cross_tenant', 403, 'FORBIDDEN', 'Store access denied');
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
