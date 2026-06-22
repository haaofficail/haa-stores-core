// Outbound webhook delivery hardening — structural guards.
//
// Asserts the invariants the OutboundWebhookService relies on:
//   - HMAC-SHA256 signing header is present and named X-Haa-Signature.
//   - Response body storage is capped (no unbounded log of a remote response).
//   - Circuit breaker pauses an endpoint after the documented threshold.
//   - maxAttempts is honoured (no infinite retry — dead-letter is implicit
//     because retryPending only picks events under maxAttempts).
//   - Delivery never assigns the endpoint secret into a stored field
//     (responseBody, log line, audit row).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../packages/commerce-core/src/outbound-webhook.ts'),
  'utf-8',
);

describe('Outbound webhook hardening (Wave 14)', () => {
  it('signs the delivery body with HMAC-SHA256 in X-Haa-Signature header', () => {
    expect(SRC).toMatch(/createHmac\(\s*['"]sha256['"]/);
    expect(SRC).toMatch(/X-Haa-Signature/);
    expect(SRC).toMatch(/sha256=\$\{signature\}/);
  });

  it('caps the stored response body to a defined maximum', () => {
    expect(SRC).toMatch(/MAX_RESPONSE_BODY_BYTES\s*=\s*\d+/);
    expect(SRC).toMatch(/\.slice\(0,\s*MAX_RESPONSE_BODY_BYTES\)/);
  });

  it('declares a circuit-breaker threshold + pause window', () => {
    expect(SRC).toMatch(/CIRCUIT_BREAKER_THRESHOLD\s*=\s*\d+/);
    expect(SRC).toMatch(/CIRCUIT_BREAKER_PAUSE_MINUTES\s*=\s*\d+/);
    expect(SRC).toMatch(/consecutiveFailures\s*>=\s*CIRCUIT_BREAKER_THRESHOLD/);
  });

  it('paused endpoint short-circuits delivery without firing HTTP', () => {
    expect(SRC).toMatch(/pausedUntil[\s\S]{0,80}>\s*new Date\(\)/);
    expect(SRC).toMatch(/return;\s*\/\/\s*Endpoint paused/);
  });

  it('retryPending caps attempts so events become dead-letter at maxAttempts', () => {
    expect(SRC).toMatch(/lt\(s\.webhookEvents\.attempts,\s*s\.webhookEvents\.maxAttempts\)/);
  });

  it('secret is never assigned into a persisted/logged field', () => {
    // Persisted/logged fields where a secret leak would be bad. The
    // service must not assign the secret value to any of these.
    const forbiddenAssignments = [
      /responseBody\s*=\s*[^;]*secret/,
      /\.responseBody\s*:\s*[^,}]*secret/,
      /console\.(log|warn|error|info)\([^)]*secret/,
      /\.log\([^)]*secret/,
      /audit[A-Za-z]*\([^)]*\bsecret\b/,
      /storage\.(write|put|save)\([^)]*\bsecret\b/,
    ];
    for (const pattern of forbiddenAssignments) {
      expect(SRC).not.toMatch(pattern);
    }
  });
});
