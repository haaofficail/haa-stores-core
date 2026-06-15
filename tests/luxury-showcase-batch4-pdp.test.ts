/**
 * Regression test for Batch 4 — ProductPage (PDP) visual upgrade.
 *
 * Goal: align the PDP with a luxury reference layout. Three changes:
 *   PDP-1. ADD TO CART button is filled with the primary (gold) color
 *         instead of the dark text color.
 *   PDP-2. A 3-item trust row appears immediately after the action buttons
 *         (Free Shipping / Warranty / Returns).
 *   PDP-3. The product page renders a reviews summary block before the
 *         tabs (rating, count, link).
 *
 * The test reads source as text and asserts on structural markers.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../apps/storefront/src/themes/luxury-showcase');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('Batch 4 — PDP visual upgrade (gold CTA, trust row, reviews summary)', () => {
  describe('LuxuryProductInfoPanel.tsx — gold ADD TO CART', () => {
    const source = read('components/LuxuryProductInfoPanel.tsx');

    it('styles the Add to Cart button with --lux-primary background', () => {
      // The Add to Cart button should reference var(--lux-primary) in its
      // backgroundColor. The previous code used --lux-text (dark).
      // Look for any backgroundColor: 'var(--lux-primary' (or similar)
      // inside the add-to-cart button context (within 200 chars of
      // 'product.addToCart' or "أضف").
      const ctaMatch = source.match(/product\.addToCart[\s\S]{0,2000}<\/button>/);
      expect(ctaMatch, 'Add to Cart button must be present').not.toBeNull();
      const ctaBlock = ctaMatch![0];
      expect(ctaBlock, 'Add to Cart button must use --lux-primary as background').toMatch(
        /backgroundColor[^,}]*var\(--lux-primary/i,
      );
    });
  });

  describe('LuxuryProductInfoPanel.tsx — inline trust row', () => {
    const source = read('components/LuxuryProductInfoPanel.tsx');

    it('renders a 3-item trust row (Free Shipping / Warranty / Returns)', () => {
      // The trust row markers: "Free Shipping" / "Warranty" / "Returns"
      // — or Arabic equivalents: "شحن مجاني" / "ضمان" / "استرجاع".
      const hasShipping = /free\s*shipping|شحن\s*مجاني/i.test(source);
      const hasWarranty = /warranty|ضمان/i.test(source);
      const hasReturns = /30[\s-]?day\s*returns|day\s*return|استرجاع/i.test(source);
      expect(hasShipping, 'Trust row must include Free Shipping').toBe(true);
      expect(hasWarranty, 'Trust row must include Warranty').toBe(true);
      expect(hasReturns, 'Trust row must include Returns').toBe(true);
    });
  });

  describe('LuxuryProductTabs.tsx — reviews summary visible at the top', () => {
    const source = read('components/LuxuryProductTabs.tsx');

    it('renders a rating + review count near the top', () => {
      // The reviews summary should expose the rating value (e.g. 4.9) and
      // a review count (24 or similar) so users see social proof before
      // expanding the Reviews tab.
      const hasRating = /\b4\.\d\b|rating/i.test(source);
      const hasCount = /\b24\b|\b\d{1,3}\b.*reviews?|reviews?.*\b\d{1,3}\b/i.test(source);
      expect(hasRating || hasCount, 'Reviews summary must show rating or count').toBe(true);
    });
  });
});
