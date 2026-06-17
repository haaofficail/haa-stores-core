// Marketplace moderation + settlements + manual payouts.
// Extracted from admin.ts lines 261-556.
//
// Each export is a raw Hono handler. The aggregator in ./index.ts applies
// `requireAdminAuth()` and any other middleware when mounting the route.
//
// `requireAdminPermission` and `payoutActionContext` are imported from the
// aggregator (./index.ts) where they live.

import { eq, and, desc, sql } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { type AdminAuthContext } from '@haa/auth-core';
import { WalletLedger } from '@haa/wallet-core';
import { AuditLogService } from '@haa/integration-core';

// ── /marketplace/summary ───────────────────────────────────────────────────
export async function marketplaceSummaryRoute(c: any) {
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
}

// ── /marketplace/products ──────────────────────────────────────────────────
export async function marketplaceProductsRoute(c: any) {
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
}

// ── /marketplace/products/:id/review ──────────────────────────────────────
export async function marketplaceProductReviewRoute(c: any) {
  const id = Number(c.req.param('id'));
  const adminAuth = c.get('adminAuth') as AdminAuthContext | undefined;
  const body = c.req.valid('json');
  const db = createDbClient();
  // Capture the prior review status BEFORE updating so the audit log
  // records both the old and new values (forensic completeness).
  const [existing] = await db
    .select({
      haaMarketplaceReviewStatus: s.products.haaMarketplaceReviewStatus,
      requiresSfdaNumber: s.products.requiresSfdaNumber,
      sfdaNumber: s.products.sfdaNumber,
      sfdaVerifiedAt: s.products.sfdaVerifiedAt,
    })
    .from(s.products)
    .where(eq(s.products.id, id))
    .limit(1);
  // TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA workflow.
  // When approving a product that requires SFDA, set the verification
  // timestamp + admin id. Admin reviews the format + manually verifies
  // (live SFDA API integration deferred to Phase 7+).
  const isApproving = body.status === 'approved';
  const needsSfdaVerify = isApproving && existing?.requiresSfdaNumber === true;
  const [product] = await db.update(s.products).set({
    haaMarketplaceReviewStatus: body.status,
    haaMarketplaceReviewNote: body.note ?? null,
    haaMarketplaceReviewedAt: new Date(),
    haaMarketplaceReviewedBy: adminAuth?.userId ?? null,
    // Auto-verify SFDA on admin approval when category requires it.
    // Admin has visually confirmed the sfda_number format matches the
    // merchant's submission + their KYC package.
    sfdaVerifiedAt: needsSfdaVerify ? new Date() : undefined,
    sfdaVerifiedBy: needsSfdaVerify ? (adminAuth?.userId ?? null) : undefined,
    updatedAt: new Date(),
  }).where(eq(s.products.id, id)).returning();
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  // Audit log: who reviewed which product, old + new status, optional note.
  // P0-5 closure — TASK-0040 Track 1C.
  await new AuditLogService().record({
    actorUserId: adminAuth?.userId ?? null,
    action: 'marketplace_product_review',
    entityType: 'product',
    entityId: product.id,
    oldValue: { haaMarketplaceReviewStatus: existing?.haaMarketplaceReviewStatus ?? null },
    newValue: {
      haaMarketplaceReviewStatus: product.haaMarketplaceReviewStatus,
      note: product.haaMarketplaceReviewNote ?? null,
      sfdaVerifiedAt: product.sfdaVerifiedAt ?? null,
      sfdaVerifiedBy: product.sfdaVerifiedBy ?? null,
    },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: product });
}

// ── /marketplace/products/:id/feature ─────────────────────────────────────
export async function marketplaceProductFeatureRoute(c: any) {
  const id = Number(c.req.param('id'));
  const adminAuth = c.get('adminAuth') as AdminAuthContext | undefined;
  const body = c.req.valid('json');
  const db = createDbClient();
  // Capture prior feature state for forensic completeness.
  const [existing] = await db
    .select({
      haaMarketplaceFeatured: s.products.haaMarketplaceFeatured,
      haaMarketplaceFeaturedSortOrder: s.products.haaMarketplaceFeaturedSortOrder,
    })
    .from(s.products)
    .where(eq(s.products.id, id))
    .limit(1);
  const [product] = await db.update(s.products).set({
    haaMarketplaceFeatured: body.featured,
    haaMarketplaceFeaturedUntil: body.featuredUntil ? new Date(body.featuredUntil) : null,
    haaMarketplaceFeaturedSortOrder: body.sortOrder ?? 0,
    updatedAt: new Date(),
  }).where(eq(s.products.id, id)).returning();
  if (!product) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }, 404);
  // Audit log: who toggled featured state on which product, old + new values.
  // P0-5 closure — TASK-0040 Track 1C.
  await new AuditLogService().record({
    actorUserId: adminAuth?.userId ?? null,
    action: 'marketplace_product_feature',
    entityType: 'product',
    entityId: product.id,
    oldValue: {
      haaMarketplaceFeatured: existing?.haaMarketplaceFeatured ?? false,
      haaMarketplaceFeaturedSortOrder: existing?.haaMarketplaceFeaturedSortOrder ?? 0,
    },
    newValue: {
      haaMarketplaceFeatured: product.haaMarketplaceFeatured,
      haaMarketplaceFeaturedSortOrder: product.haaMarketplaceFeaturedSortOrder,
      featuredUntil: product.haaMarketplaceFeaturedUntil,
    },
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  });
  return c.json({ success: true, data: product });
}

