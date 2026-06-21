import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  isValidCustomDomain,
  isPlatformHost,
  extractSubdomainSlug,
  buildVerificationRecord,
  CUSTOM_DOMAIN_CNAME_TARGET,
} from '../packages/shared/src/custom-domain.ts';

const schema = readFileSync(new URL('../packages/db/src/schema/stores.ts', import.meta.url), 'utf-8');
const migration = readFileSync(new URL('../packages/db/src/migrations/0072_custom_domain.sql', import.meta.url), 'utf-8');

describe('custom-domain normalizeDomain (QA Custom Domain)', () => {
  it('strips scheme, path, port, trailing dot, www', () => {
    expect(normalizeDomain('https://www.Shop.Example.com:443/path?q=1')).toBe('shop.example.com');
    expect(normalizeDomain('shop.example.com.')).toBe('shop.example.com');
    expect(normalizeDomain('user@shop.example.com')).toBe('shop.example.com');
  });
  it('returns null for empty', () => {
    expect(normalizeDomain('')).toBeNull();
    expect(normalizeDomain(null)).toBeNull();
  });
});

describe('custom-domain isValidCustomDomain (QA Custom Domain)', () => {
  it('accepts real FQDNs', () => {
    expect(isValidCustomDomain('shop.example.com')).toBe(true);
    expect(isValidCustomDomain('store.my-brand.sa')).toBe(true);
  });
  it('rejects IPs, localhost, bare labels', () => {
    expect(isValidCustomDomain('192.168.0.1')).toBe(false);
    expect(isValidCustomDomain('localhost')).toBe(false);
    expect(isValidCustomDomain('justalabel')).toBe(false);
  });
  it('rejects the platform domain and its subdomains (anti-takeover)', () => {
    expect(isValidCustomDomain('haastores.com')).toBe(false);
    expect(isValidCustomDomain('cool.haastores.com')).toBe(false);
  });
  it('rejects numeric TLD and bad labels', () => {
    expect(isValidCustomDomain('shop.123')).toBe(false);
    expect(isValidCustomDomain('-bad.example.com')).toBe(false);
  });
});

describe('custom-domain platform host + subdomain slug', () => {
  it('detects platform hosts', () => {
    expect(isPlatformHost('haastores.com')).toBe(true);
    expect(isPlatformHost('acme.haastores.com')).toBe(true);
    expect(isPlatformHost('shop.example.com')).toBe(false);
  });
  it('extracts slug from platform subdomain, skipping reserved', () => {
    expect(extractSubdomainSlug('acme.haastores.com')).toBe('acme');
    expect(extractSubdomainSlug('www.haastores.com')).toBeNull();
    expect(extractSubdomainSlug('api.haastores.com')).toBeNull();
    expect(extractSubdomainSlug('a.b.haastores.com')).toBeNull();
    expect(extractSubdomainSlug('shop.example.com')).toBeNull();
  });
});

describe('custom-domain verification record', () => {
  it('builds a TXT record under a stable prefix', () => {
    expect(buildVerificationRecord('shop.example.com', 'abc123')).toEqual({
      name: '_haa-verify.shop.example.com',
      value: 'haa-domain-verify=abc123',
    });
  });
  it('CNAME target points at the platform ingress', () => {
    expect(CUSTOM_DOMAIN_CNAME_TARGET).toBe('stores.haastores.com');
  });
});

describe('custom-domain schema + migration', () => {
  it('stores has custom domain columns + unique index', () => {
    expect(schema).toContain('customDomain');
    expect(schema).toContain('customDomainStatus');
    expect(schema).toContain('stores_custom_domain_uniq');
    expect(migration).toContain('custom_domain');
    expect(migration).toContain('stores_custom_domain_uniq');
  });
});
