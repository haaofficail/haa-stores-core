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
import { type AdminAuthContext, requireAdminAuth, requireAdminTwoFactorIfEnabled } from '@haa/auth-core';
import type { AdminPermission } from '@haa/shared';
import { idempotencyKey } from '../../middleware/idempotency-key.js';
import { rateLimiter } from '../../middleware/rate-limiter.js';

import {
  adminTotpStatusRoute,
  confirmAdminPasswordResetRoute,
  confirmAdminTotpEnrollmentRoute,
  disableAdminTotpRoute,
  loginRoute,
  requestAdminPasswordResetRoute,
  startAdminTotpEnrollmentRoute,
} from './auth.js';
import { dashboardRoute, tenantsRoutes, storesRoutes, kycRoutes, kycBankRoutes, settlementReadinessRoutes, paymentSettingsRoutes, paymentsRoute } from './tenants-stores.js';
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
import { accountantInboxExportQuerySchema, accountantInboxRoutes } from './accountant-inbox.js';
import { ibanRevealRoutes } from './iban-reveal.js';
import { accountantDetailRoutes } from './accountant-detail.js';
import { financeReportsExportQuerySchema, financeReportsRoutes } from './finance-reports.js';
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
import {
  listLandingContacts,
  getLandingContact,
  patchLandingContact,
  listLandingContactsQuerySchema,
  patchLandingContactBodySchema,
} from './landing-contacts.js';

// ── Permission guard used by settlement/payout routes. ────────────────────
export function requireAdminPermission(permission: AdminPermission) {
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

// Batch 4E: allow access when the admin holds ANY of the given permissions (or
// admin:*). Used where one route serves two roles — e.g. bank-account routes
// usable by general KYC reviewers (kyc.*) OR the finance accountant
// (merchant.bank_accounts.*), WITHOUT giving the accountant general KYC.
export function requireAnyAdminPermission(...permissions: AdminPermission[]) {
  return async (c: Context, next: Next) => {
    const adminAuth = c.get('adminAuth') as AdminAuthContext | undefined;
    if (!adminAuth) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Admin authentication required' } }, 401);
    }
    const ok = adminAuth.permissions.includes('admin:*')
      || permissions.some((p) => adminAuth.permissions.includes(p));
    if (!ok) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient admin permission' } }, 403);
    }
    await next();
  };
}

// ── Validation schemas used by routes that need them. ─────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

const adminPasswordResetRequestSchema = z.object({
  email: z.string().email(),
});

const adminPasswordResetConfirmSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(8).max(200),
});

const adminTotpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/),
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
  statusReason: z.string().trim().min(3).max(500),
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
  statusReason: z.string().trim().min(3).max(500),
});

const kycReviewSchema = z.object({
  status: z.enum(['approved', 'rejected', 'needs_more_info']),
  rejectionReason: z.string().max(500).optional(),
});

const productReviewSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  note: z.string().trim().max(1000).optional(),
}).superRefine((value, ctx) => {
  if ((value.status === 'rejected' || value.status === 'suspended') && !value.note?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['note'],
      message: 'Review note is required when rejecting or suspending a marketplace product',
    });
  }
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
  // Batch 4B: receipt file is mandatory and must be a PDF/PNG/JPEG with a
  // sha256 of its bytes (tamper detection). Server re-validates in the ledger.
  proofFileKey: z.string().min(1).max(500),
  fileMimeType: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  uploadIntegritySignature: z.string().min(1).max(200),
  // Batch 4C: the accountant-entered transferred amount + currency. The ledger
  // matches these against the settlement net; a mismatch parks it in
  // manual_review and never closes/debits.
  transferredAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  currency: z.string().length(3),
  notes: z.string().max(1000).optional(),
});

// Batch 4D: reveal/copy the full IBAN for a payout (purpose drives the audit).
const ibanRevealSchema = z.object({
  action: z.enum(['view', 'copy']),
});

const adminRouter = new Hono<{ Variables: { adminAuth: AdminAuthContext } }>();

// /login (no auth required)
adminRouter.post('/login', zValidator('json', loginSchema), loginRoute);
adminRouter.post(
  '/login/password-reset/request',
  rateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: 5,
    message: 'تم تجاوز الحد المسموح من المحاولات',
  }),
  zValidator('json', adminPasswordResetRequestSchema),
  requestAdminPasswordResetRoute,
);
adminRouter.post(
  '/login/password-reset/confirm',
  rateLimiter({
    windowMs: 10 * 60 * 1000,
    maxRequests: 10,
    message: 'تم تجاوز الحد المسموح من المحاولات',
  }),
  zValidator('json', adminPasswordResetConfirmSchema),
  confirmAdminPasswordResetRoute,
);

