import { describe, expect, it } from 'vitest';
import {
  REVEALABLE_PAYOUT_STATES,
  assertRevealAllowed,
} from '../apps/api/src/services/iban-reveal-policy.js';

/**
 * Batch 4D — when a full IBAN may be revealed for a payout.
 *
 * Only operational payout states tied to an actual, linked bank account may
 * reveal the IBAN. Cancelled / rejected / paid / archived must not.
 */

const bank = { id: 9, storeId: 5 };
const payout = { id: 1, storeId: 5, status: 'transfer_pending' };

describe('REVEALABLE_PAYOUT_STATES', () => {
  it('covers the operational transfer states only', () => {
    expect([...REVEALABLE_PAYOUT_STATES].sort()).toEqual(
      ['approved', 'proof_uploaded', 'transfer_pending', 'transferred'].sort(),
    );
  });
});

describe('assertRevealAllowed', () => {
  it('allows reveal for an operational payout with a linked bank account', () => {
    expect(() => assertRevealAllowed(payout, bank)).not.toThrow();
  });

  it('rejects non-operational states (cancelled / verified / rejected)', () => {
    for (const status of ['cancelled', 'rejected', 'transfer_verified', 'reversed', 'manual_review']) {
      expect(() => assertRevealAllowed({ ...payout, status }, bank)).toThrow(/PAYOUT_STATE_NOT_REVEALABLE/);
    }
  });

  it('rejects when there is no bank account', () => {
    expect(() => assertRevealAllowed(payout, null)).toThrow(/BANK_ACCOUNT_NOT_LINKED/);
  });

  it('rejects when the bank account belongs to a different store (not linked)', () => {
    expect(() => assertRevealAllowed(payout, { id: 9, storeId: 999 })).toThrow(/BANK_ACCOUNT_NOT_LINKED/);
  });
});
