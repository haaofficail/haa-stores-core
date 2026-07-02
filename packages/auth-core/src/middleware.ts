import type { Context, Next } from 'hono';
import { verifyToken } from './jwt.js';
import type { AuthContext, Permission, JwtPayload } from '@haa/shared';

export interface Variables {
  auth: AuthContext;
}

type TokenVersionVerifier = (decoded: JwtPayload) => Promise<boolean> | boolean;
type StoreTenantResolver = (storeId: number) => Promise<number | null>;

/**
 * Confirm that `userId` has an ACTIVE membership scoped to `storeId`
 * within the user's tenant. Returns:
 *   - 'ok'         — the user has a tenant_users row that matches
 *                    storeId (or a tenant-wide row with storeId NULL)
 *                    AND `is_active = true`.
 *   - 'no_role'    — the user is in the tenant but has no membership
 *                    for THIS store. Common cause: tenant has multiple
 *                    stores and the user only manages one of them.
 *   - 'revoked'    — there is a membership row but it has been
 *                    revoked (is_active = false). Surfaced separately
 *                    so the dashboard can show "your access was
 *                    revoked" instead of a generic 403.
 *
 * Implemented in the API layer (avoids circular deps; same pattern as
 * StoreTenantResolver). Audit P0 follow-up (2026-06-25): the previous
 * middleware only checked tenant boundary, letting owner of store A
 * use a sibling store B's URL.
 */
export type StoreMembershipResolver = (
  userId: number,
  storeId: number,
  tenantId: number,
) => Promise<'ok' | 'no_role' | 'revoked'>;

export type StoreAccessDenialReason =
  | 'no_store'
  | 'invalid_id'
  | 'not_found'
  | 'cross_tenant'
  // The user is in the tenant but has no membership for THIS store
  // (or their membership was revoked). Surfaced as a distinct reason
  // so the failure tracker can rate-limit cross-store probing without
  // accidentally locking out a user whose role on another store was
  // legitimately revoked.
  | 'no_store_role';

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
let _storeMembershipResolver: StoreMembershipResolver | null = null;
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
 * Install the per-request store-membership verifier. Required for
 * `requireStoreAccess` to perform the full check (tenant boundary +
 * actual role on this store). Without it, the middleware only checks
 * tenant boundary — which lets owner of store A use store B's URL.
 *
 * Implemented in the API layer (avoids circular deps).
 */
export function setStoreMembershipResolver(fn: StoreMembershipResolver): void {
  _storeMembershipResolver = fn;
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

    // FOURTH LAYER (audit P0 follow-up, 2026-06-25):
    // Confirm the user has a membership for THIS specific store
    // within the tenant. Without this, owner of store A could change
    // `:storeId` in the URL to a sibling store B's id and pass the
    // tenant boundary check — every downstream service then scopes
    // its queries by that storeId and happily serves store B's data.
    //
    // The resolver is OPTIONAL (some installations may not have
    // tenant_users seeded yet); when unset we fall back to the old
    // tenant-only check and log a single warning.
    if (_storeMembershipResolver) {
      const membership = await _storeMembershipResolver(auth.userId, storeId, auth.tenantId);
      if (membership === 'no_role') {
        return deny('no_store_role', 403, 'FORBIDDEN', 'No role on this store');
      }
      if (membership === 'revoked') {
        // Surfaced separately so the dashboard can render
        // "your access to this store has been revoked" instead of a
        // generic 403. Same HTTP code; richer i18n surface.
        return deny('no_store_role', 403, 'FORBIDDEN', 'Your access to this store has been revoked');
      }
    }

    await next();
  };
}

/**
 * Standalone tenant-boundary + membership check, extracted from
 * `requireStoreAccess` so other middleware (e.g. storageGuard, which
 * derives `storeId` from a file path rather than a `:storeId` route
 * param) can verify store ownership without duplicating the resolver
 * logic. Fail-closed: any resolver error or missing resolver denies.
 *
 * P1-2 audit fix: storageGuard previously granted access to any
 * `stores/<id>/...` path for any authenticated user with a tenantId,
 * regardless of whether that tenant actually owned `<id>` — a
 * cross-tenant IDOR on non-product store files.
 */
export async function verifyStoreOwnership(
  auth: AuthContext,
  storeId: number,
): Promise<boolean> {
  if (!Number.isFinite(storeId) || storeId < 1) return false;
  if (!_storeTenantResolver) return false;

  try {
    const storeTenantId = await _storeTenantResolver(storeId);
    if (storeTenantId === null || storeTenantId !== auth.tenantId) return false;

    if (_storeMembershipResolver) {
      const membership = await _storeMembershipResolver(auth.userId, storeId, auth.tenantId);
      if (membership !== 'ok') return false;
    }

    return true;
  } catch {
    return false;
  }
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
