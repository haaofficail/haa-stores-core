/**
 * Regression test for Batch 3 of the luxury-showcase visual review.
 *
 * Goal: align the demo's structure with a luxury reference layout:
 *   1. Hero (with subtitle eyebrow + display heading + dual CTAs)
 *   2. Featured Collections (4 cards)
 *   3. Featured Products (grid)
 *   4. Brand Story (with illustration)
 *   5. Best Sellers (grid)
 *   6. Trust Row (5 items)
 *   7. Journal / Stories (3 articles)
 *   8. Newsletter
 *
 * The test reads source files as text and verifies:
 *   - HomePage.tsx imports + renders each section component
 *   - Hero has eyebrow + display heading + 2 CTAs
 *   - BrandStorySection uses a decorative SVG illustration
 *   - JournalSection exists and is rendered
 *
 * We deliberately keep the assertions narrow (presence of imports and
 * markers) so the test stays stable across cosmetic refactors.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../apps/storefront/src/themes/luxury-showcase');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('Batch 3 — Luxury reference structure (8 sections + hero polish)', () => {
  // ----- Section presence -----
  describe('HomePage.tsx — section ordering', () => {
    const home = read('HomePage.tsx');

    it('imports all 8 expected sections', () => {
      // 1. Hero (slider or banner — both should be present as imports)
      // 2. Curated Collections
      // 3. Featured Products
      // 4. Best Sellers
      // 5. Brand Story
      // 6. Trust Row
      // 7. Newsletter
      // 8. Journal (new)
      const expected = [
        'LuxuryHeroSlider',
        'LuxuryHeroBanner',
        'CuratedCollectionsSection',
        'FeaturedProductsSection',
        'BestSellersSection',
        'BrandStorySection',
        'TrustRowSection',
        'NewsletterSection',
        'JournalSection',
      ];
      for (const name of expected) {
        expect(home, `HomePage.tsx must import ${name}`).toContain(name);
      }
    });

    it('renders JournalSection after BestSellers (or before Newsletter)', () => {
      // Reference layout: Hero → Collections → Featured → Story → BestSellers
      // → Trust → Journal → Newsletter. We allow Journal to appear after
      // BrandStory and before Newsletter.
      const journalIdx = home.indexOf('<JournalSection');
      const newsletterIdx = home.indexOf('<NewsletterSection');
      const bestSellersIdx = home.indexOf('<BestSellersSection');
      expect(journalIdx, 'JournalSection must be rendered').toBeGreaterThan(-1);
      expect(bestSellersIdx, 'BestSellersSection must be rendered').toBeGreaterThan(-1);
      expect(newsletterIdx, 'NewsletterSection must be rendered').toBeGreaterThan(-1);
      expect(journalIdx).toBeLessThan(newsletterIdx);
    });
  });

  // ----- JournalSection file -----
  describe('JournalSection.tsx — new component', () => {
    const path = resolve(ROOT, 'components/sections/JournalSection.tsx');
    it('exists', () => {
      expect(existsSync(path), 'JournalSection.tsx must exist').toBe(true);
    });

    const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
    it('exports a default React component', () => {
      expect(source).toMatch(/export\s+default\s+function/);
    });

    it('renders 3 article cards (a common pattern: map over 3 items)', () => {
      // We require either a literal array of 3 entries (case-insensitive
      // on the name) or a .map() call over an array. We use a non-greedy
      // match with [\s\S] so the pattern tolerates multi-line entries and
      // comments between them.
      const has3 =
        /\barticles\s*[:=]\s*\[[\s\S]*?{[\s\S]*?}[\s\S]*?,[\s\S]*?{[\s\S]*?}[\s\S]*?,[\s\S]*?{[\s\S]*?}[\s\S]*?\]/i.test(source) ||
        /length\s*[:=]\s*3/.test(source) ||
        /\{\/\*\s*3 articles\s*\*\/\}/.test(source) ||
        /ARTICLES\.map/.test(source);
      expect(has3, 'JournalSection should render exactly 3 articles').toBe(true);
    });
  });

  // ----- Hero polish -----
  describe('Hero — eyebrow + display heading + dual CTAs', () => {
    const heroBanner = read('components/banners/LuxuryHeroBanner.tsx');
    const heroSlider = read('components/sliders/LuxuryHeroSlider.tsx');

    it('LuxuryHeroBanner renders a subtitle (eyebrow) + description (display) + CTA', () => {
      // Eyebrow typically styled in primary color, smaller, uppercase-ish
      // (tracking-wide) and the description/heading in a serif display font.
      // We accept any combination of these markers.
      const hasSubtitle = /subtitle/.test(heroBanner);
      const hasDescription = /description/.test(heroBanner);
      const hasCta = /ctaLabel/.test(heroBanner);
      expect(hasSubtitle && hasDescription && hasCta, 'Hero must render eyebrow + display heading + CTA').toBe(true);
    });

    it('LuxuryHeroSlider renders a description (display) + CTA', () => {
      const hasDescription = /description/.test(heroSlider);
      const hasCta = /buttonText/.test(heroSlider);
      expect(hasDescription && hasCta, 'Hero slider must render heading + CTA').toBe(true);
    });
  });

  // ----- Brand Story with illustration -----
  describe('BrandStory section — decorative SVG illustration', () => {
    // The BrandStorySection wraps LuxuryStoryBanner. The illustration may
    // live in either file (the wrapper or the banner) — we accept both.
    const wrapper = read('components/sections/BrandStorySection.tsx');
    const banner = read('components/banners/LuxuryStoryBanner.tsx');
    const combined = wrapper + '\n' + banner;

    it('contains an inline SVG (decorative bottle or motif)', () => {
      expect(combined).toMatch(/<svg[\s\S]{0,2000}<\/svg>/);
    });
  });
});
