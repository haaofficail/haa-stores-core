/**
 * Transfer-receipt input validation (Batch 4B).
 *
 * A receipt is a financial document. Before it is stored it must have:
 *   - a file (proofFileKey),
 *   - a bank reference,
 *   - a sha256 (tamper detection / dedup aid),
 *   - an allowed content type (PDF / PNG / JPEG only).
 *
 * Pure + side-effect free so it can be unit tested and reused by the ledger
 * service. Errors use stable codes so the API can surface them clearly.
 */

import Decimal from 'decimal.js';

export const ALLOWED_RECEIPT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

export type ReceiptMimeType = (typeof ALLOWED_RECEIPT_MIME_TYPES)[number];

export interface ReceiptInput {
  proofFileKey?: string | null;
  bankReference?: string | null;
  sha256?: string | null;
  fileMimeType?: string | null;
}

const SHA256_RE = /^[a-f0-9]{64}$/i;

/** Allowed clock skew for a transfer date in the future (Batch 4C policy:
 *  a bank transfer can be stamped "today" across timezones, but never days
 *  ahead — documented simple rule, no separate time-policy system needed). */
const MAX_FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;

/** Throws a stable-coded Error if the receipt input is not storable. */
export function assertReceiptInput(input: ReceiptInput): void {
  if (!input.proofFileKey || input.proofFileKey.trim() === '') {
    throw new Error('RECEIPT_FILE_REQUIRED');
  }
  if (!input.bankReference || input.bankReference.trim() === '') {
    throw new Error('RECEIPT_BANK_REFERENCE_REQUIRED');
  }
  if (!input.sha256 || !SHA256_RE.test(input.sha256)) {
    throw new Error('RECEIPT_SHA256_REQUIRED');
  }
  if (!input.fileMimeType || !(ALLOWED_RECEIPT_MIME_TYPES as readonly string[]).includes(input.fileMimeType)) {
    throw new Error('RECEIPT_FILE_TYPE_NOT_ALLOWED');
  }
}

export interface TransferDataInput {
  bankName?: string | null;
  transferredAt?: Date | null;
  transferredAmount?: string | number | null;
  currency?: string | null;
}

function toPositiveNumber(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Validate the mandatory bank-transfer fields recorded with a receipt. */
export function assertTransferData(input: TransferDataInput, now: number): void {
  if (!input.bankName || input.bankName.trim() === '') {
    throw new Error('TRANSFER_BANK_NAME_REQUIRED');
  }
  if (input.bankName.length > 100) {
    throw new Error('TRANSFER_BANK_NAME_TOO_LONG');
  }
  const t = input.transferredAt;
  if (!(t instanceof Date) || Number.isNaN(t.getTime()) || t.getTime() > now + MAX_FUTURE_SKEW_MS) {
    throw new Error('TRANSFER_DATE_INVALID');
  }
  if (toPositiveNumber(input.transferredAmount) === null) {
    throw new Error('TRANSFER_AMOUNT_INVALID');
  }
  if (!input.currency || input.currency.trim() === '') {
    throw new Error('TRANSFER_CURRENCY_REQUIRED');
  }
}

export type TransferAmountResult = { ok: true } | { ok: false; code: string; reason: string };

/**
 * Decimal-safe match of the transferred amount + currency against the
 * settlement. No silent rounding, no silent difference (Batch 4C).
 */
export function evaluateTransferAmount(
  settlementAmount: string,
  settlementCurrency: string,
  transferredAmount: string | number,
  transferredCurrency: string,
): TransferAmountResult {
  const amt = toPositiveNumber(transferredAmount);
  if (amt === null) {
    return { ok: false, code: 'TRANSFER_AMOUNT_INVALID', reason: 'Transferred amount must be a positive number' };
  }
  if (transferredCurrency !== settlementCurrency) {
    return {
      ok: false,
      code: 'TRANSFER_CURRENCY_MISMATCH',
      reason: `Currency ${transferredCurrency} does not match settlement currency ${settlementCurrency}`,
    };
  }
  if (!new Decimal(transferredAmount).equals(new Decimal(settlementAmount))) {
    return {
      ok: false,
      code: 'TRANSFER_AMOUNT_MISMATCH',
      reason: `Transferred ${transferredAmount} does not match settlement net ${settlementAmount}`,
    };
  }
  return { ok: true };
}
