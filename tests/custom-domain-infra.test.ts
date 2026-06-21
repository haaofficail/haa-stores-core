import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const index = readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');
const staging = readFileSync(new URL('../deploy/staging/Caddyfile', import.meta.url), 'utf-8');
const production = readFileSync(new URL('../deploy/production/Caddyfile', import.meta.url), 'utf-8');

describe('custom-domain infra (QA Custom Domain)', () => {
  it('API exposes the on-demand TLS ask endpoint, gated on active domains', () => {
    expect(index).toContain("app.get('/api/internal/tls-check'");
    expect(index).toContain('getStoreByActiveDomain');
    // must 404 unknown hosts so Caddy refuses cert issuance
    expect(index).toContain('return c.json({ ok: false }, 404)');
  });

  for (const [name, cfg] of [['staging', staging], ['production', production]] as const) {
    it(`${name} Caddyfile wires on_demand_tls -> the ask endpoint`, () => {
      expect(cfg).toContain('on_demand_tls');
      expect(cfg).toContain('ask http://api:3001/api/internal/tls-check');
    });
    it(`${name} Caddyfile has a custom-domain catch-all with on_demand TLS`, () => {
      expect(cfg).toMatch(/:443\s*\{[\s\S]*on_demand[\s\S]*reverse_proxy storefront:80/);
    });
  }
});
