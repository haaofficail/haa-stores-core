// Storefront favicon / app-icon contract guard.
//
// The browser-tab logo on https://staging.haastores.com kept regressing because
// `apps/storefront/index.html` shipped only the Vite-default `/vite.svg`
// placeholder and no `/favicon.ico` was deployed — so Chrome / Safari fell back
// to a blank tab icon.
//
// This test locks the canonical <head> declarations and the on-disk presence
// of the matching binary assets, so a future edit can't silently break the
// favicon again. If you intentionally restructure the icon set, update BOTH
// this test and the manifest atomically.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const STOREFRONT = resolve(ROOT, 'apps/storefront');
const INDEX_HTML = resolve(STOREFRONT, 'index.html');
const PUBLIC = resolve(STOREFRONT, 'public');

function readIndex(): string {
  return readFileSync(INDEX_HTML, 'utf-8');
}

describe('storefront favicon contract', () => {
  describe('index.html declarations', () => {
    const html = readIndex();

    it('declares a PNG favicon (so /vite.svg placeholder cannot regress)', () => {
      expect(html).toMatch(
        /<link\s+rel=["']icon["']\s+type=["']image\/png["'][^>]*href=["']\/haa-logo-(?:64|192|512)\.png["']/,
      );
      // Must NOT regress to the Vite default placeholder.
      expect(html).not.toMatch(/href=["']\/vite\.svg["']/);
    });

    it('declares an apple-touch-icon for Safari / iOS', () => {
      expect(html).toMatch(
        /<link\s+rel=["']apple-touch-icon["'][^>]*href=["']\/apple-touch-icon\.png["']/,
      );
    });

    it('declares the PWA manifest', () => {
      expect(html).toMatch(/<link\s+rel=["']manifest["']\s+href=["']\/site\.webmanifest["']/);
    });

    it('declares the canonical Haa theme-color #5c9cd5', () => {
      expect(html).toMatch(/<meta\s+name=["']theme-color["']\s+content=["']#5c9cd5["']/);
    });

    it('uses the Arabic page title (متاجر هاء), not a placeholder', () => {
      expect(html).toMatch(/<title>\s*متاجر هاء\s*<\/title>/);
    });
  });

  describe('public/ assets exist on disk', () => {
    const required = [
      'haa-logo-64.png',
      'haa-logo-192.png',
      'haa-logo-512.png',
      'apple-touch-icon.png',
      'site.webmanifest',
    ];

    for (const name of required) {
      it(`ships ${name} so the deployed bundle does not 404`, () => {
        const p = resolve(PUBLIC, name);
        expect(existsSync(p), `${name} missing from apps/storefront/public/`).toBe(true);
        expect(statSync(p).size, `${name} is empty`).toBeGreaterThan(0);
      });
    }
  });

  describe('site.webmanifest', () => {
    it('is valid JSON and matches the <head> declarations', () => {
      const raw = readFileSync(resolve(PUBLIC, 'site.webmanifest'), 'utf-8');
      const manifest = JSON.parse(raw) as {
        name: string;
        short_name: string;
        theme_color: string;
        background_color: string;
        icons: Array<{ src: string; sizes: string; type: string }>;
      };

      expect(manifest.name).toBeTruthy();
      expect(manifest.short_name).toBeTruthy();
      expect(manifest.theme_color).toBe('#5c9cd5');
      expect(manifest.background_color).toBe('#ffffff');

      const srcs = manifest.icons.map((i) => i.src);
      expect(srcs).toContain('/haa-logo-192.png');
      expect(srcs).toContain('/haa-logo-512.png');

      // Every manifest icon must exist on disk.
      for (const icon of manifest.icons) {
        const p = resolve(PUBLIC, icon.src.replace(/^\//, ''));
        expect(existsSync(p), `manifest icon ${icon.src} missing`).toBe(true);
      }
    });
  });
});
