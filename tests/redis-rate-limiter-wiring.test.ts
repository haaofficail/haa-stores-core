import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const rateLimiterFile = resolve(projectRoot, 'apps/api/src/middleware/rate-limiter.ts');
const envFile = resolve(projectRoot, 'apps/api/src/env.ts');
const redisFactoryFile = resolve(projectRoot, 'packages/commerce-core/src/redis.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

describe('Quality Pass 4 — Redis Rate Limiter Wiring (Item 3)', () => {
  it('rate-limiter must support an atomic Redis store (production-grade)', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/RedisAtomicRateLimiterStore/);
    expect(content).toMatch(/redis-atomic/);
  });

  it('rate-limiter must support a non-atomic Redis store (dev/fallback)', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/RedisRateLimiterStore/);
  });

  it('rate-limiter must support an in-memory store (default in dev)', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/InMemoryRateLimiterStore/);
    expect(content).toMatch(/memory/);
  });

  it('rate-limiter factory must read RATE_LIMIT_STORE env var', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/RATE_LIMIT_STORE/);
  });

  it('rate-limiter factory must default to memory when env var is unset', () => {
    const content = read(rateLimiterFile);
    // Either explicit default check or `?? 'memory'`
    expect(content).toMatch(/['"]memory['"]/);
  });

  it('Redis store classes must read REDIS_URL env var', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/REDIS_URL/);
  });

  it('Redis store classes must throw clearly when REDIS_URL is missing', () => {
    const content = read(rateLimiterFile);
    // Match: "REDIS_URL" + "required" (in any order within a throw block)
    expect(content).toMatch(/REDIS_URL/);
    expect(content).toMatch(/throw new Error/);
    expect(content).toMatch(/REDIS_URL environment variable|REDIS_URL.*required|requires REDIS_URL/i);
  });

  it('rate-limiter middleware must set X-RateLimit-* response headers', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/X-RateLimit-Limit/);
    expect(content).toMatch(/X-RateLimit-Remaining/);
    expect(content).toMatch(/X-RateLimit-Reset/);
  });

  it('rate-limiter must return 429 with RATE_LIMITED code when over the limit', () => {
    const content = read(rateLimiterFile);
    expect(content).toMatch(/429/);
    expect(content).toMatch(/RATE_LIMITED/);
  });

  it('rate-limiter middleware must create the store ONCE (not per-request)', () => {
    const content = read(rateLimiterFile);
    // The factory should be called outside the per-request handler
    // Look for: storePromise, or a comment about "once" / "leak"
    expect(content).toMatch(/storePromise|once|leak/i);
  });

  it('env.ts must default RATE_LIMIT_STORE to redis-atomic in production', () => {
    const content = read(envFile);
    expect(content).toMatch(/RATE_LIMIT_STORE/);
    expect(content).toMatch(/redis-atomic/);
  });

  it('env.ts must require REDIS_URL in production', () => {
    const content = read(envFile);
    expect(content).toMatch(/REDIS_URL/);
  });

  it('commerce-core redis module must exist and export a Redis factory', () => {
    expect(existsSync(redisFactoryFile)).toBe(true);
    const content = read(redisFactoryFile);
    expect(content).toMatch(/REDIS_URL/);
  });

  it('rate-limiter Redis store should reuse the commerce-core redis client OR create its own with the same URL', () => {
    const rlContent = read(rateLimiterFile);
    const redisContent = read(redisFactoryFile);
    // Either: rate-limiter imports from commerce-core, OR it instantiates
    // its own ioredis client with REDIS_URL (acceptable).
    const usesShared = rlContent.includes('commerce-core') || rlContent.includes('@haa/commerce-core');
    const usesOwnUrl = rlContent.includes('new Redis(url)') || rlContent.includes('new Redis(REDIS_URL');
    expect(usesShared || usesOwnUrl).toBe(true);
    // commerce-core must also have REDIS_URL — both must agree
    expect(redisContent).toMatch(/REDIS_URL/);
  });
});