// /security/totp — personal admin 2FA management.
adminRouter.get('/security/totp/status', requireAdminAuth(), adminTotpStatusRoute);
adminRouter.post('/security/totp/enroll', requireAdminAuth(), startAdminTotpEnrollmentRoute);
adminRouter.post('/security/totp/confirm', requireAdminAuth(), zValidator('json', adminTotpCodeSchema), confirmAdminTotpEnrollmentRoute);
adminRouter.delete('/security/totp', requireAdminAuth(), zValidator('json', adminTotpCodeSchema), disableAdminTotpRoute);

// /dashboard
adminRouter.get('/dashboard', requireAdminAuth(), requireAdminPermission('dashboard:view'), dashboardRoute);

// /tenants/* — platform-level operations; audit P1-1: each route gates
// on a distinct fine-grained admin permission so an authenticated
// admin with a limited role cannot accidentally mutate tenants.
adminRouter.get('/tenants', requireAdminAuth(), requireAdminPermission('tenants.read'), tenantsRoutes.list);
adminRouter.post('/tenants', requireAdminAuth(), requireAdminPermission('tenants.create'), requireAdminTwoFactorIfEnabled(), zValidator('json', tenantCreateSchema), tenantsRoutes.create);
adminRouter.patch('/tenants/:id', requireAdminAuth(), requireAdminPermission('tenants.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', tenantUpdateSchema), tenantsRoutes.update);
adminRouter.delete('/tenants/:id', requireAdminAuth(), requireAdminPermission('tenants.delete'), requireAdminTwoFactorIfEnabled(), tenantsRoutes.remove);
adminRouter.patch('/tenants/:id/status', requireAdminAuth(), requireAdminPermission('tenants.status.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', tenantStatusSchema), tenantsRoutes.status);

// /stores/* — same hardening as tenants. Destructive ops (delete,
// status changes) are particularly dangerous because they affect a
// merchant's live business.
adminRouter.get('/stores', requireAdminAuth(), requireAdminPermission('stores.read'), storesRoutes.list);
adminRouter.post('/stores', requireAdminAuth(), requireAdminPermission('stores.create'), requireAdminTwoFactorIfEnabled(), zValidator('json', storeCreateSchema), storesRoutes.create);
adminRouter.patch('/stores/:id', requireAdminAuth(), requireAdminPermission('stores.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', storeUpdateSchema), storesRoutes.update);
adminRouter.delete('/stores/:id', requireAdminAuth(), requireAdminPermission('stores.delete'), requireAdminTwoFactorIfEnabled(), storesRoutes.remove);
adminRouter.patch('/stores/:id/status', requireAdminAuth(), requireAdminPermission('stores.status.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', storeStatusSchema), storesRoutes.status);

// /kyc/*
adminRouter.get('/kyc', requireAdminAuth(), requireAdminPermission('kyc.read'), kycRoutes.list);
adminRouter.patch('/kyc/:id/review', requireAdminAuth(), requireAdminPermission('kyc.review'), requireAdminTwoFactorIfEnabled(), zValidator('json', kycReviewSchema), kycRoutes.review);
adminRouter.get('/kyc/bank-accounts', requireAdminAuth(), requireAnyAdminPermission('kyc.read', 'merchant.bank_accounts.view'), kycBankRoutes.list);
adminRouter.patch('/kyc/bank-accounts/:id/review', requireAdminAuth(), requireAnyAdminPermission('kyc.review', 'merchant.bank_accounts.verify_for_payout'), requireAdminTwoFactorIfEnabled(), zValidator('json', z.object({
  status: z.enum(['verified', 'rejected']),
  reviewReason: z.string().trim().min(3).max(500),
})), kycBankRoutes.review);

// /stores/:storeId/settlement-readiness
const settlementReadinessUpdateSchema = z.object({
  safeguardedAccountConfigured: z.boolean().optional(),
  pspSettlementPartnerConfirmed: z.boolean().optional(),
  merchantOfRecordConfirmed: z.boolean().optional(),
  samaComplianceStatus: z.enum(['unconfirmed', 'in_progress', 'confirmed']).optional(),
});

adminRouter.get('/stores/:storeId/settlement-readiness', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), settlementReadinessRoutes.get);
adminRouter.patch('/stores/:storeId/settlement-readiness', requireAdminAuth(), requireAdminPermission('wallet.payout.approve'), requireAdminTwoFactorIfEnabled(), zValidator('json', settlementReadinessUpdateSchema), settlementReadinessRoutes.update);

