/**
 * Mobile responsive regression test for the luxury-showcase theme.
 *
 * Goal: lock in the responsive invariants that prevent horizontal
 * scrolling and keep the "Build your own store" CTA visible on
 * small viewports.
 *
 * These assertions mirror the source structure (cheap, deterministic)
 * — no Playwright/Vitest viewport setup needed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../apps/storefront');

function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('luxury-showcase — mobile responsive invariants', () => {
  // ----- Layout overflow guard -----
  describe('Layout — prevents horizontal scroll on mobile', () => {
    const source = read('src/components/Layout.tsx');

    it('storefront root has overflow-x-hidden', () => {
      // The container that wraps the header, main, and footer must
      // clip horizontal overflow so slider transforms (e.g.
      // translateX(-100%)) don't cause horizontal scrollbars.
      expect(source).toMatch(/min-h-screen\s+flex\s+flex-col\s+overflow-x-hidden/);
    });
  });

  // ----- Header CTA on mobile -----
  describe('Header — Build-your-store CTA visible on mobile', () => {
    const source = read('src/themes/luxury-showcase/Header.tsx');

    it('has a mobile-only icon CTA (md:hidden)', () => {
      // On small screens we render an icon-only link to /signup so the
      // conversion path is never hidden. The desktop pill CTA hides on
      // mobile (hidden md:inline-flex), so a mobile replacement is
      // mandatory.
      // Look for any <Link ... md:hidden ... to="/signup" ... > pattern.
      const linkMatches = source.match(/<Link\b[^>]*>/g) || [];
      const hasMobileSignup = linkMatches.some(
        (m) => /md:hidden/.test(m) && /to="\/signup"/.test(m),
      );
      expect(hasMobileSignup, 'Mobile-only signup CTA (md:hidden) must exist').toBe(true);
    });

    it('has a desktop pill CTA (hidden md:inline-flex)', () => {
      const linkMatches = source.match(/<Link\b[^>]*>/g) || [];
      const hasDesktopSignup = linkMatches.some(
        (m) => /hidden\s+md:inline-flex/.test(m) && /to="\/signup"/.test(m),
      );
      expect(hasDesktopSignup, 'Desktop pill CTA (hidden md:inline-flex) must exist').toBe(true);
    });
  });

  // ----- Slider track clipping -----
  describe('LuxurySlider — clips horizontal overflow', () => {
    const source = read('src/themes/luxury-showcase/components/sliders/LuxurySlider.tsx');

    it('wraps the track in overflow-hidden', () => {
      // The slider track uses `transform: translateX(-X%)` which makes
      // it wider than the viewport. An `overflow-hidden` wrapper
      // prevents the page from scrolling.
      expect(source).toMatch(/overflow-hidden/);
    });
  });
});
