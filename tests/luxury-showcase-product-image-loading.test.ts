/**
 * Regression test for `loading` / `decoding` attributes on product images
 * in the `luxury-showcase` theme.
 *
 * Goal: every `<img>` tag inside product-related components must declare
 *       `loading="lazy"` (or `"eager"` for the first/LCP image) AND
 *       `decoding="async"`. This guarantees we never ship a product card
 *       that triggers the full network pipeline before the user scrolls to
 *       it.
 *
 * Scope: product images only.
 *   - components/LuxuryProductCard.tsx
 *   - components/LuxuryProductGallery.tsx
 *   - components/sliders/LuxuryProductGallerySlider.tsx
 *
 * Out of scope (other tasks):
 *   - Hero slider / hero banner images (LCP candidates — must be `eager`).
 *   - Section banners (TwoColumn / ThreeColumn / Split / Single / Collection /
 *     ProductFeature / BannerSlider).
 *   - Header logo.
 *
 * The test reads each file as a string and counts `<img` opening tags vs.
 * `loading=` occurrences inside the same file. If the counts don't match
 * (or any `<img>` is missing `decoding="async"`), it fails.
 *
 * This intentionally does not use an AST — it's cheap, refactor-friendly,
 * and stable against JSX formatting changes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type FileTarget = {
  file: string;
  // The number of `<img` opening tags we expect in this file. Counts come
  // from a manual scan (latest source).
  expectedImgCount: number;
};

const THEME_ROOT = resolve(
  __dirname,
  '../apps/storefront/src/themes/luxury-showcase',
);

const TARGETS: FileTarget[] = [
  { file: 'components/LuxuryProductCard.tsx', expectedImgCount: 2 },
  { file: 'components/LuxuryProductGallery.tsx', expectedImgCount: 2 },
  { file: 'components/sliders/LuxuryProductGallerySlider.tsx', expectedImgCount: 2 },
];

function readFile(rel: string): string {
  return readFileSync(resolve(THEME_ROOT, rel), 'utf8');
}

/**
 * Counts `<img` opening tags. Matches both self-closing (`<img ... />`)
 * and JSX-with-children (`<img ...>`). We deliberately do not require
 * whitespace after `<img` — but our codebase does use one.
 */
function countImgTags(source: string): number {
  const matches = source.match(/<img[\s>]/g);
  return matches ? matches.length : 0;
}

/**
 * Counts `loading=` attribute occurrences. Matches both single and double
 * quoted values, and either the literal string `loading=` or JSX
 * expression `loading={...}`. This is the broad pattern we want — any
 * variant satisfies us.
 */
function countLoadingAttributes(source: string): number {
  // matches:  loading="lazy"  /  loading="eager"  /  loading={...}
  const matches = source.match(/\bloading\s*=\s*(?=["'{])/g);
  return matches ? matches.length : 0;
}

function countDecodingAttributes(source: string): number {
  // matches:  decoding="async"  /  decoding={...}
  const matches = source.match(/\bdecoding\s*=\s*(?=["'{])/g);
  return matches ? matches.length : 0;
}

describe('luxury-showcase product images — loading + decoding', () => {
  for (const target of TARGETS) {
    describe(target.file, () => {
      const source = readFile(target.file);
      const imgCount = countImgTags(source);

      it(`declares ${target.expectedImgCount} <img> tag(s) (sanity check)`, () => {
        // If this fails, the expected count drifted from reality. Update
        // `expectedImgCount` and re-evaluate the rest of the suite.
        expect(imgCount).toBe(target.expectedImgCount);
      });

      it('every <img> tag has a `loading` attribute', () => {
        const loadingCount = countLoadingAttributes(source);
        expect(
          loadingCount,
          `expected ${imgCount} \`loading\` attribute(s) (one per <img>), found ${loadingCount}. ` +
            'Every product image must declare loading="lazy" or loading="eager" (LCP).',
        ).toBe(imgCount);
      });

      it('every <img> tag has a `decoding` attribute', () => {
        const decodingCount = countDecodingAttributes(source);
        expect(
          decodingCount,
          `expected ${imgCount} \`decoding\` attribute(s) (one per <img>), found ${decodingCount}. ` +
            'Use decoding="async" for non-LCP images; decoding="sync" only when the layout depends on it.',
        ).toBe(imgCount);
      });
    });
  }
});
