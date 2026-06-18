/**
 * Regression test for ISSUE-0011 — Missing store_billing_settings row seed guard.
 *
 * Verifies:
 * 1. The seed script (`packages/db/src/seed/index.ts`) iterates all stores
 * 2. It uses `onConflictDoNothing({ target: storeBillingSettings.storeId })` for idempotency
 * 3. It inserts a default row with `platformFeeMode = 'percentage'`, `platformFeePct = '0.02'`
 * 4. It includes `isPlatformFeeEnabled = true`, `isCodFeeEnabled = true`
 * 5. It logs the inserted vs. skipped counts
 * 6. ISSUE-0011 documented in ISSUE_KNOWLEDGE_BASE.md
 * 7. INCIDENTS.md marks the 6 API-001 fingerprints as resolved
 *
 * Pure source-grep verification. No DB connection.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) {
    throw new Error(`Required file missing: ${rel}`);
  }
  return readFileSync(path, 'utf-8');
}

const SEED_FILE = 'packages/db/src/seed/index.ts';

describe('Seed billing settings guard (ISSUE-0011)', () => {
  it('seed script iterates all stores', () => {
    const src = read(SEED_FILE);
    expect(src).toMatch(/Billing Settings Guard/);
    expect(src).toMatch(/from\(s\.stores\)/);
  });

  it('uses onConflictDoNothing for idempotency', () => {
    const src = read(SEED_FILE);
    expect(src).toMatch(/onConflictDoNothing/);
    expect(src).toMatch(/target:\s*s\.storeBillingSettings\.storeId/);
  });

  it('inserts default platform fee policy (percentage / 2%)', () => {
    const src = read(SEED_FILE);
    expect(src).toMatch(/platformFeeMode:\s*'percentage'/);
    expect(src).toMatch(/platformFeePct:\s*'0\.02'/);
    expect(src).toMatch(/isPlatformFeeEnabled:\s*true/);
  });

  it('inserts default COD fee policy (percentage / 2%)', () => {
    const src = read(SEED_FILE);
    expect(src).toMatch(/codFeeMode:\s*'percentage'/);
    expect(src).toMatch(/codFeePct:\s*'0\.02'/);
    expect(src).toMatch(/isCodFeeEnabled:\s*true/);
  });

  it('logs inserted vs. skipped counts', () => {
    const src = read(SEED_FILE);
    expect(src).toMatch(/billingInserted/);
    expect(src).toMatch(/billingSkipped/);
    expect(src).toMatch(/Billing settings:.*inserted.*already present/);
  });

  it('handles empty store list gracefully (no crash on length-0)', () => {
    const src = read(SEED_FILE);
    // The for loop with no stores is a no-op (0 iterations), so the for-of is safe.
    // Verify no .map().filter() that would crash on undefined.
    const billingBlock = src.split('Billing Settings Guard')[1]?.split('Seed completed successfully')[0] || '';
    expect(billingBlock).toMatch(/for \(const store of allStores\)/);
  });
});

describe('ISSUE-0011 — knowledge base and incidents updated', () => {
  it('ISSUE-0011 documented in ISSUE_KNOWLEDGE_BASE.md', () => {
    const src = read('docs/ops/ISSUE_KNOWLEDGE_BASE.md');
    expect(src).toMatch(/ISSUE-0011/);
    expect(src).toMatch(/store_billing_settings.*[Ss]eed/);
  });

  it('API-001 6 fingerprints marked as Resolved in INCIDENTS.md', () => {
    const src = read('docs/ops/INCIDENTS.md');
    expect(src).toMatch(/API-001.*Resolved|Resolved.*API-001/);
    expect(src).toMatch(/seed-billing-guards/);
  });
});
