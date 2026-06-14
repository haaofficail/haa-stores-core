import { Hono, type Context, type Next } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { verifyPassword } from '@haa/auth-core';
import { signAdminToken, requireAdminAuth, type AdminAuthContext } from '@haa/auth-core';
import { SubscriptionService } from '@haa/commerce-core';
import { WalletLedger } from '@haa/wallet-core';
import { createMediaAdapter } from '@haa/shared/media';

import { AuditLogService } from '@haa/integration-core';
import { invalidateStoreTenantCache } from '../middleware/store-tenant-cache.js';

const adminRouter = new Hono<{ Variables: { adminAuth: AdminAuthContext } }>();

function requireAdminPermission(permission: string) {
  return async (c: Context, next: Next) => {
    const adminAuth = c.get('adminAuth') as AdminAuthContext | undefined;
    if (!adminAuth) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } }, 401);
    }
    if (!adminAuth.permissions.includes('admin:*') && !adminAuth.permissions.includes(permission)) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient admin permission' } }, 403);
    }
    await next();
  };
}

function payoutActionContext(c: Context, role: string) {
  const adminAuth = c.get('adminAuth') as AdminAuthContext;
  return {
    actorUserId: adminAuth.userId,
    actorRole: role,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
}

adminRouter.post('/login', zValidator('json', z.object({
  email: z.string().email(),
  password: z.string().min(6),
})), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = createDbClient();
  const audit = new AuditLogService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const userAgent = c.req.header('user-agent');
  const [user] = await db.select().from(s.users).where(eq(s.users.email, email)).limit(1);
  if (!user || !user.isAdmin || !user.isActive) {
    await audit.record({ action: 'admin_login_failed', entityType: 'user', entityId: user?.id, ipAddress, userAgent });
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid admin credentials' } }, 401);
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    await audit.record({ actorUserId: user.id, action: 'admin_login_failed', entityType: 'user', entityId: user.id, ipAddress, userAgent });
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid admin credentials' } }, 401);
  }
  const token = signAdminToken({ userId: user.id, isAdmin: true, permissions: ['admin:*'] });
  await audit.record({ actorUserId: user.id, action: 'admin_login', entityType: 'user', entityId: user.id, ipAddress, userAgent });
  return c.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email } } });
});

adminRouter.get('/dashboard', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(s.tenants);
  const [storeCount] = await db.select({ count: sql<number>`count(*)` }).from(s.stores);
  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(s.users).where(eq(s.users.isAdmin, false));
  const [orderCount] = await db.select({ count: sql<number>`count(*)` }).from(s.orders);
  const [pendingKyc] = await db.select({ count: sql<number>`count(*)` }).from(s.kycProfiles).where(eq(s.kycProfiles.status, 'submitted'));

  return c.json({ success: true, data: {
    tenants: Number(tenantCount.count),
    stores: Number(storeCount.count),
    users: Number(userCount.count),
    orders: Number(orderCount.count),
    pendingKyc: Number(pendingKyc.count),
  }});
});

adminRouter.get('/tenants', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const tenants = await db.select().from(s.tenants).orderBy(desc(s.tenants.createdAt));
  return c.json({ success: true, data: tenants });
});

adminRouter.post('/tenants', requireAdminAuth(), zValidator('json', z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'suspended']).default('active'),
})), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient();
  const [tenant] = await db.insert(s.tenants).values({
    name: body.name,
    slug: body.slug,
    email: body.email,
    phone: body.phone,
    status: body.status,
  }).returning();
  return c.json({ success: true, data: tenant }, 201);
});

adminRouter.patch('/tenants/:id', requireAdminAuth(), zValidator('json', z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'suspended']).optional(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [tenant] = await db.update(s.tenants).set({ ...body, updatedAt: new Date() }).where(eq(s.tenants.id, id)).returning();
  if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
  return c.json({ success: true, data: tenant });
});

adminRouter.delete('/tenants/:id', requireAdminAuth(), async (c) => {
  const id = Number(c.req.param('id'));
  const db = createDbClient();
  const [tenant] = await db.delete(s.tenants).where(eq(s.tenants.id, id)).returning({ id: s.tenants.id });
  if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Tenant not found' } }, 404);
  return c.json({ success: true, data: { deleted: true, id: tenant.id } });
});

