import { describe, expect, it } from 'vitest';
import { ALLOWED_RECEIPT_MIME_TYPES, assertReceiptInput } from '@haa/wallet-core';

/**
 * Batch 4B — transfer-receipt input validation (pure).
 *
 * A receipt is a financial document: it must have a file, a bank reference,
 * a sha256 (tamper detection) and an allowed content type (PDF/PNG/JPEG).
 */

const SHA = 'a'.repeat(64);
const valid = {
  proofFileKey: 'stores/1/uploads/receipt.pdf',
  bankReference: 'BNK-REF-123',
  sha256: SHA,
  fileMimeType: 'application/pdf',
};

describe('ALLOWED_RECEIPT_MIME_TYPES', () => {
  it('is exactly PDF, PNG and JPEG', () => {
    expect([...ALLOWED_RECEIPT_MIME_TYPES].sort()).toEqual(
      ['application/pdf', 'image/jpeg', 'image/png'].sort(),
    );
  });
});

describe('assertReceiptInput', () => {
  it('accepts a valid PDF receipt', () => {
    expect(() => assertReceiptInput(valid)).not.toThrow();
  });

  it('accepts PNG and JPEG receipts', () => {
    expect(() => assertReceiptInput({ ...valid, fileMimeType: 'image/png' })).not.toThrow();
    expect(() => assertReceiptInput({ ...valid, fileMimeType: 'image/jpeg' })).not.toThrow();
  });

  it('rejects a missing file with RECEIPT_FILE_REQUIRED', () => {
    expect(() => assertReceiptInput({ ...valid, proofFileKey: undefined })).toThrow(/RECEIPT_FILE_REQUIRED/);
  });

  it('rejects a missing bank reference with RECEIPT_BANK_REFERENCE_REQUIRED', () => {
    expect(() => assertReceiptInput({ ...valid, bankReference: '' })).toThrow(/RECEIPT_BANK_REFERENCE_REQUIRED/);
  });

  it('rejects a missing/invalid sha256 with RECEIPT_SHA256_REQUIRED', () => {
    expect(() => assertReceiptInput({ ...valid, sha256: undefined })).toThrow(/RECEIPT_SHA256_REQUIRED/);
    expect(() => assertReceiptInput({ ...valid, sha256: 'not-a-hash' })).toThrow(/RECEIPT_SHA256_REQUIRED/);
  });

  it('rejects a disallowed file type with RECEIPT_FILE_TYPE_NOT_ALLOWED', () => {
    expect(() => assertReceiptInput({ ...valid, fileMimeType: 'image/gif' })).toThrow(/RECEIPT_FILE_TYPE_NOT_ALLOWED/);
    expect(() => assertReceiptInput({ ...valid, fileMimeType: 'application/zip' })).toThrow(/RECEIPT_FILE_TYPE_NOT_ALLOWED/);
    expect(() => assertReceiptInput({ ...valid, fileMimeType: undefined })).toThrow(/RECEIPT_FILE_TYPE_NOT_ALLOWED/);
  });
});
