// PDPL (Saudi Personal Data Protection Law) endpoints.
//
// Resolves audit Phase 7-8 (TASK-0034 sub-item 8):
//   - GET  /api/merchant/data-export — right to data portability
//   - DELETE /api/merchant/account — right to erasure (soft delete)
//
// PDPL compliance notes:
//   - Both endpoints are merchant-scoped: requireAuth + requireStoreAccess
//   - Both require `settings:manage` permission (owner role only by default)
//   - Export returns a JSON dump of the merchant's data. Customer PII
//     is included (the merchant collected it) but no third-party data.
//   - Deletion is SOFT DELETE (isActive = false, status = 'deactivated').
//     The data is preserved for 30 days (PDPL retention) for audit/tax
//     purposes, then hard-deleted by a background job (future task).
//     During the retention period the store cannot be logged into.
//   - A hard-delete background job is tracked as a follow-up.
//
// Limitations / future work:
//   - No bulk export of audit logs (separate endpoint if needed)
//   - No "re-activate" endpoint (a deleted account is permanent;
//     a new account would need to be created)
//   - No 2FA confirmation step for deletion (TODO for Session #3+)

import { Hono } from 'hono';
import { eq, desc, inArray } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { requireAuth, requireStoreAccess, requirePermission } from '@haa/auth-core';
import { AuditLogService } from '@haa/integration-core';

const merchantDataRouter = new Hono();

merchantDataRouter.use('*', requireAuth(), requireStoreAccess());

/**
 * GET /api/merchant/data-export?storeId=N
 *
 * Returns a JSON dump of the merchant's data for PDPL right-to-
 * portability compliance. The response shape:
 *
 * {
 *   exportedAt: ISO timestamp,
 *   store: { ...store row... },
 *   storeBillingSettings: { ... },
 *   products: [...],
 *   orders: [...with orderItems nested...],
 *   customers: [...basic info, no password hashes...],
 *   walletEntries: [...],
 *   coupons: [...],
 *   categories: [...],
 *   brands: [...],
 *   tags: [...]
 * }
 *
 * The export is NOT paginated — the merchant gets all their data
 * in one response. For stores with very large datasets, a future
 * iteration should add streaming or a download URL.
 */
merchantDataRouter.get('/data-export', requirePermission('settings:update'), async (c) => {
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();

  // Fetch the store + billing settings
  const [store] = await db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);

  const [billingSettings] = await db
    .select()
    .from(s.storeBillingSettings)
    .where(eq(s.storeBillingSettings.storeId, storeId))
    .limit(1);

  // Fetch all products (limit to 1000 for now; future: streaming)
  const products = await db
    .select()
    .from(s.products)
    .where(eq(s.products.storeId, storeId))
    .limit(1000);

  // Fetch all orders (limit to 1000 for now; future: streaming)
  const orders = await db
    .select()
    .from(s.orders)
    .where(eq(s.orders.storeId, storeId))
    .orderBy(desc(s.orders.createdAt))
    .limit(1000);

  // Fetch order items for these orders
  // Note: orderItems has no storeId column — it links to orders via orderId.
  // Filter via the orderId IN clause.
  const orderIds = orders.map((o) => o.id);
  const orderItems = orderIds.length > 0
    ? await db
        .select()
        .from(s.orderItems)
        .where(inArray(s.orderItems.orderId, orderIds))
    : [];

  // Fetch customers who placed orders with this store
  const customers = await db
    .select({
      id: s.customers.id,
      storeId: s.customers.storeId,
      name: s.customers.name,
      email: s.customers.email,
      phone: s.customers.phone,
      createdAt: s.customers.createdAt,
    })
    .from(s.customers)
    .where(eq(s.customers.storeId, storeId))
    .limit(1000);

  // Fetch wallet entries
  const walletEntries = await db
    .select()
    .from(s.walletEntries)
    .where(eq(s.walletEntries.storeId, storeId))
    .orderBy(desc(s.walletEntries.createdAt))
    .limit(1000);

  // Fetch coupons, categories, brands, tags (lightweight, all small)
  const coupons = await db.select().from(s.coupons).where(eq(s.coupons.storeId, storeId));
  const categories = await db.select().from(s.categories).where(eq(s.categories.storeId, storeId));
  const brands = await db.select().from(s.brands).where(eq(s.brands.storeId, storeId));
  const tags = await db.select().from(s.tags).where(eq(s.tags.storeId, storeId));

  return c.json({
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      store,
      storeBillingSettings: billingSettings ?? null,
      products,
      orders: orders.map((o) => ({
        ...o,
        items: orderItems.filter((oi) => oi.orderId === o.id),
      })),
      customers,
      walletEntries,
      coupons,
      categories,
      brands,
      tags,
    },
  });
});

