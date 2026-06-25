// Lucide migration progress lock — F-QA-D-004 / ISSUE-0009.
//
// Counts direct `from 'lucide-react'` imports across app + ui source. The
// test snapshots a CEILING (the current count) and fails CI if the count
// grows — preventing regression while the migration to <Icon /> wrapper
// continues incrementally.
//
// To migrate a file: replace `import { Foo } from 'lucide-react'` with the
// Icon wrapper at `apps/storefront/src/components/ui/icon.tsx`, then drop
// the ceiling in this test.

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
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Strip TS/JS comments before scanning for `from 'lucide-react'`.
 *
 * Without this, a docstring that contains an example like
 *
 *   * import { ChevronRight } from 'lucide-react';
 *
 * would count as a real direct import. The icon-standards governance
 * doc (packages/ui/src/utils/icon-standards.ts) is exactly that
 * shape and was triggering a false positive — its only "lucide-react"
 * mention is the example in the docstring. Stripping comments
 * eliminates the false positive without weakening the real check.
 */
function stripComments(text: string): string {
  return text
    // Block comments /* ... */ (multi-line, non-greedy).
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Line comments // ... (single line).
    .replace(/\/\/.*$/gm, '');
}

const ROOTS = [
  resolve(ROOT, 'apps/storefront/src'),
  resolve(ROOT, 'apps/merchant-dashboard/src'),
  resolve(ROOT, 'apps/admin-dashboard/src'),
  resolve(ROOT, 'packages/ui/src'),
];

/**
 * Sanctioned Icon wrappers — the ONE permitted direct lucide-react import
 * per app. They are governed by a separate contract test
 * (tests/merchant-icon-wrapper-contract.test.ts) that locks the shape +
 * the single eslint-disable on the lucide import. Excluding them here
 * makes the ceiling reflect *real consumers* of lucide, not architectural
 * exceptions. If a new wrapper is added (e.g. admin-dashboard), append its
 * path here AND write a parallel contract test.
 */
const WRAPPER_FILES = new Set([
  resolve(ROOT, 'apps/storefront/src/components/ui/icon.tsx'),
  resolve(ROOT, 'apps/storefront/src/components/ui/icon-registry.ts'),
  resolve(ROOT, 'apps/merchant-dashboard/src/components/ui/icon.tsx'),
  resolve(ROOT, 'apps/merchant-dashboard/src/components/ui/icon-registry.ts'),
]);

// Captured 2026-06-25 after the architectural cleanup: stripComments was
// added (eliminates the icon-standards.ts docstring false positive), and
// the sanctioned Icon wrappers were excluded from the scan. The ceiling
// now reflects ONLY real consumers — files that still need to migrate to
// the `<Icon>` wrapper. Lower this when files are migrated; raising it
// requires an explicit owner ruling.
const CEILING = 164;

describe('Lucide migration progress (F-QA-D-004 / ISSUE-0009)', () => {
  it(`direct lucide-react imports remain ≤ ${CEILING}`, () => {
    let count = 0;
    const offenders: string[] = [];
    for (const root of ROOTS) {
      let files: string[];
      try {
        files = walk(root);
      } catch {
        continue;
      }
      for (const file of files) {
        if (WRAPPER_FILES.has(file)) continue;
        const raw = readFileSync(file, 'utf-8');
        const code = stripComments(raw);
        if (/from\s+['"]lucide-react['"]/.test(code)) {
          count++;
          offenders.push(file.replace(ROOT + '/', ''));
        }
      }
    }
    if (count > CEILING) {
      throw new Error(
        `Lucide migration regressed: ${count} files import lucide-react directly (ceiling ${CEILING}).\n` +
          'New direct imports:\n' +
          offenders.slice(CEILING).join('\n'),
      );
    }
    expect(count).toBeLessThanOrEqual(CEILING);
  });
});
