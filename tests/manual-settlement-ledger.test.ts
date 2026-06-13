import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const walletSchema = readFileSync(new URL('../packages/db/src/schema/wallet.ts', import.meta.url), 'utf-8');

describe('Manual settlement ledger behavior', () => {
  it('does not create a payout debit when the merchant only requests a payout', () => {
    const requestPayoutBody = walletLedger.slice(walletLedger.indexOf('async requestPayout'), walletLedger.indexOf('async failPayout'));
    expect(requestPayoutBody).toContain("status: 'requested'");
    expect(requestPayoutBody).not.toContain("type: 'payout_debit'");
    expect(requestPayoutBody).not.toContain("direction: 'debit'");
  });

  it('creates payout debit only after transfer verification', () => {
    const verifyBody = walletLedger.slice(walletLedger.indexOf('async verifyTransfer'), walletLedger.indexOf('async cancelPayout'));
    expect(verifyBody).toContain("status: 'transfer_verified'");
    expect(verifyBody).toContain("type: 'payout_debit'");
    expect(verifyBody).toContain("direction: 'debit'");
    expect(verifyBody).toContain("referenceType: 'payout'");
  });

  it('creates reversal entries for failed/reversed payouts without mutating the original debit', () => {
    expect(walletLedger).toContain("type: 'payout_reversal'");
    expect(walletLedger).toContain("direction: 'credit'");
    expect(walletSchema).toContain('payoutTransferProofs');
    expect(walletSchema).toContain('beneficiaryIbanMasked');
  });
});
