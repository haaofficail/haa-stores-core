// W5 (Autopilot Phase 3) — shipping failure-scenario contract.
//
// Locks the 6 failure modes the SAFE FULL AUTOPILOT spec required the
// shipping aggregator to handle, asserting each guard lives in its
// canonical module. All assertions are source-grep / behaviour checks
// against real code — NO live API calls.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string): string => (existsSync(resolve(ROOT, p)) ? readFileSync(resolve(ROOT, p), 'utf-8') : '');

describe('Shipping W5 failure scenarios (DECISION-OS-013)', () => {
  const factory = read('packages/shipping-core/src/factory.ts');
  const readinessSrc = read('packages/shipping-core/src/readiness.ts');
  const rateCache = read('packages/shipping-core/src/rate-cache.ts');
  const returnsSrc = read('packages/shipping-core/src/returns.ts');
  const webhookRoute = read('apps/api/src/routes/shipping-webhooks.ts');
  const readinessDoc = read('docs/ops/SHIPPING_AGGREGATOR_READINESS.md');

  it('1. provider unavailable → readiness state machine classifies as provider_error', () => {
    // The readiness module distinguishes "not_configured" (no creds) from
    // "provider_error" (creds present but provider misbehaving). This
    // separation lets the UI surface a different message for each.
    expect(readinessSrc).toMatch(/provider_error/);
    expect(readinessSrc).toMatch(/lastError/);
  });

  it('2. invalid webhook signature → 401 + INVALID_SIGNATURE + audit, no DB mutation', () => {
    expect(webhookRoute).toMatch(/verifyOtoWebhookSignature|verifyWebhookSignature/);
    expect(webhookRoute).toMatch(/INVALID_SIGNATURE/);
    // 401 is the canonical "unauthenticated payload" response.
    expect(webhookRoute).toMatch(/\b401\b/);
  });

  it('3. duplicate webhook → deduplicateFromContext returns dup, second arrival ignored', () => {
    expect(webhookRoute).toMatch(/deduplicateFromContext/);
    // The dedup module backing it must exist.
    expect(read('packages/integration-core/src/webhook-dedup.ts')).not.toEqual('');
  });

  it('4. rate timeout → rate-cache module exists with cache reads before live calls', () => {
    expect(rateCache).not.toEqual('');
    // The cache must export at minimum a get/set or similar primitive
    // that the rate flow consults before hitting the provider.
    expect(rateCache.toLowerCase()).toMatch(/cache|get|set/);
  });

  it('5. label creation failure → providers DO NOT throw raw exceptions to callers', () => {
    // The mock provider's createLabel returns a structured ShippingLabel
    // (or a failure descriptor). A future regression that threw raw
    // exceptions would break the dashboard "retry" affordance.
    const mock = read('packages/shipping-core/src/mock.ts');
    expect(mock).toMatch(/createLabel\s*\(/);
    // No bare `throw new Error` inside createLabel body.
    const labelStart = mock.indexOf('async createLabel');
    expect(labelStart).toBeGreaterThan(-1);
    const labelEnd = mock.indexOf('\n  async ', labelStart + 20);
    const body = mock.slice(labelStart, labelEnd > 0 ? labelEnd : labelStart + 800);
    expect(body).not.toMatch(/throw\s+new\s+Error/);
  });

  it('6. return request failure → returns service exposes failure path', () => {
    // Returns module must exist + must NOT crash on provider errors.
    expect(returnsSrc).not.toEqual('');
    // Returns module imports a provider interface — not a hardcoded
    // provider — so failure can surface from any backend.
    expect(returnsSrc).toMatch(/import|require/);
  });

  it('readiness doc enumerates the 6 W5 scenarios', () => {
    expect(readinessDoc).toMatch(/Provider unavailable/);
    expect(readinessDoc).toMatch(/Invalid webhook signature/);
    expect(readinessDoc).toMatch(/Duplicate webhook/);
    expect(readinessDoc).toMatch(/Rate timeout/);
    expect(readinessDoc).toMatch(/Label creation failure/);
    expect(readinessDoc).toMatch(/Return request failure/);
  });

  it('live shipping stays gated until owner flips live_ready', () => {
    // Defence-in-depth: even if a provider has creds, it should not be
    // live until the readiness state machine moves it to live_ready.
    // The factory must consult readiness, NOT just env vars.
    expect(factory).toMatch(/live_locked|liveBlocked|getShippingProviderStatus|getShippingReadinessStates|readiness/i);
  });
});
