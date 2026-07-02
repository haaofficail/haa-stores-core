// Tenant ownership guard — enforces that users can only access their own resources.
//
// Validates that the authenticated user is the owner or member of the tenant
// being accessed. Prevents cross-tenant data leakage in exports, reports, and
// other sensitive operations.

import type { MiddlewareHandler, Context, Next } from 'hono';
import { getAuth } from '@haa/auth-core';
import { createDbClient } from '@haa/db';
import { eq, and } from 'drizzle-orm';
import * as s from '@haa/db/schema';

/**
 * Guard: Verify user owns the tenant being accessed.
 *
 * Extracts tenant_id from request (param, query, or body) and validates
 * the authenticated user is a member of that tenant.
 *
 * Returns 403 Forbidden if user is not authorized.
 *
 * Usage:
 *   exportsRouter.get('/products', tenantOwnershipGuard(), handler)
 */
export function tenantOwnershipGuard(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } },
        401,
      );
    }

    // Extract tenant_id from request (try multiple sources)
    let tenantId: number | undefined;

    // Try URL parameter (most common)
    const paramId = c.req.param('tenantId') || c.req.param('storeId');
    if (paramId) {
      tenantId = Number(paramId);
    }

    // Try query parameter
    if (!tenantId) {
      const queryId = c.req.query('tenantId') || c.req.query('storeId');
      if (queryId) {
        tenantId = Number(queryId);
      }
    }

    // Try body (for POST/PATCH requests)
    if (!tenantId && (c.req.method === 'POST' || c.req.method === 'PATCH')) {
      try {
        const body = await c.req.json().catch(() => ({}));
        if (body && typeof body === 'object') {
          tenantId = body.tenantId || body.storeId;
          if (tenantId) tenantId = Number(tenantId);
        }
      } catch {
        // Ignore parse errors; continue with guard check
      }
    }

    if (!tenantId || Number.isNaN(tenantId)) {
      return c.json(
        {
          success: false,
          error: { code: 'MISSING_TENANT', message: 'Tenant ID not found in request' },
        },
        400,
      );
    }

    // Verify user is member of this tenant
    const db = createDbClient();
    const membership = await db
      .select()
      .from(s.tenantUsers)
      .where(and(eq(s.tenantUsers.userId, auth.userId), eq(s.tenantUsers.tenantId, tenantId)))
      .limit(1);

    if (membership.length === 0) {
      // User is not a member of this tenant
      return c.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this tenant',
          },
        },
        403,
      );
    }

    // Store tenant_id in context for handler access
    c.env.tenantId = tenantId;
    c.env.userTenantMembership = membership[0];

    await next();
  };
}
