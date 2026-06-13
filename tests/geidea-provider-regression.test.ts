import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createGeideaSignature, verifyGeideaCallbackSignature } from '../packages/commerce-core/src/payment';

const paymentSource = readFileSync(new URL('../packages/commerce-core/src/payment.ts', import.meta.url), 'utf-8');
const orderTypesSource = readFileSync(new URL('../packages/shared/src/types/orders.ts', import.meta.url), 'utf-8');

describe('Geidea provider regression', () => {
  it('adds Geidea as the approved card provider and disables fake fallback when it is selected', () => {
    expect(orderTypesSource).toContain("export type ProviderCode = 'fake' | 'geidea'");
    expect(orderTypesSource).toContain("'geidea_card'");
    expect(paymentSource).toContain("if (resolvedProvider === 'geidea')");
    expect(paymentSource).toContain('Fake fallback is disabled');
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
});
