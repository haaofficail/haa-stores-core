import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAdminPermissionsForRole } from '@haa/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const reportRoute = read('apps/api/src/routes/admin/finance-reports.ts');
const reportService = read('apps/api/src/services/settlement-reports.ts');
const marketplace = read('apps/api/src/routes/admin/marketplace.ts');
const ledger = read('packages/wallet-core/src/ledger.ts');
const page = read('apps/admin-dashboard/src/pages/FinanceReports.tsx');
const app = read('apps/admin-dashboard/src/App.tsx');

describe('finance reports route is finance-guarded and IBAN/URL-safe', () => {
  it('registers GET /settlements/finance-reports guarded by wallet.payout.view_all', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('/settlements/finance-reports')) ?? '';
    expect(line).toContain("requireAdminPermission('wallet.payout.view_all')");
  });
  it('the handler never selects a full IBAN nor a proof file key/URL', () => {
    expect(reportRoute).not.toMatch(/merchantBankAccounts/); // reports use the receipt's bank ref, not the IBAN table
    expect(reportRoute).not.toMatch(/proofFileKey:/); // not SELECTED (comments may mention it)
    expect(reportRoute).toMatch(/getFinanceReportsReadModel/);
    expect(reportService).not.toMatch(/merchantBankAccounts/);
    expect(reportService).not.toMatch(/proofFileKey:/);
    expect(reportService).toMatch(/classifyReconciliation/);
    expect(reportService).toMatch(/isStuckSettlement/);
  });
  it('accountant can read finance reports (view_all + export) but has no kyc.*', () => {
    const p = getAdminPermissionsForRole('accountant');
    expect(p).toContain('wallet.payout.view_all');
    expect(p).toContain('wallet.payout.export');
    expect(p).not.toContain('kyc.read');
    expect(p).not.toContain('kyc.review');
  });
});

describe('second-reject route + ledger', () => {
  it('route is guarded by second_approve + Idempotency-Key + reason schema', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('/second-reject')) ?? '';
    expect(line).toContain("requireAdminPermission('wallet.payout.second_approve')");
    expect(line).toMatch(/idempotencyKey\(\s*\{\s*required:\s*true\s*\}\s*\)/);
    expect(line).toMatch(/payoutReasonSchema/);
  });
  it('ledger secondRejectPayout: awaiting -> manual_review with a required reason + audit', () => {
    const start = ledger.indexOf('async secondRejectPayout(');
    expect(start).toBeGreaterThan(-1);
    const body = ledger.slice(start, ledger.indexOf('\n  async cancelPayout'));
    expect(body).toMatch(/awaiting_second_approval/);
    expect(body).toMatch(/manual_review/);
    expect(body).toMatch(/settlement\.second_approval_rejected/);
    expect(body).toMatch(/Rejection reason is required/);
  });
});

describe('merchant completion notification carries no sensitive data', () => {
  it('notifies only on transfer_verified and never sends an IBAN', () => {
    const start = marketplace.indexOf('function notifySettlementCompleted');
    const body = marketplace.slice(start, marketplace.indexOf('export const manualPayoutsRoutes'));
    expect(body).toMatch(/transfer_verified/);
    expect(body).not.toMatch(/\biban\b/i);
  });
});

describe('finance reports UI', () => {
  it('registers the route + nav guarded by the finance permission', () => {
    expect(app).toMatch(/path="\/finance\/reports"[\s\S]*?wallet\.payout\.view_all[\s\S]*?FinanceReports/);
    expect(app).toContain('/finance/reports|التقارير المالية|BarChart2|wallet.payout.view_all');
  });
  it('has archive / reconciliation / stuck tabs + CSV export', () => {
    expect(page).toMatch(/getFinanceReports/);
    expect(page).toMatch(/أرشيف التسويات/);
    expect(page).toMatch(/مطابقة التسويات/);
    expect(page).toMatch(/التسويات العالقة/);
    expect(page).toMatch(/downloadRowsAsCsv/);
  });
  it('the CSV / table never renders a full IBAN or a receipt URL', () => {
    // no full-IBAN pattern and no access to an `.iban` field (comments may
    // legitimately mention "IBAN").
    expect(page).not.toMatch(/[A-Z]{2}\d{20,}/);
    expect(page).not.toMatch(/\.iban\b/);
    expect(page).not.toMatch(/receiptUrl|proofFileKey|\.url\b/);
  });
});
