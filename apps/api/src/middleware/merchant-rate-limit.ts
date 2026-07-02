// Per-merchant rate limiting — prevents individual merchants from abusing shared API resources.
//
// Protects high-traffic endpoints (webhook redelivery, inventory sync) from DoS by a single merchant.
// Tracks requests per (tenant_id, window) and rejects excess with 429.
//
// Example: inventory sync webhook max 5 reqs/min per tenant → if tenant X spams 100x,
// only their requests are rate-limited; other merchants unaffected.

import type { MiddlewareHandler, Context, Next } from 'hono';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const _buckets = new Map<string, RateLimitBucket>();

function cleanupExpiredBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of _buckets.entries()) {
    if (bucket.resetAt <= now) {
      _buckets.delete(key);
    }
  }
}

export interface MerchantRateLimitOptions {
  maxRequestsPerMinute?: number; // Default: 5
  getTenantId?: (c: Context) => string | null; // Extract tenant from request
}

/**
 * Per-merchant rate limiter. Use on endpoints where single merchants can DoS the API.
 *
 * Default: 5 requests per merchant per minute.
 * Tenant ID extracted from URL param, query param, or auth context (customizable).
 */
export function merchantRateLimit(opts: MerchantRateLimitOptions = {}): MiddlewareHandler {
  const maxPerMinute = opts.maxRequestsPerMinute ?? 5;
  const windowMs = 60 * 1000; // 1 minute

  const getTenantId = opts.getTenantId ?? ((c: Context) => {
    // Default: extract from URL params or query
    const { tenantId } = c.req.param() as { tenantId?: string };
    return tenantId ?? c.req.query('tenantId') ?? null;
  });

  return async (c: Context, next: Next) => {
    const tenantId = getTenantId(c);
    if (!tenantId) {
      // No tenant context → skip rate limiting
      await next();
      return;
    }

    cleanupExpiredBuckets();
    const now = Date.now();
    const key = `merchant:${tenantId}`;
    let bucket = _buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
    }

    bucket.count += 1;
    _buckets.set(key, bucket);

    if (bucket.count > maxPerMinute) {
      return c.json(
        {
          success: false,
          error: {
            code: 'MERCHANT_RATE_LIMIT_EXCEEDED',
            message: `تم تجاوز الحد المسموح من الطلبات (${maxPerMinute}/دقيقة). حاول لاحقًا.`,
            retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
          },
        },
        429,
      );
    }

    c.header('X-RateLimit-Limit', String(maxPerMinute));
    c.header('X-RateLimit-Remaining', String(Math.max(0, maxPerMinute - bucket.count)));
    c.header('X-RateLimit-Reset', String(bucket.resetAt));

    await next();
  };
}
