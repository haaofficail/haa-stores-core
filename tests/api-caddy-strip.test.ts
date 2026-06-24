// API /api strip contract — DECISION-OS-015.
//
// Caddy (deploy/{staging,production}/Caddyfile) strips `/api/*` before
// forwarding to the API service. Hono mounts must NOT carry the `/api/`
// prefix or the route is unreachable behind the proxy.
//
// This test fails if a new `app.route('/api/...')` or `app.get('/api/...')`
// (or any verb) appears in `apps/api/src/index.ts`.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const INDEX = resolve(__dirname, '../apps/api/src/index.ts');

describe('API /api strip contract (DECISION-OS-015)', () => {
  const src = readFileSync(INDEX, 'utf-8');

  it('no Hono mount carries the /api/ prefix', () => {
    // Match patterns like:
    //   app.route('/api/foo', ...)
    //   app.get('/api/foo', ...)
    //   app.post('/api/foo', ...)
    //   app.put(...) app.patch(...) app.delete(...)
    const pattern = /app\.(route|get|post|put|patch|delete)\(\s*['"]\/api\//g;
    const matches = [...src.matchAll(pattern)];
    if (matches.length > 0) {
      const lines = src.split('\n');
      const offenders: string[] = [];
      for (const m of matches) {
        const idx = m.index ?? 0;
        const upto = src.slice(0, idx);
        const lineNo = upto.split('\n').length;
        offenders.push(`apps/api/src/index.ts:${lineNo} — ${lines[lineNo - 1].trim()}`);
      }
      throw new Error(
        'Hono mount with /api/ prefix is unreachable behind Caddy (DECISION-OS-015):\n' +
          offenders.join('\n'),
      );
    }
    expect(matches).toEqual([]);
  });

  it('Caddyfiles strip /api/* (staging + production)', () => {
    for (const f of [
      resolve(__dirname, '../deploy/staging/Caddyfile'),
      resolve(__dirname, '../deploy/production/Caddyfile'),
    ]) {
      const text = readFileSync(f, 'utf-8');
      expect(text).toMatch(/handle_path\s+\/api\/\*/);
    }
  });

  // W7 (Autopilot Phase 3): the spec explicitly calls out two routes
  // that previously carried the /api prefix and were unreachable
  // behind Caddy. They MUST stay mounted WITHOUT the prefix.
  it('landing-ai-agent mounted at /landing-ai-agent (no /api/)', () => {
    expect(src).toMatch(/app\.route\(\s*['"]\/landing-ai-agent['"]/);
    // negative: ensure no stray /api/landing-ai-agent reintroduction
    expect(src).not.toMatch(/\/api\/landing-ai-agent/);
  });

  it('public api mounted at /v1 (no /api/v1)', () => {
    expect(src).toMatch(/app\.route\(\s*['"]\/v1['"]/);
    expect(src).not.toMatch(/app\.route\(\s*['"]\/api\/v1/);
  });

  // Client SPAs must continue to be BUILT with VITE_API_URL=/api so
  // requests hit Caddy's `handle_path /api/*` and get stripped before
  // the API receives them. The build arg lives in deploy.yml; verifying
  // it here completes the round-trip:
  //   client(/api/foo) → caddy(strip /api/*) → hono(/foo)
  it('deploy.yml builds SPAs with VITE_API_URL=/api', () => {
    const deployYml = readFileSync(
      resolve(__dirname, '../.github/workflows/deploy.yml'),
      'utf-8',
    );
    expect(deployYml).toMatch(/VITE_API_URL=\/api/);
  });

  it('storefront client uses VITE_API_URL as the request base', () => {
    // Without the env-driven base, the SPA would fetch from the same
    // origin without a prefix, which Caddy would NOT strip.
    const apiClient = resolve(__dirname, '../apps/storefront/src/lib/api.ts');
    const text = readFileSync(apiClient, 'utf-8');
    expect(text).toMatch(/VITE_API_URL/);
  });

  it('merchant dashboard client uses VITE_API_URL as the request base', () => {
    const apiClient = resolve(__dirname, '../apps/merchant-dashboard/src/lib/api.ts');
    const text = readFileSync(apiClient, 'utf-8');
    expect(text).toMatch(/VITE_API_URL/);
  });
});
