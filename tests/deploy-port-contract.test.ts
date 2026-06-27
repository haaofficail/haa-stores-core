// Deploy port contract.
//
// Prevents the #294-class outage: the frontend Dockerfiles were changed to
// `serve -l 3001` but the Caddyfiles still had `reverse_proxy storefront:80`,
// so every frontend returned 502 in staging/production. No test caught it.
//
// This test derives the CANONICAL serve port from the frontend Dockerfiles
// and asserts that Caddy (both envs), the compose files, and the build args
// all agree. It fails the moment any of them drift — so a future port change
// that forgets to update Caddy can never reach a deploy.
//
// It deliberately reads the deploy/infra files as text (no Docker/Caddy
// runtime) so it runs in plain CI.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = (p: string) => resolve(__dirname, '..', p);
const read = (p: string) => readFileSync(root(p), 'utf-8');

const FRONTENDS = ['storefront', 'merchant-dashboard', 'admin-dashboard'] as const;
const CADDYFILES = ['deploy/staging/Caddyfile', 'deploy/production/Caddyfile'] as const;
const COMPOSES = [
  'deploy/staging/docker-compose.yml',
  'deploy/production/docker-compose.yml',
] as const;

// `CMD ["serve", "-s", "dist", "-l", "3001"]` → 3001
function frontendServePort(app: string): number {
  const df = read(`apps/${app}/Dockerfile`);
  const m = df.match(/serve[^\n]*?-l["',\s]+(\d{2,5})/);
  if (!m) throw new Error(`apps/${app}/Dockerfile: no 'serve ... -l <port>' CMD found`);
  return Number(m[1]);
}

// `EXPOSE 3001` → 3001
function exposePort(app: string): number {
  const df = read(`apps/${app}/Dockerfile`);
  const m = df.match(/^EXPOSE\s+(\d{2,5})/m);
  if (!m) throw new Error(`apps/${app}/Dockerfile: no EXPOSE found`);
  return Number(m[1]);
}

// Extract a single service block (the lines under `  <name>:`, up to the next
// 2-space-indented service OR a 0-indent top-level key OR EOF) from a compose
// file so we can assert per-service properties. Line-based to avoid JS-regex
// end-of-input pitfalls (`\Z` is not supported in JS).
function serviceBlock(compose: string, service: string): string {
  const lines = compose.split('\n');
  const start = lines.findIndex((l) => l.startsWith(`  ${service}:`));
  if (start === -1) throw new Error(`compose: service '${service}' not found`);
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^ {2}\S/.test(l) || /^\S/.test(l)) break; // next service or top-level key
    out.push(l);
  }
  return out.join('\n');
}

const FE_PORT = frontendServePort('storefront');
const API_PORT = exposePort('api');

describe('deploy port contract', () => {
  it('all three frontends serve on ONE unified port (EXPOSE === serve -l)', () => {
    const ports = new Set<number>();
    for (const app of FRONTENDS) {
      const serve = frontendServePort(app);
      const exposed = exposePort(app);
      expect(exposed, `${app}: EXPOSE (${exposed}) must equal serve -l (${serve})`).toBe(serve);
      ports.add(serve);
    }
    expect(ports.size, `frontends must serve on a single unified port, got [${[...ports]}]`).toBe(1);
  });

  for (const cf of CADDYFILES) {
    describe(cf, () => {
      const cfg = read(cf);

      it(`every frontend upstream is :${FE_PORT} (matches the Dockerfile)`, () => {
        const ups = [...cfg.matchAll(/reverse_proxy\s+(storefront|merchant-dashboard|admin-dashboard):(\d+)/g)];
        expect(ups.length, `${cf}: expected frontend reverse_proxy entries`).toBeGreaterThan(0);
        for (const u of ups) {
          expect(Number(u[2]), `${cf}: ${u[1]} upstream must be :${FE_PORT}, found :${u[2]}`).toBe(FE_PORT);
        }
      });

      it('has no stale :80 frontend upstream (the #294 bug)', () => {
        expect(cfg).not.toMatch(/reverse_proxy\s+(storefront|merchant-dashboard|admin-dashboard):80\b/);
      });

      it(`every api upstream is :${API_PORT} (matches apps/api/Dockerfile)`, () => {
        const ups = [...cfg.matchAll(/reverse_proxy\s+api:(\d+)/g)];
        expect(ups.length, `${cf}: expected api reverse_proxy entries`).toBeGreaterThan(0);
        for (const u of ups) {
          expect(Number(u[1]), `${cf}: api upstream must be :${API_PORT}, found :${u[1]}`).toBe(API_PORT);
        }
      });
    });
  }

  it('deploy.yml builds the SPAs with VITE_API_URL=/api (so calls hit the Caddy /api strip)', () => {
    const dy = read('.github/workflows/deploy.yml');
    expect(dy, 'deploy.yml must pass VITE_API_URL=/api as a build arg').toMatch(/VITE_API_URL=\/api\b/);
  });

  for (const comp of COMPOSES) {
    describe(comp, () => {
      const cfg = read(comp);

      it('frontend + api services publish NO host ports (caddy is the only ingress)', () => {
        for (const svc of [...FRONTENDS, 'api']) {
          const block = serviceBlock(cfg, svc);
          expect(block.includes('ports:'), `${comp}: service '${svc}' must NOT publish host ports — route it through Caddy on the internal network`).toBe(false);
        }
      });

      it('caddy publishes the public 80 and 443 ports', () => {
        const block = serviceBlock(cfg, 'caddy');
        expect(block, `${comp}: caddy must publish 80:80`).toMatch(/-\s*"80:80"/);
        expect(block, `${comp}: caddy must publish 443:443`).toMatch(/-\s*"443:443"/);
      });
    });
  }
});