adminRouter.patch('/tenants/:id/status', requireAdminAuth(), zValidator('json', z.object({
  status: z.enum(['active', 'suspended']),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const { status } = c.req.valid('json');
  const db = createDbClient();
  await db.update(s.tenants).set({ status, updatedAt: new Date() }).where(eq(s.tenants.id, id));
  return c.json({ success: true, data: { id, status } });
});

adminRouter.get('/stores', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const stores = await db.select().from(s.stores).orderBy(desc(s.stores.createdAt));
  return c.json({ success: true, data: stores });
});

adminRouter.post('/stores', requireAdminAuth(), zValidator('json', z.object({
  tenantId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().default(true),
})), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient();
  const [store] = await db.insert(s.stores).values({
    tenantId: body.tenantId,
    name: body.name,
    slug: body.slug,
    email: body.email,
    phone: body.phone,
    isActive: body.isActive,
  }).returning();
  await db.insert(s.storeSettings).values({ storeId: store.id });
  return c.json({ success: true, data: store }, 201);
});

adminRouter.patch('/stores/:id', requireAdminAuth(), zValidator('json', z.object({
  tenantId: z.coerce.number().int().positive().optional(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [store] = await db.update(s.stores).set({ ...body, updatedAt: new Date() }).where(eq(s.stores.id, id)).returning();
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  invalidateStoreTenantCache(id);
  return c.json({ success: true, data: store });
});

adminRouter.delete('/stores/:id', requireAdminAuth(), async (c) => {
  const id = Number(c.req.param('id'));
  const db = createDbClient();
  const [store] = await db.delete(s.stores).where(eq(s.stores.id, id)).returning({ id: s.stores.id });
  if (!store) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Store not found' } }, 404);
  invalidateStoreTenantCache(id);
  return c.json({ success: true, data: { deleted: true, id: store.id } });
});

adminRouter.patch('/stores/:id/status', requireAdminAuth(), zValidator('json', z.object({
  isActive: z.boolean(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const { isActive } = c.req.valid('json');
  const db = createDbClient();
  await db.update(s.stores).set({ isActive, updatedAt: new Date() }).where(eq(s.stores.id, id));
  return c.json({ success: true, data: { id, isActive } });
});

adminRouter.get('/kyc', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const profiles = await db.select().from(s.kycProfiles).orderBy(desc(s.kycProfiles.createdAt));
  return c.json({
    success: true,
    data: profiles.map(p => {
      const { nationalIdOrIqama, ...safe } = p as any;
      return safe;
    }),
  });
});

adminRouter.patch('/kyc/:id/review', requireAdminAuth(), zValidator('json', z.object({
  status: z.enum(['approved', 'rejected', 'needs_more_info']),
  rejectionReason: z.string().max(500).optional(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const adminAuth = c.get('adminAuth') as { userId: number } | undefined;
  const { status, rejectionReason } = c.req.valid('json');
  const db = createDbClient();
  const audit = new AuditLogService();
  const ipAddress = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip');
  const [profile] = await db.select().from(s.kycProfiles).where(eq(s.kycProfiles.id, id)).limit(1);
  if (!profile) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'KYC profile not found' } }, 404);
  if (profile.status !== 'submitted' && profile.status !== 'under_review') {
    return c.json({ success: false, error: { code: 'INVALID_STATUS', message: 'Can only review submitted/under_review profiles' } }, 400);
  }
  await db.update(s.kycProfiles).set({
    status,
    reviewedAt: new Date(),
    reviewedBy: adminAuth?.userId,
    rejectionReason: status === 'rejected' ? (rejectionReason || null) : null,
    updatedAt: new Date(),
  }).where(eq(s.kycProfiles.id, id));
  await audit.record({
    actorUserId: adminAuth?.userId,
    action: 'kyc_reviewed',
    entityType: 'kyc_profile',
    entityId: id,
    oldValue: { status: profile.status },
    newValue: { status, rejectionReason },
    ipAddress,
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: { id, status } });
});

adminRouter.get('/payments', requireAdminAuth(), async (c) => {
  const storeId = c.req.query('storeId');
  if (!storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const payments = await db.select().from(s.payments).where(eq(s.payments.storeId, Number(storeId))).orderBy(desc(s.payments.createdAt)).limit(100);
  return c.json({ success: true, data: payments });
});

adminRouter.get('/marketplace/summary', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const [pendingProducts] = await db.select({ count: sql<number>`count(*)` }).from(s.products)
    .where(and(eq(s.products.haaMarketplaceEnabled, true), eq(s.products.haaMarketplaceReviewStatus, 'pending')));
  const [approvedProducts] = await db.select({ count: sql<number>`count(*)` }).from(s.products)
    .where(and(eq(s.products.haaMarketplaceEnabled, true), eq(s.products.haaMarketplaceReviewStatus, 'approved')));
  const [sellerCount] = await db.select({ count: sql<number>`count(DISTINCT ${s.products.storeId})` }).from(s.products)
    .where(and(eq(s.products.haaMarketplaceEnabled, true), eq(s.products.haaMarketplaceReviewStatus, 'approved')));
  const [marketplaceOrderCount] = await db.select({ count: sql<number>`count(*)` }).from(s.marketplaceOrders);
  const [commissionTotal] = await db.select({ total: sql<string>`COALESCE(sum(${s.marketplaceOrders.platformCommission}), 0)` }).from(s.marketplaceOrders);

  return c.json({ success: true, data: {
    pendingProducts: Number(pendingProducts.count),
    approvedProducts: Number(approvedProducts.count),
    sellers: Number(sellerCount.count),
    marketplaceOrders: Number(marketplaceOrderCount.count),
    platformCommission: commissionTotal.total,
  }});
});

adminRouter.get('/marketplace/products', requireAdminAuth(), async (c) => {
  const status = c.req.query('status');
  const db = createDbClient();
  const conditions = [eq(s.products.haaMarketplaceEnabled, true)];
  if (status) conditions.push(eq(s.products.haaMarketplaceReviewStatus, status));
  const rows = await db.select({ product: s.products, store: s.stores })
    .from(s.products)
    .innerJoin(s.stores, eq(s.products.storeId, s.stores.id))
    .where(and(...conditions))
    .orderBy(desc(s.products.updatedAt))
    .limit(200);
  return c.json({ success: true, data: rows.map(({ product, store }) => ({
    ...product,
    storeName: store.name,
    storeSlug: store.slug,
    storeCity: store.city,
  })) });
});

adminRouter.patch('/marketplace/products/:id/review', requireAdminAuth(), zValidator('json', z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  note: z.string().max(1000).optional(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const adminAuth = c.get('adminAuth') as AdminAuthContext | undefined;
  const body = c.req.valid('json');
  const db = createDbClient();
  const [product] = await db.update(s.products).set({
    haaMarketplaceReviewStatus: body.status,
    haaMarketplaceReviewNote: body.note ?? null,
    haaMarketplaceReviewedAt: new Date(),
    haaMarketplaceReviewedBy: adminAuth?.userId ?? null,
    updatedAt: new Date(),
  }).where(eq(s.products.id, id)).returning();
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  return c.json({ success: true, data: product });
});

adminRouter.patch('/marketplace/products/:id/feature', requireAdminAuth(), zValidator('json', z.object({
  featured: z.boolean(),
  featuredUntil: z.string().datetime().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const db = createDbClient();
  const [product] = await db.update(s.products).set({
    haaMarketplaceFeatured: body.featured,
    haaMarketplaceFeaturedUntil: body.featuredUntil ? new Date(body.featuredUntil) : null,
    haaMarketplaceFeaturedSortOrder: body.sortOrder ?? 0,
    updatedAt: new Date(),
  }).where(eq(s.products.id, id)).returning();
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  return c.json({ success: true, data: product });
});

adminRouter.get('/marketplace/sellers', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const rows = await db.select({
    id: s.stores.id,
    name: s.stores.name,
    slug: s.stores.slug,
    city: s.stores.city,
    logoUrl: s.stores.logoUrl,
    productCount: sql<number>`count(${s.products.id})`,
    pendingCount: sql<number>`sum(CASE WHEN ${s.products.haaMarketplaceReviewStatus} = 'pending' THEN 1 ELSE 0 END)`,
    approvedCount: sql<number>`sum(CASE WHEN ${s.products.haaMarketplaceReviewStatus} = 'approved' THEN 1 ELSE 0 END)`,
  })
    .from(s.stores)
    .innerJoin(s.products, eq(s.products.storeId, s.stores.id))
    .where(eq(s.products.haaMarketplaceEnabled, true))
    .groupBy(s.stores.id, s.stores.name, s.stores.slug, s.stores.city, s.stores.logoUrl)
    .orderBy(sql`count(${s.products.id}) DESC`);
  return c.json({ success: true, data: rows.map((row) => ({
    ...row,
    productCount: Number(row.productCount),
    pendingCount: Number(row.pendingCount),
    approvedCount: Number(row.approvedCount),
  })) });
});

adminRouter.get('/marketplace/orders', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const orders = await db.select().from(s.marketplaceOrders).orderBy(desc(s.marketplaceOrders.createdAt)).limit(200);
  return c.json({ success: true, data: orders });
});

adminRouter.get('/marketplace/settlements', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const rows = await db.select({
    storeId: s.marketplaceOrderLinks.storeId,
    storeName: s.marketplaceOrderLinks.storeName,
    storeSlug: s.marketplaceOrderLinks.storeSlug,
    grossSales: sql<string>`COALESCE(sum(${s.marketplaceOrderLinks.total}), 0)`,
    platformCommission: sql<string>`COALESCE(sum(${s.marketplaceOrderLinks.platformCommission}), 0)`,
    sellerNet: sql<string>`COALESCE(sum(${s.marketplaceOrderLinks.total} - ${s.marketplaceOrderLinks.platformCommission}), 0)`,
    orderCount: sql<number>`count(*)`,
  })
    .from(s.marketplaceOrderLinks)
    .groupBy(s.marketplaceOrderLinks.storeId, s.marketplaceOrderLinks.storeName, s.marketplaceOrderLinks.storeSlug)
    .orderBy(sql`sum(${s.marketplaceOrderLinks.platformCommission}) DESC`);
  return c.json({ success: true, data: rows.map((row) => ({ ...row, orderCount: Number(row.orderCount) })) });
});

adminRouter.get('/marketplace/deep-report', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const [totals] = await db.select({
    gmv: sql<string>`COALESCE(sum(${s.marketplaceOrders.total}), 0)`,
    subtotal: sql<string>`COALESCE(sum(${s.marketplaceOrders.subtotal}), 0)`,
    shipping: sql<string>`COALESCE(sum(${s.marketplaceOrders.shippingTotal}), 0)`,
    commission: sql<string>`COALESCE(sum(${s.marketplaceOrders.platformCommission}), 0)`,
    orders: sql<number>`count(*)`,
  }).from(s.marketplaceOrders);

  const topSellers = await db.select({
    storeName: s.marketplaceOrderLinks.storeName,
    storeSlug: s.marketplaceOrderLinks.storeSlug,
    gmv: sql<string>`COALESCE(sum(${s.marketplaceOrderLinks.total}), 0)`,
    commission: sql<string>`COALESCE(sum(${s.marketplaceOrderLinks.platformCommission}), 0)`,
    orders: sql<number>`count(*)`,
  })
    .from(s.marketplaceOrderLinks)
    .groupBy(s.marketplaceOrderLinks.storeName, s.marketplaceOrderLinks.storeSlug)
    .orderBy(sql`sum(${s.marketplaceOrderLinks.total}) DESC`)
    .limit(10);

  const productModeration = await db.select({
    status: s.products.haaMarketplaceReviewStatus,
    count: sql<number>`count(*)`,
  })
    .from(s.products)
    .where(eq(s.products.haaMarketplaceEnabled, true))
    .groupBy(s.products.haaMarketplaceReviewStatus);

  return c.json({ success: true, data: {
    totals: { ...totals, orders: Number(totals.orders) },
    topSellers: topSellers.map((row) => ({ ...row, orders: Number(row.orders) })),
    productModeration: productModeration.map((row) => ({ ...row, count: Number(row.count) })),
  }});
});

adminRouter.get('/settlements/batches', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), async (c) => {
  const storeId = c.req.query('storeId');
  const batches = storeId
    ? await new WalletLedger().getSettlementBatches(Number(storeId))
    : await new WalletLedger().getAdminSettlementBatches();
  return c.json({ success: true, data: batches });
});

adminRouter.get('/settlements/batches/:batchId', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), async (c) => {
  const batchId = Number(c.req.param('batchId'));
  const detail = await new WalletLedger().getAdminSettlementBatchDetail(batchId);
  if (!detail) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Settlement batch not found' } }, 404);
  return c.json({ success: true, data: detail });
});

adminRouter.get('/settlements/manual-payouts', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), async (c) => {
  const status = c.req.query('status');
  const payouts = await new WalletLedger().listAllPayouts(status);
  return c.json({ success: true, data: payouts });
});

adminRouter.get('/settlements/manual-payouts/:payoutId', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  const [payout] = await createDbClient().select().from(s.payoutRequests).where(eq(s.payoutRequests.id, payoutId)).limit(1);
  if (!payout) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Payout not found' } }, 404);
  const detail = await new WalletLedger().getPayout(payout.storeId, payoutId);
  return c.json({ success: true, data: detail });
});

