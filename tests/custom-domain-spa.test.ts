import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { isPlatformHost, isCustomDomainHost } from '../apps/storefront/src/lib/custom-host.ts';

const gate = readFileSync(new URL('../apps/storefront/src/components/CustomDomainGate.tsx', import.meta.url), 'utf-8');
const app = readFileSync(new URL('../apps/storefront/src/App.tsx', import.meta.url), 'utf-8');

describe('storefront custom-host detection (QA Custom Domain)', () => {
  it('treats platform host + localhost + IP as platform', () => {
    expect(isPlatformHost('haastores.com')).toBe(true);
    expect(isPlatformHost('acme.haastores.com')).toBe(true);
    expect(isPlatformHost('localhost')).toBe(true);
    expect(isPlatformHost('127.0.0.1')).toBe(true);
    expect(isPlatformHost('')).toBe(true); // fail-safe
  });
  it('treats a merchant domain as custom', () => {
    expect(isCustomDomainHost('shop.example.com')).toBe(true);
    expect(isCustomDomainHost('haastores.com')).toBe(false);
  });
});

describe('CustomDomainGate wiring (QA Custom Domain)', () => {
  it('resolves host -> slug and rewrites to /s/:slug preserving sub-path', () => {
    expect(gate).toContain('/api/resolve-host');
    expect(gate).toContain('isCustomDomainHost()');
    expect(gate).toContain('/s/${res.slug}');
    expect(gate).toContain("location.pathname.startsWith('/s/')");
  });
  it('is mounted around the app routes', () => {
    expect(app).toContain('<CustomDomainGate>');
    expect(app).toContain('</CustomDomainGate>');
  });
});
