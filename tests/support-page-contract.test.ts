// Platform Support page (haastores.com/support) — source-grep contract.
//
// Locks the standalone /support help-centre surface introduced
// 2026-06-26. Distinct from `/s/:slug/support` (Support.tsx) which is
// the per-merchant customer help surface owned by the merchant.
//
// Owner positioning: hero with "كيف نساعدك؟" + UI search bar, four
// category cards (البدء/الدفع/الشحن/الفنيات), 10+ FAQ items, and a
// "ما زلت بحاجة مساعدة؟" CTA pointing to hello@haastores.com.
//
// Regressions here (removing the route, dropping the FAQ, losing
// the support email CTA) silently break the marketing/help surface,
// so we lock with source-grep.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const SUPPORT_PATH = resolve(__dirname, '../apps/storefront/src/pages/PlatformSupport.tsx');
const SUPPORT_CSS_PATH = resolve(__dirname, '../apps/storefront/src/pages/support.css');
const APP_PATH = resolve(__dirname, '../apps/storefront/src/App.tsx');

describe('PlatformSupport — standalone /support page', () => {
  it('source file exists at the canonical path', () => {
    expect(existsSync(SUPPORT_PATH)).toBe(true);
    expect(existsSync(SUPPORT_CSS_PATH)).toBe(true);
  });

  const SRC = readFileSync(SUPPORT_PATH, 'utf-8');
  const APP = readFileSync(APP_PATH, 'utf-8');

  it('is mounted at /support (platform-level) and lazy-loaded', () => {
    expect(APP).toMatch(/lazy\(\(\)\s*=>\s*import\(['"]@\/pages\/PlatformSupport['"]\)\)/);
    // Top-level route (NOT under /s/:slug — that one is per-merchant Support).
    expect(APP).toMatch(/path=["']\/support["'][^>]*element=\{<PlatformSupport\s*\/>\}/);
    // Per-store support on /s/:slug/support must still exist (unchanged).
    expect(APP).toMatch(/path=["']support["'][^>]*element=\{<Support\s*\/>\}/);
  });

  it('renders the hero question "كيف نساعدك"', () => {
    expect(SRC).toMatch(/كيف نساعدك/);
  });

  it('includes a UI-only search bar (input + submit)', () => {
    expect(SRC).toMatch(/<input[\s\S]*?type=["']search["']/);
    expect(SRC).toMatch(/role=["']search["']/);
  });

  it('renders four category cards (البدء / الدفع / الشحن / الفنيات)', () => {
    expect(SRC).toMatch(/البدء/);
    expect(SRC).toMatch(/الدفع/);
    expect(SRC).toMatch(/الشحن/);
    expect(SRC).toMatch(/الفنيات/);
  });

  it('contains at least 10 FAQ entries', () => {
    // We grep for the FAQ tuple structure — each entry is a [q, a] pair.
    // Conservative: at least 10 string-literal pairs in the FAQ array.
    const faqBlock = SRC.match(/const FAQ:[^=]*=\s*\[([\s\S]*?)\];/);
    expect(faqBlock, 'FAQ literal not found').toBeTruthy();
    const inner = faqBlock![1];
    // Each entry is wrapped in `[`. Count opening brackets.
    const entries = inner.match(/\[\s*['"]/g) ?? [];
    expect(entries.length).toBeGreaterThanOrEqual(10);
  });

  it('exposes the support email CTA (hello@haastores.com via mailto)', () => {
    expect(SRC).toMatch(/mailto:hello@haastores\.com/);
    expect(SRC).toMatch(/hello@haastores\.com/);
    expect(SRC).toMatch(/ما زلت بحاجة مساعدة/);
  });

  it('uses the Haa-native page scope (.support-pg, NOT editorial vocabulary)', () => {
    expect(SRC).toMatch(/support-pg/);
    expect(SRC).not.toMatch(/settings-about-editorial\.css/);
    expect(SRC).not.toMatch(/Reem Kufi|El Messiri|paper-grain/i);
  });

  it('imports IBM-Plex-only CSS (no extra font families introduced)', () => {
    const CSS = readFileSync(SUPPORT_CSS_PATH, 'utf-8');
    expect(CSS).toMatch(/IBM Plex Sans Arabic/);
    expect(CSS).not.toMatch(/Reem Kufi|El Messiri|Tajawal|Cairo/);
  });

  it('declares Arabic + RTL semantics on the page root', () => {
    expect(SRC).toMatch(/lang=["']ar["']/);
    expect(SRC).toMatch(/dir=["']rtl["']/);
  });

  it('applies overflow-x-hidden on the root div (mobile-perf guard)', () => {
    expect(SRC).toMatch(/overflow-x-hidden/);
  });

  it('uses semantic <main> for the page body', () => {
    expect(SRC).toMatch(/<main[\s>]/);
    expect(SRC).toMatch(/<\/main>/);
  });

  it('forces white text on the primary pill (storefront-scope override)', () => {
    const CSS = readFileSync(SUPPORT_CSS_PATH, 'utf-8');
    expect(CSS).toMatch(/color:\s*#ffffff\s*!important/);
  });

  it('sets SEO title + description that mention Haa Stores / support', () => {
    const useSEOBlock = SRC.slice(SRC.indexOf('useSEO('), SRC.indexOf('useSEO(') + 400);
    expect(useSEOBlock).toMatch(/title:/);
    expect(useSEOBlock).toMatch(/description:/);
    expect(useSEOBlock).toMatch(/متاجر هاء|الدعم/);
  });
});