adminRouter.post('/settlements/manual-payouts/:payoutId/review', requireAdminAuth(), requireAdminPermission('wallet.payout.review'), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  try {
    const payout = await new WalletLedger().reviewPayout(payoutId, payoutActionContext(c, 'reviewer'));
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Review failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/approve', requireAdminAuth(), requireAdminPermission('wallet.payout.approve'), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  try {
    const payout = await new WalletLedger().approvePayout(payoutId, payoutActionContext(c, 'approver'));
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Approve failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/reject', requireAdminAuth(), requireAdminPermission('wallet.payout.reject'), zValidator('json', z.object({
  reason: z.string().min(1).max(500),
})), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  const ctx = { ...payoutActionContext(c, 'approver'), reason: c.req.valid('json').reason };
  try {
    const payout = await new WalletLedger().rejectPayout(payoutId, ctx);
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Reject failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/mark-transfer-pending', requireAdminAuth(), requireAdminPermission('wallet.payout.mark_transferred'), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  try {
    const payout = await new WalletLedger().markTransferPending(payoutId, payoutActionContext(c, 'finance'));
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Mark transfer pending failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/mark-transferred', requireAdminAuth(), requireAdminPermission('wallet.payout.mark_transferred'), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  try {
    const payout = await new WalletLedger().markTransferred(payoutId, payoutActionContext(c, 'finance'));
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Mark transferred failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/upload-proof', requireAdminAuth(), requireAdminPermission('wallet.payout.upload_proof'), zValidator('json', z.object({
  bankReference: z.string().min(1).max(120),
  bankName: z.string().min(1).max(100),
  transferredAt: z.coerce.date(),
  beneficiaryName: z.string().min(1).max(255),
  beneficiaryIbanMasked: z.string().min(4).max(40),
  proofFileKey: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
})), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  try {
    const payout = await new WalletLedger().uploadTransferProof(payoutId, c.req.valid('json'), payoutActionContext(c, 'finance'));
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Upload proof failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/verify-transfer', requireAdminAuth(), requireAdminPermission('wallet.payout.verify_transfer'), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  try {
    const payout = await new WalletLedger().verifyTransfer(payoutId, payoutActionContext(c, 'verifier'));
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Verify transfer failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/cancel', requireAdminAuth(), requireAdminPermission('wallet.payout.cancel'), zValidator('json', z.object({
  reason: z.string().min(1).max(500),
})), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  const ctx = { ...payoutActionContext(c, 'admin'), reason: c.req.valid('json').reason };
  try {
    const payout = await new WalletLedger().cancelPayout(payoutId, ctx);
    return c.json({ success: true, data: payout });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Cancel failed' } }, 400);
  }
});

