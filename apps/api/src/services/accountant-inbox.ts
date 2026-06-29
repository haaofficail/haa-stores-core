/**
 * Accountant Settlement Inbox — pure read/segmentation layer (Batch 3).
 *
 * Given payout rows plus per-store bank summaries and store names, split
 * settlements into:
 *   - `ready`      — actionable + bank verified (the accountant will process
 *                    these in a LATER batch; nothing is processed here)
 *   - `exceptions` — not processable, each with a clear reason
 *
 * Hard rules (Batch 3 scope):
 *   - READ ONLY. No transfer logic, no ledger mutation, no state change.
 *   - The full IBAN must NEVER leave the server. Callers pass only a bank
 *     summary `{ status, ibanLast4 }`; this module surfaces `ibanLast4` only.
 */

import { inArray } from 'drizzle-orm';
import { createDbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { WalletLedger } from '@haa/wallet-core';

/** Payout states the accountant can still act on (forward path). */
export const READY_STATES = ['requested', 'under_review', 'approved', 'transfer_pending'] as const;

/** Terminal-failure states surfaced as exceptions (read-only, with a reason). */
export const TERMINAL_FAILURE_STATES = ['failed', 'cancelled', 'rejected', 'reversed'] as const;

export interface InboxPayoutRow {
  id: number;
  storeId: number;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  bankAccountId?: number | null;
  requestedAt?: Date | string | null;
  failureReason?: string | null;
  rejectionReason?: string | null;
  metadata?: { period?: string; ordersCount?: number; dueDate?: string } | null;
}

/** Bank summary — deliberately carries NO full IBAN. */
export interface BankSummary {
  status: string;
  ibanLast4: string | null;
}

export interface AccountantInboxInput {
  payouts: InboxPayoutRow[];
  banksByStoreId: Record<number, BankSummary | undefined>;
  storeNamesById: Record<number, string | undefined>;
  secondApprovalThresholdSar: number;
}

export interface InboxItem {
  settlementId: number;
  reference: string;
  merchantName: string;
  netAmount: string;
  currency: string;
  period: string | null;
  ordersCount: number | null;
  status: string;
  bankAccountStatus: string;
  ibanLast4: string | null;
  dueDate: string | null;
  needsSecondApproval: boolean;
  /** Present only on exception items. */
  exceptionReason?: string;
}

export interface AccountantInbox {
  ready: InboxItem[];
  exceptions: InboxItem[];
}

const DEFAULT_SECOND_APPROVAL_THRESHOLD_SAR = 10000;

/** Configurable (never hardcoded in logic) via env; safe positive default. */
export function getSecondApprovalThresholdSar(): number {
  const v = Number(process.env.SETTLEMENT_SECOND_APPROVAL_THRESHOLD_SAR);
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_SECOND_APPROVAL_THRESHOLD_SAR;
}

const STATUS_REASON_AR: Record<string, string> = {
  failed: 'فشل التحويل',
  cancelled: 'أُلغيت التسوية',
  rejected: 'رُفضت التسوية',
  reversed: 'عُكست التسوية',
};

function humanizeFailure(row: InboxPayoutRow): string {
  return (
    row.failureReason ||
    row.rejectionReason ||
    STATUS_REASON_AR[row.status] ||
    'تسوية غير قابلة للمعالجة'
  );
}

function baseItem(row: InboxPayoutRow, input: AccountantInboxInput): InboxItem {
  const bank = input.banksByStoreId[row.storeId];
  const meta = row.metadata ?? {};
  return {
    settlementId: row.id,
    reference: row.reference,
    merchantName: input.storeNamesById[row.storeId] ?? `#${row.storeId}`,
    netAmount: row.amount,
    currency: row.currency,
    period: meta.period ?? null,
    ordersCount: meta.ordersCount ?? null,
    status: row.status,
    bankAccountStatus: bank?.status ?? 'missing',
    // Server-side masking: only the last 4 digits ever leave this layer.
    ibanLast4: bank?.ibanLast4 ?? null,
    dueDate: meta.dueDate ?? null,
    needsSecondApproval: Number(row.amount) >= input.secondApprovalThresholdSar,
  };
}

/**
 * Pure segmentation of payouts into the accountant's ready queue and the
 * exceptions list. Never mutates inputs; never exposes a full IBAN.
 */
export function buildAccountantInbox(input: AccountantInboxInput): AccountantInbox {
  const ready: InboxItem[] = [];
  const exceptions: InboxItem[] = [];

  for (const row of input.payouts) {
    const item = baseItem(row, input);

    if ((TERMINAL_FAILURE_STATES as readonly string[]).includes(row.status)) {
      exceptions.push({ ...item, exceptionReason: humanizeFailure(row) });
      continue;
    }

    // Batch 4D: a settlement parked for human review (e.g. transfer
    // amount/currency mismatch) is shown as a READ-ONLY exception with a clear
    // reason — never in the ready-to-transfer queue.
    if (row.status === 'manual_review') {
      exceptions.push({ ...item, exceptionReason: 'مراجعة يدوية مطلوبة (اختلاف في بيانات التحويل)' });
      continue;
    }

    if ((READY_STATES as readonly string[]).includes(row.status)) {
      if (item.bankAccountStatus === 'verified') {
        ready.push(item);
      } else {
        exceptions.push({ ...item, exceptionReason: 'الحساب البنكي غير موثّق للتحويل' });
      }
    }

    // Completed / in-progress (proof_uploaded, transfer_verified, paid, …) are
    // neither ready nor exceptions — excluded from the inbox.
  }

  return { ready, exceptions };
}

export async function getAccountantInboxReadModel(): Promise<AccountantInbox> {
  const db = createDbClient();
  const payouts = await new WalletLedger().listAllPayouts();
  const storeIds = [...new Set(payouts.map((p: { storeId: number }) => p.storeId))];

  const storeNamesById: Record<number, string> = {};
  const banksByStoreId: Record<number, BankSummary> = {};

  if (storeIds.length > 0) {
    const stores = await db
      .select({ id: s.stores.id, name: s.stores.name })
      .from(s.stores)
      .where(inArray(s.stores.id, storeIds));
    for (const row of stores) storeNamesById[row.id] = row.name;

    // Only masked columns are selected — the full `iban` is never read here.
    const banks = await db
      .select({
        storeId: s.merchantBankAccounts.storeId,
        status: s.merchantBankAccounts.status,
        ibanLast4: s.merchantBankAccounts.ibanLast4,
        isDefault: s.merchantBankAccounts.isDefault,
      })
      .from(s.merchantBankAccounts)
      .where(inArray(s.merchantBankAccounts.storeId, storeIds));
    for (const b of banks) {
      // Prefer the default account; otherwise keep the first seen.
      if (!banksByStoreId[b.storeId] || b.isDefault) {
        banksByStoreId[b.storeId] = { status: b.status, ibanLast4: b.ibanLast4 ?? null };
      }
    }
  }

  return buildAccountantInbox({
    payouts: payouts as unknown as InboxPayoutRow[],
    banksByStoreId,
    storeNamesById,
    secondApprovalThresholdSar: getSecondApprovalThresholdSar(),
  });
}