// /stores/:storeId/payment-settings
const paymentSettingsUpsertSchema = z.object({
  providerCode: z.string().min(1).max(50),
  enabled: z.boolean().optional(),
  isEnabled: z.boolean().optional(),
  mode: z.enum(['test', 'live']).optional(),
  status: z.enum(['active', 'suspended', 'not_configured', 'configured', 'invalid']).optional(),
  supportedPaymentMethod: z.string().min(1).max(50).optional(),
});

adminRouter.get('/stores/:storeId/payment-settings', requireAdminAuth(), requireAdminPermission('stores.read'), paymentSettingsRoutes.list);
adminRouter.put('/stores/:storeId/payment-settings', requireAdminAuth(), requireAdminPermission('stores.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', paymentSettingsUpsertSchema), paymentSettingsRoutes.upsert);

// /payments
adminRouter.get('/payments', requireAdminAuth(), requireAdminPermission('payments.read'), paymentsRoute);

// /marketplace/*
adminRouter.get('/marketplace/summary', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceSummaryRoute);
adminRouter.get('/marketplace/products', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceProductsRoute);
adminRouter.patch('/marketplace/products/:id/review', requireAdminAuth(), requireAdminPermission('marketplace.review'), requireAdminTwoFactorIfEnabled(), zValidator('json', productReviewSchema), marketplaceProductReviewRoute);
adminRouter.patch('/marketplace/products/:id/feature', requireAdminAuth(), requireAdminPermission('marketplace.feature'), requireAdminTwoFactorIfEnabled(), zValidator('json', productFeatureSchema), marketplaceProductFeatureRoute);
adminRouter.get('/marketplace/sellers', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceSellersRoute);
adminRouter.get('/marketplace/orders', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceOrdersRoute);
adminRouter.get('/marketplace/settlements', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceSettlementsRoute);
adminRouter.get('/marketplace/deep-report', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceDeepReportRoute);

// /settlements/batches
adminRouter.get('/settlements/batches', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), settlementBatchesRoutes.list);
adminRouter.get('/settlements/batches/:batchId', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), settlementBatchesRoutes.detail);

