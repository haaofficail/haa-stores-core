// Beta deletion policy — DECISION-OS-014.
//
// In beta, direct tenant deletion and merchant account self-deletion are
// disabled as features. This test asserts the route handlers return the
// FORBIDDEN_BETA_POLICY response and do NOT reach the underlying delete
// path. It is a source-grep guard plus a behavioural assertion.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TENANT_SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/admin/tenants-stores.ts'),
  'utf-8',
);
const MERCHANT_SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/merchant-data.ts'),
  'utf-8',
);

describe('Beta deletion policy (DECISION-OS-014)', () => {
  it('admin tenant DELETE returns FORBIDDEN_BETA_POLICY', () => {
    // Locate the `remove:` handler and verify the early return.
    const idx = TENANT_SRC.indexOf('remove: async');
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = TENANT_SRC.slice(idx, idx + 800);
    expect(block).toContain('FORBIDDEN_BETA_POLICY');
    expect(block).toContain('DECISION-OS-014');
    // The early-return guard must precede any call to db.delete.
    const guardIdx = block.indexOf('FORBIDDEN_BETA_POLICY');
    const deleteIdx = block.indexOf('db.delete(');
    if (deleteIdx >= 0) {
      expect(guardIdx).toBeLessThan(deleteIdx);
    }
  });

  it('merchant DELETE /account returns FORBIDDEN_BETA_POLICY', () => {
    const idx = MERCHANT_SRC.indexOf("merchantDataRouter.delete('/account'");
    expect(idx).toBeGreaterThanOrEqual(0);
    const block = MERCHANT_SRC.slice(idx, idx + 1500);
    expect(block).toContain('FORBIDDEN_BETA_POLICY');
    expect(block).toContain('DECISION-OS-014');
  });
});
