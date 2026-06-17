/**
 * TASK-0040 Track 1A — P0-4 Demo Isolation Contract Fix
 *
 * Bug: haa-marketplace.ts uses raw `sql\`${s.stores.demoProfile} IS NOT NULL\``
 *      in 4 query sites (lines 92, 263, 400, 448). Demo store with
 *      `demoProfile='general'` (set by main seed) passes this SQL filter
 *      and is shown on the marketplace alongside real stores.
 *
 *      The shared `shouldShowInMarketplace(store)` helper exists in
 *      packages/shared/src/demo/demo-rules.ts:106 but is never called.
 *      For profiles not in the whitelist ('main', 'perfume'),
 *      `shouldShowInMarketplace` returns false (correct), while the raw
 *      SQL returns true (bug).
 *
 * Fix: Replace the 4 raw SQL sites with `shouldShowInMarketplace(s.stores)`
 *      (via Drizzle SQL helper) so the whitelist is the single source of
 *      truth. Plus change seed `demoProfile: 'general'` to `'main'`
 *      (per plan §3 Track 1A recommendation).
 *
 * This test codifies the contract so future regressions are caught.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  shouldShowInMarketplace,
} from '@haa/shared';

const ROOT = resolve(__dirname, '..');
const HAAM = resolve(ROOT, 'apps/api/src/routes/haa-marketplace.ts');
const SEED = resolve(ROOT, 'packages/db/src/seed/index.ts');

function readSource(file: string): string {
  return readFileSync(file, 'utf-8');
}

describe('TASK-0040 Track 1A — P0-4 demo isolation (source-grep contract)', () => {
  it('haa-marketplace.ts no longer uses raw `demoProfile IS NOT NULL` SQL', () => {
    const src = readSource(HAAM);
    // Bug pattern: literal raw SQL checking demoProfile is not null
    expect(src).not.toMatch(/\$\{s\.stores\.demoProfile\}\s+IS\s+NOT\s+NULL/);
  });

  it('haa-marketplace.ts uses shouldShowInMarketplace helper (via shared export)', () => {
    const src = readSource(HAAM);
    // The fix path: either a direct call OR the SQL template uses the
    // helper's decision. Accept either:
    //   - shouldShowInMarketplace(s.stores) called directly
    //   - sql`(SELECT 1 FROM ...)` style that uses the helper
    // Simplest contract: at least one reference to shouldShowInMarketplace
    // in the route source.
    expect(src).toContain('shouldShowInMarketplace');
  });

  it('seed does not set demoProfile to the unrecognized value "general"', () => {
    const src = readSource(SEED);
    // After the fix, the main seed must use a recognized profile.
    // `general` is NOT in the demo-rules whitelist (lines 86-97 of demo-rules.ts
    // only defines `main` + `perfume`). So `general` is the bug value.
    // The fix per plan §3 Track 1A: change to `main`.
    expect(src).not.toMatch(/demoProfile:\s*['"]general['"]/);
  });

  it('seed sets demoProfile to a recognized value (main or perfume)', () => {
    const src = readSource(SEED);
    // After the fix, the seed must use `main` (or `perfume`).
    const matches = src.match(/demoProfile:\s*['"]([a-z]+)['"]/g) ?? [];
    const profiles = matches.map((m) => m.match(/['"]([a-z]+)['"]/)![1]);
    expect(profiles.length).toBeGreaterThan(0);
    for (const p of profiles) {
      expect(['main', 'perfume']).toContain(p);
    }
  });
});

describe('TASK-0040 Track 1A — shouldShowInMarketplace behavioral contract', () => {
  // These mirror tests/marketplace-demo.test.ts but emphasize the bug:
  // a store with `demoProfile='general'` (the seed bug) should NOT show.

  it('rejects "general" demo profile (the bug value)', () => {
    const store = { isDemo: true, demoProfile: 'general' };
    expect(shouldShowInMarketplace(store)).toBe(false);
  });

  it('rejects "unknown" demo profile', () => {
    const store = { isDemo: true, demoProfile: 'unknown' };
    expect(shouldShowInMarketplace(store)).toBe(false);
  });

  it('accepts "main" demo profile', () => {
    const store = { isDemo: true, demoProfile: 'main' };
    expect(shouldShowInMarketplace(store)).toBe(true);
  });

  it('accepts "perfume" demo profile', () => {
    const store = { isDemo: true, demoProfile: 'perfume' };
    expect(shouldShowInMarketplace(store)).toBe(true);
  });

  it('rejects real store (isDemo=false)', () => {
    const store = { isDemo: false, demoProfile: null };
    expect(shouldShowInMarketplace(store)).toBe(false);
  });

  it('rejects null/undefined store', () => {
    expect(shouldShowInMarketplace(null)).toBe(false);
    expect(shouldShowInMarketplace(undefined)).toBe(false);
  });
});
