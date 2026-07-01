import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const app = read('apps/admin-dashboard/src/App.tsx');
const tenantsPage = read('apps/admin-dashboard/src/pages/Tenants.tsx');
const tenantDossier = read('apps/admin-dashboard/src/pages/TenantDossier.tsx');
const adminApi = read('apps/admin-dashboard/src/lib/api.ts');

describe('admin tenant dossier operating-system flow', () => {
  it('routes each tenant to a dedicated operating dossier from the tenants table', () => {
    expect(app).toContain("const TenantDossier = lazy(() => import('./pages/TenantDossier'))");
    expect(app).toContain('path="/tenants/:tenantId"');
    expect(tenantsPage).toContain("export function tenantDossierPath(tenantId: number | string)");
    expect(tenantsPage).toContain('<Link to={tenantDossierPath(tenant.id)}');
    expect(tenantsPage).toContain('ملف التاجر');
  });

  it('shows the tenant as one operating file, not isolated admin pages', () => {
    expect(tenantDossier).toContain('مركز القرار والإجراء التالي');
    expect(tenantDossier).toContain('رحلات المتاجر التابعة');
    expect(tenantDossier).toContain('المبيعات والمستخلصات');
    expect(tenantDossier).toContain('سجل التدقيق والتعديلات');
    expect(tenantDossier).toContain('buildMerchantVerificationRecords');
    expect(tenantDossier).toContain('adminApi.listPayouts()');
    expect(tenantDossier).toContain('adminApi.getAuditLogs({ tenantId: numericTenantId })');
  });

  it('does not calculate tenant sales from a platform-wide payments sample', () => {
    expect(tenantDossier).not.toContain('adminApi.getPayments()');
    expect(tenantDossier).not.toContain('tenantPayments');
    expect(tenantDossier).not.toContain('grossSales');
    expect(tenantDossier).toContain('UNAVAILABLE_FROM_SCOPED_SOURCE');
    expect(tenantDossier).toContain('يتطلب endpoint تجميعي مفلتر للتاجر أو المتجر');
  });

  it('loads audit history with tenant scope instead of an unscoped empty read', () => {
    expect(tenantDossier).toContain('adminApi.getAuditLogs({ tenantId: numericTenantId })');
    expect(adminApi).toContain("if (typeof params.tenantId === 'number') qs.set('tenantId', String(params.tenantId))");
    expect(adminApi).toContain("return request<Record<string, unknown>[]>('GET', `/admin/audit${suffix}`)");
    expect(tenantDossier).toContain('لا توجد أحداث تدقيق مفلترة لهذا التاجر');
  });

  it('does not show settlement aggregates from the current platform-wide batch source', () => {
    expect(tenantDossier).not.toContain('adminApi.getSettlementBatches(storeId)');
    expect(tenantDossier).not.toContain('settlementBatches.length');
    expect(tenantDossier).toContain('غير متاح من مصدر مفلتر');
    expect(tenantDossier).toContain('يتطلب مصدر تسويات يطبق storeId قبل عرض أي رقم');
  });

  it('does not turn missing store readiness fields into false blockers', () => {
    expect(tenantDossier).toContain('function hasTrustedReadinessData(store: AdminStore)');
    expect(tenantDossier).toContain('const readinessSourceAvailable = records.length > 0 && storesForTenant.every(hasTrustedReadinessData)');
    expect(tenantDossier).toContain('const visibleBlockingItems = readinessSourceAvailable ? blockingItems : []');
    expect(tenantDossier).toContain('جاهزية النشر غير متاحة من مصدر بيانات مكتمل');
    expect(tenantDossier).not.toContain('value={blockingItems.length}');
  });

  it('keeps sensitive bank data and financial decisions out of the tenant overview', () => {
    expect(tenantDossier).toContain('لا يتم عرض IBAN كامل');
    expect(tenantDossier).not.toContain('revealIban');
    expect(tenantDossier).not.toContain('approvePayout');
    expect(tenantDossier).not.toContain('verifyTransfer');
    expect(tenantDossier).not.toMatch(/\\biban\\b\\s*:/i);
  });
});
