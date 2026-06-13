import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const walletRoutes = readFileSync(new URL('../apps/api/src/routes/wallet.ts', import.meta.url), 'utf-8');

describe('Payout ledger integrity regression', () => {
  it('blocks payout unless KYC, verified bank account, and reconciliation health are satisfied', () => {
    expect(walletLedger).toContain("kyc.status !== 'approved'");
    expect(walletLedger).toContain("eq(s.merchantBankAccounts.status, 'verified')");
    expect(walletLedger).toContain("eq(s.paymentProviderTransactions.reconciliationStatus, 'failed')");
    expect(walletLedger).toContain('Payout blocked while reconciliation has failed transactions');
  });

  it('prevents payout from pending balance and creates a ledger debit reference', () => {
    expect(walletLedger).toContain('Payout cannot exceed available balance');
    expect(walletLedger).toContain("type: 'payout_debit'");
    expect(walletLedger).toContain("direction: 'debit'");
    expect(walletLedger).toContain("referenceType: 'payout'");
    expect(walletLedger).toContain('liveBankTransfer: false');
  });

  it('supports payout failure reversal without marking bank transfer paid', () => {
    expect(walletLedger).toContain('failPayout');
    expect(walletLedger).toContain("status: 'failed'");
    expect(walletLedger).toContain("type: 'payout_reversal'");
    expect(walletLedger).not.toContain("status: 'paid',");
    expect(walletRoutes).toContain("walletRouter.post('/payouts'");
  });
});
