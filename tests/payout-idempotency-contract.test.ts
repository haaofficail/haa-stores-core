// Source-grep contract: the payout request endpoints MUST be guarded
// by `idempotencyKey({ required: true })`. Without this, a single
// double-click on the dashboard's "Request payout" button creates two
// payout requests against the same available balance — only one is
// reversible.
//
// Audit reference: P0 #1 in the dashboard-quality audit (2026-06-25).
//
// We assert both:
//   1. The middleware is imported from the shared helper.
//   2. Both `POST /payouts` and `POST /payouts/request` declare it.
//   3. The duplication of business logic between the two routes was
//      collapsed to a single `handlePayoutRequest` function (so a
//      future fix doesn't drift between paths).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/wallet.ts'),
  'utf-8',
);

describe('Payout idempotency contract', () => {
  it('imports the idempotencyKey middleware', () => {
    expect(SRC).toMatch(/from\s+['"]\.\.\/middleware\/idempotency-key\.js['"]/);
    expect(SRC).toMatch(/idempotencyKey/);
  });

  it('POST /payouts/request requires Idempotency-Key', () => {
    // The middleware MUST be wired with required: true (not the
    // default false-bypass) — otherwise a forgotten header on the
    // client silently disables the protection.
    const block = SRC.slice(
      SRC.indexOf(".post(\n  '/payouts/request'"),
      SRC.indexOf(".post(\n  '/payouts',"),
    );
    expect(block).toMatch(/idempotencyKey\(\s*\{\s*required:\s*true\s*\}\s*\)/);
  });

  it('POST /payouts requires Idempotency-Key', () => {
    const block = SRC.slice(SRC.indexOf(".post(\n  '/payouts',"));
    expect(block).toMatch(/idempotencyKey\(\s*\{\s*required:\s*true\s*\}\s*\)/);
  });

  it('payout business logic is shared (no duplicated handler block)', () => {
    // Both routes MUST delegate to handlePayoutRequest. Two separate
    // handler bodies are how the bug was originally introduced — a
    // fix on one path silently skipped the other.
    expect(SRC).toMatch(/async function handlePayoutRequest/);
    const requestMatches = SRC.match(/handlePayoutRequest\b/g) ?? [];
    expect(requestMatches.length).toBeGreaterThanOrEqual(3);
  });
});
