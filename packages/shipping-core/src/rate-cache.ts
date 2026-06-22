// Server-side shipping rate cache + concurrent debounce — F-QA-C-004.
//
// In-process cache for `getRates` results. Two purposes:
//
//   1. Cache (short TTL): identical rate requests within a short window
//      reuse the prior result instead of hammering the carrier API.
//   2. Concurrent debounce: if two requests with the same key arrive
//      simultaneously, only one upstream call runs; the second awaits the
//      first's result (single-flight pattern).
//
// The cache key is derived from:
//   - storeId
//   - destination (country + city + postal where present)
//   - cart hash (items + quantities)
//   - provider/method (when caller has narrowed it down)
//
// No live API call is made by this module — it merely wraps an arbitrary
// loader function. The loader is supplied by the caller and may itself be
// a mock or a real shipping provider.

import crypto from "node:crypto";

const DEFAULT_TTL_MS = 30_000; // 30 seconds — short enough to stay fresh, long enough to absorb a checkout race.
const DEFAULT_ERROR_TTL_MS = 2_000; // very short cache for failures, just enough to absorb the in-flight race.

export interface RateCacheKeyInput {
  storeId: number | string;
  destination: {
    country?: string | null;
    city?: string | null;
    postalCode?: string | null;
    region?: string | null;
  };
  cart: Array<{ sku?: string | null; productId?: number | string; quantity: number }>;
  provider?: string | null;
  method?: string | null;
}

interface CacheEntry<T> {
  value: T | undefined;
  error: Error | undefined;
  expiresAt: number;
  inFlight: Promise<T> | undefined;
}

export interface ShippingRateCacheStats {
  size: number;
  hits: number;
  misses: number;
  coalesced: number;
  errors: number;
  hitRate: number;
}

export class ShippingRateCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly errorTtlMs: number;
  private hits = 0;
  private misses = 0;
  private coalesced = 0;
  private errors = 0;

  constructor(opts: { ttlMs?: number; errorTtlMs?: number } = {}) {
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    this.errorTtlMs = opts.errorTtlMs ?? DEFAULT_ERROR_TTL_MS;
  }

  /**
   * Get rates for the key. Wraps the supplied loader with cache + single-flight.
   *
   * - cache hit (within TTL) → returns cached value immediately.
   * - cache miss, no in-flight call → calls loader, stores result, returns.
   * - cache miss, in-flight call exists → awaits the in-flight call (no duplicate upstream).
   * - error → cached briefly (errorTtlMs) so a thundering herd doesn't hammer a failing provider.
   */
  async getOrLoad(input: RateCacheKeyInput, loader: () => Promise<T>): Promise<T> {
    const key = this.keyOf(input);
    const now = Date.now();
    const entry = this.store.get(key);

    if (entry) {
      // Live in-flight call: piggy-back.
      if (entry.inFlight) {
        this.coalesced += 1;
        return entry.inFlight;
      }
      if (entry.expiresAt > now) {
        if (entry.error) {
          this.errors += 1;
          throw entry.error;
        }
        if (entry.value !== undefined) {
          this.hits += 1;
          return entry.value;
        }
      }
      // Stale — drop and refetch.
      this.store.delete(key);
    }

    this.misses += 1;
    const inFlight = (async () => {
      try {
        const value = await loader();
        this.store.set(key, {
          value,
          error: undefined,
          expiresAt: Date.now() + this.ttlMs,
          inFlight: undefined,
        });
        return value;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.store.set(key, {
          value: undefined,
          error,
          expiresAt: Date.now() + this.errorTtlMs,
          inFlight: undefined,
        });
        throw error;
      }
    })();

    this.store.set(key, {
      value: undefined,
      error: undefined,
      expiresAt: now + this.ttlMs,
      inFlight,
    });

    return inFlight;
  }

  /** Visible for tests and ops introspection. */
  size(): number {
    return this.store.size;
  }

  /** Snapshot of counters + size. Hit rate denominator excludes errors. */
  stats(): ShippingRateCacheStats {
    const lookups = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      coalesced: this.coalesced,
      errors: this.errors,
      hitRate: lookups === 0 ? 0 : this.hits / lookups,
    };
  }

  /** Visible for tests. Clears all cached entries. */
  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
    this.coalesced = 0;
    this.errors = 0;
  }

  /** Compute the stable key for the given input. Exposed for tests. */
  keyOf(input: RateCacheKeyInput): string {
    const items = [...input.cart]
      .map((i) => ({
        sku: i.sku ?? null,
        productId: i.productId ?? null,
        quantity: i.quantity,
      }))
      .sort((a, b) => {
        const sa = `${a.sku}|${a.productId}`;
        const sb = `${b.sku}|${b.productId}`;
        return sa.localeCompare(sb);
      });
    const canonical = JSON.stringify({
      s: input.storeId,
      d: {
        country: input.destination.country ?? null,
        city: input.destination.city ?? null,
        postalCode: input.destination.postalCode ?? null,
        region: input.destination.region ?? null,
      },
      p: input.provider ?? null,
      m: input.method ?? null,
      c: items,
    });
    return crypto.createHash("sha256").update(canonical).digest("hex");
  }
}

// Default singleton — convenient for the API layer where one cache instance
// per process is the sensible default. Tests should construct their own to
// avoid cross-test bleed.
let _defaultCache: ShippingRateCache<unknown> | undefined;
export function getDefaultShippingRateCache(): ShippingRateCache<unknown> {
  if (!_defaultCache) _defaultCache = new ShippingRateCache<unknown>();
  return _defaultCache;
}
