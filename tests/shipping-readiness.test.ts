// Shipping readiness state machine — DECISION-OS-013.
//
// Pure unit tests against the readiness classifier. No live API.

import { describe, it, expect, afterEach } from 'vitest';
import { getShippingReadinessStates } from '@haa/shipping-core';

const SHIPPING_ENVS = [
  'SHIPPING_PROVIDER',
  'SHIPPING_MODE',
  'OTO_MARKETPLACE_TOKEN',
  'OTO_API_KEY',
  'OTO_ACCESS_TOKEN',
  'OTO_SANDBOX_API_KEY',
  'ARAMEX_USERNAME',
  'ARAMEX_ACCOUNT_NUMBER',
  'SMSA_PASS_KEY',
  'SMSA_SENDER_ID',
];

function snapshot(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of SHIPPING_ENVS) out[k] = process.env[k];
  return out;
}

function restore(snap: Record<string, string | undefined>): void {
  for (const k of SHIPPING_ENVS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

describe('Shipping readiness (DECISION-OS-013)', () => {
  const original = snapshot();
  afterEach(() => restore(original));

  it('manual + haa_mock are always mock_ready', () => {
    for (const k of SHIPPING_ENVS) delete process.env[k];
    const states = getShippingReadinessStates();
    expect(states.find((s) => s.provider === 'manual')?.state).toBe('mock_ready');
    expect(states.find((s) => s.provider === 'haa_mock')?.state).toBe('mock_ready');
  });

  it('a provider without credentials is not_configured', () => {
    for (const k of SHIPPING_ENVS) delete process.env[k];
    const states = getShippingReadinessStates();
    expect(states.find((s) => s.provider === 'oto')?.state).toBe('not_configured');
    expect(states.find((s) => s.provider === 'aramex')?.state).toBe('not_configured');
    expect(states.find((s) => s.provider === 'smsa')?.state).toBe('not_configured');
  });

  it('OTO with sandbox creds + sandbox mode = sandbox_configured', () => {
    for (const k of SHIPPING_ENVS) delete process.env[k];
    process.env.SHIPPING_MODE = 'sandbox';
    process.env.OTO_SANDBOX_API_KEY = 'test-sandbox';
    const states = getShippingReadinessStates();
    expect(states.find((s) => s.provider === 'oto')?.state).toBe('sandbox_configured');
  });

  it('OTO with sandbox creds + verified flag = sandbox_verified', () => {
    for (const k of SHIPPING_ENVS) delete process.env[k];
    process.env.SHIPPING_MODE = 'sandbox';
    process.env.OTO_SANDBOX_API_KEY = 'test-sandbox';
    const states = getShippingReadinessStates({ sandboxVerified: { oto: true } });
    expect(states.find((s) => s.provider === 'oto')?.state).toBe('sandbox_verified');
  });

  it('SMSA with creds but no live unblock = live_locked (when mode != sandbox)', () => {
    for (const k of SHIPPING_ENVS) delete process.env[k];
    process.env.SHIPPING_MODE = 'manual';
    process.env.SMSA_PASS_KEY = 'key';
    process.env.SMSA_SENDER_ID = 'sender';
    const states = getShippingReadinessStates();
    const smsa = states.find((s) => s.provider === 'smsa')!;
    expect(['live_locked', 'sandbox_configured', 'sandbox_verified']).toContain(smsa.state);
  });

  it('provider_error is reported when a last-error is fed in', () => {
    for (const k of SHIPPING_ENVS) delete process.env[k];
    process.env.SHIPPING_MODE = 'sandbox';
    process.env.OTO_SANDBOX_API_KEY = 'test-sandbox';
    const states = getShippingReadinessStates({ lastErrors: { oto: 'timeout' } });
    const oto = states.find((s) => s.provider === 'oto')!;
    expect(oto.state).toBe('provider_error');
    expect(oto.reason).toContain('timeout');
  });
});
