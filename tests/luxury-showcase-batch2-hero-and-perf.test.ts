/**
 * Regression test for Batch 2 of the luxury-showcase visual review.
 *
 * Goal: make hero placeholders + banner images more delightful and
 *       performance-friendly.
 *
 * Changes:
 *   B1. `LuxuryImageFallback` exposes a new `hero` icon variant that
 *       renders a gradient + decorative perfume silhouette + brand mark
 *       (no broken-image look).
 *   B2. Banner images declare `loading` and `decoding` attributes.
 *   B3. Hero and single/banner-slider images declare `fetchPriority="high"`
 *       since they are the LCP candidate.
 *
 * The test reads source files as text (no JSX parsing) and asserts the
 * attribute contracts directly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../apps/storefront/src/themes/luxury-showcase');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('Batch 2 — Hero variant + banner image perf + LCP priority', () => {
  // ----- B1: hero variant exists -----
  describe('LuxuryImageFallback.tsx — `hero` variant', () => {
    const source = read('components/LuxuryImageFallback.tsx');

    it('exports a `hero` value in the FallbackIcon type', () => {
      // The icon union must include 'hero'.
      expect(source).toMatch(/FallbackIcon\s*=\s*['"]perfume['"]\s*\|\s*['"]star['"]\s*\|\s*['"]gift['"]\s*\|\s*['"]hero['"]/);
    });

    it('the `hero` branch renders a gradient + svg', () => {
      // The hero branch should have its own JSX that uses linear-gradient
      // and a larger svg (size > 48).
      const heroMatch = source.match(/icon\s*===\s*['"]hero['"][\s\S]{0,2500}<\/svg>/);
      expect(heroMatch, 'hero branch must include a closing </svg>').not.toBeNull();
      expect(heroMatch![0]).toMatch(/linear-gradient|gradient/i);
    });
  });

  describe('HeroSlider.tsx + LuxuryHeroSlider.tsx + LuxuryHeroBanner.tsx — use `hero` icon', () => {
    const hero = read('components/HeroSlider.tsx');
    const luxury = read('components/sliders/LuxuryHeroSlider.tsx');
    const banner = read('components/banners/LuxuryHeroBanner.tsx');

    it('HeroSlider.tsx fallback uses the `hero` icon (or shares it via the other files)', () => {
      // HeroSlider itself may not use LuxuryImageFallback; we only require
      // the e2e fallback in either LuxuryHeroSlider or LuxuryHeroBanner
      // to use the `hero` icon.
      void hero;
      const ok = /icon\s*=\s*['"]hero['"]/.test(luxury) || /icon\s*=\s*['"]hero['"]/.test(banner);
      expect(ok, 'One of the hero files must use icon="hero" for the fallback.').toBe(true);
    });

    it('LuxuryHeroSlider.tsx uses icon="hero" in the fallback branch', () => {
      expect(luxury).toMatch(/icon\s*=\s*['"]hero['"]/);
    });

    it('LuxuryHeroBanner.tsx uses icon="hero" in the fallback branch', () => {
      expect(banner).toMatch(/icon\s*=\s*['"]hero['"]/);
    });
  });

  // ----- B2: banner images declare loading + decoding -----
  describe('Banners — loading + decoding attributes', () => {
    const files = [
      'components/banners/LuxuryTwoColumnBanners.tsx',
      'components/banners/LuxuryThreeColumnBanners.tsx',
      'components/banners/LuxurySingleBanner.tsx',
      'components/banners/LuxurySplitBanner.tsx',
      'components/banners/LuxuryCollectionBanner.tsx',
      'components/banners/LuxuryProductFeatureBanner.tsx',
      'components/sliders/LuxuryBannerSlider.tsx',
    ];

    for (const file of files) {
      it(`${file} declares loading and decoding on its <img>`, () => {
        const source = read(file);
        // Every <img tag must be followed (within 200 chars) by both
        // `loading=` and `decoding=` attributes.
        const imgMatches = source.match(/<img[\s\S]{0,300}\/?>/g) || [];
        expect(imgMatches.length, `${file} should contain at least one <img>`).toBeGreaterThan(0);
        for (const img of imgMatches) {
          expect(img, `${file} <img> must have loading attribute`).toMatch(/\bloading\s*=\s*['"]/);
          expect(img, `${file} <img> must have decoding attribute`).toMatch(/\bdecoding\s*=\s*['"]/);
        }
      });
    }
  });

  // ----- B3: LCP candidates have fetchPriority="high" -----
  describe('Hero images — fetchPriority="high" for LCP', () => {
    it('LuxuryHeroSlider.tsx <img> has fetchPriority="high"', () => {
      const source = read('components/sliders/LuxuryHeroSlider.tsx');
      expect(source).toMatch(/fetchPriority\s*=\s*['"]high['"]/);
    });

    it('LuxuryHeroBanner.tsx <img> has fetchPriority="high"', () => {
      const source = read('components/banners/LuxuryHeroBanner.tsx');
      expect(source).toMatch(/fetchPriority\s*=\s*['"]high['"]/);
    });

    it('HeroSlider.tsx <img> has fetchPriority="high"', () => {
      const source = read('components/HeroSlider.tsx');
      expect(source).toMatch(/fetchPriority\s*=\s*['"]high['"]/);
    });
  });
});
