// HTTP Idempotency-Key middleware — IETF draft (draft-ietf-httpapi-idempotency-key-header)
//
// Sensitive POST endpoints (refunds, payouts, manual adjustments) send `Idempotency-Key: <uuid>`.
// The middleware:
//   1. Computes SHA256 fingerprint of request body; reuse with different payload → 409.
//   2. Caches successful response (status, body, headers) keyed by (method:path:key).
//   3. On replay with same key+body within TTL, returns cached response without touching handler.
//
// Backed by Redis when REDIS_URL is set (scale-safe: idempotency survives process restart).
// Falls back to in-memory cache for local dev/single-process deployments.
//
// Header is OPTIONAL by default — clients without it bypass middleware entirely.
// Pass `{ required: true }` to enforce it (reject calls without header with 400).

import type { Context, MiddlewareHandler, Next } from 'hono';
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h — matches the draft's recommended floor.
const MAX_KEY_LENGTH = 256;
const MIN_KEY_LENGTH = 8;
const HEADER = 'idempotency-key';
const REDIS_KEY_PREFIX = 'idempotency:';

interface CachedResponseBase {
  headers: Record<string, string>;
  fingerprint: string;
  expiresAt: number;
}

type CachedResponse =
  | (CachedResponseBase & { status: ContentfulStatusCode; body: string })
  | (CachedResponseBase & { status: StatusCode; body: null });

interface IdempotencyMetrics {
  total: number;
  hits: number;
  misses: number;
  conflicts: number;
  invalidKey: number;
  redisErrors: number;
}

const _metrics: IdempotencyMetrics = {
  total: 0,
  hits: 0,
  misses: 0,
  conflicts: 0,
  invalidKey: 0,
  redisErrors: 0,
};

const _store = new Map<string, CachedResponse>();
let _redis: Redis | null | undefined;

async function getRedisClient(): Promise<Redis | null> {
  if (_redis !== undefined) return _redis;
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    _redis = null;
    return null;
  }
  try {
    const client = new Redis(redisUrl);
    await client.ping();
    _redis = client;
    return client;
  } catch {
    _metrics.redisErrors += 1;
    _redis = null;
    return null;
  }
}

const SUCCESS_STATUS_CODES = new Set<number>([200, 201, 202, 203, 204, 205, 206, 207, 208, 226]);
const CONTENTLESS_STATUS_CODES = new Set<number>([101, 204, 205, 304]);

function toSuccessStatusCode(status: number): StatusCode {
  return SUCCESS_STATUS_CODES.has(status) ? status as StatusCode : 200;
}

function hasResponseBody(status: StatusCode): status is ContentfulStatusCode {
  return !CONTENTLESS_STATUS_CODES.has(status);
}

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
export async function resetIdempotencyKeyState(): Promise<void> {
  _store.clear();
  const redis = await getRedisClient();
  if (redis) {
    const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }
  _metrics.total = 0;
  _metrics.hits = 0;
  _metrics.misses = 0;
  _metrics.conflicts = 0;
  _metrics.invalidKey = 0;
  _metrics.redisErrors = 0;
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
  const ttlSeconds = Math.floor(ttlMs / 1000);
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

    const rawBody = await c.req.text().catch(() => '');
    const fingerprint = fingerprintBody(rawBody);
    const cacheKey = `${c.req.method}:${c.req.path}:${key}`;
    const redisKey = `${REDIS_KEY_PREFIX}${cacheKey}`;

    const redis = await getRedisClient();
    let existing: CachedResponse | null = null;

    // Try Redis first (scale-safe), then in-memory fallback (local dev)
    if (redis) {
      try {
        const cached = await redis.get(redisKey);
        if (cached) {
          existing = JSON.parse(cached) as CachedResponse;
        }
      } catch {
        _metrics.redisErrors += 1;
      }
    }

    if (!existing) {
      existing = _store.get(cacheKey) ?? null;
    }

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
      if (existing.body === null) return c.body(null, existing.status);
      return c.body(existing.body, existing.status);
    }

    _metrics.misses += 1;
    await next();

    const res = c.res;
    if (res.status >= 200 && res.status < 300) {
      const status = toSuccessStatusCode(res.status);
      const cloned = res.clone();
      const headers: Record<string, string> = {};
      cloned.headers.forEach((v, k) => {
        headers[k] = v;
      });

      const cached: CachedResponse = hasResponseBody(status)
        ? {
            status,
            headers,
            body: await cloned.text(),
            fingerprint,
            expiresAt: now + ttlMs,
          }
        : {
            status,
            headers,
            body: null,
            fingerprint,
            expiresAt: now + ttlMs,
          };

      _store.set(cacheKey, cached);

      if (redis) {
        try {
          await redis.setex(redisKey, ttlSeconds, JSON.stringify(cached));
        } catch {
          _metrics.redisErrors += 1;
        }
      }
    }
  };
}
