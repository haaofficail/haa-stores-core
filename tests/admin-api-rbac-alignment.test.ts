import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ADMIN_PERMISSION_CATALOG } from '@haa/shared';

const adminRoutes = readFileSync(
  new URL('../apps/api/src/routes/admin/index.ts', import.meta.url),
  'utf-8',
);
const sharedTypes = readFileSync(
  new URL('../packages/shared/src/types/orders.ts', import.meta.url),
  'utf-8',
);
const plansPage = readFileSync(
  new URL('../apps/admin-dashboard/src/pages/Plans.tsx', import.meta.url),
  'utf-8',
);
const marketplacePage = readFileSync(
  new URL('../apps/admin-dashboard/src/pages/Marketplace.tsx', import.meta.url),
  'utf-8',
);
const settingsPage = readFileSync(
  new URL('../apps/admin-dashboard/src/pages/Settings.tsx', import.meta.url),
  'utf-8',
);

describe('Admin API RBAC alignment', () => {
  it('types admin route permissions against the shared AdminPermission source', () => {
    expect(sharedTypes).toContain('export type AdminPermission');
    expect(adminRoutes).toContain("import type { AdminPermission } from '@haa/shared'");
    expect(adminRoutes).toContain('requireAdminPermission(permission: AdminPermission)');
  });

  it('has one catalog entry for every platform admin permission used by this task', () => {
    const required = [
      'dashboard:view',
      'payments.read',
      'marketplace.read',
      'marketplace.review',
      'marketplace.feature',
      'audit.read',
      'webhooks.read',
      'plans.read',
      'plans.update',
      'platform.settings.read',
      'platform.settings.update',
      'platform.media.upload',
    ];
    const catalogKeys = ADMIN_PERMISSION_CATALOG.map(entry => entry.key);

    for (const permission of required) {
      expect(sharedTypes).toContain(`'${permission}'`);
      expect(catalogKeys).toContain(permission);
    }

    expect(new Set(catalogKeys).size).toBe(catalogKeys.length);
  });

  it('requires explicit permissions on admin routes that used to be auth-only', () => {
    const guardedRoutes = [
      "adminRouter.get('/dashboard', requireAdminAuth(), requireAdminPermission('dashboard:view'), dashboardRoute)",
      "adminRouter.get('/payments', requireAdminAuth(), requireAdminPermission('payments.read'), paymentsRoute)",
      "adminRouter.get('/marketplace/summary', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceSummaryRoute)",
      "adminRouter.get('/marketplace/products', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceProductsRoute)",
      "adminRouter.get('/marketplace/sellers', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceSellersRoute)",
      "adminRouter.get('/marketplace/orders', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceOrdersRoute)",
      "adminRouter.get('/marketplace/settlements', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceSettlementsRoute)",
      "adminRouter.get('/marketplace/deep-report', requireAdminAuth(), requireAdminPermission('marketplace.read'), marketplaceDeepReportRoute)",
      "adminRouter.get('/audit', requireAdminAuth(), requireAdminPermission('audit.read'), auditRoute)",
      "adminRouter.get('/webhooks', requireAdminAuth(), requireAdminPermission('webhooks.read'), webhooksRoute)",
      "adminRouter.get('/webhooks/dedup-stats', requireAdminAuth(), requireAdminPermission('webhooks.read'), webhookDedupStatsRoute)",
      "adminRouter.get('/idempotency-key/stats', requireAdminAuth(), requireAdminPermission('webhooks.read'), idempotencyKeyStatsRoute)",
      "adminRouter.get('/plans', requireAdminAuth(), requireAdminPermission('plans.read'), plansRoutes.list)",
      "adminRouter.patch('/plans/:id', requireAdminAuth(), requireAdminPermission('plans.update'), zValidator('json', planUpdateSchema), plansRoutes.update)",
      "adminRouter.post('/upload', requireAdminAuth(), requireAdminPermission('platform.media.upload'), uploadRoute)",
      "adminRouter.get('/settings', requireAdminAuth(), requireAdminPermission('platform.settings.read'), settingsRoutes.get)",
      "adminRouter.put('/settings', requireAdminAuth(), requireAdminPermission('platform.settings.update'), zValidator('json', settingsUpdateSchema), settingsRoutes.update)",
    ];

    for (const route of guardedRoutes) {
      expect(adminRoutes).toContain(route);
    }
  });

  it('does not leave the targeted routes with auth-only registration', () => {
    const authOnlyFragments = [
      "adminRouter.get('/dashboard', requireAdminAuth(), dashboardRoute)",
      "adminRouter.get('/payments', requireAdminAuth(), paymentsRoute)",
      "adminRouter.get('/marketplace/summary', requireAdminAuth(), marketplaceSummaryRoute)",
      "adminRouter.get('/marketplace/products', requireAdminAuth(), marketplaceProductsRoute)",
      "adminRouter.get('/marketplace/sellers', requireAdminAuth(), marketplaceSellersRoute)",
      "adminRouter.get('/marketplace/orders', requireAdminAuth(), marketplaceOrdersRoute)",
      "adminRouter.get('/marketplace/settlements', requireAdminAuth(), marketplaceSettlementsRoute)",
      "adminRouter.get('/marketplace/deep-report', requireAdminAuth(), marketplaceDeepReportRoute)",
      "adminRouter.get('/audit', requireAdminAuth(), auditRoute)",
      "adminRouter.get('/webhooks', requireAdminAuth(), webhooksRoute)",
      "adminRouter.get('/webhooks/dedup-stats', requireAdminAuth(), webhookDedupStatsRoute)",
      "adminRouter.get('/idempotency-key/stats', requireAdminAuth(), idempotencyKeyStatsRoute)",
      "adminRouter.get('/plans', requireAdminAuth(), plansRoutes.list)",
      "adminRouter.patch('/plans/:id', requireAdminAuth(), zValidator('json', planUpdateSchema), plansRoutes.update)",
      "adminRouter.post('/upload', requireAdminAuth(), uploadRoute)",
      "adminRouter.get('/settings', requireAdminAuth(), settingsRoutes.get)",
      "adminRouter.put('/settings', requireAdminAuth(), zValidator('json', settingsUpdateSchema), settingsRoutes.update)",
    ];

    for (const route of authOnlyFragments) {
      expect(adminRoutes).not.toContain(route);
    }
  });

  it('reflects mutation permissions in admin page actions', () => {
    expect(plansPage).toContain("hasAdminPermission('plans.update')");
    expect(plansPage).toContain('disabled={!canUpdatePlans}');

    expect(marketplacePage).toContain("hasAdminPermission('marketplace.review')");
    expect(marketplacePage).toContain("hasAdminPermission('marketplace.feature')");
    expect(marketplacePage).toContain('disabled={!canReviewMarketplaceProduct}');
    expect(marketplacePage).toContain('disabled={!canFeatureMarketplaceProduct}');

    expect(settingsPage).toContain("hasAdminPermission('platform.settings.update')");
    expect(settingsPage).toContain("hasAdminPermission('platform.media.upload')");
    expect(settingsPage).toContain('disabled={!canUpdateSettings}');
    expect(settingsPage).toContain('disabled={!canUploadPlatformMedia}');
  });
});
