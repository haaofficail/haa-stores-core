// Geidea readiness invariants — DECISION-OS-011.
//
// Locks the rule that Geidea refund capabilities stay OFF until the live
// implementation lands. UI rendering of "refund" for Geidea merchants
// must not return without flipping these flags + replacing the stub.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BASE = readFileSync(resolve(__dirname, '../packages/payment-providers/src/base.ts'), 'utf-8');
const GEIDEA = readFileSync(resolve(__dirname, '../packages/payment-providers/src/geidea.ts'), 'utf-8');

describe('Geidea readiness (DECISION-OS-011)', () => {
  it('GEIDEA_CAPABILITIES.supportsRefunds is false until live implementation lands', () => {
    // Look only inside the GEIDEA_CAPABILITIES block.
    const block = BASE.split('GEIDEA_CAPABILITIES')[1] ?? '';
    expect(block).toMatch(/supportsRefunds:\s*false/);
  });

  it('GEIDEA_CAPABILITIES.supportsPartialRefunds is false until live implementation lands', () => {
    const block = BASE.split('GEIDEA_CAPABILITIES')[1] ?? '';
    expect(block).toMatch(/supportsPartialRefunds:\s*false/);
  });

  it('GeideaPaymentProvider.refundPayment is still the stub returning success:false', () => {
    expect(GEIDEA).toMatch(/refundPayment[^]*?Geidea refunds require live provider/);
  });

  it('readiness document exists', () => {
    const doc = readFileSync(
      resolve(__dirname, '../docs/agent-os/GEIDEA_READINESS.md'),
      'utf-8',
    );
    for (const k of [
      'not_configured',
      'mock_ready',
      'sandbox_configured',
      'sandbox_verified',
      'live_locked',
      'live_ready',
    ]) {
      expect(doc).toContain(k);
    }
  });

  // W4 (Autopilot Phase 3): the dashboard MUST NOT show a refund button
  // for orders paid via Geidea until the live refund pipeline lands.
  // Showing a button that calls a stub-success-false endpoint is strictly
  // worse than not showing it. The gate lives in
  // apps/merchant-dashboard/src/lib/order-actions.ts.
  describe('W4 — refund UI gating for Geidea merchants', () => {
    const orderActionsSrc = readFileSync(
      resolve(__dirname, '../apps/merchant-dashboard/src/lib/order-actions.ts'),
      'utf-8',
    );

    it('PROVIDERS_WITHOUT_REFUND_UI set contains geidea', () => {
      expect(orderActionsSrc).toMatch(/PROVIDERS_WITHOUT_REFUND_UI\s*=\s*new Set\(\[\s*['"]geidea['"]/);
    });

    it('orderProviderCode helper normalizes geidea_card → geidea', () => {
      expect(orderActionsSrc).toMatch(/orderProviderCode/);
      expect(orderActionsSrc).toMatch(/replace\(\/_\(card\|pay\|gateway\)/);
    });

    it('refund action is gated by refundUiAllowed', () => {
      // The single-line gate: `if (status === 'returned' && refundUiAllowed)`.
      // A future commit accidentally removing the gate fails this test.
      expect(orderActionsSrc).toMatch(/status === ['"]returned['"]\s*&&\s*refundUiAllowed/);
    });

    it('refundUiAllowed defaults to true when provider is unknown', () => {
      // We do NOT want to hide refund for orders with no provider data
      // (e.g. legacy / manual entries). The guard inverts the membership:
      //   refundUiAllowed = !providerCode || !SET.has(providerCode);
      expect(orderActionsSrc).toMatch(/refundUiAllowed\s*=\s*!providerCode\s*\|\|\s*!PROVIDERS_WITHOUT_REFUND_UI\.has/);
    });
  });
});
