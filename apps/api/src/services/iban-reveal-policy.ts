/**
 * IBAN reveal policy (Batch 4D) — pure guards for when a full IBAN may be
 * revealed for a payout. The full IBAN is sensitive; it is only ever returned
 * by the dedicated, permission-guarded reveal route, and only for an
 * operational payout tied to its store's bank account.
 */

/** Operational payout states for which an IBAN reveal is allowed. */
export const REVEALABLE_PAYOUT_STATES = [
  'approved',
  'transfer_pending',
  'transferred',
  'proof_uploaded',
] as const;

interface RevealPayout {
  id: number;
  storeId: number;
  status: string;
}

interface RevealBank {
  id: number;
  storeId: number;
}

/**
 * Throws a stable-coded Error if the IBAN must not be revealed for this payout
 * + bank account. Callers map the codes to HTTP 400/404.
 */
export function assertRevealAllowed(payout: RevealPayout, bank: RevealBank | null | undefined): void {
  if (!(REVEALABLE_PAYOUT_STATES as readonly string[]).includes(payout.status)) {
    throw new Error('PAYOUT_STATE_NOT_REVEALABLE');
  }
  if (!bank) {
    throw new Error('BANK_ACCOUNT_NOT_LINKED');
  }
  if (bank.storeId !== payout.storeId) {
    throw new Error('BANK_ACCOUNT_NOT_LINKED');
  }
}
