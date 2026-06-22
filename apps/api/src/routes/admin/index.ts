// Admin router aggregator. Splits the original apps/api/src/routes/admin.ts
// (692 LOC) into 5 domain files. See Quality Pass 2 — Item 2.4.
//
// All split files export raw Hono handlers. This aggregator registers the
// zValidator (where needed) and `requireAdminAuth()` middleware on every
// route, preserving the original middleware sequence exactly.
//
// Mount order matches the original admin.ts route order so paths and
// middleware remain stable. /login is mounted first (no auth required).

import { Hono, type Context, type Next } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { type AdminAuthContext, requireAdminAuth } from '@haa/auth-core';

import { loginRoute } from './auth.js';
import { dashboardRoute, tenantsRoutes, storesRoutes, kycRoutes, paymentsRoute } from './tenants-stores.js';
import {
  marketplaceSummaryRoute,
  marketplaceProductsRoute,
  marketplaceProductReviewRoute,
  marketplaceProductFeatureRoute,
  marketplaceSellersRoute,
  marketplaceOrdersRoute,
  marketplaceSettlementsRoute,
  marketplaceDeepReportRoute,
  settlementBatchesRoutes,
  manualPayoutsRoutes,
} from './marketplace.js';
import {
  auditRoute,
  webhooksRoute,
  webhookDedupStatsRoute,
  idempotencyKeyStatsRoute,
  plansRoutes,
  uploadRoute,
  settingsRoutes,
  usersRoute,
} from './operations.js';
import { getBillingSettings, patchBillingSettings } from './billing-settings.js';

// ── Permission guard used by settlement/payout routes. ────────────────────
export function requireAdminPermission(permission: string) {
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

// ── Validation schemas used by routes that need them. ─────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const tenantCreateSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'suspended']).default('active'),
});

const tenantUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  // TASK-0038 G1-G10 — compliance fields. See docs/ops/OWNER_ACTION_G*.md
  // All optional so admins can fill incrementally as owner completes each item.
  commercialRegistrationNumber: z.string().max(20).nullable().optional(),
  commercialRegistrationIssuedAt: z.string().datetime().nullable().optional(),
  vatNumber: z.string().max(20).nullable().optional(),
  vatRegisteredAt: z.string().datetime().nullable().optional(),
  ecommerceLicenseNumber: z.string().max(30).nullable().optional(),
  ecommerceLicenseIssuedAt: z.string().datetime().nullable().optional(),
  ecommerceLicenseExpiresAt: z.string().datetime().nullable().optional(),
  dpoEmail: z.string().email().max(255).nullable().optional(),
  dpoPhone: z.string().max(20).nullable().optional(),
  dpoAppointedAt: z.string().datetime().nullable().optional(),
  trademarkNumber: z.string().max(30).nullable().optional(),
  trademarkRegisteredAt: z.string().datetime().nullable().optional(),
  trademarkExpiresAt: z.string().datetime().nullable().optional(),
  asvLastScanAt: z.string().datetime().nullable().optional(),
  asvVendor: z.string().max(100).nullable().optional(),
  asvCertificateUrl: z.string().url().max(500).nullable().optional(),
  pentestLastScanAt: z.string().datetime().nullable().optional(),
  pentestVendor: z.string().max(100).nullable().optional(),
  pentestReportUrl: z.string().url().max(500).nullable().optional(),
  pentestPass: z.boolean().nullable().optional(),
  hostingRegion: z.string().max(50).nullable().optional(),
  hostingProvider: z.string().max(100).nullable().optional(),
  hostingKsaResidency: z.boolean().optional(),
  tabbyDpaSignedAt: z.string().datetime().nullable().optional(),
  tabbyDpaUrl: z.string().url().max(500).nullable().optional(),
  drPlanDocumentedAt: z.string().datetime().nullable().optional(),
  drLastTabletopAt: z.string().datetime().nullable().optional(),
  drNextTabletopAt: z.string().datetime().nullable().optional(),
});

const tenantStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

const storeCreateSchema = z.object({
  tenantId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().default(true),
});

const storeUpdateSchema = z.object({
  tenantId: z.coerce.number().int().positive().optional(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

const storeStatusSchema = z.object({
  isActive: z.boolean(),
});

const kycReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'needs_more_info']),
  rejectionReason: z.string().max(500).optional(),
});

const productReviewSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  note: z.string().max(1000).optional(),
});

const productFeatureSchema = z.object({
  featured: z.boolean(),
  featuredUntil: z.string().datetime().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

const planUpdateSchema = z.object({
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
});

const settingsUpdateSchema = z.object({
  name: z.string().min(1).max(255),
  logoUrl: z.string().max(500).nullable().optional(),
  faviconUrl: z.string().max(500).nullable().optional(),
});

const payoutReasonSchema = z.object({
  reason: z.string().min(1).max(500),
});

const payoutUploadProofSchema = z.object({
  bankReference: z.string().min(1).max(120),
  bankName: z.string().min(1).max(100),
  transferredAt: z.coerce.date(),
  beneficiaryName: z.string().min(1).max(255),
  beneficiaryIbanMasked: z.string().min(4).max(40),
  proofFileKey: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

const adminRouter = new Hono<{ Variables: { adminAuth: AdminAuthContext } }>();

// /login (no auth required)
adminRouter.post('/login', zValidator('json', loginSchema), loginRoute);

// /dashboard
adminRouter.get('/dashboard', requireAdminAuth(), dashboardRoute);

// /tenants/*
adminRouter.get('/tenants', requireAdminAuth(), tenantsRoutes.list);
adminRouter.post('/tenants', requireAdminAuth(), zValidator('json', tenantCreateSchema), tenantsRoutes.create);
adminRouter.patch('/tenants/:id', requireAdminAuth(), zValidator('json', tenantUpdateSchema), tenantsRoutes.update);
adminRouter.delete('/tenants/:id', requireAdminAuth(), tenantsRoutes.remove);
adminRouter.patch('/tenants/:id/status', requireAdminAuth(), zValidator('json', tenantStatusSchema), tenantsRoutes.status);

// /stores/*
adminRouter.get('/stores', requireAdminAuth(), storesRoutes.list);
adminRouter.post('/stores', requireAdminAuth(), zValidator('json', storeCreateSchema), storesRoutes.create);
adminRouter.patch('/stores/:id', requireAdminAuth(), zValidator('json', storeUpdateSchema), storesRoutes.update);
adminRouter.delete('/stores/:id', requireAdminAuth(), storesRoutes.remove);
adminRouter.patch('/stores/:id/status', requireAdminAuth(), zValidator('json', storeStatusSchema), storesRoutes.status);

// /kyc/*
adminRouter.get('/kyc', requireAdminAuth(), kycRoutes.list);
adminRouter.patch('/kyc/:id/review', requireAdminAuth(), zValidator('json', kycReviewSchema), kycRoutes.review);

// /payments
adminRouter.get('/payments', requireAdminAuth(), paymentsRoute);

// /marketplace/*
adminRouter.get('/marketplace/summary', requireAdminAuth(), marketplaceSummaryRoute);
adminRouter.get('/marketplace/products', requireAdminAuth(), marketplaceProductsRoute);
adminRouter.patch('/marketplace/products/:id/review', requireAdminAuth(), requireAdminPermission('marketplace.review'), zValidator('json', productReviewSchema), marketplaceProductReviewRoute);
adminRouter.patch('/marketplace/products/:id/feature', requireAdminAuth(), requireAdminPermission('marketplace.feature'), zValidator('json', productFeatureSchema), marketplaceProductFeatureRoute);
adminRouter.get('/marketplace/sellers', requireAdminAuth(), marketplaceSellersRoute);
adminRouter.get('/marketplace/orders', requireAdminAuth(), marketplaceOrdersRoute);
adminRouter.get('/marketplace/settlements', requireAdminAuth(), marketplaceSettlementsRoute);
adminRouter.get('/marketplace/deep-report', requireAdminAuth(), marketplaceDeepReportRoute);

// /settlements/batches
adminRouter.get('/settlements/batches', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), settlementBatchesRoutes.list);
adminRouter.get('/settlements/batches/:batchId', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), settlementBatchesRoutes.detail);

// /settlements/manual-payouts
adminRouter.get('/settlements/manual-payouts', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), manualPayoutsRoutes.list);
adminRouter.get('/settlements/manual-payouts/:payoutId', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), manualPayoutsRoutes.detail);
adminRouter.post('/settlements/manual-payouts/:payoutId/review', requireAdminAuth(), requireAdminPermission('wallet.payout.review'), manualPayoutsRoutes.review);
adminRouter.post('/settlements/manual-payouts/:payoutId/approve', requireAdminAuth(), requireAdminPermission('wallet.payout.approve'), manualPayoutsRoutes.approve);
adminRouter.post('/settlements/manual-payouts/:payoutId/reject', requireAdminAuth(), requireAdminPermission('wallet.payout.reject'), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.reject);
adminRouter.post('/settlements/manual-payouts/:payoutId/mark-transfer-pending', requireAdminAuth(), requireAdminPermission('wallet.payout.mark_transferred'), manualPayoutsRoutes.markTransferPending);
adminRouter.post('/settlements/manual-payouts/:payoutId/mark-transferred', requireAdminAuth(), requireAdminPermission('wallet.payout.mark_transferred'), manualPayoutsRoutes.markTransferred);
adminRouter.post('/settlements/manual-payouts/:payoutId/upload-proof', requireAdminAuth(), requireAdminPermission('wallet.payout.upload_proof'), zValidator('json', payoutUploadProofSchema), manualPayoutsRoutes.uploadProof);
adminRouter.post('/settlements/manual-payouts/:payoutId/verify-transfer', requireAdminAuth(), requireAdminPermission('wallet.payout.verify_transfer'), manualPayoutsRoutes.verifyTransfer);
adminRouter.post('/settlements/manual-payouts/:payoutId/cancel', requireAdminAuth(), requireAdminPermission('wallet.payout.cancel'), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.cancel);
adminRouter.post('/settlements/manual-payouts/:payoutId/reverse', requireAdminAuth(), requireAdminPermission('wallet.payout.reverse'), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.reverse);

