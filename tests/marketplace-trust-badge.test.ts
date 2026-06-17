// TASK-0038 P0-#3 — Marketplace 'متجر موثوق' badge gating tests
//
// The 'متجر موثوق' badge was previously rendered unconditionally for
// every store, including demo stores. This is misleading to customers
// and creates legal risk (false advertising). The badge must only
// display when the store is verified (kycVerified === true) AND
// not a demo store.

import { describe, it, expect } from 'vitest';

// Mirrors the gating logic in MarketplaceProductDetail.tsx so we can
// unit-test it without rendering the whole component tree.
function shouldShowTrustBadge(store: {
  kycVerified?: boolean;
  isDemoStore?: boolean;
}): boolean {
  return store.kycVerified === true && !store.isDemoStore;
}

describe('marketplace trust badge gating', () => {
  it('hides badge when kycVerified is undefined (default)', () => {
    expect(shouldShowTrustBadge({})).toBe(false);
  });

  it('hides badge when kycVerified is false', () => {
    expect(shouldShowTrustBadge({ kycVerified: false })).toBe(false);
  });

  it('hides badge for demo stores even when kycVerified is true', () => {
    // The most important case: a demo store with kycVerified=true
    // must still NOT show the badge. Demo stores are seed data, not
    // real merchants.
    expect(shouldShowTrustBadge({ kycVerified: true, isDemoStore: true })).toBe(false);
  });

  it('shows badge only for verified, non-demo stores', () => {
    expect(shouldShowTrustBadge({ kycVerified: true, isDemoStore: false })).toBe(true);
  });

  it('hides badge when isDemoStore is true (regardless of kycVerified)', () => {
    expect(shouldShowTrustBadge({ isDemoStore: true })).toBe(false);
    expect(shouldShowTrustBadge({ isDemoStore: true, kycVerified: undefined })).toBe(false);
  });

  it('hides badge for stores with only isDemoStore=false but no kycVerified', () => {
    // A real store that hasn't completed KYC must not show the badge.
    expect(shouldShowTrustBadge({ isDemoStore: false })).toBe(false);
  });
});

describe('kycVerified — backend DTO contract', () => {
  // The backend's mapProduct function in apps/api/src/routes/haa-marketplace.ts
  // explicitly sets kycVerified: false on every response. This test
  // documents that contract so the test fails if a future change
  // accidentally flips the default to true.
  it('documents that kycVerified must default to false in the DTO', () => {
    // Read the source to verify the constant.
    const fs = require('fs');
    const path = require('path');
    const sourcePath = path.resolve(
      __dirname,
      '..',
      'apps/api/src/routes/haa-marketplace.ts',
    );
    const source = fs.readFileSync(sourcePath, 'utf-8');
    // Find the kycVerified assignment in the mapProduct function.
    // It must be the literal value `false` (or a function call that
    // resolves to false), NOT `true` and NOT a property read that
    // could be undefined.
    const matches = source.match(/kycVerified:\s*([^,\n}]+)/g) || [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      const value = m.replace(/^kycVerified:\s*/, '').trim();
      // The default value should be the literal `false` so no store
      // accidentally gets `kycVerified: undefined` (which would NOT
      // show the badge in the gating logic).
      expect(value).toBe('false');
    }
  });
});
