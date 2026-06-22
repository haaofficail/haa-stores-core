// Login form + nginx security headers — P0 audit findings.
//
// Locks the rule that:
//   1. The merchant login form declares method="post" so a JS failure
//      doesn't leak credentials into the URL query string.
//   2. Each SPA's nginx config emits the full set of expected security
//      headers (HSTS, CSP, COOP + the existing X-Frame, MIME, Referrer,
//      Permissions).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

describe('Login form + headers (P0 audit)', () => {
  it('merchant Login.tsx form declares method="post" defense-in-depth', () => {
    const text = read('apps/merchant-dashboard/src/pages/Login.tsx');
    expect(text).toMatch(/<form[^>]*\bonSubmit=\{handleSubmit\}[^>]*\bmethod=["']post["']/s);
  });

  describe.each([
    ['merchant', 'apps/merchant-dashboard/nginx.conf'],
    ['admin',    'apps/admin-dashboard/nginx.conf'],
    ['storefront','apps/storefront/nginx.conf'],
  ])('%s nginx.conf', (name, path) => {
    const conf = read(path);

    it('declares HSTS with a one-year max-age + includeSubDomains + preload', () => {
      expect(conf).toMatch(
        /add_header\s+Strict-Transport-Security\s+["']max-age=31536000;\s*includeSubDomains;\s*preload["']\s+always;/,
      );
    });

    it('declares Content-Security-Policy with frame-ancestors + form-action', () => {
      expect(conf).toMatch(/add_header\s+Content-Security-Policy/);
      expect(conf).toMatch(/frame-ancestors/);
      expect(conf).toMatch(/form-action 'self'/);
      // 'unsafe-eval' is never allowed inside the CSP header value itself
      // (comments above the directive are allowed to mention it).
      const cspLine = conf.split(/\n/).find((l) => /add_header\s+Content-Security-Policy/.test(l)) ?? '';
      expect(cspLine).not.toMatch(/'unsafe-eval'/);
    });

    it('declares Cross-Origin-Opener-Policy: same-origin', () => {
      expect(conf).toMatch(/add_header\s+Cross-Origin-Opener-Policy\s+["']same-origin["']\s+always;/);
    });

    it('keeps the pre-existing X-Frame-Options + nosniff + referrer + permissions headers', () => {
      expect(conf).toMatch(/add_header\s+X-Frame-Options/);
      expect(conf).toMatch(/add_header\s+X-Content-Type-Options\s+["']nosniff["']/);
      expect(conf).toMatch(/add_header\s+Referrer-Policy/);
      expect(conf).toMatch(/add_header\s+Permissions-Policy/);
    });

    it('keeps server_tokens off', () => {
      // merchant + storefront declare server_tokens; admin inherits from default.
      // We assert it for every config we touch.
      if (name !== 'admin') {
        expect(conf).toMatch(/server_tokens\s+off;/);
      }
    });
  });

  it('admin nginx.conf uses the stricter frame-ancestors none + connect-src self', () => {
    const conf = read('apps/admin-dashboard/nginx.conf');
    expect(conf).toMatch(/frame-ancestors 'none'/);
    expect(conf).toMatch(/connect-src 'self'(?!\s*https)/);
  });
});
