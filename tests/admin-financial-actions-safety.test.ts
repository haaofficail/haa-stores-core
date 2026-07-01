import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const tenantStoresRoutes = read('apps/api/src/routes/admin/tenants-stores.ts');
const marketplaceRoutes = read('apps/api/src/routes/admin/marketplace.ts');
const exportAudit = read('apps/api/src/routes/admin/financial-export-audit.ts');
const accountantInboxRoute = read('apps/api/src/routes/admin/accountant-inbox.ts');
const financeReportsRoute = read('apps/api/src/routes/admin/finance-reports.ts');
const paymentsPage = read('apps/admin-dashboard/src/pages/Payments.tsx');
const readinessPage = read('apps/admin-dashboard/src/pages/SettlementReadiness.tsx');
const accountantDetailPage = read('apps/admin-dashboard/src/pages/AccountantSettlementDetail.tsx');
const settlementBatchDetailPage = read('apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx');
const adminApi = read('apps/admin-dashboard/src/lib/api.ts');
const walletLedger = read('packages/wallet-core/src/ledger.ts');

describe('admin financial exports are permissioned, audited, and scoped', () => {
  it('payments CSV uses the server route guarded by wallet.payout.export', () => {
    const routeLine = adminIndex.split('\n').find((line) => line.includes('/payments/export')) ?? '';
    expect(routeLine).toContain("requireAdminPermission('wallet.payout.export')");
    expect(routeLine).toContain('paymentsExportRoute');
    expect(paymentsPage).toMatch(/hasAdminPermission\('wallet\.payout\.export'\)/);
    expect(paymentsPage).toMatch(/exportPaymentsCsv\(\{ q: query\.trim\(\) \|\| undefined \}\)/);
    expect(paymentsPage).toMatch(/downloadBlob/);
    expect(paymentsPage).not.toMatch(/downloadRowsAsCsv\(/);
    expect(adminApi).toMatch(/exportPaymentsCsv/);
    expect(adminApi).toMatch(/requestBlob\(`\/admin\/payments\/export/);
  });

  it('payments read/export model excludes provider metadata, idempotency keys, and raw metadata', () => {
    const paymentsArea = tenantStoresRoutes.slice(
      tenantStoresRoutes.indexOf('const adminPaymentSelect'),
      tenantStoresRoutes.indexOf('// ── /dashboard'),
    );
    expect(paymentsArea).toMatch(/const adminPaymentSelect/);
    expect(paymentsArea).toMatch(/method: s\.payments\.provider/);
    expect(paymentsArea).not.toMatch(/providerPaymentId|idempotencyKey|metadata/);

    const routeArea = tenantStoresRoutes.slice(
      tenantStoresRoutes.indexOf('export async function paymentsRoute'),
    );
    expect(routeArea).toMatch(/getAdminPaymentRows/);
    expect(routeArea).toMatch(/recordFinancialExportAudit/);
  });

  it('finance CSV exports record audit before returning the blob', () => {
    expect(exportAudit).toMatch(/AuditLogService/);
    expect(exportAudit).toMatch(/action: 'export_wallet'/);
    expect(exportAudit).toMatch(/entityType: 'finance_csv_export'/);
    expect(accountantInboxRoute).toMatch(/recordFinancialExportAudit/);
    expect(financeReportsRoute).toMatch(/recordFinancialExportAudit/);
    expect(tenantStoresRoutes).toMatch(/recordFinancialExportAudit/);
  });
});

describe('admin financial actions match backend permissions and contracts', () => {
  it('settlement readiness uses API-compatible SAMA statuses and approve permission for edits', () => {
    expect(adminIndex).toContain("samaComplianceStatus: z.enum(['unconfirmed', 'in_progress', 'confirmed']).optional()");
    expect(readinessPage).toContain("type SamaStatus = 'unconfirmed' | 'in_progress' | 'confirmed'");
    expect(readinessPage).toContain("hasAdminPermission('wallet.payout.approve')");
    expect(readinessPage).toContain('disabled={!canUpdateSettlementReadiness || saving}');
    expect(readinessPage).toContain('normalizeSamaStatus');
    expect(walletLedger).toContain("readiness.samaComplianceStatus === 'confirmed'");
    expect(walletLedger).not.toContain("readiness.samaComplianceStatus !== 'unconfirmed'");
  });

  it('accountant detail gates transfer and receipt actions by their specific mutation permissions', () => {
    expect(accountantDetailPage).toMatch(/hasAdminPermission\('wallet\.payout\.mark_transferred'\)/);
    expect(accountantDetailPage).toMatch(/hasAdminPermission\('wallet\.payout\.upload_proof'\)/);
    expect(accountantDetailPage).toMatch(/canMarkTransferred \? \(/);
    expect(accountantDetailPage).toMatch(/canUploadProof \? \(/);
  });

  it('destructive payout dialogs are semantic and proof upload copy matches backend requirements', () => {
    const dialogCount = settlementBatchDetailPage.match(/role="dialog" aria-modal="true"/g)?.length ?? 0;
    expect(dialogCount).toBeGreaterThanOrEqual(5);
    expect(settlementBatchDetailPage).toContain('ملف الإثبات *');
    expect(settlementBatchDetailPage).toContain('ملف الإثبات مطلوب قبل حفظ التحويل.');
    expect(settlementBatchDetailPage).not.toContain('يمكن حفظ الإثبات بدون ملف');
  });

  it('manual payout detail redacts stored proof file keys from read responses', () => {
    expect(marketplaceRoutes).toMatch(/function redactPayoutDetailForAdmin/);
    expect(marketplaceRoutes).toMatch(/delete proof\.proofFileKey/);
    const manualStart = marketplaceRoutes.indexOf('export const manualPayoutsRoutes');
    const detailHandler = marketplaceRoutes.slice(
      marketplaceRoutes.indexOf('detail: async (c: any) => {', manualStart),
      marketplaceRoutes.indexOf('\n  review: async', manualStart),
    );
    expect(detailHandler).toMatch(/redactPayoutDetailForAdmin\(detail\)/);
  });
});
