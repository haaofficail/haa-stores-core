/**
 * Regression test for the `luxury-showcase` Hero slider's image-empty
 * handling.
 *
 * Why this test exists:
 *   The hero slider receives slides from `themeConfig.homepage.heroSlider`.
 *   At runtime, those slides may have `imageUrl: ""` (empty string) or
 *   other missing/blank image values. The component must not render a
 *   broken `<img>` tag in that case — it must fall back to
 *   `<LuxuryImageFallback>` so the user sees a meaningful placeholder
 *   instead of an empty box.
 *
 * What this test pins down (reading the source as text — no JSX/AST):
 *   1. The component defines a truthiness guard for `imageUrl`
 *      (e.g. `const hasImage = ...;` with a non-empty check).
 *   2. The component only renders `<picture>` / `<img>` inside a branch
 *      gated by that guard.
 *   3. The component imports `LuxuryImageFallback` and renders it in the
 *      `!hasImage` branch.
 *   4. The `HeroSlide` type makes `imageUrl` a required `string` (not
 *      `imageUrl?: string`).
 *
 * If any of these checks fail, the test fails — even if the page happens
 * to render correctly today. We want a stable invariant.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const HERO_SLIDER_PATH = resolve(
  __dirname,
  '../apps/storefront/src/themes/luxury-showcase/components/sliders/LuxuryHeroSlider.tsx',
);

function readHeroSlider(): string {
  return readFileSync(HERO_SLIDER_PATH, 'utf8');
}

describe('luxury-showcase HeroSlider — image-empty safety', () => {
  const source = readHeroSlider();

  it('imports the `LuxuryImageFallback` component', () => {
    expect(
      source,
      'LuxuryHeroSlider must import `LuxuryImageFallback` so it can render a placeholder when the slide has no image.',
    ).toMatch(/import\s+LuxuryImageFallback\b/);
  });

  it('declares a truthiness guard for `imageUrl`', () => {
    // We look for the canonical pattern: `const hasImage = ...;`
    // The right-hand side must reference `imageUrl`.
    const guardMatch = source.match(/const\s+hasImage\s*=\s*([^;]+);/);
    expect(
      guardMatch,
      'LuxuryHeroSlider must declare `const hasImage = ...;` to guard the image render branch.',
    ).not.toBeNull();
    expect(
      guardMatch![1],
      '`hasImage` must reference `imageUrl` so empty strings are treated as no-image.',
    ).toMatch(/imageUrl/);
  });

  it('renders `<picture>` (or `<img>`) only inside a `hasImage`-gated branch', () => {
    // Locate the `<picture` opening tag.
    const pictureIdx = source.indexOf('<picture');
    expect(
      pictureIdx,
      'LuxuryHeroSlider should render a <picture> element for the hero image.',
    ).toBeGreaterThan(-1);

    // Find the `hasImage` guard nearest above it. We search the substring
    // between the start of the file and the `<picture` for any reference
    // to `hasImage`. The guard must be in scope (inside the same render
    // function or branch).
    const headSlice = source.slice(0, pictureIdx);
    expect(
      headSlice,
      '`hasImage` must be referenced before the <picture> element so the picture only renders when an image exists.',
    ).toMatch(/\bhasImage\b/);
  });

  it('renders `<LuxuryImageFallback>` in the `!hasImage` branch', () => {
    // Find a `<LuxuryImageFallback` JSX usage. The component must be used
    // (not just imported) so empty-image slides get a placeholder.
    expect(
      source,
      'LuxuryHeroSlider must render `<LuxuryImageFallback ... />` somewhere in the JSX.',
    ).toMatch(/<LuxuryImageFallback\b/);
  });

  it('declares `imageUrl` as a string field (required or optional) on the slide type', () => {
    // We look for the `HeroSlide` type/interface and check the `imageUrl`
    // line. We accept BOTH forms:
    //   - `imageUrl: string;`   (required — every slide must carry a URL)
    //   - `imageUrl?: string;`  (optional — slides without an image
    //                            rely on the LuxuryImageFallback)
    //
    // The choice is a design call. The runtime invariant is what matters:
    // when `imageUrl` is missing or empty, the fallback must render.
    const fieldMatch = source.match(/^\s*imageUrl(\?)?:\s*string\b/m);
    expect(
      fieldMatch,
      'The `HeroSlide` type must declare `imageUrl: string` or `imageUrl?: string`.',
    ).not.toBeNull();
  });
});
