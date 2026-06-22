/**
 * Per-store token-bucket rate limiter for outbound WhatsApp sends.
 *
 * WhatsApp's anti-abuse system bans paired numbers that exceed ~200
 * messages per hour with no human-feeling jitter. The product audit
 * picked 120/hr/store as the safe ceiling — well below the ban
 * threshold, but high enough for a small-merchant abandoned-cart blast
 * to actually go out.
 *
 * The bucket holds `capacity` tokens and refills `refillPerSec` tokens
 * per second. Every `tryTake()` consumes one token if the bucket has
 * any; otherwise returns false and the caller is expected to defer.
 *
 * Per-store isolation: a `Map<storeId, Bucket>`. A noisy store can't
 * starve another store's budget — each gets its own bucket.
 *
 * This module has no external dependencies and is fully synchronous
 * (no I/O). It's safe to import from anywhere in the API process.
 */

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

export class WhatsappRateLimiter {
  private buckets = new Map<number, Bucket>();
  constructor(
    /** Maximum tokens in the bucket. Default: 120/hour. */
    private readonly capacity: number = 120,
    /** Refill rate in tokens per second. Default: 120/3600 ≈ 0.0333. */
    private readonly refillPerSec: number = 120 / 3600,
    /** Clock source (injectable for tests). */
    private readonly now: () => number = Date.now,
  ) {}

  private refill(bucket: Bucket): void {
    const nowMs = this.now();
    const elapsedSec = (nowMs - bucket.lastRefillMs) / 1000;
    if (elapsedSec <= 0) return;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
    bucket.lastRefillMs = nowMs;
  }

  /**
   * Consume one token for `storeId`. Returns true if allowed, false if
   * the bucket is empty (caller should defer / queue).
   */
  tryTake(storeId: number): boolean {
    let bucket = this.buckets.get(storeId);
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefillMs: this.now() };
      this.buckets.set(storeId, bucket);
    }
    this.refill(bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }

  /** Read-only snapshot of remaining capacity for diagnostics. */
  remaining(storeId: number): number {
    const bucket = this.buckets.get(storeId);
    if (!bucket) return this.capacity;
    this.refill(bucket);
    return bucket.tokens;
  }

  /** Test-only — reset a store's bucket. */
  __reset(storeId: number): void {
    this.buckets.delete(storeId);
  }
}

/** Process-singleton instance reused by the send service. */
export const whatsappRateLimiter = new WhatsappRateLimiter();