// ── /marketplace/sellers ───────────────────────────────────────────────────
export async function marketplaceSellersRoute(c: any) {
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
}

// ── /marketplace/orders ───────────────────────────────────────────────────
export async function marketplaceOrdersRoute(c: any) {
  const db = createDbClient();
  const orders = await db.select().from(s.marketplaceOrders).orderBy(desc(s.marketplaceOrders.createdAt)).limit(200);
  return c.json({ success: true, data: orders });
}

// ── /marketplace/settlements ──────────────────────────────────────────────
export async function marketplaceSettlementsRoute(c: any) {
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
}

// ── /marketplace/deep-report ───────────────────────────────────────────────
export async function marketplaceDeepReportRoute(c: any) {
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
}

// ── /settlements/batches ──────────────────────────────────────────────────
export const settlementBatchesRoutes = {
  list: async (c: any) => {
    const storeId = c.req.query('storeId');
    const batches = storeId
      ? await new WalletLedger().getSettlementBatches(Number(storeId))
      : await new WalletLedger().getAdminSettlementBatches();
    return c.json({ success: true, data: batches });
  },

  detail: async (c: any) => {
    const batchId = Number(c.req.param('batchId'));
    const detail = await new WalletLedger().getAdminSettlementBatchDetail(batchId);
    if (!detail) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Settlement batch not found' } }, 404);
    return c.json({ success: true, data: detail });
  },
};

// ── /settlements/manual-payouts ───────────────────────────────────────────
export const manualPayoutsRoutes = {
  list: async (c: any) => {
    const status = c.req.query('status');
    const payouts = await new WalletLedger().listAllPayouts(status);
    return c.json({ success: true, data: payouts });
  },

  detail: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    const [payout] = await createDbClient().select().from(s.payoutRequests).where(eq(s.payoutRequests.id, payoutId)).limit(1);
    if (!payout) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Payout not found' } }, 404);
    const detail = await new WalletLedger().getPayout(payout.storeId, payoutId);
    return c.json({ success: true, data: detail });
  },

  review: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    try {
      const payout = await new WalletLedger().reviewPayout(payoutId, payoutActionContext(c, 'reviewer'));
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Review failed' } }, 400);
    }
  },

  approve: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    try {
      const payout = await new WalletLedger().approvePayout(payoutId, payoutActionContext(c, 'approver'));
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Approve failed' } }, 400);
    }
  },

  reject: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    const ctx = { ...payoutActionContext(c, 'approver'), reason: c.req.valid('json').reason };
    try {
      const payout = await new WalletLedger().rejectPayout(payoutId, ctx);
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Reject failed' } }, 400);
    }
  },

  markTransferPending: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    try {
      const payout = await new WalletLedger().markTransferPending(payoutId, payoutActionContext(c, 'finance'));
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Mark transfer pending failed' } }, 400);
    }
  },

  markTransferred: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    try {
      const payout = await new WalletLedger().markTransferred(payoutId, payoutActionContext(c, 'finance'));
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Mark transferred failed' } }, 400);
    }
  },

  uploadProof: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    try {
      const payout = await new WalletLedger().uploadTransferProof(payoutId, c.req.valid('json'), payoutActionContext(c, 'finance'));
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Upload proof failed' } }, 400);
    }
  },

  verifyTransfer: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    try {
      const payout = await new WalletLedger().verifyTransfer(payoutId, payoutActionContext(c, 'verifier'));
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Verify transfer failed' } }, 400);
    }
  },

  cancel: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    const ctx = { ...payoutActionContext(c, 'admin'), reason: c.req.valid('json').reason };
    try {
      const payout = await new WalletLedger().cancelPayout(payoutId, ctx);
      return c.json({ success: true, data: payout });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Cancel failed' } }, 400);
    }
  },

  reverse: async (c: any) => {
    const payoutId = Number(c.req.param('payoutId'));
    const ctx = { ...payoutActionContext(c, 'admin'), reason: c.req.valid('json').reason };
    try {
      const entry = await new WalletLedger().reversePayout(payoutId, ctx);
      return c.json({ success: true, data: entry });
    } catch (e) {
      return c.json({ success: false, error: { code: 'PAYOUT_WORKFLOW_ERROR', message: e instanceof Error ? e.message : 'Reverse failed' } }, 400);
    }
  },
};

// Local helper — small enough to duplicate here, keeps marketplace.ts
// self-contained while not crossing the index.ts boundary mid-file.
function payoutActionContext(c: any, role: string) {
  const adminAuth = c.get('adminAuth') as AdminAuthContext;
  return {
    actorUserId: adminAuth.userId,
    actorRole: role,
    ipAddress: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    userAgent: c.req.header('user-agent'),
  };
}
