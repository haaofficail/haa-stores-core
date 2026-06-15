/**
 * Regression test for Batch 1 of the luxury-showcase visual review.
 *
 * Goal: make the demo discoverable for the merchant audience. Three changes:
 *   1.A Header: add a "Build your own store" CTA button next to the cart.
 *   1.B Footer: add a visible "Powered by Haa" badge with a signup link.
 *   1.D Hero CTA: make the hero button a filled (primary) button instead of
 *       an outline, so it actually pulls the eye.
 *
 * This test pins the contracts:
 *   - Header.tsx has a link/button labeled "ابنِ متجرك" (or similar) and
 *     uses the `Store` icon from lucide-react.
 *   - Footer.tsx has a "Powered by Haa" link with href to a signup path.
 *   - HeroSlider.tsx and LuxuryHeroSlider.tsx render the hero CTA as a
 *     filled button (uses `var(--lux-primary)` as background) when an image
 *     is present.
 *
 * Out of scope (other batches / data fixes):
 *   - Hero images are still empty (imageUrl === ''). The fallback renders,
 *     but the underlying data is unchanged.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../apps/storefront/src/themes/luxury-showcase');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('Batch 1 — Demo discoverability (Header CTA, Footer Haa badge, Hero filled CTA)', () => {
  // ----- 1.A: Header CTA -----
  describe('Header.tsx — "Build your own store" CTA', () => {
    const source = read('Header.tsx');

    it('imports a `Store` icon from `lucide-react`', () => {
      expect(source).toMatch(/import\s*\{[^}]*\bStore\b[^}]*\}\s*from\s*['"]lucide-react['"]/);
    });

    it('contains a visible CTA labeled "ابنِ متجرك"', () => {
      // The exact label can be tweaked; we check for a Build-your-store
      // string variant plus an anchor target.
      const hasBuildLabel = /ابنِ\s+متجرك|ابن متجرك|انشئ\s+متجرك|أنشئ\s+متجرك|Build your store/i.test(source);
      expect(hasBuildLabel, 'Header must include a "build your store" label').toBe(true);
    });

    it('CTA is rendered as a link to a signup or landing route (not "#")', () => {
      // The CTA must point to a real route — not an empty hash.
      // Acceptable hrefs include "/signup", "/register", "/start", "/landing",
      // or anything that is NOT just "#".
      const linkMatch = source.match(/<Link[^>]+to\s*=\s*\{[^}]*["'](#|["'])[^}]*\}/);
      // We just want to make sure a Link to a meaningful path exists.
      const hasRealHref = /<Link[^>]+to\s*=\s*\{[`'"](?!\#)[^`'"]*signup|register|start|landing|pricing/i.test(source);
      expect(
        hasRealHref,
        'Header must link the Build-your-store CTA to a real signup/landing route (not "#").',
      ).toBe(true);
      // If linkMatch is null, the above assertion is the real check; this
      // is just to silence the unused-variable warning.
      void linkMatch;
    });
  });

  // ----- 1.B: Footer "Powered by Haa" badge -----
  describe('Footer.tsx — "Powered by Haa" badge', () => {
    const source = read('Footer.tsx');

    it('has a visible "Powered by Haa" link (or equivalent Arabic)', () => {
      // Arabic default "هاء متاجر" already exists in the source. We want a
      // real <Link> with an actual href pointing to a marketing/landing
      // route — not just the year/copyright text.
      // Note: the rendered DOM may add prefix text (e.g. "مدعوم بواسطة"),
      // so we check that "هاء متاجر" appears INSIDE a <Link> body, not as
      // a standalone text node.
      const linkBody = /<Link[\s\S]*?>([\s\S]*?)<\/Link>/g;
      let m: RegExpExecArray | null;
      let foundInLink = false;
      while ((m = linkBody.exec(source)) !== null) {
        if (/هاء\s*متاجر|powered\s*by\s*haa/i.test(m[1])) {
          foundInLink = true;
          break;
        }
      }
      expect(foundInLink, 'Footer must wrap "هاء متاجر" inside a <Link> body').toBe(true);
    });

    it('wraps the "Haa" mention in a <Link> to a real route', () => {
      // Find a <Link ...> ... haa ... </Link> pattern, OR
      // a direct anchor href. We check for "signup" or "landing" in the
      // href, and "هاء" / "haa" inside the element. The 600-char window
      // is loose enough to cover multi-line attributes and JSX bodies.
      const linkToHaa = /<Link[^>]+(?:marketing|landing|signup|register|start|pricing)[^>]*>[\s\S]{0,600}(?:هاء\s*متاجر|powered\s*by\s*haa)/i.test(
        source,
      );
      const anchorToHaa = /<a[^>]+(?:marketing|landing|signup|register|start|pricing)[^>]*>[\s\S]{0,600}(?:هاء\s*متاجر|powered\s*by\s*haa)/i.test(
        source,
      );
      expect(
        linkToHaa || anchorToHaa,
        'Footer must wrap the Haa mention in a <Link>/<a> pointing to a real marketing/landing route.',
      ).toBe(true);
    });
  });

  // ----- 1.D: Hero CTA filled (not outline) -----
  describe('HeroSlider.tsx + LuxuryHeroSlider.tsx — hero CTA is filled', () => {
    const heroSource = read('components/HeroSlider.tsx');
    const luxuryHeroSource = read('components/sliders/LuxuryHeroSlider.tsx');

    /**
     * Heuristic: the CTA is "filled" when, somewhere inside the JSX that
     * references `buttonText` (the hero CTA label), the source contains
     * a `backgroundColor:` set to the primary token. We don't try to
     * parse the JSX — we just look for the two markers within ~600 chars
     * of each other.
     */
    function hasFilledCta(src: string): boolean {
      // Find the buttonText block (the CTA <span>) and check the surrounding
      // ~600 chars for the primary background.
      const buttonTextIdx = src.indexOf('slide.buttonText');
      if (buttonTextIdx < 0) return false;
      const slice = src.slice(buttonTextIdx, buttonTextIdx + 800);
      // The filled branch sets backgroundColor to the primary token
      // (`var(--lux-primary`).
      const hasPrimaryBg = /backgroundColor\s*:[^,}]*var\(--lux-primary/i.test(slice);
      return hasPrimaryBg;
    }

    it('HeroSlider.tsx uses a filled CTA', () => {
      expect(hasFilledCta(heroSource), 'HeroSlider must use a filled (primary) CTA.').toBe(true);
    });

    it('LuxuryHeroSlider.tsx uses a filled CTA', () => {
      expect(hasFilledCta(luxuryHeroSource), 'LuxuryHeroSlider must use a filled (primary) CTA.').toBe(true);
    });
  });
});
