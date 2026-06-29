/**
 * Settlement reports — pure classification helpers (Batch 6).
 *
 * Reconciliation is an INTERNAL report to help the accountant match the system
 * against a bank statement by hand. No live bank feed. No full IBAN, no receipt
 * URL — callers must pass already-masked data.
 */

import { inArray, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { getStuckAfterHours } from '@haa/wallet-core';

export const RECONCILIATION_STATUSES = [
  'matched',
  'missing_bank_reference',
  'missing_receipt',
  'amount_mismatch',
  'currency_mismatch',
  'pending_second_approval',
  'stuck_transfer_pending',
  'manual_review',
] as const;

export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export interface ReconPayout {
  status: string;
  amount: string;
  currency: string;
}

export interface ReconProof {
  bankReference?: string | null;
  amount?: string | null;
  currency?: string | null;
}

/** Classify a settlement for the internal reconciliation report. */
export function classifyReconciliation(payout: ReconPayout, proof: ReconProof | null): ReconciliationStatus {
  if (payout.status === 'manual_review') return 'manual_review';
  if (payout.status === 'awaiting_second_approval') return 'pending_second_approval';
  if (payout.status === 'transfer_pending') return 'stuck_transfer_pending';

  // transferred / proof_uploaded / transfer_verified — check receipt integrity.
  if (!proof) return 'missing_receipt';
  if (!proof.bankReference || proof.bankReference.trim() === '') return 'missing_bank_reference';
  if (Number(proof.amount) !== Number(payout.amount)) return 'amount_mismatch';
  if ((proof.currency ?? '') !== payout.currency) return 'currency_mismatch';
  return 'matched';
}

/** Non-final, in-progress states that can get "stuck". */
export const STUCK_STATES = [
  'transfer_pending',
  'transferred',
  'proof_uploaded',
  'manual_review',
  'awaiting_second_approval',
] as const;

export interface StuckPayout {
  status: string;
  updatedAt: Date | string | number;
}

/** True if the settlement has sat in a non-final state past the threshold. */
export function isStuckSettlement(payout: StuckPayout, stuckAfterHours: number, now: number): boolean {
  if (!(STUCK_STATES as readonly string[]).includes(payout.status)) return false;
  const ts = payout.updatedAt instanceof Date ? payout.updatedAt.getTime() : new Date(payout.updatedAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return now - ts > stuckAfterHours * 3600 * 1000;
}

function shortSha(v: string | null): string | null {
  return v ? `${v.slice(0, 12)}…` : null;
}

export async function getFinanceReportsReadModel() {
  const db = createDbClient();
  const payouts = await db.select().from(s.payoutRequests).orderBy(desc(s.payoutRequests.createdAt));
  const storeIds = [...new Set(payouts.map((p: { storeId: number }) => p.storeId))];

  const storeNamesById: Record<number, string> = {};
  if (storeIds.length > 0) {
    const stores = await db.select({ id: s.stores.id, name: s.stores.name }).from(s.stores).where(inArray(s.stores.id, storeIds));
    for (const st of stores) storeNamesById[st.id] = st.name;
  }

  // Latest proof METADATA per payout (no proofFileKey / URL selected).
  const proofRows = storeIds.length === 0 ? [] : await db.select({
    payoutRequestId: s.payoutTransferProofs.payoutRequestId,
    bankReference: s.payoutTransferProofs.bankReference,
    bankName: s.payoutTransferProofs.bankName,
    amount: s.payoutTransferProofs.amount,
    currency: s.payoutTransferProofs.currency,
    transferredAt: s.payoutTransferProofs.transferredAt,
    sha256: s.payoutTransferProofs.sha256,
    fileMimeType: s.payoutTransferProofs.fileMimeType,
    id: s.payoutTransferProofs.id,
    createdAt: s.payoutTransferProofs.createdAt,
  }).from(s.payoutTransferProofs).orderBy(desc(s.payoutTransferProofs.createdAt));
  const proofByPayout: Record<number, (typeof proofRows)[number]> = {};
  for (const pr of proofRows) if (!proofByPayout[pr.payoutRequestId]) proofByPayout[pr.payoutRequestId] = pr;

  const stuckHours = getStuckAfterHours();
  const now = Date.now();

  const rows = payouts.map((p) => {
    const proof = proofByPayout[p.id] ?? null;
    return {
      settlementId: p.reference,
      payoutId: p.id,
      storeName: storeNamesById[p.storeId] ?? `#${p.storeId}`,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      transferDate: proof?.transferredAt ?? p.transferredAt ?? null,
      bankReference: proof?.bankReference ?? null,
      bankName: proof?.bankName ?? null,
      receiptId: proof?.id ?? null,
      sha256: shortSha(proof?.sha256 ?? null),
      fileMimeType: proof?.fileMimeType ?? null,
      accountantId: p.transferredByUserId ?? null,
      secondApproverId: p.verifiedByUserId ?? null,
      reconciliationStatus: classifyReconciliation(p, proof),
      stuck: isStuckSettlement({ status: p.status, updatedAt: p.updatedAt }, stuckHours, now),
    };
  });

  return {
    archive: rows.filter((r) => r.status === 'transfer_verified'),
    reconciliation: rows,
    stuck: rows.filter((r) => r.stuck),
    stuckAfterHours: stuckHours,
    generatedAt: new Date().toISOString(),
  };
}
