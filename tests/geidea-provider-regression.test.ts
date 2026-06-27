import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGeideaSignature, verifyGeideaCallbackSignature } from '../packages/payment-providers/src/base';

const factorySource = readFileSync(new URL('../packages/payment-providers/src/factory.ts', import.meta.url), 'utf-8');
const orderTypesSource = readFileSync(new URL('../packages/shared/src/types/orders.ts', import.meta.url), 'utf-8');

describe('Geidea provider regression', () => {
  it('adds Geidea as the approved card provider and disables fake fallback when it is selected', () => {
    expect(orderTypesSource).toContain("export type ProviderCode = 'fake' | 'geidea'");
    expect(orderTypesSource).toContain("'geidea_card'");
    expect(factorySource).toContain("if (resolvedProvider === 'geidea')");
    expect(factorySource).toContain('Fake fallback is disabled');
  });

  it('creates and verifies callback signatures without exposing the API password', () => {
    const apiPassword = 'test-secret';
    const payload = {
      merchantPublicKey: 'pub',
      orderAmount: '10.00',
      orderCurrency: 'SAR',
      orderId: 'ORD-1',
      status: 'Success',
      merchantReferenceId: 'haa_1',
      timeStamp: '2026-06-12T00:00:00Z',
    };
    const signature = createGeideaSignature([
      payload.merchantPublicKey,
      payload.orderAmount,
      payload.orderCurrency,
      payload.orderId,
      payload.status,
      payload.merchantReferenceId,
      payload.timeStamp,
    ], apiPassword);

    expect(signature).not.toContain(apiPassword);
    expect(verifyGeideaCallbackSignature({ ...payload, signature }, apiPassword)).toBe(true);
  });

  it('rejects a wrong-but-equal-length signature without leaking timing (returns false, never throws)', () => {
    const apiPassword = 'test-secret';
    const real = createGeideaSignature(['ORD-1'], apiPassword);
    // toggle one char while keeping the exact same length
    const tampered = (real[0] === 'A' ? 'B' : 'A') + real.slice(1);
    expect(tampered.length).toBe(real.length);
    expect(() => verifyGeideaCallbackSignature({ orderId: 'ORD-1', signature: tampered }, apiPassword)).not.toThrow();
    expect(verifyGeideaCallbackSignature({ orderId: 'ORD-1', signature: tampered }, apiPassword)).toBe(false);
  });

  it('fails closed on a length-mismatched signature instead of throwing RangeError (QA S5 length guard)', () => {
    // timingSafeEqual throws "Input buffers must have the same byte length"
    // when the attacker-controlled signature differs in length from the
    // expected base64 HMAC. The guard must turn that into a plain `false`.
    const apiPassword = 'test-secret';
    for (const sig of ['', 'x', 'short', 'A'.repeat(1000)]) {
      expect(() => verifyGeideaCallbackSignature({ orderId: 'ORD-1', signature: sig }, apiPassword)).not.toThrow();
      expect(verifyGeideaCallbackSignature({ orderId: 'ORD-1', signature: sig }, apiPassword)).toBe(false);
    }
  });
});
