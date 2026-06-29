/**
 * Accountant settlement detail (read model, Batch 4E).
 *
 * Pure assembly of everything the accountant needs to process a transfer. It
 * NEVER exposes a full IBAN, a receipt file URL/key, KYC data or secrets — the
 * full IBAN is available only via the audited reveal route.
 */

import { eq, and, asc, desc } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { REVEALABLE_PAYOUT_STATES } from './iban-reveal-policy.js';

export interface DetailPayout {
  id: number;
  storeId: number;
  status: string;
  amount: string;
  currency: string;
  reference: string;
  bankAccountId?: number | null;
  metadata?: { period?: string; ordersCount?: number; dueDate?: string } | null;
}

export interface DetailBank {
  bankName: string;
  accountHolderName: string;
  ibanLast4: string | null;
  status: string;
}

export interface DetailProof {
  id: number;
  sha256: string | null;
  fileMimeType: string | null;
  bankReference: string;
  bankName: string;
  transferredAt: Date | string;
  amount: string;
  currency: string;
}

export interface DetailEvent {
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  createdAt: Date | string;
  actorRole?: string | null;
  amount?: string | null;
}

export interface AccountantDetailInput {
  payout: DetailPayout;
  storeName: string;
  bank: DetailBank | null;
  proof: DetailProof | null;
  events: DetailEvent[];
  revealableStates: readonly string[];
  /** Computed by the route from the current admin (permission + not the
   *  receipt uploader) — UI gating only; the ledger is the real enforcement. */
  canSecondApprove?: boolean;
}

export interface AdminPermissionContext {
  userId: number;
  permissions: string[];
}

export function buildAccountantSettlementDetail(input: AccountantDetailInput) {
  const { payout, bank, proof, events } = input;
  const meta = payout.metadata ?? {};
  return {
    payoutId: payout.id,
    storeId: payout.storeId,
    merchantName: input.storeName,
    amount: payout.amount,
    currency: payout.currency,
    status: payout.status,
    reference: payout.reference,
    period: meta.period ?? null,
    ordersCount: meta.ordersCount ?? null,
    dueDate: meta.dueDate ?? null,
    // Masked bank account only — never the full IBAN.
    bankAccount: bank
      ? {
          bankName: bank.bankName,
          accountHolderName: bank.accountHolderName,
          ibanLast4: bank.ibanLast4,
          maskedIban: bank.ibanLast4 ? `****${bank.ibanLast4}` : null,
          verificationStatus: bank.status,
        }
      : null,
    // Receipt metadata only — no file URL/key.
    transferProof: proof
      ? {
          receiptId: proof.id,
          sha256: proof.sha256,
          fileMimeType: proof.fileMimeType,
          bankReference: proof.bankReference,
          bankName: proof.bankName,
          transferDate: proof.transferredAt,
          transferredAmount: proof.amount,
          currency: proof.currency,
        }
      : null,
    events: events.map((e) => ({
      eventType: e.eventType,
      fromStatus: e.fromStatus,
      toStatus: e.toStatus,
      actorRole: e.actorRole ?? null,
      amount: e.amount ?? null,
      createdAt: e.createdAt,
    })),
    canRevealIban: !!bank && input.revealableStates.includes(payout.status),
    awaitingSecondApproval: payout.status === 'awaiting_second_approval',
    canSecondApprove: payout.status === 'awaiting_second_approval' && !!input.canSecondApprove,
  };
}

export async function getAccountantSettlementDetailReadModel(
  payoutId: number,
  adminAuth?: AdminPermissionContext,
) {
  const db = createDbClient();

  const [payout] = await db.select().from(s.payoutRequests)
    .where(eq(s.payoutRequests.id, payoutId)).limit(1);
  if (!payout) return null;

  const [store] = await db.select({ name: s.stores.name })
    .from(s.stores).where(eq(s.stores.id, payout.storeId)).limit(1);

  // Masked bank columns ONLY — the full `iban` column is never selected here.
  const bankCols = {
    bankName: s.merchantBankAccounts.bankName,
    accountHolderName: s.merchantBankAccounts.accountHolderName,
    ibanLast4: s.merchantBankAccounts.ibanLast4,
    status: s.merchantBankAccounts.status,
  };
  let bank;
  if (payout.bankAccountId) {
    [bank] = await db.select(bankCols).from(s.merchantBankAccounts)
      .where(eq(s.merchantBankAccounts.id, payout.bankAccountId)).limit(1);
  } else {
    [bank] = await db.select(bankCols).from(s.merchantBankAccounts)
      .where(and(eq(s.merchantBankAccounts.storeId, payout.storeId), eq(s.merchantBankAccounts.status, 'verified')))
      .limit(1);
  }

  // Proof METADATA only — proofFileKey / any URL is deliberately not selected.
  const [proof] = await db.select({
    id: s.payoutTransferProofs.id,
    sha256: s.payoutTransferProofs.sha256,
    fileMimeType: s.payoutTransferProofs.fileMimeType,
    bankReference: s.payoutTransferProofs.bankReference,
    bankName: s.payoutTransferProofs.bankName,
    transferredAt: s.payoutTransferProofs.transferredAt,
    amount: s.payoutTransferProofs.amount,
    currency: s.payoutTransferProofs.currency,
  }).from(s.payoutTransferProofs)
    .where(eq(s.payoutTransferProofs.payoutRequestId, payoutId))
    .orderBy(desc(s.payoutTransferProofs.createdAt))
    .limit(1);

  const events = await db.select({
    eventType: s.payoutEvents.eventType,
    fromStatus: s.payoutEvents.fromStatus,
    toStatus: s.payoutEvents.toStatus,
    createdAt: s.payoutEvents.createdAt,
    actorRole: s.payoutEvents.actorRole,
    amount: s.payoutEvents.amount,
  }).from(s.payoutEvents)
    .where(eq(s.payoutEvents.payoutRequestId, payoutId))
    .orderBy(asc(s.payoutEvents.createdAt));

  // Batch 5: the current admin may second-approve only if they hold the
  // permission AND are not the receipt uploader (segregation). UI gating only
  // — the ledger enforces it authoritatively.
  const hasSecondApprove = !!adminAuth && (adminAuth.permissions.includes('admin:*') || adminAuth.permissions.includes('wallet.payout.second_approve'));
  const canSecondApprove = hasSecondApprove && adminAuth!.userId !== payout.transferredByUserId;

  return buildAccountantSettlementDetail({
    payout: payout as never,
    storeName: store?.name ?? `#${payout.storeId}`,
    bank: bank ?? null,
    proof: proof ?? null,
    events,
    revealableStates: REVEALABLE_PAYOUT_STATES,
    canSecondApprove,
  });
}
