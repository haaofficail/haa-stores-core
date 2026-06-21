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
});
