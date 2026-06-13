import { Context, MiddlewareHandler } from 'hono';
import Redis from 'ioredis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimiterStore {
  get(key: string): Promise<RateLimitEntry | undefined>;
  set(key: string, entry: RateLimitEntry): Promise<void>;
  delete(key: string): Promise<void>;
  increment?(key: string, windowMs: number): Promise<RateLimitEntry>;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  store?: RateLimiterStore;
  keyGenerator?: (c: Context) => string;
  message?: string;
}

// ── In-Memory Store ──────────────────────────────────

export class InMemoryRateLimiterStore implements RateLimiterStore {
  private store = new Map<string, RateLimitEntry>();

  constructor() {
    setInterval(() => this.cleanupExpired(), 60_000);
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    return this.store.get(key);
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    this.store.set(key, entry);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry || entry.resetTime <= now) {
      const next = { count: 1, resetTime: now + windowMs };
      this.store.set(key, next);
      return next;
    }
    const next = { ...entry, count: entry.count + 1 };
    this.store.set(key, next);
    return next;
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }
}

// ── Redis Store ──────────────────────────────────────

export class RedisRateLimiterStore implements RateLimiterStore {
  private redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error(
        'RedisRateLimiterStore requires REDIS_URL environment variable.'
      );
    }
    this.redis = new Redis(url);
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const redisKey = `rl:${key}`;
    const [count, ttl] = await Promise.all([
      this.redis.get(redisKey),
      this.redis.ttl(redisKey),
    ]);
    if (!count || ttl <= 0) return undefined;
    return {
      count: Number(count),
      resetTime: Date.now() + ttl * 1000,
    };
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttl = Math.max(1, Math.ceil((entry.resetTime - Date.now()) / 1000));
    await this.redis.set(`rl:${key}`, JSON.stringify(entry), 'EX', ttl);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`rl:${key}`);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = await this.get(key);
    if (!existing || existing.resetTime <= now) {
      const next = { count: 1, resetTime: now + windowMs };
      await this.set(key, next);
      return next;
    }
    const next = { ...existing, count: existing.count + 1 };
    await this.set(key, next);
    return next;
  }
}

export class RedisAtomicRateLimiterStore implements RateLimiterStore {
  private redis: Redis;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('RedisAtomicRateLimiterStore requires REDIS_URL environment variable.');
    }
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const data = await this.redis.get(`rl:${key}`);
    return data ? JSON.parse(data) : undefined;
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttl = Math.max(1, Math.ceil((entry.resetTime - Date.now()) / 1000));
    const redisKey = `rl:${key}`;
    const current = await this.redis.incr(redisKey);
    if (current === 1) {
      await this.redis.expire(redisKey, ttl);
    }
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`rl:${key}`);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const redisKey = `rl:${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.pexpire(redisKey, windowMs);
    }
    const ttl = await this.redis.pttl(redisKey);
    return {
      count,
      resetTime: Date.now() + Math.max(ttl, 0),
    };
  }
}

// ── Factory ──────────────────────────────────────────

async function createStore(): Promise<RateLimiterStore> {
  const driver = process.env.RATE_LIMIT_STORE || 'memory';
  switch (driver) {
    case 'redis-atomic':
      return new RedisAtomicRateLimiterStore();
    case 'redis':
      return new RedisRateLimiterStore();
    case 'memory':
    default:
      return new InMemoryRateLimiterStore();
  }
}

// ── Middleware ───────────────────────────────────────

export function rateLimiter(config: RateLimitConfig): MiddlewareHandler {
  const windowMs = config.windowMs;
  const maxRequests = config.maxRequests;
  const getKey = config.keyGenerator ?? ((c: Context) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
      ?? c.req.header('x-real-ip')
      ?? 'unknown';
    return `${ip}:${c.req.method}:${c.req.path}`;
  });
  const message = config.message ?? 'تم تجاوز الحد المسموح من المحاولات. حاول لاحقًا.';

  // Create store ONCE, not per-request (prevents connection/memory leak)
  const storePromise = createStore();

  return async (c, next) => {
    const store = await storePromise;
    const key = getKey(c);
    const now = Date.now();
    if (store.increment) {
      const entry = await store.increment(key, windowMs);
      c.res.headers.set('X-RateLimit-Limit', String(maxRequests));
      c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - entry.count)));
      c.res.headers.set('X-RateLimit-Reset', String(entry.resetTime));

      if (entry.count > maxRequests) {
        return c.json({
          success: false,
          error: { code: 'RATE_LIMITED', message },
        }, 429);
      }

      return next();
    }

    const entry = await store.get(key);

    if (!entry || entry.resetTime <= now) {
      const newEntry = { count: 1, resetTime: now + windowMs };
      await store.set(key, newEntry);
      c.res.headers.set('X-RateLimit-Limit', String(maxRequests));
      c.res.headers.set('X-RateLimit-Remaining', String(maxRequests - 1));
      c.res.headers.set('X-RateLimit-Reset', String(now + windowMs));
      return next();
    }

    const updatedEntry = { ...entry, count: entry.count + 1 };
    await store.set(key, updatedEntry);

    c.res.headers.set('X-RateLimit-Limit', String(maxRequests));
    c.res.headers.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - updatedEntry.count)));
    c.res.headers.set('X-RateLimit-Reset', String(entry.resetTime));

    if (updatedEntry.count > maxRequests) {
      return c.json({
        success: false,
        error: { code: 'RATE_LIMITED', message },
      }, 429);
    }

    return next();
  };
}
