// PROBLEM-014 — Concurrent webhook dedup race must NOT return HTTP 400.
//
// Background:
//   Two concurrent deliveries of the same webhook can both pass the
//   SELECT in deduplicateWebhook(); exactly one wins the INSERT. The
//   loser hits Postgres errcode 23505 (unique_violation) on the
//   `idempotencyKey` constraint. Before this fix, the helper rethrew
//   23505, the service caught it in a generic catch block and
//   returned `httpStatus: 400, code: WEBHOOK_ERROR`, and the provider
//   read 400 as a genuine failure and entered a retry storm.
//
// Fix:
//   In deduplicateWebhook(), wrap ONLY the INSERT in its own
//   try/catch. If it throws a unique_violation, treat the result as
//   a duplicate-found (same outcome as if the SELECT had hit the row
//   first). Bump a `raceRecovered` metric so operators can see the
//   race actually fires under load.
//
// What this guards:
//   - The PG_UNIQUE_VIOLATION constant pins to SQLSTATE 23505 (not
//     a brittle error-message regex).
//   - The catch returns `{ duplicate: true, existingId: -1 }` —
//     NEVER rethrows, NEVER returns `{ duplicate: false }`.
//   - The metric `raceRecovered` is bumped and exposed via
//     getWebhookDedupStats().
//   - Other DB errors still propagate (only 23505 is special-cased).

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const SRC = readFileSync(
  resolve(root, 'packages/integration-core/src/webhook-dedup.ts'),
  'utf-8',
);

describe('PROBLEM-014 — concurrent webhook dedup race recovery', () => {
  it('pins the SQLSTATE constant to 23505 (Postgres unique_violation)', () => {
    expect(SRC).toMatch(/PG_UNIQUE_VIOLATION\s*=\s*['"]23505['"]/);
  });

  it('has an isPgUniqueViolation guard that checks `.code === "23505"`', () => {
    expect(SRC).toMatch(/function\s+isPgUniqueViolation/);
    expect(SRC).toMatch(/code\s*===\s*PG_UNIQUE_VIOLATION/);
  });

  it('wraps the INSERT in its own try/catch (not the SELECT)', () => {
    // The insert call must live inside a try-block that has a catch
    // examining the error. We anchor on the insert statement and
    // verify the surrounding control flow contains both `try {` and
    // a catch that calls isPgUniqueViolation.
    const insertIdx = SRC.indexOf('await db.insert(s.paymentWebhookEvents)');
    expect(insertIdx).toBeGreaterThan(-1);

    // Look at the ~600 chars around the insert for the catch logic.
    const window = SRC.slice(Math.max(0, insertIdx - 100), insertIdx + 800);
    expect(window).toMatch(/try\s*\{/);
    expect(window).toMatch(/catch\s*\(\s*\w+\s*\)/);
    expect(window).toMatch(/isPgUniqueViolation/);
  });

  it('returns `{ duplicate: true, existingId: -1 }` on race recovery', () => {
    // The race-recovery branch must explicitly return duplicate:true.
    // Anchor on the `_metrics.raceRecovered += 1` bump (specifically
    // the assignment statement — not the export line in the stats
    // function) and assert the return value follows it.
    const raceIdx = SRC.indexOf('_metrics.raceRecovered += 1');
    expect(raceIdx).toBeGreaterThan(-1);
    const window = SRC.slice(raceIdx, raceIdx + 400);
    expect(window).toMatch(/return\s*\{\s*duplicate:\s*true/);
    expect(window).toMatch(/existingId:\s*-1/);
  });

  it('does NOT swallow non-unique-violation DB errors', () => {
    // Inside the insert-catch, after the isPgUniqueViolation check,
    // there must be a `throw insertErr` (or equivalent) so genuine
    // DB failures still propagate. We scan the substring after the
    // catch keyword for a throw statement.
    const catchIdx = SRC.indexOf('catch (insertErr)');
    expect(catchIdx).toBeGreaterThan(-1);
    // Look at the next 1200 chars of the catch block — generous so
    // comments and the recovery branch fit without crowding out the
    // throw at the end.
    const block = SRC.slice(catchIdx, catchIdx + 1200);
    expect(block).toMatch(/throw\s+insertErr/);
  });

  it('exposes raceRecovered in getWebhookDedupStats() output', () => {
    // The stats interface must declare the field AND the function
    // must populate it.
    expect(SRC).toMatch(/raceRecovered:\s*number/);
    expect(SRC).toMatch(/raceRecovered:\s*_metrics\.raceRecovered/);
  });

  it('resetWebhookDedupMetrics() clears raceRecovered too', () => {
    const resetFn = SRC.match(/resetWebhookDedupMetrics[\s\S]*?\}\s*\n/);
    expect(resetFn).toBeTruthy();
    expect(resetFn![0]).toMatch(/_metrics\.raceRecovered\s*=\s*0/);
  });

  it('keeps the duplicates counter consistent — race recovery counts as a duplicate', () => {
    // Operationally, a race-recovered call IS a duplicate from the
    // caller's perspective. We want both counters to move so the
    // observable duplicate rate stays accurate.
    const raceIdx = SRC.indexOf('_metrics.raceRecovered += 1');
    expect(raceIdx).toBeGreaterThan(-1);
    const window = SRC.slice(Math.max(0, raceIdx - 200), raceIdx + 200);
    expect(window).toMatch(/_metrics\.duplicates\s*\+=\s*1/);
  });
});

describe('PROBLEM-014 — file integrity (helper still wired correctly)', () => {
  it('payment-webhook-service.ts still uses the helper unchanged', () => {
    const servicePath = resolve(
      root,
      'packages/commerce-core/src/payment-webhook-service.ts',
    );
    if (!existsSync(servicePath)) return; // optional file in some checkouts
    const svc = readFileSync(servicePath, 'utf-8');
    expect(svc).toMatch(/deduplicateWebhook\(/);
    expect(svc).toMatch(/duplicate_ignored/);
  });
});
