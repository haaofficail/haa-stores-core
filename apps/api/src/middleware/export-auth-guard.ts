// Export auth guard — restricts merchant data exports to owned tenants.
//
// Validates that merchants can only export data from stores they own.
// Prevents cross-tenant data leakage via CSV/PDF export endpoints.

import type { MiddlewareHandler, Context, Next } from 'hono';
import { getAuth } from '@haa/auth-core';
import { createDbClient } from '@haa/db';
import { eq, and } from 'drizzle-orm';
import * as s from '@haa/db/schema';

/**
 * Guard: Verify merchant owns the store being exported.
 *
 * Checks that:
 * 1. User is authenticated
 * 2. storeId is provided in request (param, query, or body)
 * 3. User is the owner or admin of that store
 *
 * Returns 403 Forbidden if not authorized.
 *
 * Usage:
 *   exportsRouter.get('/orders/csv', exportAuthGuard(), handler)
 *   exportsRouter.post('/invoices', exportAuthGuard(), handler)
 */
export function exportAuthGuard(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401,
      );
    }

    // Extract storeId from request (try multiple sources)
    let storeId: number | undefined;

    // Try URL parameter (most common)
    const paramId = c.req.param('storeId') || c.req.param('id');
    if (paramId) {
      storeId = Number(paramId);
    }

    // Try query parameter
    if (!storeId) {
      const queryId = c.req.query('storeId') || c.req.query('id');
      if (queryId) {
        storeId = Number(queryId);
      }
    }

    // Try body (for POST requests)
    if (!storeId && (c.req.method === 'POST' || c.req.method === 'PATCH')) {
      try {
        const body = await c.req.json().catch(() => ({}));
        if (body && typeof body === 'object') {
          storeId = body.storeId || body.id;
          if (storeId) storeId = Number(storeId);
        }
      } catch {
        // Ignore parse errors; continue with guard check
      }
    }

    if (!storeId || Number.isNaN(storeId)) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_STORE', message: 'Store ID not found in request' },
        },
        400,
      );
    }

    // Verify user is member of the tenant that owns this store
    const db = createDbClient();

    // Get the store's tenant
    const store = await db
      .select({ tenantId: s.stores.tenantId })
      .from(s.stores)
      .where(eq(s.stores.id, storeId))
      .limit(1);

    if (store.length === 0) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } },
        404,
      );
    }

    const tenantId = store[0].tenantId;

    // Check: is user an ACTIVE member of this tenant?
    // Must check is_active to prevent revoked employees from accessing (issue #4)
    const membership = await db
      .select()
      .from(s.tenantUsers)
      .where(
        and(
          eq(s.tenantUsers.userId, auth.userId),
          eq(s.tenantUsers.tenantId, tenantId),
          eq(s.tenantUsers.isActive, true),
        ),
      )
      .limit(1);

    if (membership.length === 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to export data from this store',
          },
        },
        403,
      );
    }

    // User is member of tenant, grant access
    c.env.exportStoreId = storeId;
    c.env.exportTenantId = tenantId;
    await next();
  };
}
