/**
 * L-PR-7 — loyalty.expiry cron sweep (source-grep).
 *
 * Verifies the scheduler in apps/api/src/worker.ts wires the
 * `loyalty.expiry` job correctly:
 *   - JOB_NAMES exposes the job under `loyaltyExpiry`
 *   - The handler runs hourly (60 * 60 * 1000) but only fires when the
 *     Riyadh-local hour is 02:00 (effective daily cadence)
 *   - The handler enumerates stores with `pointsExpiryMonths > 0` only
 *     (no full table scan; matches LoyaltyService.expireAllAccounts
 *     short-circuit semantics)
 *   - LoyaltyService exposes `expireAllAccounts(storeId)` — pre-existing
 *     `expireAccount(storeId, customerId)` is the per-customer primitive
 *
 * Companion to loyalty-service.test.ts which locks consumeFifo + per-
 * account semantics. The cron test is a pure source-grep so it runs
 * without a DB and without booting the scheduler (which would call
 * `setInterval` and bind to Redis).
 *
 * PROBLEM-003: this job degrades silently when QUEUE_REDIS_URL is unset
 * because the distributed lock layer becomes a no-op. That's accepted
 * (single-instance mode) and called out in the worker comment.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const worker = readFileSync(new URL('../apps/api/src/worker.ts', import.meta.url), 'utf-8');
const svc = readFileSync(new URL('../packages/commerce-core/src/loyalty.ts', import.meta.url), 'utf-8');

describe('loyalty.expiry — worker registration (L-PR-7)', () => {
  it('declares the job name under JOB_NAMES.loyaltyExpiry', () => {
    expect(worker).toMatch(/loyaltyExpiry:\s*['"]loyalty\.expiry['"]/);
  });

  it('schedules at hourly cadence (60 * 60 * 1000 ms)', () => {
    // The handler runs hourly so we can re-check the Riyadh-local hour.
    // Daily cadence is enforced by the hour-of-day guard in the handler.
    expect(worker).toMatch(/JOB_NAMES\.loyaltyExpiry[\s\S]{0,200}intervalMs:\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it('guards execution on Riyadh-local 02:00 only', () => {
    expect(worker).toContain("timeZone: 'Asia/Riyadh'");
    expect(worker).toMatch(/hourRiyadh\s*!==\s*2/);
  });

  it('enumerates only stores with pointsExpiryMonths > 0 (skip disabled)', () => {
    expect(worker).toContain('pointsExpiryMonths');
    expect(worker).toMatch(/gt\(\s*schema\.loyaltySettings\.pointsExpiryMonths,\s*0\s*\)/);
  });

  it('calls LoyaltyService.expireAllAccounts per eligible store', () => {
    expect(worker).toMatch(/svc\.expireAllAccounts\(\s*row\.storeId\s*\)/);
  });

  it('per-store failure does not abort the sweep (try/catch around the call)', () => {
    // The handler must wrap each store's expiry in try/catch so one bad
    // tenant doesn't block the rest. Same pattern as marketingActionGenerate.
    expect(worker).toMatch(/loyalty\.expiry[\s\S]{0,2000}catch[\s\S]{0,200}console\.error/);
  });
});

describe('LoyaltyService.expireAllAccounts (L-PR-7 backing)', () => {
  it('is exported as a method on the service class', () => {
    expect(svc).toContain('async expireAllAccounts');
  });

  it('short-circuits when the store has expiry disabled', () => {
    expect(svc).toMatch(/expireAllAccounts[\s\S]{0,500}pointsExpiryMonths\s*<=\s*0/);
    expect(svc).toMatch(/expireAllAccounts[\s\S]{0,600}return\s*\{\s*accounts:\s*0,\s*totalExpired:\s*0\s*\}/);
  });

  it('iterates accounts with balance > 0 (skip empty rows)', () => {
    expect(svc).toMatch(/expireAllAccounts[\s\S]{0,800}gt\(s\.loyaltyAccounts\.balance,\s*0\)/);
  });

  it('delegates per-account work to the existing expireAccount() primitive', () => {
    // expireAllAccounts must not duplicate the FIFO logic — it must call
    // the per-customer method so we have a single source of truth.
    expect(svc).toMatch(/expireAllAccounts[\s\S]{0,1000}this\.expireAccount\(/);
  });

  it('returns { accounts, totalExpired } so the cron can log effort', () => {
    expect(svc).toMatch(/expireAllAccounts[\s\S]{0,1200}return\s*\{\s*accounts[\s\S]{0,80}totalExpired/);
  });

  it('catches per-account failures (one bad row never aborts the sweep)', () => {
    expect(svc).toMatch(/expireAllAccounts[\s\S]{0,1500}catch[\s\S]{0,200}console\.error/);
  });
});