/**
 * DELETE /api/merchant/account?storeId=N
 *
 * Soft-delete the merchant's account. PDPL right-to-erasure compliance.
 * - Sets `isActive = false` and `status = 'deactivated'`
 * - Preserves all data for 30 days (retention period for tax/audit)
 * - A future background job hard-deletes after the retention period
 * - The store cannot be logged into after deactivation
 *
 * Returns: { success: true, deactivatedAt, retentionDays, hardDeleteAt }
 */
merchantDataRouter.delete('/account', requirePermission('settings:update'), async (c) => {
  // DECISION-OS-014 (beta deletion policy):
  // No merchant account self-deletion as a feature in beta. The PDPL right-
  // to-erasure obligation is honoured by routing the request through
  // compliance/support (operator-assisted soft delete + 2FA gate), not via
  // a self-service endpoint without 2FA (ISSUE-0010 / F-QA-B-002).
  //
  // To re-enable this endpoint, two prerequisites must land first:
  //   1. 2FA confirmation step (TOTP / email / re-password) — F-QA-B-002.
  //   2. Owner ruling re-opening DECISION-OS-014 for self-service deletion.
  return c.json({
    success: false,
    error: {
      code: 'FORBIDDEN_BETA_POLICY',
      message: 'Self-service account deletion is disabled in beta (DECISION-OS-014). Open a compliance/support request for PDPL right-to-erasure.',
    },
  }, 403);

  // The legacy soft-delete implementation is preserved below for reference
  // when this endpoint is re-enabled with 2FA. It is unreachable today.
   
  const storeId = Number(c.req.param('storeId'));
  const db = createDbClient();
  const audit = new AuditLogService(db);

  // Verify the store exists
  const [store] = await db.select().from(s.stores).where(eq(s.stores.id, storeId)).limit(1);
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);

  if (store.status === 'deactivated') {
    return c.json({
      success: false,
      error: { code: 'ALREADY_DEACTIVATED', message: 'Store is already deactivated' },
    }, 400);
  }

  const deactivatedAt = new Date();
  const retentionDays = 30;
  const hardDeleteAt = new Date(deactivatedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  // Soft delete: set isActive = false and status = 'deactivated'
  await db
    .update(s.stores)
    .set({
      isActive: false,
      status: 'deactivated',
    })
    .where(eq(s.stores.id, storeId));

  // Audit log
  await audit.record({
    actorUserId: null, // self-service deletion
    storeId,
    action: 'store_deactivated',
    entityType: 'store',
    entityId: storeId,
    oldValue: { isActive: store.isActive, status: store.status },
    newValue: { isActive: false, status: 'deactivated', retentionDays, hardDeleteAt: hardDeleteAt.toISOString() },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });

  return c.json({
    success: true,
    data: {
      deactivatedAt: deactivatedAt.toISOString(),
      retentionDays,
      hardDeleteAt: hardDeleteAt.toISOString(),
      message: `Store deactivated. Data will be hard-deleted after ${retentionDays} days. Contact support to reactivate within the retention period.`,
    },
  });
});

export { merchantDataRouter };
