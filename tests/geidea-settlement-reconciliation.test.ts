import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletSchema = readFileSync(new URL('../packages/db/src/schema/wallet.ts', import.meta.url), 'utf-8');
const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const providerStatusRoute = readFileSync(new URL('../apps/api/src/routes/provider-status.ts', import.meta.url), 'utf-8');

describe('Geidea settlement reconciliation regression', () => {
  it('records provider transactions with order, amount, currency, fees, and reconciliation status', () => {
    expect(walletSchema).toContain('paymentProviderTransactions');
    expect(walletSchema).toContain('providerTransactionId');
    expect(walletSchema).toContain('orderId');
    expect(walletSchema).toContain('amount');
    expect(walletSchema).toContain('currency');
    expect(walletSchema).toContain('gatewayFees');
    expect(walletSchema).toContain('merchantPayable');
    expect(walletSchema).toContain('reconciliationStatus');
  });

  it('prevents duplicate callback credit by payment reference', () => {
    expect(walletLedger).toContain("eq(s.walletEntries.referenceType, 'payment')");
    expect(walletLedger).toContain('eq(s.walletEntries.referenceId, input.orderId)');
    expect(walletLedger).toContain('if (existing.length > 0) return existing[0]');
  });

  it('does not report settlement ready without PSP/legal confirmation', () => {
    expect(providerStatusRoute).toContain('pspSettlementPartnerConfirmed');
    expect(providerStatusRoute).toContain('merchantOfRecordConfirmed');
    expect(providerStatusRoute).toContain('samaComplianceStatus');
    expect(walletLedger).toContain('requires_psp_or_legal_confirmation');
    expect(walletLedger).toContain('liveEnabled: false');
  });
});
