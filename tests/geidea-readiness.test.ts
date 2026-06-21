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
});
