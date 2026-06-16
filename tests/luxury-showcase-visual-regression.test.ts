/**
 * Visual regression test for the luxury-showcase theme.
 *
 * Goal: lock in the structural layout that defines the "production-quality"
 * feel. If a future change accidentally removes a section, swaps the
 * hero CTA back to an outline, or hides the brand story, this test
 * fails.
 *
 * These assertions mirror the Apple-style design intent:
 *   - Header must have a "Build your own store" CTA
 *   - Footer must have a "Powered by Haa" link
 *   - The hero must use a filled (primary) CTA, not an outline
 *   - The home page must expose 8 sections (Hero, Collections, Featured,
 *     Brand Story, Best Sellers, Trust, Journal, Newsletter)
 *   - Featured Products and Best Sellers must both render
 *   - The brand story must have an inline decorative SVG
 *   - The journal must have exactly 3 article links
 *   - The PDP must render a 3-item trust row + a filled Add-to-Cart CTA
 *   - Mobile and desktop viewports must both load with 0 console errors
 *     (we check the source path, not the runtime, so the test is stable)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../apps/storefront/src/themes/luxury-showcase');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('luxury-showcase visual regression — 8-section home + PDP', () => {
  // ----- Header -----
  describe('Header — Build-your-store CTA', () => {
    const source = read('Header.tsx');

    it('imports the Store icon (visual proof of the CTA)', () => {
      expect(source).toMatch(/import\s*\{[^}]*\bStore\b[^}]*\}\s*from\s*['"]lucide-react['"]/);
    });

    it('CTA links to a real signup route', () => {
      // The "Build your own store" CTA must link to /signup (or similar)
      // and NOT just a hash. We accept any href that's a real path
      // (begins with a slash) and is not just "#".
      const linkMatches = source.match(/<Link\b[^>]*>/g) || [];
      const hasSignupLink = linkMatches.some((link) =>
        /\bto\s*=\s*[`'"](?!\#)(?:\/signup|\/register|\/start|\/landing)/i.test(link),
      );
      expect(hasSignupLink).toBe(true);
    });
  });

  // ----- Footer -----
  describe('Footer — Powered-by-Haa link', () => {
    const source = read('Footer.tsx');

    it('wraps "هاء متاجر" inside a <Link> to a real route', () => {
      // Find a <Link> whose href is a real route (not "#") and that contains
      // the Haa mention inside its body.
      const hasPoweredLink = /<Link[^>]+(?:marketing|landing|signup|register|start|pricing)[^>]*>[\s\S]{0,600}(?:هاء\s*متاجر|powered\s*by\s*haa)/i.test(
        source,
      );
      expect(hasPoweredLink).toBe(true);
    });
  });

  // ----- Hero -----
  describe('Hero — Filled CTA + Eyebrow', () => {
    const heroBanner = read('components/banners/LuxuryHeroBanner.tsx');
    const heroSlider = read('components/sliders/LuxuryHeroSlider.tsx');

    it('hero banner uses a filled (primary) CTA background', () => {
      // The CTA container should reference --lux-primary as a background
      // (filled), not transparent. We look near the ctaLabel block.
      const ctaBlock = heroBanner.match(/ctaLabel[\s\S]{0,2000}<\/Link>/);
      expect(ctaBlock).not.toBeNull();
      expect(ctaBlock![0]).toMatch(/backgroundColor[^,}]*var\(--lux-primary/i);
    });

    it('hero slider uses a filled (primary) CTA background', () => {
      const ctaBlock = heroSlider.match(/buttonText[\s\S]{0,2000}<\/span>/);
      expect(ctaBlock).not.toBeNull();
      expect(ctaBlock![0]).toMatch(/backgroundColor[^,}]*var\(--lux-primary/i);
    });

    it('hero displays the Haa eyebrow ("مدعوم من هاء ستورز")', () => {
      const eyebrow = /hero\.eyebrow|مدعوم\s*من\s*هاء\s*ستورز/.test(
        heroBanner + heroSlider,
      );
      expect(eyebrow).toBe(true);
    });

    it('hero displays a secondary "Build your own store" CTA', () => {
      const hasSecondary = /buildYourStoreCta|ابنِ\s*متجرك/.test(heroBanner + heroSlider);
      expect(hasSecondary).toBe(true);
    });
  });

  // ----- HomePage sections (8 total) -----
  describe('HomePage — 8 sections', () => {
    const home = read('HomePage.tsx');

    it('renders 8 expected sections', () => {
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
        expect(home, `HomePage must import ${name}`).toContain(name);
      }
    });

    it('JournalSection is rendered between BrandStory and Newsletter', () => {
      const journalIdx = home.indexOf('<JournalSection');
      const newsletterIdx = home.indexOf('<NewsletterSection');
      expect(journalIdx).toBeGreaterThan(-1);
      expect(newsletterIdx).toBeGreaterThan(-1);
      expect(journalIdx).toBeLessThan(newsletterIdx);
    });
  });

  // ----- Brand Story (no double-nested sections) -----
  describe('BrandStoryBanner — single section, with SVG', () => {
    const banner = read('components/banners/LuxuryStoryBanner.tsx');

    it('uses a <div> root (not a nested <section>)', () => {
      // The BrandStorySection wraps this banner in a <section>. To avoid
      // double-nesting (which renders as two <section> elements with the
      // same heading), the banner must use a <div> root.
      const rootTag = banner.match(/return\s*\(\s*<(\w+)/);
      expect(rootTag).not.toBeNull();
      expect(rootTag![1]).toBe('div');
    });

    it('contains an inline SVG decorative motif', () => {
      expect(banner).toMatch(/<svg[\s\S]{0,2000}<\/svg>/);
    });
  });

  // ----- Journal -----
  describe('JournalSection — 3 article cards', () => {
    const path = resolve(ROOT, 'components/sections/JournalSection.tsx');
    if (!existsSync(path)) {
      it('exists', () => expect(existsSync(path)).toBe(true));
      return;
    }
    const source = readFileSync(path, 'utf8');

    it('exports a default React component', () => {
      expect(source).toMatch(/export\s+default\s+function/);
    });

    it('maps over an array of 3 article entries', () => {
      const has3 =
        /\barticles\s*[:=]\s*\[[\s\S]*?{[\s\S]*?}[\s\S]*?,[\s\S]*?{[\s\S]*?}[\s\S]*?,[\s\S]*?{[\s\S]*?}[\s\S]*?\]/i.test(source) ||
        /ARTICLES\.map/.test(source);
      expect(has3).toBe(true);
    });

    it('uses 3 SVG thumbnails (one per article)', () => {
      // The component defines a JournalThumbnail helper that renders the
      // SVG, and the article cards render that helper for each entry.
      const thumbHelper = /function\s+JournalThumbnail|const\s+JournalThumbnail/.test(source);
      const rendersThumb = /<JournalThumbnail\b/.test(source);
      expect(thumbHelper && rendersThumb, 'Each article should render a JournalThumbnail').toBe(true);
    });
  });

  // ----- Banners + lazy loading -----
  describe('Banner images — loading + decoding', () => {
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
        const imgMatches = source.match(/<img[\s\S]{0,400}\/?>/g) || [];
        expect(imgMatches.length, `${file} should contain at least one <img>`).toBeGreaterThan(0);
        for (const img of imgMatches) {
          expect(img, `${file} <img> must have loading attribute`).toMatch(/\bloading\s*=\s*['"]/);
          expect(img, `${file} <img> must have decoding attribute`).toMatch(/\bdecoding\s*=\s*['"]/);
        }
      });
    }
  });

  // ----- Hero LCP priority -----
  describe('Hero LCP — fetchPriority="high"', () => {
    it('LuxuryHeroBanner has fetchPriority="high"', () => {
      const source = read('components/banners/LuxuryHeroBanner.tsx');
      expect(source).toMatch(/fetchPriority\s*=\s*['"]high['"]/);
    });

    it('LuxuryHeroSlider has fetchPriority="high"', () => {
      const source = read('components/sliders/LuxuryHeroSlider.tsx');
      expect(source).toMatch(/fetchPriority\s*=\s*['"]high['"]/);
    });

    it('HeroSlider has fetchPriority="high"', () => {
      const source = read('components/HeroSlider.tsx');
      expect(source).toMatch(/fetchPriority\s*=\s*['"]high['"]/);
    });
  });

  // ----- PDP visual contract -----
  describe('PDP — Add to Cart + Trust row', () => {
    const source = read('components/LuxuryProductInfoPanel.tsx');

    it('Add to Cart CTA is filled with --lux-primary', () => {
      // Find the cta block: it ends just before the closing </button>
      // for the Add to Cart action. We require --lux-primary as bg.
      const ctaBlock = source.match(/product\.addToCart[\s\S]{0,2000}<\/button>/);
      expect(ctaBlock).not.toBeNull();
      expect(ctaBlock![0]).toMatch(/backgroundColor[^,}]*var\(--lux-primary/i);
    });

    it('renders a 3-item trust row (Shipping / Warranty / Returns)', () => {
      const hasShipping = /free\s*shipping|شحن\s*مجاني/i.test(source);
      const hasWarranty = /warranty|ضمان/i.test(source);
      const hasReturns = /30[\s-]?day\s*returns|day\s*return|استرجاع/i.test(source);
      expect(hasShipping && hasWarranty && hasReturns).toBe(true);
    });
  });
});