adminRouter.post('/settlements/manual-payouts/:payoutId/reverse', requireAdminAuth(), requireAdminPermission('wallet.payout.reverse'), zValidator('json', z.object({
  reason: z.string().min(1).max(500),
})), async (c) => {
  const payoutId = Number(c.req.param('payoutId'));
  const ctx = { ...payoutActionContext(c, 'admin'), reason: c.req.valid('json').reason };
  try {
    const entry = await new WalletLedger().reversePayout(payoutId, ctx);
    return c.json({ success: true, data: entry });
  } catch (e) {
    return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Reverse failed' } }, 400);
  }
});

adminRouter.get('/audit', requireAdminAuth(), async (c) => {
  const tenantId = c.req.query('tenantId');
  const storeId = c.req.query('storeId');
  if (!tenantId && !storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const conditions = [];
  if (tenantId) conditions.push(eq(s.auditLogs.tenantId, Number(tenantId)));
  if (storeId) conditions.push(eq(s.auditLogs.storeId, Number(storeId)));
  const logs = await db.select().from(s.auditLogs).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(s.auditLogs.createdAt)).limit(200);
  return c.json({ success: true, data: logs });
});

adminRouter.get('/webhooks', requireAdminAuth(), async (c) => {
  const tenantId = c.req.query('tenantId');
  const storeId = c.req.query('storeId');
  if (!tenantId && !storeId) {
    return c.json({ success: true, data: [] });
  }
  const db = createDbClient();
  const conditions = [];
  if (tenantId) conditions.push(eq(s.webhookEvents.tenantId, Number(tenantId)));
  if (storeId) conditions.push(eq(s.webhookEvents.storeId, Number(storeId)));
  const events = await db.select().from(s.webhookEvents).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(s.webhookEvents.createdAt)).limit(100);
  return c.json({ success: true, data: events });
});

