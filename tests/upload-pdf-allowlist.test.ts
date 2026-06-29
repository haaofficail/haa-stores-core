import { describe, expect, it } from 'vitest';
import { LocalStorageAdapter } from '../packages/shared/src/media.js';

/**
 * Batch 4C — PDF is accepted end-to-end in the real upload path so bank
 * transfer receipts (commonly PDF) can be stored. No other new types are
 * opened and the size limit is unchanged.
 */

const adapter = new LocalStorageAdapter();
const pdf = Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46]), Buffer.alloc(64)]); // %PDF
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(64)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64)]);
const gif = Buffer.concat([Buffer.from([0x47, 0x49, 0x46, 0x38]), Buffer.alloc(64)]);

describe('upload allowlist accepts PDF receipts', () => {
  it('accepts a valid PDF (magic %PDF)', () => {
    expect(adapter.validateFile(pdf, 'application/pdf', { allowPdf: true })).toBeNull();
  });

  it('still accepts PNG and JPEG', () => {
    expect(adapter.validateFile(png, 'image/png')).toBeNull();
    expect(adapter.validateFile(jpeg, 'image/jpeg')).toBeNull();
  });

  it('rejects a disallowed type (GIF)', () => {
    expect(adapter.validateFile(gif, 'image/gif')).not.toBeNull();
  });

  it('rejects a PDF mimetype with the wrong magic bytes', () => {
    expect(adapter.validateFile(png, 'application/pdf', { allowPdf: true })).not.toBeNull();
  });

  it('keeps the 5MB size limit (rejects oversized PDF)', () => {
    const big = Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46]), Buffer.alloc(5 * 1024 * 1024 + 1)]);
    expect(adapter.validateFile(big, 'application/pdf', { allowPdf: true })).not.toBeNull();
  });
});
