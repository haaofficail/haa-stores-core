// Deeper RBAC Coverage Test — Quality Pass 3, Item 4
//
// Background: Quality Pass 1 + 2 + the existing RBAC Passes 1-5
// already implemented a robust RBAC framework. Routes use
// `requireAuth` + `requireStoreAccess` + `requirePermission` for
// tenant-scoped resources, and `requireAuth` alone for tenant-
// scoped resources that don't need a storeId in the URL.
//
// This test codifies the rule that EVERY mutating route handler
// (POST/PUT/PATCH/DELETE) is RBAC-protected. If a future change
// adds a new mutating route without guards, the test fails —
// preventing accidental privilege escalation.
//
// Routes that are intentionally public (webhooks, landing-ai-
// agent, public-api, etc.) are in the DENY_LIST so the test
// doesn't flag them.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const routesDir = resolve(projectRoot, 'apps/api/src/routes');

// Routes that are intentionally public (or have their own
// alternative auth like API key or signature). They MUST NOT
// have requireAuth/requireStoreAccess because they handle
// pre-auth flows (login, register) or pre-tenant flows
// (webhooks, landing AI agent) or public customer flows
// (storefront cart, checkout, support tickets).
const DENY_LIST = new Set<string>([
  // Pre-auth / cross-tenant endpoints
  'auth.ts',                  // /auth/login, /auth/register, /auth/me, /auth/logout
  'admin/auth.ts',            // /admin/login
  'admin/index.ts',           // aggregator
  'admin/tenants-stores.ts',  // /admin/tenants, /admin/stores, etc. (admin auth via adminRouter.use)
  'admin/operations.ts',      // /admin/audit, /admin/webhooks, /admin/plans, etc.
  'admin/marketplace.ts',     // /admin/marketplace/* (admin auth)
  'marketplaces/index.ts',    // aggregator
  'marketplaces/salla.ts',    // OAuth callbacks; requireAuth + requireStoreAccess at router-level (verified)
  'marketplaces/zid.ts',      // OAuth callbacks; requireAuth + requireStoreAccess at router-level (verified)
  'marketplaces/amazon.ts',   // OAuth callbacks; requireAuth + requireStoreAccess at router-level (verified)
  'webhooks.ts',              // /webhooks/payments — verifyWebhookSignature + timingSafeEqual + dedup
  'shipping-webhooks.ts',     // /webhooks/shipping, /webhooks/oto — verifyOtoWebhookSignature + auth header + dedup
  'landing-ai-agent.ts',      // pre-signup public trial
  'landing.ts',               // POST /landing/contact — public marketing form, rate-limited + honeypot, no auth by design
  'auth/otp.ts',              // POST /auth/otp/send + /auth/otp/verify — public, rate-limited, no auth by design (basename match below)
  'otp.ts',                   // basename of auth/otp.ts — DENY_LIST is checked against `filePath.split('/').pop()`
  'public-api.ts',            // API key auth (own middleware)
  'webhooks/shipping.ts',     // if exists
  'webhooks/oto.ts',          // if exists
  'health.ts',                // /health
  'support-errors.ts',        // /internal/support-errors (local-dev only)
  'migration.ts',             // /merchant/:storeId/migration (admin-style)

  // Storefront public customer endpoints (no auth, no storeId).
  // Customers can add to cart, checkout, submit support tickets
  // without authenticating. These are mounted under /s/* in
  // apps/api/src/index.ts.
  'cart.ts',                  // /s/:slug/cart/*, /s/:slug/cart/:cartId/*
  'checkout.ts',              // /s/:slug/checkout/*
  'haa-marketplace.ts',       // /marketplace/orders (public)
  'support.ts',               // /s/:slug/support/*, /s/:slug/events
  'loyalty-public.ts',        // /s/:slug/loyalty/{settings,balance,redeem-quote} — customer phone-identified, no enumeration leak
  'unsubscribe.ts',           // /s/:slug/unsubscribe/:token — public PDPL Article 18, HMAC-signed token instead of session auth
  'my-orders.ts',             // /s/:slug/orders — public customer order-history by phone (same trust model as /track/:orderNumber)

  // Aggregator files (route definitions delegated to sub-routers)
  'index.ts',
]);


function walkRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      out.push(...walkRoutes(fullPath));
    } else if (entry.endsWith('.ts')) {
      out.push(fullPath);
    }
  }
  return out;
}

interface RouteGuard {
  file: string;
  route: string;
  method: string;
  hasRequireAuth: boolean;
  hasRequireStoreAccess: boolean;
  hasRequirePermission: boolean;
}

