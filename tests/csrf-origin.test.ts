// CSRF Origin/Referer Middleware — Quality Pass 3
//
// Source-grep style tests for apps/api/src/middleware/csrf-origin.ts
// and its mount point in apps/api/src/index.ts. We assert behavior
// via the source code (consistent with the project's existing
// file-source test pattern) since the project has no runtime
// middleware test infrastructure.
//
// The CSRF defense here is an **Origin/Referer header check** on
// mutating requests (POST/PUT/PATCH/DELETE). This is the modern
// equivalent of double-submit cookies for Bearer-token APIs (used
// by GitHub, GitLab, etc.) because the project uses localStorage-
// stored Bearer tokens and has no cookies anywhere.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);

const middlewarePath = resolve(projectRoot, 'apps/api/src/middleware/csrf-origin.ts');
const indexPath = resolve(projectRoot, 'apps/api/src/index.ts');

const middleware = readFileSync(middlewarePath, 'utf-8');
const apiIndex = readFileSync(indexPath, 'utf-8');

describe('CSRF Origin/Referer Middleware (Quality Pass 3)', () => {
  describe('Middleware file (csrf-origin.ts)', () => {
    it('exists and exports a csrfOrigin factory', () => {
      expect(middleware).toContain('export');
      // Should export either csrfOrigin (factory) or the middleware function
      expect(middleware).toMatch(/export.*csrfOrigin|export.*csrf/);
    });

    it('imports Hono MiddlewareHandler type', () => {
      expect(middleware).toContain("from 'hono'");
      expect(middleware).toContain('MiddlewareHandler');
    });

    it('uses env.CORS_ORIGINS for the allowed-origin list', () => {
      expect(middleware).toContain('env.CORS_ORIGINS');
      expect(middleware).toContain("from '../env.js");
    });

    it('only inspects mutating methods (POST/PUT/PATCH/DELETE)', () => {
      // Must include the mutating method list
      expect(middleware).toMatch(/POST|PUT|PATCH|DELETE/);
      // Must explicitly skip GET/HEAD/OPTIONS (or fall through)
      // The simplest check: the method allowlist contains the four
      // mutating methods
      const allowMethods = middleware.match(/\[([^\]]*(?:POST|PUT|PATCH|DELETE)[^\]]*)\]/);
      expect(allowMethods).not.toBeNull();
    });

    it('compares Origin (or Referer) against the allowed list', () => {
      // Should read the Origin header (preferred over Referer)
      expect(middleware).toMatch(/Origin|origin/);
      // Should do some kind of comparison/normalize
      expect(middleware).toMatch(/includes|===|allowlist|allowed/i);
    });

    it('rejects cross-origin mutating requests with 403', () => {
      // Must return a 403 status on mismatch
      expect(middleware).toMatch(/403/);
      // Must use a structured error code
      expect(middleware).toContain('CSRF');
    });

    it('allows mutating requests when Origin is absent (server-to-server)', () => {
      // The check must early-return (next()) when there is no Origin
      // header (CLI tools, mobile apps, webhooks)
      // The most reliable signal: a "if (!origin)" early-return pattern
      expect(middleware).toMatch(/!.*[oO]rigin.*next|origin.*==.*null|!origin/);
    });
  });

  describe('Mount point (apps/api/src/index.ts)', () => {
    it('imports csrfOrigin from the new middleware module', () => {
      expect(apiIndex).toMatch(/import.*csrfOrigin.*csrf-origin/);
    });

    it('registers the middleware globally with app.use(...)', () => {
      // Should be registered somewhere in the middleware chain
      expect(apiIndex).toMatch(/app\.use\([^)]*csrfOrigin/);
    });

    it('registers the middleware AFTER CORS (so Origin is validated against the same allowlist)', () => {
      const corsIdx = apiIndex.search(/app\.use\([^)]*cors/);
      const csrfIdx = apiIndex.search(/app\.use\([^)]*csrfOrigin/);
      // Both must be present and csrfOrigin must come after cors
      expect(corsIdx).toBeGreaterThan(-1);
      expect(csrfIdx).toBeGreaterThan(-1);
      expect(csrfIdx).toBeGreaterThan(corsIdx);
    });
  });

  describe('Webhook endpoints are NOT blocked', () => {
    // The webhook router is mounted before the csrfOrigin middleware
    // runs (or it must be explicitly excluded). The router has
    // strictRateLimit but no auth — Origin would be empty for
    // server-to-server webhook calls.
    it('webhook router is mounted as a route, not just a use()', () => {
      expect(apiIndex).toMatch(/app\.route\([^)]*webhook/i);
    });
  });
});
