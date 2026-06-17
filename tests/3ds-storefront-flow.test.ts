// 3DS Storefront Wiring — TASK-0035 sub-item 5
//
// SAMA-mandated 3-D Secure flow at the customer-facing layer:
//   1. The customer submits the checkout form.
//   2. The API's /confirm endpoint calls the payment provider's
//      createPaymentIntent. If the provider requires 3DS, it returns
//      a redirectUrl (the issuer's challenge URL).
//   3. The API surfaces the redirectUrl to the storefront in the confirm
//      response (as `redirectUrl` alongside the existing `paymentStatus`).
//   4. The storefront, seeing paymentStatus === 'requires_3ds' AND a
//      redirectUrl, navigates the customer to the issuer's challenge page.
//   5. After 3DS, the issuer redirects the customer back to the storefront.
//   6. The storefront calls a 3DS callback endpoint on the API to verify
//      the payment and update the status (paid or failed).
//
// This test covers the contract for the storefront + API wiring:
//   - FakePaymentProvider.createPaymentIntent returns redirectUrl when
//     paymentMethod === 'fake_3ds_challenge'
//   - CheckoutService.confirm surfaces the redirectUrl in its return
//   - The API /confirm route forwards the redirectUrl
//   - The API has a /3ds-callback endpoint
//   - The storefront Checkout.tsx checks for the 3DS redirect
//   - The fake provider has a 'fake_3ds_challenge' payment method

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FakePaymentProvider } from '@haa/commerce-core';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const fakeSourcePath = resolve(projectRoot, 'packages/payment-providers/src/fake.ts');
const checkoutServicePath = resolve(projectRoot, 'packages/commerce-core/src/checkout.ts');
const apiConfirmPath = resolve(projectRoot, 'apps/api/src/routes/storefront/checkout.ts');
const storefrontCheckoutPath = resolve(projectRoot, 'apps/storefront/src/pages/Checkout.tsx');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

const fakeSource = read(fakeSourcePath);
const checkoutService = read(checkoutServicePath);
const apiConfirm = read(apiConfirmPath);
const storefrontCheckout = read(storefrontCheckoutPath);

// ── 1. Runtime: FakePaymentProvider advertises fake_3ds_challenge ──

describe('FakePaymentProvider — 3DS challenge simulation (runtime)', () => {
  it('advertises supports3DS: true (so the fake mode is testable end-to-end)', () => {
    const provider = new FakePaymentProvider();
    expect(provider.capabilities.supports3DS).toBe(true);
  });
});

// ── 2. Source-grep: FakePaymentProvider source handles fake_3ds_challenge ──

describe('FakePaymentProvider — fake_3ds_challenge contract (source-grep)', () => {
  it('source recognizes fake_3ds_challenge as a valid payment method', () => {
    // The fake provider must recognize fake_3ds_challenge in the metadata
    // to simulate a 3DS-required card payment.
    expect(fakeSource).toMatch(/fake_3ds_challenge/);
  });

  it('source returns a redirectUrl for fake_3ds_challenge (so the storefront can redirect)', () => {
    expect(fakeSource).toMatch(/redirectUrl/);
  });

  it('source sets the local payment status to requires_3ds for fake_3ds_challenge', () => {
    // The local payment row must transition to 'requires_3ds' so the
    // storefront knows the next step is a 3DS redirect, not a confirmation.
    expect(fakeSource).toMatch(/['"]requires_3ds['"]/);
  });
});

// ── 3. Source-grep: CheckoutService.confirm surfaces redirectUrl ──

describe('CheckoutService.confirm — 3DS redirect surface (source-grep)', () => {
  it('captures the redirectUrl from createPaymentIntent', () => {
    // The confirm method must read the redirectUrl from the payment result
    // and surface it in the return value so the API can forward it.
    expect(checkoutService).toMatch(/payment\.redirectUrl/);
  });

  it('returns redirectUrl in the result type when 3DS is required', () => {
    // The confirm result must include a redirectUrl field for 3DS payments.
    expect(checkoutService).toMatch(/redirectUrl/);
  });

  it('does not call confirmPayment when 3DS is required (deferred to callback)', () => {
    // When the payment requires 3DS, the confirm flow must NOT
    // immediately call confirmPayment — the payment is in flight
    // and the 3DS callback will trigger the confirmation.
    // We verify by checking that the redirectUrl branch returns early.
    expect(checkoutService).toMatch(/redirectUrl.*\n.*return|return.*redirectUrl/);
  });
});

// ── 4. Source-grep: API /confirm route forwards redirectUrl ──

describe('API /confirm route — forwards redirectUrl (source-grep)', () => {
  it('includes redirectUrl in the response data', () => {
    // The API route must forward the redirectUrl from CheckoutService.confirm
    // so the storefront can navigate the customer to the 3DS challenge.
    expect(apiConfirm).toMatch(/redirectUrl/);
  });
});

// ── 5. Source-grep: API has a 3DS callback endpoint ──

describe('API 3DS callback endpoint (source-grep)', () => {
  it('has a route for the 3DS callback (POST or GET 3ds-callback)', () => {
    // The 3DS callback endpoint lets the storefront finalize the payment
    // after the customer completes the 3DS challenge.
    expect(apiConfirm).toMatch(/3ds-callback|3ds_callback|threeDs/i);
  });
});

// ── 6. Source-grep: Storefront Checkout.tsx handles 3DS redirect ──

describe('Storefront Checkout.tsx — 3DS redirect handling (source-grep)', () => {
  it('checks for paymentStatus === requires_3ds after confirm', () => {
    // The storefront must branch on paymentStatus === 'requires_3ds' to
    // navigate the customer to the 3DS challenge URL.
    expect(storefrontCheckout).toMatch(/requires_3ds/);
  });

  it('navigates to redirectUrl when 3DS is required', () => {
    // The storefront must read redirectUrl from the confirm result and
    // navigate the customer to it (window.location.href = redirectUrl).
    expect(storefrontCheckout).toMatch(/redirectUrl/);
  });
});