adminRouter.get('/plans', requireAdminAuth(), async (c) => {
  const plans = await new SubscriptionService().getAllPlans();
  return c.json({ success: true, data: plans });
});

adminRouter.patch('/plans/:id', requireAdminAuth(), zValidator('json', z.object({
  name: z.string().min(1).max(100).optional(),
  code: z.string().min(1).max(30).optional(),
  description: z.string().max(500).nullable().optional(),
  priceMonthly: z.string().optional(),
  priceAnnual: z.string().optional(),
  productLimit: z.coerce.number().int().optional(),
  staffLimit: z.coerce.number().int().optional(),
  storageLimitMb: z.coerce.number().int().optional(),
  orderLimit: z.coerce.number().int().optional(),
  trialDays: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
})), async (c) => {
  const id = Number(c.req.param('id'));
  const body = c.req.valid('json');
  const plan = await new SubscriptionService().updatePlan(id, body);
  if (!plan) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Plan not found' } }, 404);
  }
  return c.json({ success: true, data: plan });
});

adminRouter.post('/upload', requireAdminAuth(), async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'] as File | undefined;
  if (!file) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'File is required' } }, 400);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimetype = file.type || 'image/png';
  try {
    const adapter = createMediaAdapter();
    const validationError = adapter.validateFile(buffer, mimetype);
    if (validationError) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: validationError } }, 400);
    }
    const result = await adapter.upload(buffer, mimetype, 0, 0);
    return c.json({ success: true, data: { url: result.url, key: result.key, thumbUrl: result.thumbUrl, sizeBytes: result.sizeBytes } }, 201);
  } catch (err) {
    return c.json({ success: false, error: { code: 'UPLOAD_FAILED', message: err instanceof Error ? err.message : 'Upload failed' } }, 500);
  }
});

