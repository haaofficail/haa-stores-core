import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const tenantsPage = read('apps/admin-dashboard/src/pages/Tenants.tsx');
const storesPage = read('apps/admin-dashboard/src/pages/Stores.tsx');
const marketplacePage = read('apps/admin-dashboard/src/pages/Marketplace.tsx');
const adminApi = read('apps/admin-dashboard/src/lib/api.ts');
const adminIndex = read('apps/api/src/routes/admin/index.ts');
const tenantsStoresRoutes = read('apps/api/src/routes/admin/tenants-stores.ts');

describe('Admin dangerous action reason gates', () => {
  it('tenant suspension/activation goes through a reason dialog and reasoned API call', () => {
    expect(tenantsPage).toContain('TenantStatusDialog');
    expect(tenantsPage).toContain("import { AdminDialog } from '../components/ui/AdminDialog'");
    expect(tenantsPage).toContain('statusReason');
    expect(tenantsPage).toContain('openStatusDialog(tenant)');
    // The reasoned status change now flows through a TanStack mutation: the
    // trimmed reason is captured at the call site and forwarded to the API in
    // the mutationFn. Both halves are asserted so the reason can't be dropped.
    expect(tenantsPage).toContain('statusMutation.mutate({ id: statusDialog.id, next: statusDialog.nextStatus, reason: statusReason.trim() })');
    expect(tenantsPage).toContain('adminApi.updateTenantStatus(vars.id, vars.next, vars.reason)');
    expect(tenantsPage).toContain('disabled={!statusReason.trim()}');
    expect(tenantsPage).not.toContain('updateTenantStatus(id, newStatus)');
    expect(tenantsPage).not.toContain('updateTenant(editId, form)');
  });

  it('store disable/enable goes through a reason dialog and reasoned API call', () => {
    expect(storesPage).toContain('StoreStatusDialog');
    expect(storesPage).toContain("import { AdminDialog } from '../components/ui/AdminDialog'");
    expect(storesPage).toContain('statusReason');
    expect(storesPage).toContain('openStatusDialog(s)');
    // Reasoned status change flows through a TanStack mutation (see Tenants note).
    expect(storesPage).toContain('statusMutation.mutate({ id: statusDialog.id, next: statusDialog.nextIsActive, reason: statusReason.trim() })');
    expect(storesPage).toContain('adminApi.updateStoreStatus(vars.id, vars.next, vars.reason)');
    expect(storesPage).toContain('disabled={!statusReason.trim()}');
    expect(storesPage).not.toContain('updateStoreStatus(id, !current)');
    expect(storesPage).not.toContain('updateStore(editId, data)');
  });

  it('marketplace reject/suspend moderation requires an actionable note', () => {
    expect(marketplacePage).toContain('MarketplaceDecisionModal');
    expect(marketplacePage).toContain("import { AdminDialog } from '../components/ui/AdminDialog'");
    expect(marketplacePage).toContain("status: 'rejected'");
    expect(marketplacePage).toContain("status: 'suspended'");
    expect(marketplacePage).toContain("review(decisionModal.id, decisionModal.status, rejectNote.trim())");
    // The confirm button still requires a note; the in-flight guard is OR'd on
    // after the TanStack mutation migration.
    expect(marketplacePage).toContain('disabled={!rejectNote.trim() || reviewMutation.isPending}');
    expect(marketplacePage).not.toContain("review(product.id, 'suspended')");
    expect(marketplacePage).not.toContain("rejectNote || undefined");
  });

  it('admin API contracts validate and audit reasons server-side', () => {
    expect(adminApi).toContain('updateTenantStatus: (id: number, status: string, statusReason: string)');
    expect(adminApi).toContain('updateStoreStatus: (id: number, isActive: boolean, statusReason: string)');
    expect(adminIndex).toContain('statusReason: z.string().trim().min(3).max(500)');
    expect(adminIndex).toContain('Review note is required when rejecting or suspending a marketplace product');
    expect(tenantsStoresRoutes).toContain('newValue: { status, statusReason }');
    expect(tenantsStoresRoutes).toContain("action: 'admin_store_suspended'");
    expect(tenantsStoresRoutes).toContain('newValue: { isActive, statusReason }');
    expect(tenantsStoresRoutes).toContain('invalidateStoreTenantCache(id)');
  });

  it('direct tenant/store delete is not exposed as a beta admin UI feature', () => {
    expect(tenantsPage).not.toContain('adminApi.deleteTenant');
    expect(tenantsPage).not.toContain('setConfirmDelete');
    expect(storesPage).not.toContain('adminApi.deleteStore');
    expect(storesPage).not.toContain('setConfirmDeleteId');
    expect(tenantsStoresRoutes).toContain('Direct tenant deletion is disabled in beta');
    expect(tenantsStoresRoutes).toContain('Direct store deletion is disabled in beta');
  });
});