function inspectFile(filePath: string): RouteGuard[] {
  const file = filePath.split('/').pop()!;
  if (DENY_LIST.has(file)) return [];
  const src = readFileSync(filePath, 'utf-8');
  const guards: RouteGuard[] = [];

  // Detect file-level middleware (e.g. `<router>.use('*', requireAuth(), requireStoreAccess())`).
  // These protect every route in the file even if not repeated inline.
  const hasFileLevelRequireAuth = /(\w+Router)\.use\(\s*['"`][^'"`]*['"`]\s*,\s*[^)]*?\brequireAuth\b/.test(src);
  const hasFileLevelRequireStoreAccess = /(\w+Router)\.use\(\s*['"`][^'"`]*['"`]\s*,\s*[^)]*?\brequireStoreAccess\b/.test(src);

  // Find all router method calls
  // Match patterns like: router.post('/path', ...handler)
  // The router variable name varies (ordersRouter, productsRouter, etc.)
  const routePattern = /(\w+Router)\.(post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = routePattern.exec(src)) !== null) {
    const [, router, method, route] = match;
    // The handler slice starts at the route string. We stop at the
    // next `<router>.<method>(` declaration (next route) or
    // `async (c) =>` to keep the slice to the middleware chain
    // that immediately precedes the handler.
    const startIdx = match.index + match[0].length;
    const afterSlice = src.slice(startIdx);
    // Find the next route definition OR the first async (c) =>
    const nextRouteMatch = afterSlice.match(
      new RegExp(`\\b${router}\\.(?:get|post|put|patch|delete)\\b`),
    );
    const handlerMatch = afterSlice.match(/async\s*\(\s*[a-z_]+\s*\)\s*=>/);
    let endIdx = afterSlice.length;
    if (nextRouteMatch && nextRouteMatch.index !== undefined) {
      endIdx = Math.min(endIdx, nextRouteMatch.index);
    }
    if (handlerMatch && handlerMatch.index !== undefined) {
      endIdx = Math.min(endIdx, handlerMatch.index);
    }
    const handlerSlice = afterSlice.slice(0, endIdx);
    const hasInlineRequireAuth = /\brequireAuth\b/.test(handlerSlice);
    const hasInlineRequireStoreAccess = /\brequireStoreAccess\b/.test(handlerSlice);
    const hasInlineRequirePermission =
      /\brequirePermission\b|\brequireAnyPermission\b/.test(handlerSlice);
    guards.push({
      file,
      route,
      method,
      hasRequireAuth: hasInlineRequireAuth || hasFileLevelRequireAuth,
      hasRequireStoreAccess:
        hasInlineRequireStoreAccess || hasFileLevelRequireStoreAccess,
      hasRequirePermission: hasInlineRequirePermission,
    });
  }
  return guards;
}

describe('Deeper RBAC Coverage (Quality Pass 3, Item 4)', () => {
  const routeFiles = walkRoutes(routesDir);
  const allGuards: RouteGuard[] = routeFiles.flatMap(inspectFile);

  it('finds at least 30 mutating routes to audit (sanity check)', () => {
    // Sanity: if this is too low, the test pattern is broken.
    expect(allGuards.length).toBeGreaterThanOrEqual(30);
  });

  describe('every mutating route has requireAuth', () => {
    const missing = allGuards.filter((g) => !g.hasRequireAuth);
    it(`all ${allGuards.length} mutating routes call requireAuth()`, () => {
      if (missing.length > 0) {
        const list = missing
          .map((g) => `  - ${g.file}: ${g.method.toUpperCase()} ${g.route}`)
          .join('\n');
        throw new Error(`${missing.length} routes missing requireAuth:\n${list}`);
      }
      expect(missing).toEqual([]);
    });
  });

  describe('every mutating route under /merchant/:storeId/* has requireStoreAccess', () => {
    // Only routes whose URL contains storeId need store access
    const scoped = allGuards.filter((g) => /:storeId/.test(g.route) || g.route.includes('storeId'));
    const missing = scoped.filter((g) => !g.hasRequireStoreAccess);
    it(`all ${scoped.length} store-scoped routes call requireStoreAccess()`, () => {
      if (missing.length > 0) {
        const list = missing
          .map((g) => `  - ${g.file}: ${g.method.toUpperCase()} ${g.route}`)
          .join('\n');
        throw new Error(`${missing.length} store-scoped routes missing requireStoreAccess:\n${list}`);
      }
      expect(missing).toEqual([]);
    });
  });

  describe('every mutating route has at least one permission guard', () => {
    const missing = allGuards.filter((g) => !g.hasRequirePermission);
    it(`all ${allGuards.length} mutating routes have a permission guard`, () => {
      if (missing.length > 0) {
        const list = missing
          .map((g) => `  - ${g.file}: ${g.method.toUpperCase()} ${g.route}`)
          .join('\n');
        throw new Error(`${missing.length} routes missing permission guard:\n${list}`);
      }
      expect(missing).toEqual([]);
    });
  });
});
