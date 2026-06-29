import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const page = readFileSync(resolve(root, 'apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx'), 'utf-8');

/**
 * Batch 4F — the legacy super_admin settlement detail page must use the same
 * receipt contract the backend now requires (4B/4C): sha256, fileMimeType,
 * transferredAmount, currency, allowed types, 5MB, idempotency.
 */
describe('legacy super_admin receipt upload matches the new contract', () => {
  it('the proof form carries sha256, fileMimeType, transferredAmount and currency', () => {
    for (const field of ['sha256', 'fileMimeType', 'transferredAmount', 'currency']) {
      expect(page, `proof form must include ${field}`).toMatch(new RegExp(field));
    }
  });

  it('computes the sha256 in the browser before uploading', () => {
    expect(page).toMatch(/crypto\.subtle\.digest\(\s*['"]SHA-256['"]/);
  });

  it('accepts only PDF/PNG/JPEG and enforces a 5MB limit', () => {
    expect(page).toMatch(/application\/pdf/);
    expect(page).toMatch(/image\/png/);
    expect(page).toMatch(/image\/jpeg/);
    expect(page).not.toMatch(/image\/webp/); // receipts are not webp
    expect(page).toMatch(/5\s*\*\s*1024\s*\*\s*1024|5242880|5MB|5\s*MB/);
  });

  it('uploads the proof via adminApi.uploadProof (which sends the Idempotency-Key)', () => {
    expect(page).toMatch(/adminApi\.uploadProof\(/);
  });

  it('surfaces an amount/currency mismatch clearly', () => {
    expect(page).toMatch(/MISMATCH|اختلاف|لا يطابق/);
  });

  it('disables submit while saving / uploading', () => {
    expect(page).toMatch(/disabled=\{[^}]*proofUploading/);
  });
});
