/**
 * L-PR-8 — outbound webhook events for loyalty (source-grep).
 *
 * Verifies:
 *   - packages/commerce-core/src/outbound-webhook.ts exports the three
 *     event types: loyalty.earned, loyalty.redeemed, loyalty.expired.
 *   - LoyaltyService fires each event after the corresponding mutation
 *     commits (earn / redeem / expire). The fire must be post-commit
 *     and best-effort so a webhook failure never rolls back loyalty
 *     state.
 *   - commerce-core barrel re-exports the constants so the dashboard
 *     webhook-settings UI can offer them as subscribable types.
 *
 * Source-grep style matches the rest of the loyalty + outbound-webhook
 * test suite (loyalty-routes-*.test.ts, outbound-webhook-hardening.test.ts)
 * so the test runs without a database.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const outbound = readFileSync(
  new URL('../packages/commerce-core/src/outbound-webhook.ts', import.meta.url),
  'utf-8',
);
const svc = readFileSync(
  new URL('../packages/commerce-core/src/loyalty.ts', import.meta.url),
  'utf-8',
);
const barrel = readFileSync(
  new URL('../packages/commerce-core/src/index.ts', import.meta.url),
  'utf-8',
);

describe('outbound-webhook event constants (L-PR-8)', () => {
  it('exports LOYALTY_EARNED_EVENT = "loyalty.earned"', () => {
    expect(outbound).toMatch(/export const LOYALTY_EARNED_EVENT\s*=\s*['"]loyalty\.earned['"]/);
  });

  it('exports LOYALTY_REDEEMED_EVENT = "loyalty.redeemed"', () => {
    expect(outbound).toMatch(/export const LOYALTY_REDEEMED_EVENT\s*=\s*['"]loyalty\.redeemed['"]/);
  });

  it('exports LOYALTY_EXPIRED_EVENT = "loyalty.expired"', () => {
    expect(outbound).toMatch(/export const LOYALTY_EXPIRED_EVENT\s*=\s*['"]loyalty\.expired['"]/);
  });

  it('exports LOYALTY_EVENT_TYPES tuple covering all three', () => {
    expect(outbound).toMatch(/export const LOYALTY_EVENT_TYPES[\s\S]{0,200}LOYALTY_EARNED_EVENT[\s\S]{0,80}LOYALTY_REDEEMED_EVENT[\s\S]{0,80}LOYALTY_EXPIRED_EVENT/);
  });
});

describe('LoyaltyService — fires webhooks after each mutation (L-PR-8)', () => {
  it('imports the event constants from outbound-webhook', () => {
    expect(svc).toMatch(/import[\s\S]{0,200}LOYALTY_EARNED_EVENT[\s\S]{0,200}from\s+['"]\.\/outbound-webhook\.js['"]/);
  });

  it('emits loyalty.earned after a successful earnFromOrder commit', () => {
    // The emit must follow the transaction commit, before returning,
    // so a webhook failure (try/catch inside emitLoyaltyEvent) does not
    // roll back the points credit.
    expect(svc).toMatch(/earnFromOrder[\s\S]{0,3000}emitLoyaltyEvent\([\s\S]{0,200}LOYALTY_EARNED_EVENT/);
  });

  it('emits loyalty.redeemed only when points were actually debited', () => {
    expect(svc).toMatch(/redeem[\s\S]{0,3000}if\s*\(\s*result\.points\s*>\s*0\s*\)[\s\S]{0,200}LOYALTY_REDEEMED_EVENT/);
  });

  it('emits loyalty.expired only when expiry actually consumed points', () => {
    expect(svc).toMatch(/expireAccount[\s\S]{0,3000}if\s*\(\s*expired\s*>\s*0\s*\)[\s\S]{0,200}LOYALTY_EXPIRED_EVENT/);
  });

  it('webhook emission is best-effort (caught + logged, never thrown)', () => {
    // The helper wraps OutboundWebhookService.emit in try/catch so a
    // webhook misconfiguration never rolls back the loyalty mutation.
    expect(svc).toMatch(/async\s+function\s+emitLoyaltyEvent[\s\S]{0,500}try[\s\S]{0,400}catch[\s\S]{0,200}console\.error/);
  });

  it('emit payload carries customerId on every event', () => {
    // All three emits must include customerId — required for the
    // merchant's downstream CRM to attribute the event.
    const matches = svc.match(/emitLoyaltyEvent\(/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
    // Earn/redeem use input.customerId; expire uses customerId (local var).
    expect(svc).toMatch(/LOYALTY_EARNED_EVENT[\s\S]{0,300}customerId:\s*input\.customerId/);
    expect(svc).toMatch(/LOYALTY_REDEEMED_EVENT[\s\S]{0,300}customerId:\s*input\.customerId/);
    expect(svc).toMatch(/LOYALTY_EXPIRED_EVENT[\s\S]{0,300}customerId,/);
  });
});

describe('commerce-core barrel re-exports the new constants (L-PR-8)', () => {
  it('exports the three loyalty event constants', () => {
    expect(barrel).toContain('LOYALTY_EARNED_EVENT');
    expect(barrel).toContain('LOYALTY_REDEEMED_EVENT');
    expect(barrel).toContain('LOYALTY_EXPIRED_EVENT');
  });

  it('exports the LoyaltyEventType type', () => {
    expect(barrel).toMatch(/export type \{[\s\S]{0,200}LoyaltyEventType/);
  });
});
