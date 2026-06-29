// Merchant login UX — P1 audit follow-ups.
//
// Locks the three login basics flagged by the staging audit:
//   1. Forgot-password link + dedicated /forgot-password route.
//   2. Remember-me checkbox that persists ONLY the email.
//   3. Show/hide password toggle with proper aria-pressed.
// Plus the index.html SEO/PWA basics: favicon, manifest, description,
// theme-color, Open Graph and Twitter Card.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const LOGIN = read('apps/merchant-dashboard/src/pages/Login.tsx');
const APP = read('apps/merchant-dashboard/src/App.tsx');
const INDEX = read('apps/merchant-dashboard/index.html');
const MANIFEST = read('apps/merchant-dashboard/public/manifest.webmanifest');
const FORGOT = read('apps/merchant-dashboard/src/pages/ForgotPassword.tsx');

describe('Merchant login UX (P1 audit)', () => {
  describe('Login.tsx', () => {
    it('renders a "نسيت كلمة المرور؟" link pointing to /forgot-password', () => {
      expect(LOGIN).toMatch(/to="\/forgot-password"/);
      expect(LOGIN).toMatch(/نسيت كلمة المرور/);
    });

    it('has a "remember me" checkbox that only persists the email', () => {
      expect(LOGIN).toMatch(/rememberMe/);
      expect(LOGIN).toMatch(/haa-remember-email/);
      expect(LOGIN).toMatch(/تذكّرني/);
      expect(LOGIN).toMatch(/await login\(email,\s*password,\s*rememberMe\)/);
      // CRITICAL: password must NEVER be persisted alongside the email.
      expect(LOGIN).not.toMatch(/setItem\(['"]haa-remember-password/);
    });

    it('has a show/hide password toggle with aria-pressed', () => {
      expect(LOGIN).toMatch(/showPassword/);
      expect(LOGIN).toMatch(/aria-pressed=\{showPassword\}/);
      expect(LOGIN).toMatch(/type=\{showPassword \? 'text' : 'password'\}/);
      expect(LOGIN).toMatch(/Eye|EyeOff/);
    });
  });

  describe('App.tsx', () => {
    it('registers a /forgot-password route mapped to ForgotPassword', () => {
      expect(APP).toMatch(/lazy\(\(\) => import\('@\/pages\/ForgotPassword'\)\)/);
      expect(APP).toMatch(/path="\/forgot-password"/);
    });
  });

  describe('ForgotPassword.tsx', () => {
    it('renders a mailto support link with a pre-filled subject', () => {
      expect(FORGOT).toMatch(/mailto:/);
      expect(FORGOT).toMatch(/SUPPORT_EMAIL/);
      expect(FORGOT).toMatch(/support@haastores\.com/);
    });

    it('links back to /login', () => {
      expect(FORGOT).toMatch(/to="\/login"/);
    });
  });

  describe('index.html', () => {
    it('uses /haa-logo.png as favicon + apple-touch-icon (not vite.svg)', () => {
      expect(INDEX).toMatch(/rel="icon"[^>]*href="\/haa-logo\.png"/);
      expect(INDEX).toMatch(/rel="apple-touch-icon"[^>]*href="\/haa-logo\.png"/);
      expect(INDEX).not.toMatch(/href="\/vite\.svg"/);
    });

    it('links to the web manifest', () => {
      expect(INDEX).toMatch(/rel="manifest"[^>]*href="\/manifest\.webmanifest"/);
    });

    it('declares meta description + theme-color + robots noindex', () => {
      expect(INDEX).toMatch(/<meta name="description"/);
      expect(INDEX).toMatch(/<meta name="theme-color" content="#5c9cd5"/);
      expect(INDEX).toMatch(/<meta name="robots" content="noindex/);
    });

    it('declares Open Graph + Twitter Card', () => {
      expect(INDEX).toMatch(/property="og:title"/);
      expect(INDEX).toMatch(/property="og:description"/);
      expect(INDEX).toMatch(/property="og:image"/);
      expect(INDEX).toMatch(/property="og:locale" content="ar_SA"/);
      expect(INDEX).toMatch(/name="twitter:card"/);
    });
  });

  describe('manifest.webmanifest', () => {
    it('is valid JSON with lang=ar dir=rtl theme_color=#5c9cd5', () => {
      const json = JSON.parse(MANIFEST);
      expect(json.lang).toBe('ar');
      expect(json.dir).toBe('rtl');
      expect(json.theme_color).toBe('#5c9cd5');
      expect(json.display).toBe('standalone');
      expect(json.icons).toBeInstanceOf(Array);
      expect(json.icons.length).toBeGreaterThan(0);
    });
  });
});
