/**
 * Landing AI Agent — Rate Limit
 *
 * Lightweight in-memory token bucket per IP. For production a Redis-backed
 * limiter is recommended; this is the MVP-friendly version that works
 * without extra infrastructure.
 *
 * The API guard wires this in front of the chat endpoint.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

const DEFAULTS = {
  /** Requests per window per IP */
  limit: 30,
  /** Window length in ms */
  windowMs: 60_000, // 1 minute
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/** Check (and consume) a token for the given IP. */
export function checkRateLimit(
  ip: string,
  opts: { limit?: number; windowMs?: number } = {}
): RateLimitResult {
  const limit = opts.limit ?? DEFAULTS.limit;
  const windowMs = opts.windowMs ?? DEFAULTS.windowMs;
  const now = Date.now();
  const key = ip || 'unknown';
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Test-only: reset all buckets. */
export function __resetRateLimit() {
  buckets.clear();
}
