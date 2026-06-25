// Platform Pricing page (haastores.com/pricing) — source-grep contract.
//
// Locks the standalone /pricing surface introduced 2026-06-26.
// Owner positioning: 3 tiers (Free / Pro / Business), brand-blue
// hero aurora, comparison table, FAQ, primary CTA "ابدأ الآن مجاناً",
// and the same Haa-native vocabulary as PlatformAbout (no editorial
// fonts, no display serifs, single brand-blue accent).
//
// Regressions here (removing the route, dropping the comparison
// table, losing the primary CTA, regressing the hero copy) silently
// break the marketing funnel, so we lock the surface with source-grep.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PRICING_PATH = resolve(__dirname, '../apps/storefront/src/pages/Pricing.tsx');
const PRICING_CSS_PATH = resolve(__dirname, '../apps/storefront/src/pages/pricing.css');
const APP_PATH = resolve(__dirname, '../apps/storefront/src/App.tsx');

describe('Pricing — standalone /pricing page', () => {
  it('source file exists at the canonical path', () => {
    expect(existsSync(PRICING_PATH)).toBe(true);
    expect(existsSync(PRICING_CSS_PATH)).toBe(true);
  });

  const SRC = readFileSync(PRICING_PATH, 'utf-8');
  const APP = readFileSync(APP_PATH, 'utf-8');

  it('is mounted at /pricing and lazy-loaded', () => {
    // Lazy import — keep the route off the initial bundle.
    expect(APP).toMatch(/lazy\(\(\)\s*=>\s*import\(['"]@\/pages\/Pricing['"]\)\)/);
    // Top-level route, NOT under /s/:slug.
    expect(APP).toMatch(/path=["']\/pricing["'][^>]*element=\{<Pricing\s*\/>\}/);
  });

  it('renders the three required plan tiers (Free, Pro, Business)', () => {
    expect(SRC).toMatch(/Free/);
    expect(SRC).toMatch(/Pro/);
    expect(SRC).toMatch(/Business/);
    // Arabic labels too — owner requirement to stay bilingual on plan names.
    expect(SRC).toMatch(/مجاني/);
    expect(SRC).toMatch(/احتراف/);
    expect(SRC).toMatch(/أعمال/);
  });

  it('includes a comparison table (feature x plan)', () => {
    expect(SRC).toMatch(/<table[\s>]/);
    expect(SRC).toMatch(/<thead/);
    expect(SRC).toMatch(/<tbody/);
    // Owner requirement: comparison title in Arabic.
    expect(SRC).toMatch(/مقارنة/);
  });

  it('includes a FAQ section covering billing/cancellation/support', () => {
    expect(SRC).toMatch(/الأسئلة الشائعة/);
    // Cancellation, billing-related copy must remain.
    expect(SRC).toMatch(/إلغاء/);
    expect(SRC).toMatch(/فوتر|فاتورة|فواتير|البريد|الدعم/);
  });

  it('exposes the primary CTA "ابدأ الآن مجاناً" (or accepted variant)', () => {
    // Owner-mandated CTA copy. Accept both spellings (with/without ـً).
    expect(SRC).toMatch(/ابدأ الآن مجان[اًا]/);
  });

  it('uses the Haa-native page scope (.pricing-pg, NOT editorial vocabulary)', () => {
    expect(SRC).toMatch(/pricing-pg/);
    // Must NOT pull editorial about-ed CSS or any display/serif font import.
    expect(SRC).not.toMatch(/settings-about-editorial\.css/);
    expect(SRC).not.toMatch(/Reem Kufi|El Messiri|paper-grain/i);
  });

  it('imports IBM-Plex-only CSS (no extra font families introduced)', () => {
    const CSS = readFileSync(PRICING_CSS_PATH, 'utf-8');
    expect(CSS).toMatch(/IBM Plex Sans Arabic/);
    expect(CSS).not.toMatch(/Reem Kufi|El Messiri|Tajawal|Cairo/);
  });

  it('declares Arabic + RTL semantics on the page root', () => {
    expect(SRC).toMatch(/lang=["']ar["']/);
    expect(SRC).toMatch(/dir=["']rtl["']/);
  });

  it('applies overflow-x-hidden on the root div (mobile-perf guard)', () => {
    // mobile-performance-sprint4 inspects new page-roots for this guard.
    expect(SRC).toMatch(/overflow-x-hidden/);
  });

  it('uses semantic <main> for the page body', () => {
    expect(SRC).toMatch(/<main[\s>]/);
    expect(SRC).toMatch(/<\/main>/);
  });

  it('forces white text on the primary pill (storefront-scope override)', () => {
    // `#storefront-scope *` forces color via !important; the brand-blue
    // pill must escalate so the white label wins.
    const CSS = readFileSync(PRICING_CSS_PATH, 'utf-8');
    expect(CSS).toMatch(/color:\s*#ffffff\s*!important/);
  });

  it('sets SEO title + description that mention Haa Stores / pricing', () => {
    const useSEOBlock = SRC.slice(SRC.indexOf('useSEO('), SRC.indexOf('useSEO(') + 400);
    expect(useSEOBlock).toMatch(/title:/);
    expect(useSEOBlock).toMatch(/description:/);
    expect(useSEOBlock).toMatch(/متاجر هاء/);
  });
});
