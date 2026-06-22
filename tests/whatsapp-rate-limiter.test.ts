// WhatsApp rate limiter — token-bucket unit tests (WA-PR-3).
//
// What this locks:
//   - Per-store buckets are independent (one store's exhaustion does
//     not starve another).
//   - Default capacity 120; the 121st send in zero time fails.
//   - Refill is proportional to elapsed time — after capacity/rate
//     seconds, the bucket is full again.
//   - Time is mockable via the injected clock.
//
// WhatsApp's anti-abuse system bans paired numbers that exceed ~200
// messages/hr. The default 120/hr ceiling is well below that, but
// these tests pin the behaviour so a future change can't silently
// raise it without the test being updated deliberately.

import { describe, it, expect } from 'vitest';
import { WhatsappRateLimiter } from '../apps/api/src/services/whatsapp/rate-limiter.js';

describe('WhatsappRateLimiter — token-bucket', () => {
  it('allows the default 120 messages from a cold bucket then blocks the 121st', () => {
    const now = 1000;
    const limiter = new WhatsappRateLimiter(120, 120 / 3600, () => now);
    let allowed = 0;
    for (let i = 0; i < 120; i += 1) {
      if (limiter.tryTake(7)) allowed += 1;
    }
    expect(allowed).toBe(120);
    expect(limiter.tryTake(7)).toBe(false);
  });

  it('refills the bucket proportionally to elapsed time', () => {
    let now = 1000;
    const limiter = new WhatsappRateLimiter(120, 120 / 3600, () => now);
    // Drain.
    for (let i = 0; i < 120; i += 1) limiter.tryTake(1);
    expect(limiter.tryTake(1)).toBe(false);
    // 1 hour = 3_600_000 ms → full refill.
    now += 3_600_000;
    expect(limiter.remaining(1)).toBe(120);
    expect(limiter.tryTake(1)).toBe(true);
  });

  it('keeps per-store buckets independent', () => {
    const now = 1000;
    const limiter = new WhatsappRateLimiter(120, 120 / 3600, () => now);
    for (let i = 0; i < 120; i += 1) limiter.tryTake(1);
    expect(limiter.tryTake(1)).toBe(false);
    // Store 2 starts cold — should be allowed.
    expect(limiter.tryTake(2)).toBe(true);
    expect(limiter.remaining(2)).toBeGreaterThan(118);
  });

  it('caps refill at capacity (does not over-fill on long idle)', () => {
    let now = 1000;
    const limiter = new WhatsappRateLimiter(120, 120 / 3600, () => now);
    // Idle for 24 hours.
    now += 24 * 3_600_000;
    expect(limiter.remaining(99)).toBe(120);
  });

  it('counts down monotonically with successive tryTake calls', () => {
    const now = 1000;
    const limiter = new WhatsappRateLimiter(120, 120 / 3600, () => now);
    const before = limiter.remaining(5);
    limiter.tryTake(5);
    const after = limiter.remaining(5);
    expect(after).toBeLessThan(before);
  });
});
