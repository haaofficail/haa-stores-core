// Deep staging-login fixes — discovered during 2026-06-22 staging audit
// of https://merchant.staging.haastores.com/login.
//
// Locks the four follow-up fixes from the audit:
//   1. Caddy emits security headers (nginx inheritance was silently dropping
//      them inside location blocks; moved to Caddy edge).
//   2. The Haa logo container uses a white background, not a brand-blue
//      gradient — the haa-logo PNG is itself blue, so a blue gradient made
//      the mark invisible.
//   3. The "سجّل كتاجر جديد" link uses a runtime-derived storefront origin
//      (strip "merchant." subdomain) instead of the broken haa.store fallback
//      which doesn't resolve in DNS.
//   4. usePlatformBrand fetches /brand (relative to BASE_URL), not /api/brand
//      — appending /api on top of VITE_API_URL="/api" produced /api/api/brand.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const LOGIN = read('apps/merchant-dashboard/src/pages/Login.tsx');
const PLATFORM_BRAND = read('apps/storefront/src/hooks/usePlatformBrand.ts');
const CADDY_STAGING = read('deploy/staging/Caddyfile');
const CADDY_PROD = read('deploy/production/Caddyfile');

describe('Deep staging-login fixes (audit 2026-06-22)', () => {
  describe('Fix 1: Caddy emits security headers', () => {
    describe.each([
      ['staging', CADDY_STAGING],
      ['production', CADDY_PROD],
    ])('%s Caddyfile', (_name, conf) => {
      it('defines a (security_headers) snippet', () => {
        expect(conf).toMatch(/\(security_headers\)\s*\{/);
      });

      it('declares HSTS one-year + includeSubDomains + preload', () => {
        expect(conf).toMatch(
          /Strict-Transport-Security\s+"max-age=31536000;\s*includeSubDomains;\s*preload"/,
        );
      });

      it('declares X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + COOP', () => {
        expect(conf).toMatch(/X-Frame-Options\s+"(SAMEORIGIN|DENY)"/);
        expect(conf).toMatch(/X-Content-Type-Options\s+"nosniff"/);
        expect(conf).toMatch(/Referrer-Policy\s+"(strict-origin-when-cross-origin|no-referrer)"/);
        expect(conf).toMatch(/Permissions-Policy\s+"camera=\(\)/);
        expect(conf).toMatch(/Cross-Origin-Opener-Policy\s+"same-origin"/);
      });

      it('hides the server token (strips Server header)', () => {
        expect(conf).toMatch(/-Server/);
      });

      it('admin sub-domain pulls the stricter (admin_security_headers) snippet', () => {
        expect(conf).toMatch(/admin[^{]*\.haastores\.com\s*\{[^}]*import admin_security_headers/s);
      });

      it('storefront + merchant import the standard (security_headers)', () => {
        // staging.haastores.com + merchant.* (and prod equivalents).
        expect(conf).toMatch(/import security_headers/);
      });
    });
  });

  describe('Fix 2: logo container is white-on-ring, not blue gradient', () => {
    it('removes the from-primary-400 to-primary-600 gradient on the logo wrapper', () => {
      const wrapperRegion = LOGIN.slice(
        LOGIN.indexOf('Logo + brand'),
        LOGIN.indexOf('h-12 w-12') + 100,
      );
      expect(wrapperRegion).toMatch(/bg-white/);
      expect(wrapperRegion).not.toMatch(/bg-gradient-to-br from-primary-400 to-primary-600/);
    });

    it('uses h-12/w-12 + sizes=48px (slightly bigger than before to compensate)', () => {
      expect(LOGIN).toMatch(/className="h-12 w-12"/);
      expect(LOGIN).toMatch(/sizes="48px"/);
      expect(LOGIN).toMatch(/width=\{48\}/);
    });
  });

  describe('Fix 3: signup link uses runtime-derived storefront origin', () => {
    it('defines a resolveSignupHref helper', () => {
      expect(LOGIN).toMatch(/function resolveSignupHref/);
    });

    it('the helper strips the "merchant." subdomain', () => {
      expect(LOGIN).toMatch(/replace\(\/\^merchant\\\.\//);
    });

    it('uses the helper output via an <a href={signupHref}>', () => {
      expect(LOGIN).toMatch(/const signupHref = resolveSignupHref\(\)/);
      expect(LOGIN).toMatch(/<a\s+href=\{signupHref\}/);
      expect(LOGIN).not.toMatch(/haa\.store\/signup`/); // dead fallback removed from JSX
    });
  });

  describe('Fix 4: usePlatformBrand no longer double-prefixes /api', () => {
    it('fetches `${BASE_URL}/brand` (not `${BASE_URL}/api/brand`)', () => {
      expect(PLATFORM_BRAND).toMatch(/fetch\(`\$\{BASE_URL\}\/brand`\)/);
      expect(PLATFORM_BRAND).not.toMatch(/fetch\(`\$\{BASE_URL\}\/api\/brand`\)/);
    });

    it('documents the double-prefix gotcha in a comment', () => {
      expect(PLATFORM_BRAND).toMatch(/\/api\/api\/<endpoint>/);
    });
  });
});
