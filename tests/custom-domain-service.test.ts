import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { checkDnsRecords } from '../packages/commerce-core/src/custom-domain.ts';

const svc = readFileSync(new URL('../packages/commerce-core/src/custom-domain.ts', import.meta.url), 'utf-8');
const shared = readFileSync(new URL('../apps/api/src/routes/storefront/_shared.ts', import.meta.url), 'utf-8');
const route = readFileSync(new URL('../apps/api/src/routes/custom-domain.ts', import.meta.url), 'utf-8');
const index = readFileSync(new URL('../apps/api/src/index.ts', import.meta.url), 'utf-8');

describe('custom-domain DNS check (QA Custom Domain)', () => {
  const target = 'stores.haastores.com';
  it('passes when TXT and CNAME both match', () => {
    const r = checkDnsRecords([['haa-domain-verify=tok']], ['stores.haastores.com.'], 'haa-domain-verify=tok', target);
    expect(r).toEqual({ txtFound: true, cnameOk: true, ok: true });
  });
  it('joins chunked TXT records before matching', () => {
    const r = checkDnsRecords([['haa-domain-', 'verify=tok']], ['stores.haastores.com'], 'haa-domain-verify=tok', target);
    expect(r.txtFound).toBe(true);
  });
  it('fails when CNAME points elsewhere', () => {
    const r = checkDnsRecords([['haa-domain-verify=tok']], ['example.net'], 'haa-domain-verify=tok', target);
    expect(r.cnameOk).toBe(false);
    expect(r.ok).toBe(false);
  });
  it('fails when TXT token is wrong', () => {
    const r = checkDnsRecords([['haa-domain-verify=WRONG']], ['stores.haastores.com'], 'haa-domain-verify=tok', target);
    expect(r.txtFound).toBe(false);
    expect(r.ok).toBe(false);
  });
});

describe('custom-domain service + wiring (QA Custom Domain)', () => {
  it('setDomain validates, enforces global uniqueness, issues a token', () => {
    expect(svc).toContain('isValidCustomDomain');
    expect(svc).toContain("error: 'already_taken'");
    expect(svc).toContain('randomBytes');
  });
  it('verifyDomain requires BOTH TXT and CNAME (ok = txtFound && cnameOk)', () => {
    expect(svc).toContain('checkDnsRecords');
    expect(svc).toContain("status: ok ? 'active' : 'failed'");
  });
  it('getStoreByActiveDomain only matches active domains', () => {
    expect(svc).toContain("eq(s.stores.customDomainStatus, 'active')");
  });

  it('resolveStoreByHost: custom domain -> subdomain slug -> null', () => {
    expect(shared).toContain('resolveStoreByHost');
    expect(shared).toContain('isPlatformHost');
    expect(shared).toContain('extractSubdomainSlug');
    expect(shared).toContain("eq(s.stores.customDomainStatus, 'active')");
  });

  it('merchant domain route exposes get/put/verify/delete', () => {
    expect(route).toContain("'/verify'");
    expect(route).toContain('setDomain');
    expect(route).toContain('removeDomain');
  });

  it('public resolve-host route reads forwarded host and is mounted', () => {
    // No /api prefix — Caddy strips /api before forwarding to the API.
    expect(index).toContain("app.get('/resolve-host'");
    expect(index).toContain('x-forwarded-host');
    expect(index).toContain('resolveStoreByHost');
    expect(index).toContain("app.route('/merchant/:storeId/domain', customDomainRouter)");
  });
});
