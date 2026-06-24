// Theme boundary source-grep guard — DECISION-OS-009.
//
// Locks the rule that merchant-dashboard and admin-dashboard never import
// runtime/main theme packages. Dashboards must consume themes via the
// `/server` subpaths only (types + pure registry reads), or via
// `@haa/system-theme` for the dashboard's own visual identity.
//
// If this test fails, a new boundary violation was introduced. Either:
//   (a) move the import to `@haa/storefront-themes/server` (preferred), or
//   (b) re-export the symbol from the `/server` subpath and update the test,
//   (c) get an explicit owner ruling to amend DECISION-OS-009.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
      walk(full, acc);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

// Imports forbidden in dashboards (must use /server or system-theme).
// Matches the import bare specifier without a /server suffix.
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /from\s+['"]@haa\/storefront-themes['"]/,
    reason: 'Use @haa/storefront-themes/server',
  },
  {
    pattern: /from\s+['"]@haa\/theme-system['"]/,
    reason: 'Use @haa/theme-system/server',
  },
  {
    pattern: /from\s+['"]@haa\/theme-engine['"]/,
    reason: 'Internal theme runtime — not for dashboards',
  },
  {
    pattern: /from\s+['"]@haa\/theme-web['"]/,
    reason: 'Theme preview app — not for dashboards',
  },
  {
    // Added in W1 cleanup pass (Autopilot Phase 3): the dashboard used
    // `<ThemeProvider>` as a dead wrapper at root. Removed; this guard
    // prevents reintroduction. The dashboard's own chrome theme comes
    // from @haa/system-theme (allowed).
    pattern: /from\s+['"]@haa\/theme-react['"]/,
    reason: 'Storefront-only React runtime — use @haa/system-theme for dashboard chrome',
  },
];

const DASHBOARD_ROOTS = [
  resolve(ROOT, 'apps/merchant-dashboard/src'),
  resolve(ROOT, 'apps/admin-dashboard/src'),
];

describe('Theme boundary (DECISION-OS-009)', () => {
  for (const root of DASHBOARD_ROOTS) {
    const label = root.replace(ROOT + '/', '');
    it(`${label} does not import runtime/main theme packages`, () => {
      const files = walk(root);
      const violations: string[] = [];
      for (const file of files) {
        const text = readFileSync(file, 'utf-8');
        for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
          if (pattern.test(text)) {
            const rel = file.replace(ROOT + '/', '');
            violations.push(`${rel} → ${pattern.source} (${reason})`);
          }
        }
      }
      if (violations.length > 0) {
        throw new Error(
          'Theme boundary violations (DECISION-OS-009):\n' + violations.join('\n'),
        );
      }
      expect(violations).toEqual([]);
    });
  }
});
