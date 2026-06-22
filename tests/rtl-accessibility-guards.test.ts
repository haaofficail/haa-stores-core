// RTL + accessibility static guards — F-QA-D-005 + F-QA-D-006.
//
// Brand guard already lives in `tests/brand-consistency.test.ts`.
//
// This file adds two cheap structural guards:
//   1. RTL ceiling: number of hardcoded directional Tailwind classes
//      (ml-/mr-/pl-/pr-/text-left/text-right) does not grow.
//   2. Accessibility presence: each app SPA HTML root declares `lang="ar"`
//      and `dir="rtl"`.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next' || entry === '.turbo') continue;
      walk(full, acc);
    } else if (full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

// Captured 2026-06-22 during Wave 18 (300); dropped 2026-06-22 after
// the RTL codemod migrated 298 instances to logical classes
// (ms-/me-/ps-/pe-/text-start/text-end).
const HARDCODED_DIRECTIONAL_CEILING = 10;

describe('RTL / a11y guards (F-QA-D-005 / F-QA-D-006)', () => {
  it(`hardcoded directional Tailwind classes ≤ ${HARDCODED_DIRECTIONAL_CEILING}`, () => {
    const roots = [
      resolve(ROOT, 'apps/storefront/src'),
      resolve(ROOT, 'apps/merchant-dashboard/src'),
      resolve(ROOT, 'apps/admin-dashboard/src'),
    ];
    // Match Tailwind directional classes with hyphen + digit suffix and the textLeft/textRight variants.
    const pattern = /\b(ml|mr|pl|pr)-\d|\btext-(left|right)\b/g;
    let total = 0;
    for (const root of roots) {
      let files: string[];
      try {
        files = walk(root);
      } catch {
        continue;
      }
      for (const file of files) {
        const text = readFileSync(file, 'utf-8');
        const matches = text.match(pattern);
        if (matches) total += matches.length;
      }
    }
    expect(total).toBeLessThanOrEqual(HARDCODED_DIRECTIONAL_CEILING);
  });

  it('every SPA index.html declares lang="ar" dir="rtl"', () => {
    for (const rel of [
      'apps/storefront/index.html',
      'apps/merchant-dashboard/index.html',
      'apps/admin-dashboard/index.html',
    ]) {
      const text = readFileSync(resolve(ROOT, rel), 'utf-8');
      expect(text).toMatch(/lang=['"]ar['"]/);
      expect(text).toMatch(/dir=['"]rtl['"]/);
    }
  });
});
