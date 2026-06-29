import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const checkout = read('apps/storefront/src/pages/Checkout.tsx');
const settlementDetail = read('apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx');
const bankAccounts = read('apps/admin-dashboard/src/pages/BankAccounts.tsx');
const adminApi = read('apps/admin-dashboard/src/lib/api.ts');
const adminRoutes = read('apps/api/src/routes/admin/index.ts');
const tenantsStoresRoutes = read('apps/api/src/routes/admin/tenants-stores.ts');

describe('Apple-grade report remediation guards', () => {
  it('checkout payment failures show a persistent recovery surface, not only a toast', () => {
    expect(checkout).toContain('PaymentRecoveryState');
    expect(checkout).toContain('checkout-payment-recovery');
    expect(checkout).toContain('handleRetryPayment');
    expect(checkout).toContain('handleChangePaymentAfterFailure');
    expect(checkout).toContain("href={`/s/${slug}/support`}");
    expect(checkout).toContain('setPaymentRecovery({');
    expect(checkout).toContain('checkout.paymentRecoveryHelp');
  });

  it('manual payout money-moving actions require explicit confirmation before API calls', () => {
    expect(settlementDetail).toContain('ConfirmPayoutAction');
    expect(settlementDetail).toContain('openPayoutConfirmation');
    expect(settlementDetail).toContain('handleConfirmedPayoutAction');
    expect(settlementDetail).toContain('هذا إجراء مالي مؤثر');
    expect(settlementDetail).not.toContain("onClick={() => performAction('approve', () => adminApi.approvePayout(payout.id))}");
    expect(settlementDetail).not.toContain("onClick={() => performAction('markTransferred', () => adminApi.markTransferred(payout.id))}");
    expect(settlementDetail).not.toContain("onClick={() => performAction('verifyTransfer', () => adminApi.verifyTransfer(payout.id))}");
  });

  it('bank account review requires confirmation, a reason, API validation, audit, and notification context', () => {
    expect(bankAccounts).toContain('BankAccountReviewDialog');
    expect(bankAccounts).toContain('reviewReason');
    expect(bankAccounts).toContain('submitReviewDecision');
    expect(bankAccounts).not.toContain("onClick={() => decide(a.id, 'verified')}");
    expect(bankAccounts).not.toContain("onClick={() => decide(a.id, 'rejected')}");

    expect(adminApi).toContain('reviewBankAccount: (id: number, status:');
    expect(adminApi).toContain('reviewReason');
    expect(adminRoutes).toContain('reviewReason: z.string().trim().min(3).max(500)');
    expect(tenantsStoresRoutes).toContain("action: 'bank_account_changed'");
    expect(tenantsStoresRoutes).toContain('newValue: { status, reviewReason }');
    expect(tenantsStoresRoutes).toContain('reviewReason,');
  });
});