// /audit
adminRouter.get('/audit', requireAdminAuth(), auditRoute);

// /webhooks
adminRouter.get('/webhooks', requireAdminAuth(), webhooksRoute);
adminRouter.get('/webhooks/dedup-stats', requireAdminAuth(), webhookDedupStatsRoute);
adminRouter.get('/idempotency-key/stats', requireAdminAuth(), idempotencyKeyStatsRoute);

// /plans
adminRouter.get('/plans', requireAdminAuth(), plansRoutes.list);
adminRouter.patch('/plans/:id', requireAdminAuth(), zValidator('json', planUpdateSchema), plansRoutes.update);

// /upload
adminRouter.post('/upload', requireAdminAuth(), uploadRoute);

// /settings
adminRouter.get('/settings', requireAdminAuth(), settingsRoutes.get);
adminRouter.put('/settings', requireAdminAuth(), zValidator('json', settingsUpdateSchema), settingsRoutes.update);

// /users
adminRouter.get('/users', requireAdminAuth(), usersRoute);

// /stores/:storeId/billing-settings
adminRouter.get(
  '/stores/:storeId/billing-settings',
  requireAdminAuth(),
  requireAdminPermission('billing.platform_fee.read'),
  getBillingSettings,
);
adminRouter.patch(
  '/stores/:storeId/billing-settings',
  requireAdminAuth(),
  requireAdminPermission('billing.platform_fee.update'),
  patchBillingSettings,
);

export { adminRouter };