adminRouter.get('/settings', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const [tenant] = await db.select().from(s.tenants).limit(1);
  if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No platform found' } }, 404);
  return c.json({
    success: true,
    data: {
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl ?? null,
      faviconUrl: tenant.faviconUrl ?? null,
      email: tenant.email,
      phone: tenant.phone,
    },
  });
});

adminRouter.put('/settings', requireAdminAuth(), zValidator('json', z.object({
  name: z.string().min(1).max(255),
  logoUrl: z.string().max(500).nullable().optional(),
  faviconUrl: z.string().max(500).nullable().optional(),
})), async (c) => {
  const body = c.req.valid('json');
  const db = createDbClient();
  const [tenant] = await db.select().from(s.tenants).limit(1);
  if (!tenant) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No platform found' } }, 404);

  const [updated] = await db.update(s.tenants).set({
    name: body.name,
    logoUrl: body.logoUrl ?? null,
    faviconUrl: body.faviconUrl ?? null,
    updatedAt: new Date(),
  }).where(eq(s.tenants.id, tenant.id)).returning();

  return c.json({
    success: true,
    data: {
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl ?? null,
      faviconUrl: updated.faviconUrl ?? null,
    },
  });
});

adminRouter.get('/users', requireAdminAuth(), async (c) => {
  const db = createDbClient();
  const users = await db.select().from(s.users).orderBy(desc(s.users.createdAt)).limit(100);
  return c.json({
    success: true,
    data: users.map(u => {
      const { passwordHash, ...safe } = u;
      return safe;
    }),
  });
});

export { adminRouter };
