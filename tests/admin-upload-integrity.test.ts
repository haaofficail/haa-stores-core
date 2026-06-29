import { describe, expect, it } from 'vitest';
import {
  assertAdminUploadIntegrity,
  sha256Hex,
  signAdminUploadIntegrity,
  verifyAdminUploadIntegrity,
} from '../apps/api/src/services/admin-upload-integrity';

describe('admin upload integrity signatures', () => {
  it('computes a stable sha256 for server-side upload bytes', () => {
    expect(sha256Hex(Buffer.from('receipt-bytes'))).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256Hex(Buffer.from('receipt-bytes'))).toBe(sha256Hex(Buffer.from('receipt-bytes')));
  });

  it('verifies the exact key/hash/mime tuple returned by the server upload route', () => {
    const input = {
      key: 'admin/receipt.pdf',
      sha256: sha256Hex(Buffer.from('%PDF receipt')),
      fileMimeType: 'application/pdf',
    };
    const signature = signAdminUploadIntegrity(input);

    expect(verifyAdminUploadIntegrity({ ...input, signature })).toBe(true);
    expect(verifyAdminUploadIntegrity({ ...input, key: 'admin/other.pdf', signature })).toBe(false);
    expect(verifyAdminUploadIntegrity({ ...input, sha256: 'b'.repeat(64), signature })).toBe(false);
    expect(verifyAdminUploadIntegrity({ ...input, fileMimeType: 'image/png', signature })).toBe(false);
  });

  it('throws a stable error code when a proof tries to use a tampered signature', () => {
    const input = {
      key: 'admin/receipt.pdf',
      sha256: sha256Hex(Buffer.from('%PDF receipt')),
      fileMimeType: 'application/pdf',
    };
    const signature = signAdminUploadIntegrity(input);

    expect(() => assertAdminUploadIntegrity({ ...input, signature })).not.toThrow();
    expect(() => assertAdminUploadIntegrity({ ...input, key: 'admin/tampered.pdf', signature }))
      .toThrow(/UPLOAD_INTEGRITY_SIGNATURE_INVALID/);
  });
});
