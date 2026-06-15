import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
// Quality Pass 2 — Item 2.4: admin.ts was split into a directory of 5 files.
// Concatenate the per-domain files so existing assertions that grep the
// full admin surface continue to work.
const adminRoutes = [
  'index.ts',
  'auth.ts',
  'tenants-stores.ts',
  'marketplace.ts',
  'operations.ts',
].map((f) => readFileSync(new URL(`../apps/api/src/routes/admin/${f}`, import.meta.url), 'utf-8')).join('\n');
const walletRoutes = readFileSync(new URL('../apps/api/src/routes/wallet.ts', import.meta.url), 'utf-8');
const sharedPermissions = readFileSync(new URL('../packages/shared/src/permissions.ts', import.meta.url), 'utf-8');
const sharedTypes = readFileSync(new URL('../packages/shared/src/types/orders.ts', import.meta.url), 'utf-8');

describe('Manual settlement maker-checker controls', () => {
  it('prevents one actor from approving, transferring, and verifying sensitive stages', () => {
    expect(walletLedger).toContain('requester cannot approve payout');
    expect(walletLedger).toContain('approver cannot mark payout transferred');
    expect(walletLedger).toContain('transfer actor cannot verify transfer');
    expect(walletLedger).toContain('requester cannot verify transfer');
  });

  it('blocks invalid direct transitions', () => {
    expect(walletLedger).toContain('Invalid payout transition');
    expect(walletLedger).toContain('Cannot verify transfer without uploaded proof');
    expect(walletLedger).toContain('Transfer proof can only be uploaded after transferred status');
  });

  it('adds granular settlement permissions and enforces them on admin routes', () => {
    for (const permission of ['wallet.payout.request', 'wallet.payout.review', 'wallet.payout.approve', 'wallet.payout.reject', 'wallet.payout.mark_transferred', 'wallet.payout.upload_proof', 'wallet.payout.verify_transfer', 'wallet.payout.cancel', 'wallet.payout.reverse']) {
      expect(sharedTypes).toContain(permission);
      if (permission !== 'wallet.payout.request') {
        expect(adminRoutes).toContain(`requireAdminPermission('${permission}')`);
      }
    }
  });

  it('uses the canonical payout request permission in role definitions', () => {
    expect(sharedPermissions).toContain('wallet.payout.request');
    expect(walletRoutes).toContain("requireAnyPermission('wallet.payout.request', 'wallet:request_payout')");
  });
});
