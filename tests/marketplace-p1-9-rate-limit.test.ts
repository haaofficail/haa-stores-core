/**
 * TASK-0043 Phase 4 — Track 4A — P1-9 Rate Limit + P1-1 CSRF Coverage
 *
 * Source-grep contracts verifying that the marketplace POST /orders endpoint:
 *   1. Is protected by a separate rate limit (stricter than the general
 *      browse limit) — guards against phone enumeration + spam + cost
 *      amplification.
 *   2. Falls under the CSRF origin check middleware (already applied at
 *      app.use('*', csrfOrigin()) in index.ts — we verify the wiring
 *      doesn't get accidentally bypassed).
 *
 * The rate limit middleware is wired in apps/api/src/index.ts as
 * `marketplaceOrderRateLimit` (30 requests / 10 minutes in production).
 *
 * Limit values are documented as constants in the index.ts comment block
 * so changes trigger this test to fail loudly.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const INDEX = resolve(projectRoot, 'apps/api/src/index.ts');
const RATE_LIMITER = resolve(projectRoot, 'apps/api/src/middleware/rate-limiter.ts');
const MARKETPLACE_ROUTE = resolve(projectRoot, 'apps/api/src/routes/haa-marketplace.ts');

const indexSrc = readFileSync(INDEX, 'utf-8');
const rlSrc = readFileSync(RATE_LIMITER, 'utf-8');
const mpSrc = readFileSync(MARKETPLACE_ROUTE, 'utf-8');

describe('TASK-0043 Track 4A — P1-9: marketplace order rate limit', () => {
  it('index.ts defines a dedicated marketplaceOrderRateLimit constant', () => {
    // The rate limit must be defined as a separate constant — not
    // reusing the browse limit which is too generous (600/10min).
    expect(indexSrc).toMatch(/const marketplaceOrderRateLimit = rateLimiter\(/);
  });

  it('marketplace order rate limit is stricter than browse limit (≤30 prod)', () => {
    // Extract the maxRequests value from marketplaceOrderRateLimit block.
    // The block ends at the closing }); of the rateLimiter({...}) call.
    // Production target: 30 / 10 minutes.
    const mpBlock = indexSrc.match(
      /const marketplaceOrderRateLimit = rateLimiter\(\{([\s\S]*?)\}\)/,
    );
    expect(mpBlock).not.toBeNull();
    const mpMaxMatch = mpBlock![1].match(
      /maxRequests:\s*env\.NODE_ENV === 'development'\s*\?\s*([\d_]+)\s*:\s*([\d_]+)/,
    );
    expect(mpMaxMatch).not.toBeNull();
    const [, devMaxRaw, prodMaxRaw] = mpMaxMatch!;
    const devMax = Number(devMaxRaw.replace(/_/g, ''));
    const prodMax = Number(prodMaxRaw.replace(/_/g, ''));
    // Production max must be ≤30 (TASK-0043 P1-9 spec).
    expect(Number(prodMax)).toBeLessThanOrEqual(30);
    // Browse limit must be ≥10x more generous (sanity check — this is
    // the whole point of having a separate limit).
    const browseBlock = indexSrc.match(
      /const storefrontBrowseRateLimit = rateLimiter\(\{([\s\S]*?)\}\)/,
    );
    expect(browseBlock).not.toBeNull();
    const browseMaxMatch = browseBlock![1].match(
      /maxRequests:\s*env\.NODE_ENV === 'development'\s*\?\s*([\d_]+)\s*:\s*([\d_]+)/,
    );
    expect(browseMaxMatch).not.toBeNull();
    const [, , browseProdRaw] = browseMaxMatch!;
    const browseProd = Number(browseProdRaw.replace(/_/g, ''));
    expect(Number(browseProd)).toBeGreaterThanOrEqual(Number(prodMax) * 10);
    // Dev max (unused in prod, just for sanity)
    expect(Number(devMax)).toBeGreaterThan(Number(prodMax));
  });

  it('marketplaceOrderRateLimit is wired to /marketplace/orders path', () => {
    // The middleware must actually be applied — not just defined.
    const wireMatch = indexSrc.match(/app\.use\(['"]\/marketplace\/orders['"],\s*marketplaceOrderRateLimit\)/);
    expect(wireMatch).not.toBeNull();
  });

  it('marketplace order rate limit window is 10 minutes', () => {
    // Spec calls for 30/10min. Window must be 10 * 60 * 1000.
    const match = indexSrc.match(
      /const marketplaceOrderRateLimit = rateLimiter\(\{[\s\S]{0,200}windowMs:\s*10\s*\*\s*60\s*\*\s*1000/,
    );
    expect(match).not.toBeNull();
  });

  it('rate limiter exports a MiddlewareHandler factory', () => {
    // Sanity: the underlying rateLimiter() factory must still exist.
    expect(rlSrc).toMatch(/export function rateLimiter\(config: RateLimitConfig\)/);
    expect(rlSrc).toMatch(/MiddlewareHandler/);
  });

  it('rate limiter supports in-memory store fallback (RATE_LIMIT_STORE=memory)', () => {
    // Production deployments may not have Redis configured.
    // The default must be in-memory (safe fallback).
    expect(rlSrc).toMatch(/RATE_LIMIT_STORE \|\| 'memory'/);
  });

  it('marketplace route file does not skip rate limit (no use(c, next) override)', () => {
    // Sanity check: the route file should not bypass the rate limiter.
    // The rate limit is applied at the app level, so we just ensure the
    // route doesn't do `app.use('/marketplace/orders', ...)` again with
    // a different middleware that overrides.
    expect(mpSrc).not.toMatch(/app\.use\(['"]\/marketplace\/orders['"]/);
  });
});

describe('TASK-0043 Track 4A — P1-1: CSRF origin check covers marketplace routes', () => {
  it('csrfOrigin middleware is applied globally before all routes', () => {
    // P1-1: CSRF must apply to POST endpoints. We use csrfOrigin (verify
    // Origin header matches allowed origins) which is applied via
    // app.use('*', csrfOrigin()) before any marketplace route.
    const csrfMatch = indexSrc.match(/app\.use\(['"]\*['"],\s*csrfOrigin\(\)\)/);
    expect(csrfMatch).not.toBeNull();
    // The csrfOrigin() middleware position must be BEFORE the marketplace
    // route mount (line numbers ascending).
    const csrfLine = indexSrc.split('\n').findIndex((l) => /app\.use\(['"]\*['"],\s*csrfOrigin\(\)\)/.test(l));
    const mpLine = indexSrc.split('\n').findIndex((l) => l.includes('app.route') && l.includes('marketplace'));
    expect(csrfLine).toBeGreaterThan(-1);
    expect(mpLine).toBeGreaterThan(-1);
    expect(csrfLine).toBeLessThan(mpLine);
  });

  it('csrfOrigin module is imported', () => {
    expect(indexSrc).toMatch(/import\s*\{[^}]*csrfOrigin[^}]*\}\s*from\s*['"][^'"]*csrf/);
  });

  it('marketplace route POST handlers validate Origin header via csrfOrigin', () => {
    // POST /orders handler must not bypass csrfOrigin. We verify by
    // checking that the marketplace route file does not have any
    // explicit CSRF skip.
    const csrfSkipPatterns = [
      /csrfOrigin\(\)/.test(mpSrc) === false, // file doesn't re-apply (app-level already does)
      !/csrf:\s*false/i.test(mpSrc),
      !/skipCsrf/.test(mpSrc),
    ];
    expect(csrfSkipPatterns.every(Boolean)).toBe(true);
  });
});
