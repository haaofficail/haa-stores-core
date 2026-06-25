// Storefront SVG dimensions contract.
//
// Root cause of "logos that don't appear" (2026-06-25): when an <img>
// references an SVG that has only `viewBox` but no `width` / `height`
// attributes on the root <svg>, modern browsers inside a flex/grid
// container compute the image's intrinsic size as 0×0. That collapses
// the parent (e.g. `<span class="lp-marquee__item">`) to width=0 and
// the logo is invisible — even though the asset loads with 200 OK and
// the natural size from a non-flex context would be fine.
//
// This affected Apple Pay, STC Pay, Visa, Mastercard, ZATCA, Saudi
// Business Center, Tamara, Saudi Post, the SAR symbol, and the
// "one-minute" hero illustration. mada / aramex / redbox were fine
// because they ship `width` + `height` in the root <svg>.
//
// This contract locks the fix: every SVG in the storefront's public
// asset tree must have `width` AND `height` in the root <svg>. If a
// designer adds a new logo without dimensions, CI fails before deploy.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

const ROOT = resolve(__dirname, '..');
const ASSETS_DIR = resolve(ROOT, 'apps/storefront/public/assets');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (full.endsWith('.svg')) {
      acc.push(full);
    }
  }
  return acc;
}

/** Match the opening <svg ...> tag (across line breaks). */
function readSvgOpeningTag(file: string): string {
  const src = readFileSync(file, 'utf-8');
  const m = src.match(/<svg\b[^>]*>/);
  return m ? m[0] : '';
}

describe('Storefront SVG assets — dimensions on root <svg>', () => {
  const files = walk(ASSETS_DIR);

  it(`scans ${files.length} SVG files (>0)`, () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((f) => [relative(ROOT, f), f]))(
    '%s declares both width and height on the root <svg>',
    (_label, file) => {
      const tag = readSvgOpeningTag(file);
      expect(tag, `no <svg> tag found in ${file}`).not.toBe('');
      expect(
        /\bwidth\s*=/.test(tag),
        `${file} root <svg> is missing the width attribute (causes width=0 inside flex containers)`,
      ).toBe(true);
      expect(
        /\bheight\s*=/.test(tag),
        `${file} root <svg> is missing the height attribute`,
      ).toBe(true);
    },
  );
});
