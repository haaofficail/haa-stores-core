// In-memory failure tracker for `requireStoreAccess` — F-QA-B-NEXT.
//
// Tracks how many `not_found` / `cross_tenant` denials a (userId | ip)
// produces in a rolling window, and blocks further attempts once the
// budget is exceeded. The instance is process-local; a Redis-backed
// variant can be added later if multi-instance backends ship.

import type { Context } from 'hono';
import type { AuthContext } from '@haa/shared';
import type {
  StoreAccessDenialReason,
  StoreAccessFailureTracker,
  StoreAccessFailureTrackerResult,
} from './middleware.js';

export interface StoreAccessFailureTrackerOptions {
  /** Rolling window length in ms. */
  windowMs?: number;
  /** Max denials per key inside the window before blocking. */
  maxFailures?: number;
  /** Reasons that count against the budget. Default: cross-tenant + not-found. */
  countedReasons?: ReadonlyArray<StoreAccessDenialReason>;
  /**
   * Override the source of "now" — exposed for tests. Production callers
   * should leave this unset.
   */
  now?: () => number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const DEFAULT_COUNTED: ReadonlyArray<StoreAccessDenialReason> = [
  'not_found',
  'cross_tenant',
];

/**
 * Build an in-memory tracker. The returned function matches the
 * `StoreAccessFailureTracker` signature and is safe to pass straight
 * to `setStoreAccessFailureTracker`.
 */
export function createInMemoryStoreAccessFailureTracker(
  opts: StoreAccessFailureTrackerOptions = {},
): StoreAccessFailureTracker & { reset: () => void; size: () => number } {
  const windowMs = opts.windowMs ?? 60_000;
  const maxFailures = opts.maxFailures ?? 10;
  const counted = new Set(opts.countedReasons ?? DEFAULT_COUNTED);
  const now = opts.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  function keyFor(c: Context, auth: AuthContext): string {
    // Prefer authenticated user id — that's the strongest identity.
    // Fall back to a best-effort IP so a single attacker without a session
    // (e.g. expired token then probing) still gets throttled.
    const userPart = auth.userId ?? 'anon';
    const tenantPart = auth.tenantId ?? '0';
    const ip =
      c.req.header('cf-connecting-ip') ??
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      'unknown';
    return `${userPart}:${tenantPart}:${ip}`;
  }

  const tracker: StoreAccessFailureTracker = (c, auth, reason) => {
    const t = now();
    const key = keyFor(c, auth);
    const bucket = buckets.get(key);

    if (!counted.has(reason)) {
      // We still passively gc the bucket if it's expired so the map
      // doesn't accumulate dead entries.
      if (bucket && bucket.resetAt <= t) buckets.delete(key);
      return { blocked: false };
    }

    if (!bucket || bucket.resetAt <= t) {
      buckets.set(key, { count: 1, resetAt: t + windowMs });
      return { blocked: false };
    }

    bucket.count += 1;
    if (bucket.count > maxFailures) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - t) / 1000));
      const result: StoreAccessFailureTrackerResult = {
        blocked: true,
        retryAfterSec,
      };
      return result;
    }
    return { blocked: false };
  };

  return Object.assign(tracker, {
    reset: () => buckets.clear(),
    size: () => buckets.size,
  });
}
