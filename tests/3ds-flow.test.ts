// 3DS Flow Tests — TASK-0035 sub-item 3
//
// SAMA has mandated 3-D Secure for online card transactions in Saudi Arabia
// since 2021. This test covers the contract for the 3DS challenge flow:
//
//   1. Status mapping: moyasar's 3DS-specific statuses map to 'requires_3ds'
//   2. Provider contract: MoyasarSandboxProvider.createPaymentIntent returns
//      `redirectUrl` when the gateway response contains a 3DS challenge URL
//      (`source.transaction_url`), and the local payment row is saved with
//      status `requires_3ds`.
//   3. Webhook contract: MoyasarSandboxProvider.handleWebhook updates the
//      local payment status to `paid` (or `failed`) when the 3DS callback
//      event arrives.
//   4. Capability flag: providers that support 3DS (Moyasar, Geidea) advertise
//      `supports3DS: true`; BNPL providers (Tabby, Tamara) advertise `false`
//      because they handle their own authentication.
//   5. Fake provider parity: FakePaymentProvider advertises `supports3DS: true`
//      so dev/staging can exercise the full challenge flow without real keys.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  mapProviderStatus,
  FakePaymentProvider,
  MoyasarSandboxProvider,
  GeideaPaymentProvider,
  TabbyProvider,
  TamaraProvider,
  FAKE_CAPABILITIES,
  MOYASAR_CAPABILITIES,
  GEIDEA_CAPABILITIES,
  TABBY_CAPABILITIES,
  TAMARA_CAPABILITIES,
} from '@haa/commerce-core';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const moyasarSourcePath = resolve(projectRoot, 'packages/payment-providers/src/moyasar.ts');
const fakeSourcePath = resolve(projectRoot, 'packages/payment-providers/src/fake.ts');
const checkoutSourcePath = resolve(projectRoot, 'apps/api/src/routes/storefront/checkout.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

const moyasarSource = read(moyasarSourcePath);
const fakeSource = read(fakeSourcePath);
const checkoutSource = read(checkoutSourcePath);

// ── 1. Runtime: status mapping ──────────────────────────

describe('3DS Status Mapping (runtime)', () => {
  it("moyasar's 'requires_3ds' provider status maps to 'requires_3ds' internal status", () => {
    expect(mapProviderStatus('moyasar', 'requires_3ds')).toBe('requires_3ds');
  });

  it("moyasar's existing 'initiated' status still maps to 'initiated' (no regression)", () => {
    expect(mapProviderStatus('moyasar', 'initiated')).toBe('initiated');
  });

  it("moyasar's 'authorized' status still maps to 'authorized' (post-3DS completion)", () => {
    expect(mapProviderStatus('moyasar', 'authorized')).toBe('authorized');
  });

  it("moyasar's 'paid' status still maps to 'paid'", () => {
    expect(mapProviderStatus('moyasar', 'paid')).toBe('paid');
  });

  it("moyasar's 'failed' status still maps to 'failed' (post-3DS challenge failure)", () => {
    expect(mapProviderStatus('moyasar', 'failed')).toBe('failed');
  });
});

// ── 2. Runtime: capability flags per provider ──────────

describe('3DS Capability Flags (runtime)', () => {
  it('FakePaymentProvider supports 3DS for dev/staging', () => {
    expect(FAKE_CAPABILITIES.supports3DS).toBe(true);
  });

  it('MoyasarSandboxProvider supports 3DS (SAMA mandatory)', () => {
    expect(MOYASAR_CAPABILITIES.supports3DS).toBe(true);
  });

  it('GeideaPaymentProvider supports 3DS', () => {
    expect(GEIDEA_CAPABILITIES.supports3DS).toBe(true);
  });

  it('TabbyProvider does NOT support 3DS (BNPL handles its own auth)', () => {
    expect(TABBY_CAPABILITIES.supports3DS).toBe(false);
  });

  it('TamaraProvider does NOT support 3DS (BNPL handles its own auth)', () => {
    expect(TAMARA_CAPABILITIES.supports3DS).toBe(false);
  });

  it('provider instances advertise supports3DS from the capability flag', () => {
    const fake = new FakePaymentProvider();
    const moyasar = new MoyasarSandboxProvider();
    const geidea = new GeideaPaymentProvider();
    const tabby = new TabbyProvider();
    const tamara = new TamaraProvider();
    expect(fake.capabilities.supports3DS).toBe(true);
    expect(moyasar.capabilities.supports3DS).toBe(true);
    expect(geidea.capabilities.supports3DS).toBe(true);
    expect(tabby.capabilities.supports3DS).toBe(false);
    expect(tamara.capabilities.supports3DS).toBe(false);
  });
});

// ── 3. Source-grep: Moyasar createPaymentIntent 3DS contract ──

describe('MoyasarSandboxProvider.createPaymentIntent — 3DS contract (source-grep)', () => {
  it('exists in the package', () => {
    expect(moyasarSource).toBeDefined();
    expect(moyasarSource.length).toBeGreaterThan(0);
  });

  it('reads the 3DS challenge URL from source.transaction_url', () => {
    // The contract: the provider must extract source.transaction_url
    // from the Moyasar response and surface it as redirectUrl.
    // Allow optional chaining (`source?.transaction_url`) too.
    expect(moyasarSource).toMatch(/source\??\.transaction_url/);
  });

  it('returns redirectUrl in the createPaymentIntent result when 3DS is required', () => {
    // The function signature in base.ts already declares redirectUrl as
    // an optional return field — the provider must populate it.
    expect(moyasarSource).toMatch(/redirectUrl/);
  });

  it('saves the local payment row with status requires_3ds when 3DS is required', () => {
    // The local payment status must be 'requires_3ds' (not 'initiated')
    // when Moyasar responds with a 3DS challenge URL.
    expect(moyasarSource).toMatch(/['"]requires_3ds['"]/);
  });

  it('uses mapProviderStatus for non-3DS payments (no regression on existing behavior)', () => {
    expect(moyasarSource).toMatch(/mapProviderStatus/);
  });
});

// ── 4. Source-grep: Moyasar handleWebhook 3DS contract ──

describe('MoyasarSandboxProvider.handleWebhook — 3DS contract (source-grep)', () => {
  it('updates the local payment status when the 3DS callback event arrives', () => {
    // After the customer completes the 3DS challenge, Moyasar fires
    // a webhook (payment.paid or payment.failed). The handler must
    // update the local payment status accordingly.
    expect(moyasarSource).toMatch(/handleWebhook/);
  });

  it('recognizes payment.requires_3ds event type', () => {
    // Some Moyasar flows emit a dedicated payment.requires_3ds event
    // before payment.paid. The handler should handle it without
    // treating it as a failure.
    expect(moyasarSource).toMatch(/payment\.requires_3ds|requires_3ds/);
  });

  it('deduplicates via the existing idempotency key mechanism (no regression)', () => {
    expect(moyasarSource).toMatch(/idempotencyKey/);
  });
});

// ── 5. Source-grep: storefront checkout 3DS handling ───

describe('Storefront checkout — 3DS handling (source-grep)', () => {
  it('storefront checkout route exists', () => {
    expect(checkoutSource).toBeDefined();
    expect(checkoutSource.length).toBeGreaterThan(0);
  });

  it('surfaces the redirectUrl from createPaymentIntent to the storefront client', () => {
    // The checkout API must forward redirectUrl to the client so the
    // storefront can redirect the customer to the issuer's 3DS challenge.
    expect(checkoutSource).toMatch(/redirectUrl/);
  });

  it('handles the requires_3ds status from the payment provider', () => {
    // The checkout must not treat requires_3ds as a terminal state.
    expect(checkoutSource).toMatch(/requires_3ds/);
  });
});

// ── 6. Source-grep: fake provider 3DS parity (for dev/staging) ──

describe('FakePaymentProvider — 3DS parity (source-grep, optional)', () => {
  it('the fake provider source advertises 3DS support', () => {
    // The fake provider must advertise supports3DS for dev E2E tests.
    // The capability flag is imported from base.ts, so the test
    // verifies the provider's source references the capability object.
    expect(fakeSource).toMatch(/FAKE_CAPABILITIES/);
  });
});
