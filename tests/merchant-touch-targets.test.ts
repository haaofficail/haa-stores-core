// Merchant dashboard touch-target audit (WCAG 2.5.5).
//
// Locks two invariants flagged in the live-staging audit:
//   (a) Icon-only Button instances inside the products table never
//       shrink below 44x44 — i.e. no `h-8 w-8` (32px) or smaller
//       size class on those rows.
//   (b) The Topbar notification bell button container is 44x44 so
//       the hit area meets the touch-target floor even though the
//       Bell glyph itself stays 20px.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

const PRODUCT_LIST = read('apps/merchant-dashboard/src/components/products/ProductListTable.tsx');
const TOPBAR = read('apps/merchant-dashboard/src/components/layout/Topbar.tsx');

describe('Merchant dashboard touch targets ≥ 44px (WCAG 2.5.5)', () => {
  it('ProductListTable has no icon-only Button at h-8 w-8 or smaller', () => {
    // Walk every `<Button ... size="icon" ...>` tag and verify the
    // className does not declare h-7/h-8 (or anything below h-11).
    const buttonTagRe = /<Button[^>]*size="icon"[^>]*>/g;
    const matches = PRODUCT_LIST.match(buttonTagRe) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const tag of matches) {
      // Forbidden small sizes — anything below 44px.
      expect(tag).not.toMatch(/\bh-(?:6|7|8|9|10)\s+w-(?:6|7|8|9|10)\b/);
      // Must declare h-11 w-11 explicitly so the default `h-9 w-9` from
      // size="icon" in the Button cva can't sneak through.
      expect(tag).toMatch(/\bh-11\s+w-11\b/);
    }
  });

  it('Topbar notification bell button is h-11 w-11', () => {
    // Find the <button ...> wrapper that owns the <Bell /> glyph.
    const bellIdx = TOPBAR.indexOf('<Bell ');
    expect(bellIdx).toBeGreaterThan(-1);
    const buttonStart = TOPBAR.lastIndexOf('<button', bellIdx);
    expect(buttonStart).toBeGreaterThan(-1);
    const buttonTag = TOPBAR.slice(buttonStart, bellIdx);
    expect(buttonTag).toMatch(/\bh-11\s+w-11\b/);
    // Anything smaller is a regression.
    expect(buttonTag).not.toMatch(/\bp-2(?:\.5)?\s+rounded/);
  });
});
