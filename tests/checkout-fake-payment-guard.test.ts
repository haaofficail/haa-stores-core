/**
 * P0-3 audit fix: `fake_card_success`/`fake_card_failed` exist in
 * ALLOWED_PAYMENT_METHODS for local/staging dev convenience. Hiding them
 * in the storefront UI (import.meta.env.DEV) is not a server-side
 * guarantee — a direct POST to /checkout/sessions could still mint a
 * "paid" order in production without any real payment. This test locks
 * the server-side guard in `apps/api/src/routes/storefront/checkout.ts`.
 */
import { describe, it, expect } from 'vitest';
import { isFakePaymentMethodBlocked, FAKE_PAYMENT_METHODS } from '../apps/api/src/routes/storefront/checkout';

describe('isFakePaymentMethodBlocked', () => {
  it('blocks fake_card_success in production', () => {
    expect(isFakePaymentMethodBlocked('fake_card_success', 'production')).toBe(true);
  });

  it('blocks fake_card_failed in production', () => {
    expect(isFakePaymentMethodBlocked('fake_card_failed', 'production')).toBe(true);
  });

  it('allows fake_card_success in development', () => {
    expect(isFakePaymentMethodBlocked('fake_card_success', 'development')).toBe(false);
  });

  it('allows fake_card_success in staging (not production)', () => {
    expect(isFakePaymentMethodBlocked('fake_card_success', 'staging')).toBe(false);
  });

  it('never blocks real payment methods, even in production', () => {
    expect(isFakePaymentMethodBlocked('bank_transfer', 'production')).toBe(false);
    expect(isFakePaymentMethodBlocked('cash_on_delivery', 'production')).toBe(false);
    expect(isFakePaymentMethodBlocked('moyasar_creditcard', 'production')).toBe(false);
  });

  it('FAKE_PAYMENT_METHODS contains exactly the two fake methods', () => {
    expect(FAKE_PAYMENT_METHODS).toEqual(new Set(['fake_card_success', 'fake_card_failed']));
  });
});
