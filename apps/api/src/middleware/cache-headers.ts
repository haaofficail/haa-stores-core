// Cache-Control headers for read-only endpoints — reduces database load on repeated requests.
//
// Strategy: List endpoints cache for 1 hour (ETag + If-None-Match for revalidation).
// Detail endpoints cache for 5 minutes (data can change via concurrent writes).
// State-change endpoints (POST/PATCH/DELETE) are never cached.

import type { MiddlewareHandler, Context, Next } from 'hono';
import { createHash } from 'node:crypto';

export interface CacheHeadersOptions {
  maxAgeSeconds?: number; // Default: 3600 (1 hour) for lists, 300 (5 min) for details
  isDetailEndpoint?: boolean; // If true, use shorter TTL (5 min)
}

/**
 * Apply Cache-Control headers for safe (GET) endpoints.
 *
 * - Safe methods (GET/HEAD/OPTIONS) get cache headers based on endpoint type.
 * - State-change methods (POST/PATCH/DELETE) get no-cache directives.
 * - ETags computed from response body for revalidation (304 Not Modified).
 */
export function cacheHeaders(opts: CacheHeadersOptions = {}): MiddlewareHandler {
  const isDetail = opts.isDetailEndpoint ?? false;
  const maxAge = opts.maxAgeSeconds ?? (isDetail ? 300 : 3600); // 5 min for detail, 1 hour for lists

  return async (c: Context, next: Next) => {
    const method = c.req.method.toUpperCase();

    // State-change methods: no caching
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
      c.header('Cache-Control', 'no-cache, no-store, must-revalidate, private');
      c.header('Pragma', 'no-cache');
      c.header('Expires', '0');
      await next();
      return;
    }

    // Safe methods (GET, HEAD, OPTIONS): cacheable
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      c.header('Cache-Control', `public, max-age=${maxAge}`);

      // Continue to handler
      await next();

      // After handler runs, compute ETag from response body for revalidation
      const response = c.res.clone();
      const body = await response.text();

      if (body) {
        const etag = `"${createHash('md5').update(body).digest('hex')}"`;
        const clientEtag = c.req.header('if-none-match');

        // If client has matching ETag, return 304 Not Modified
        if (clientEtag && clientEtag === etag) {
          return c.body(null, 304);
        }

        // Otherwise, send full response with ETag for future revalidation
        c.header('ETag', etag);
      }

      return;
    }

    // Unknown method: pass through
    await next();
  };
}
