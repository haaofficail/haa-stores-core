// HTTP Idempotency-Key middleware — F-QA-B-NEXT / Wave 18 P2.
//
// Implements the operational subset of the IETF idempotency-key-header
// draft (draft-ietf-httpapi-idempotency-key-header) for sensitive POST
// endpoints (refunds, payouts, manual adjustments). The merchant client
// sends `Idempotency-Key: <uuid>` and the middleware:
//
//   1. Computes a fingerprint of the request body so a key reused with
//      different payload is rejected with 409 (per the draft).
//   2. Caches the eventual response (status, body, content-type) for a
//      short TTL keyed by (route, idempotency-key).
//   3. On a replay with the same key+body within the TTL, returns the
//      cached response byte-for-byte without touching the handler.
//
// The cache is in-memory and process-local — same constraint as the
// shipping rate cache and webhook dedup counters. A Redis-backed
// implementation can be added later once we have a horizontally-scaled
// API; until then a single Node instance is the deployment shape.
//
// Header is OPTIONAL by default — clients without the header bypass the
// middleware entirely. Pass `{ required: true }` to a route to enforce
// the header (and reject calls without one with 400).

import type { Context, MiddlewareHandler, Next } from 'hono';
import { createHash } from 'node:crypto';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — matches the draft's recommended floor.
const MAX_KEY_LENGTH = 256;
const MIN_KEY_LENGTH = 8;
const HEADER = 'idempotency-key';

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  fingerprint: string;
  expiresAt: number;
}

interface IdempotencyMetrics {
  total: number;
  hits: number;
  misses: number;
  conflicts: number;
  invalidKey: number;
}

const _metrics: IdempotencyMetrics = {
  total: 0,
  hits: 0,
  misses: 0,
  conflicts: 0,
  invalidKey: 0,
};

const _store = new Map<string, CachedResponse>();

export interface IdempotencyKeyStats {
  total: number;
  hits: number;
  misses: number;
  conflicts: number;
  invalidKey: number;
  hitRate: number;
  size: number;
}

export function getIdempotencyKeyStats(): IdempotencyKeyStats {
  const lookups = _metrics.hits + _metrics.misses;
  return {
    total: _metrics.total,
    hits: _metrics.hits,
    misses: _metrics.misses,
    conflicts: _metrics.conflicts,
    invalidKey: _metrics.invalidKey,
    hitRate: lookups === 0 ? 0 : _metrics.hits / lookups,
    size: _store.size,
  };
}

/** Test-only. Clears the cache and zeroes the counters. */
export function resetIdempotencyKeyState(): void {
  _store.clear();
  _metrics.total = 0;
  _metrics.hits = 0;
  _metrics.misses = 0;
  _metrics.conflicts = 0;
  _metrics.invalidKey = 0;
}

function isValidKey(key: string): boolean {
  if (key.length < MIN_KEY_LENGTH || key.length > MAX_KEY_LENGTH) return false;
  // Accept anything URL-safe — UUIDs, ULIDs, hex hashes. Reject newlines,
  // control chars, and obvious garbage.
  return /^[A-Za-z0-9_\-:.+/=]+$/.test(key);
}

function fingerprintBody(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

function purgeExpired(now: number): void {
  for (const [k, v] of _store.entries()) {
    if (v.expiresAt <= now) _store.delete(k);
  }
}

export interface IdempotencyKeyOptions {
  /** Cache TTL in ms. Default: 24h. */
  ttlMs?: number;
  /** Reject calls without the header. Default: false. */
  required?: boolean;
}

/**
 * Per-route Hono middleware. Reads `Idempotency-Key` from request
 * headers, caches the response by (request path + key), and replays
 * the cached response on a same-key+same-body retry.
 *
 *   - same key, same body → cached response (hit).
 *   - same key, different body → 409 Conflict (per the draft).
 *   - new key → handler runs, response is cached on success.
 *   - missing key, required=false → bypass (no caching).
 *   - missing key, required=true → 400.
 */
export function idempotencyKey(opts: IdempotencyKeyOptions = {}): MiddlewareHandler {
  const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
  const required = opts.required ?? false;

  return async (c: Context, next: Next) => {
    const raw = c.req.header(HEADER) ?? c.req.header('Idempotency-Key');
    const key = raw?.trim() ?? '';

    if (!key) {
      if (required) {
        _metrics.invalidKey += 1;
        return c.json(
          {
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_REQUIRED',
              message: 'Idempotency-Key header is required on this endpoint.',
            },
          },
          400,
        );
      }
      // Optional + missing → just pass through.
      await next();
      return;
    }

    if (!isValidKey(key)) {
      _metrics.invalidKey += 1;
      return c.json(
        {
          success: false,
          error: {
            code: 'IDEMPOTENCY_KEY_INVALID',
            message: `Idempotency-Key must be ${MIN_KEY_LENGTH}–${MAX_KEY_LENGTH} URL-safe characters.`,
          },
        },
        400,
      );
    }

    _metrics.total += 1;
    const now = Date.now();
    purgeExpired(now);

    // Read the raw body so we can fingerprint it. Hono buffers it for
    // downstream handlers, so this is safe.
    const rawBody = await c.req.text().catch(() => '');
    const fingerprint = fingerprintBody(rawBody);
    const cacheKey = `${c.req.method}:${c.req.path}:${key}`;

    const existing = _store.get(cacheKey);
    if (existing && existing.expiresAt > now) {
      if (existing.fingerprint !== fingerprint) {
        _metrics.conflicts += 1;
        return c.json(
          {
            success: false,
            error: {
              code: 'IDEMPOTENCY_KEY_CONFLICT',
              message: 'Idempotency-Key was reused with a different request body.',
            },
          },
          409,
        );
      }
      _metrics.hits += 1;
      c.header('Idempotency-Replay', 'true');
      for (const [hk, hv] of Object.entries(existing.headers)) {
        if (hk.toLowerCase() === 'content-type') c.header('Content-Type', hv);
      }
      return c.body(existing.body, existing.status as any);
    }

    _metrics.misses += 1;
    await next();

    const res = c.res;
    // Only cache deterministic success responses. 4xx/5xx are not cached
    // so transient failures can be retried with the same key.
    if (res.status >= 200 && res.status < 300) {
      const cloned = res.clone();
      const body = await cloned.text();
      const headers: Record<string, string> = {};
      cloned.headers.forEach((v, k) => {
        headers[k] = v;
      });
      _store.set(cacheKey, {
        status: res.status,
        headers,
        body,
        fingerprint,
        expiresAt: now + ttlMs,
      });
    }
  };
}
