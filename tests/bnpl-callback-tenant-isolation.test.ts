import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const checkoutSource = readFileSync(
  new URL('../packages/commerce-core/src/checkout.ts', import.meta.url),
  'utf-8',
);

function methodBody(name: string): string {
  const start = checkoutSource.indexOf(`async ${name}(`);
  expect(start).toBeGreaterThan(-1);
  const next = checkoutSource.indexOf('\n  async ', start + 1);
  return checkoutSource.slice(start, next === -1 ? checkoutSource.length : next);
}

describe('CheckoutService.handleBNPLCallback tenant isolation', () => {
  it('scopes provider payment lookup by storeId before confirming with the provider', () => {
    const body = methodBody('handleBNPLCallback');
    const paymentLookupEnd = body.indexOf('const isTabby');
    expect(paymentLookupEnd).toBeGreaterThan(-1);
    const paymentLookup = body.slice(0, paymentLookupEnd);

    expect(paymentLookup).toMatch(/from\(s\.payments\)/);
    expect(paymentLookup).toMatch(/and\(/);
    expect(paymentLookup).toMatch(/eq\(s\.payments\.providerPaymentId,\s*providerPaymentId\)/);
    expect(paymentLookup).toMatch(/eq\(s\.payments\.storeId,\s*storeId\)/);

    const notFoundGuard = body.indexOf('if (!payment)');
    const providerFactory = body.indexOf('createPaymentProvider');
    const providerConfirm = body.indexOf('confirmPayment');
    expect(notFoundGuard).toBeGreaterThan(-1);
    expect(providerFactory).toBeGreaterThan(notFoundGuard);
    expect(providerConfirm).toBeGreaterThan(notFoundGuard);
  });

  it('uses an ownership-specific not-found error for cross-store callbacks', () => {
    const body = methodBody('handleBNPLCallback');
    expect(body).toContain('Payment not found or does not belong to this store');
  });
});
