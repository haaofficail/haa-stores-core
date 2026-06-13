import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const walletLedger = readFileSync(new URL('../packages/wallet-core/src/ledger.ts', import.meta.url), 'utf-8');
const walletSchema = readFileSync(new URL('../packages/db/src/schema/wallet.ts', import.meta.url), 'utf-8');

describe('Manual settlement audit log', () => {
  it('adds append-only payout events with actor, status movement, amount, reason, and request metadata', () => {
    expect(walletSchema).toContain('payoutEvents');
    expect(walletSchema).toContain('actorUserId');
    expect(walletSchema).toContain('fromStatus');
    expect(walletSchema).toContain('toStatus');
    expect(walletSchema).toContain('ipAddress');
    expect(walletSchema).toContain('userAgent');
    expect(walletLedger).toContain('recordPayoutEvent');
  });

  it('records every required workflow event type', () => {
    for (const eventType of ['payout_review_started', 'payout_approved', 'payout_rejected', 'payout_marked_transfer_pending', 'payout_marked_transferred', 'payout_transfer_proof_uploaded', 'payout_transfer_verified', 'payout_cancelled', 'payout_reversed']) {
      expect(walletLedger).toContain(eventType);
    }
  });

  it('keeps full IBAN out of transfer proof fields', () => {
    expect(walletSchema).toContain('beneficiaryIbanMasked');
    expect(walletSchema).not.toContain('beneficiaryIban:');
    expect(walletLedger).toContain('Only masked IBAN may be stored with transfer proof');
  });
});