// /settlements/manual-payouts
// Accountant Settlement Inbox — READ-ONLY (ready queue + exceptions). No
// transfer/ledger mutation here; guarded by the finance view permission.
adminRouter.get('/settlements/accountant-inbox', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), accountantInboxRoutes.list);
adminRouter.get('/settlements/accountant-inbox/export', requireAdminAuth(), requireAdminPermission('wallet.payout.export'), zValidator('query', accountantInboxExportQuerySchema), accountantInboxRoutes.exportCsv);
// Batch 4D: full-IBAN reveal for payout execution — the ONLY route returning a
// full IBAN; guarded by the dedicated reveal permission and fully audited.
adminRouter.post('/settlements/:payoutId/reveal-iban', requireAdminAuth(), requireAdminPermission('merchant.bank_accounts.reveal_iban_for_payout'), requireAdminTwoFactorIfEnabled(), zValidator('json', ibanRevealSchema), ibanRevealRoutes.reveal);
// Batch 4E: accountant settlement detail (masked — no full IBAN, no receipt URL).
adminRouter.get('/settlements/:payoutId/accountant-detail', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), accountantDetailRoutes.detail);
// Batch 5: second approval for large settlements — guarded by the dedicated
// permission (accountant does NOT have it) + Idempotency-Key.
adminRouter.post('/settlements/:payoutId/second-approve', requireAdminAuth(), requireAdminPermission('wallet.payout.second_approve'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), manualPayoutsRoutes.secondApprove);
// Batch 6: reject a second approval back to manual_review (reason required).
adminRouter.post('/settlements/:payoutId/second-reject', requireAdminAuth(), requireAdminPermission('wallet.payout.second_approve'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.secondReject);
// Batch 6: accountant finance reports (archive + reconciliation + stuck) —
// masked, no full IBAN / receipt URL. Guarded by the finance view permission.
adminRouter.get('/settlements/finance-reports', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), financeReportsRoutes.list);
adminRouter.get('/settlements/finance-reports/export', requireAdminAuth(), requireAdminPermission('wallet.payout.export'), zValidator('query', financeReportsExportQuerySchema), financeReportsRoutes.exportCsv);
adminRouter.get('/settlements/manual-payouts', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), manualPayoutsRoutes.list);
adminRouter.get('/settlements/manual-payouts/:payoutId', requireAdminAuth(), requireAdminPermission('wallet.payout.view_all'), manualPayoutsRoutes.detail);
// Batch 4A: every state-changing payout action requires an Idempotency-Key so
// a double-click or a retried/concurrent request cannot run the same financial
// transition twice. Combined with the optimistic-lock guard in WalletLedger
// (conditional UPDATE on the expected fromStatus) this prevents double-spend.
adminRouter.post('/settlements/manual-payouts/:payoutId/review', requireAdminAuth(), requireAdminPermission('wallet.payout.review'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), manualPayoutsRoutes.review);
adminRouter.post('/settlements/manual-payouts/:payoutId/approve', requireAdminAuth(), requireAdminPermission('wallet.payout.approve'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), manualPayoutsRoutes.approve);
adminRouter.post('/settlements/manual-payouts/:payoutId/reject', requireAdminAuth(), requireAdminPermission('wallet.payout.reject'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.reject);
adminRouter.post('/settlements/manual-payouts/:payoutId/mark-transfer-pending', requireAdminAuth(), requireAdminPermission('wallet.payout.mark_transferred'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), manualPayoutsRoutes.markTransferPending);
adminRouter.post('/settlements/manual-payouts/:payoutId/mark-transferred', requireAdminAuth(), requireAdminPermission('wallet.payout.mark_transferred'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), manualPayoutsRoutes.markTransferred);
adminRouter.post('/settlements/manual-payouts/:payoutId/upload-proof', requireAdminAuth(), requireAdminPermission('wallet.payout.upload_proof'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), zValidator('json', payoutUploadProofSchema), manualPayoutsRoutes.uploadProof);
adminRouter.post('/settlements/manual-payouts/:payoutId/verify-transfer', requireAdminAuth(), requireAdminPermission('wallet.payout.verify_transfer'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), manualPayoutsRoutes.verifyTransfer);
adminRouter.post('/settlements/manual-payouts/:payoutId/cancel', requireAdminAuth(), requireAdminPermission('wallet.payout.cancel'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.cancel);
adminRouter.post('/settlements/manual-payouts/:payoutId/reverse', requireAdminAuth(), requireAdminPermission('wallet.payout.reverse'), requireAdminTwoFactorIfEnabled(), idempotencyKey({ required: true }), zValidator('json', payoutReasonSchema), manualPayoutsRoutes.reverse);

// /audit
adminRouter.get('/audit', requireAdminAuth(), requireAdminPermission('audit.read'), auditRoute);

// /webhooks
adminRouter.get('/webhooks', requireAdminAuth(), requireAdminPermission('webhooks.read'), webhooksRoute);
adminRouter.get('/webhooks/dedup-stats', requireAdminAuth(), requireAdminPermission('webhooks.read'), webhookDedupStatsRoute);
adminRouter.get('/idempotency-key/stats', requireAdminAuth(), requireAdminPermission('webhooks.read'), idempotencyKeyStatsRoute);

// /plans
adminRouter.get('/plans', requireAdminAuth(), requireAdminPermission('plans.read'), plansRoutes.list);
adminRouter.patch('/plans/:id', requireAdminAuth(), requireAdminPermission('plans.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', planUpdateSchema), plansRoutes.update);

// /upload
adminRouter.post('/upload', requireAdminAuth(), requireAdminPermission('platform.media.upload'), requireAdminTwoFactorIfEnabled(), uploadRoute);

// /settings
adminRouter.get('/settings', requireAdminAuth(), requireAdminPermission('platform.settings.read'), settingsRoutes.get);
adminRouter.put('/settings', requireAdminAuth(), requireAdminPermission('platform.settings.update'), requireAdminTwoFactorIfEnabled(), zValidator('json', settingsUpdateSchema), settingsRoutes.update);

// /users
// /users — listing platform users. Audit P1-8: needs explicit
// permission since the route exposes a window into the user table.
adminRouter.get('/users', requireAdminAuth(), requireAdminPermission('users.read'), usersRoute);

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
  requireAdminTwoFactorIfEnabled(),
  patchBillingSettings,
);

// /landing-contacts/* — public-landing inbox. Permissions added to the
// admin role granularly; super-admin (admin:*) implicitly grants both.
adminRouter.get(
  '/landing-contacts',
  requireAdminAuth(),
  requireAdminPermission('landing_contacts.read'),
  zValidator('query', listLandingContactsQuerySchema),
  listLandingContacts,
);
adminRouter.get(
  '/landing-contacts/:id',
  requireAdminAuth(),
  requireAdminPermission('landing_contacts.read'),
  getLandingContact,
);
adminRouter.patch(
  '/landing-contacts/:id',
  requireAdminAuth(),
  requireAdminPermission('landing_contacts.update'),
  requireAdminTwoFactorIfEnabled(),
  zValidator('json', patchLandingContactBodySchema),
  patchLandingContact,
);

export { adminRouter };
