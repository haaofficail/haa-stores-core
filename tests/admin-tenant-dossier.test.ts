import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const app = read('apps/admin-dashboard/src/App.tsx');
const tenantsPage = read('apps/admin-dashboard/src/pages/Tenants.tsx');
const tenantDossier = read('apps/admin-dashboard/src/pages/TenantDossier.tsx');

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
    expect(tenantDossier).toContain('adminApi.getAuditLogs()');
    expect(tenantDossier).toContain('adminApi.getSettlementBatches(storeId)');
  });

  it('keeps sensitive bank data and financial decisions out of the tenant overview', () => {
    expect(tenantDossier).toContain('لا يتم عرض IBAN كامل');
    expect(tenantDossier).not.toContain('revealIban');
    expect(tenantDossier).not.toContain('approvePayout');
    expect(tenantDossier).not.toContain('verifyTransfer');
    expect(tenantDossier).not.toMatch(/\\biban\\b\\s*:/i);
  });
});
