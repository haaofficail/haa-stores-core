import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletSchema = readFileSync(new URL('../packages/db/src/schema/wallet.ts', import.meta.url), 'utf-8');
const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const walletRoutes = readFileSync(new URL('../apps/api/src/routes/wallet.ts', import.meta.url), 'utf-8');
const providerStatusRoute = readFileSync(new URL('../apps/api/src/routes/provider-status.ts', import.meta.url), 'utf-8');
const providerStatusService = readFileSync(new URL('../packages/commerce-core/src/provider-status-service.ts', import.meta.url), 'utf-8');

describe('Wallet settlement readiness regression', () => {
  it('adds settlement readiness fields without enabling live payouts', () => {
    expect(walletSchema).toContain('walletSettlementReadiness');
    expect(walletSchema).toContain('safeguardedAccountConfigured');
    expect(walletSchema).toContain('pspSettlementPartnerConfirmed');
    expect(walletSchema).toContain('merchantOfRecordConfirmed');
    expect(walletSchema).toContain('samaComplianceStatus');
    expect(walletSchema).toContain("livePayoutEnabled: boolean('live_payout_enabled').notNull().default(false)");
  });

  it('keeps merchant funds pending until reconciliation makes them available', () => {
    expect(walletLedger).toContain('recordPendingMerchantPayable');
    expect(walletLedger).toContain("reconciliationStatus: 'pending'");
    expect(walletLedger).toContain('markPaymentReconciled');
    expect(walletLedger).toContain("eq(s.walletEntries.status, 'pending')");
    expect(walletLedger).toContain("set({ status: 'available' })");
  });

  it('exposes readiness APIs and provider-status remains not ready without compliance confirmation', () => {
    expect(walletRoutes).toContain("walletRouter.get('/settlement-readiness'");
    expect(walletRoutes).toContain("walletRouter.get('/settlement-transactions'");
    // After QP 5 Route Migration 7/24, the provider-status
    // aggregation moved from the route into ProviderStatusService.
    // The wallet-readiness fields now live in the service.
    expect(providerStatusService).toContain("fundsModel: 'platform_collects_and_settles'");
    expect(providerStatusService).toContain('settlementReadiness: settlement.settlementReadiness');
    expect(providerStatusService).toContain('complianceStatus: settlement.complianceStatus');
    // The route just passes the service result through.
    expect(providerStatusRoute).toMatch(/c\.json\(\{\s*success:\s*true,\s*data\s*\}\)/);
  });

  it('blocks settlement readiness for inactive stores and open refund or dispute risk', () => {
    expect(walletLedger).toContain('Payout blocked while store is suspended or inactive');
    expect(walletLedger).toContain('Payout blocked while refund risk is still open');
    expect(walletLedger).toContain('Payout blocked while chargeback or dispute risk is still open');
    expect(walletLedger).toContain("eq(s.paymentTransactions.type, 'chargeback')");
    expect(walletLedger).toContain('storeActive');
    expect(walletLedger).toContain('refundRiskClear');
    expect(walletLedger).toContain('disputeRiskClear');
  });
});
