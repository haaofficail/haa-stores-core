import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const walletSchema = readFileSync(new URL('../packages/db/src/schema/wallet.ts', import.meta.url), 'utf-8');
const walletRoutes = readFileSync(new URL('../apps/api/src/routes/wallet.ts', import.meta.url), 'utf-8');
const adminRoutes = readFileSync(new URL('../apps/api/src/routes/admin.ts', import.meta.url), 'utf-8');

describe('Manual settlement review workflow', () => {
  it('defines the required payout workflow statuses and transition methods', () => {
    for (const status of ['requested', 'under_review', 'approved', 'rejected', 'transfer_pending', 'transferred', 'proof_uploaded', 'transfer_verified', 'failed', 'cancelled', 'reversed']) {
      expect(walletLedger).toContain(status);
    }
    expect(walletLedger).toContain("transitionPayout(payoutId, 'requested', 'under_review'");
    expect(walletLedger).toContain("transitionPayout(payoutId, 'under_review', 'approved'");
    expect(walletLedger).toContain("transitionPayout(payoutId, 'approved', 'transfer_pending'");
    expect(walletLedger).toContain("transitionPayout(payoutId, 'transfer_pending', 'transferred'");
    expect(walletLedger).toContain("transitionPayout(payoutId, 'transferred', 'proof_uploaded'");
  });

  it('adds merchant and admin settlement APIs', () => {
    expect(walletRoutes).toContain("walletRouter.post('/payouts/request'");
    expect(walletRoutes).toContain("walletRouter.get('/payouts/:payoutId'");
    expect(adminRoutes).toContain("'/settlements/manual-payouts'");
    expect(adminRoutes).toContain("'/settlements/manual-payouts/:payoutId/approve'");
    expect(adminRoutes).toContain("'/settlements/manual-payouts/:payoutId/verify-transfer'");
  });

  it('stores workflow actors on payout requests', () => {
    expect(walletSchema).toContain('requestedByUserId');
    expect(walletSchema).toContain('reviewedByUserId');
    expect(walletSchema).toContain('approvedByUserId');
    expect(walletSchema).toContain('transferredByUserId');
    expect(walletSchema).toContain('verifiedByUserId');
  });
});
