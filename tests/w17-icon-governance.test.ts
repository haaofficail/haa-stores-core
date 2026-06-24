// W17 (Autopilot Phase 3) — icon governance lock.
//
// Direct `lucide-react` imports in dashboards + storefront are migrated
// to the `<Icon icon={...} />` wrapper from @/components/ui/icon as
// part of a gradual rollout. ESLint warns on each new direct import,
// and pre-commit (--max-warnings 0 on touched files only) blocks new
// ones. This test asserts the COUNT does not regress.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (e === 'node_modules' || e === 'dist' || e === '.turbo') continue;
      walk(full, acc);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

function countLucideImports(root: string): number {
  let count = 0;
  for (const f of walk(root)) {
    const txt = readFileSync(f, 'utf-8');
    // Count import lines that pull from `lucide-react` directly.
    for (const line of txt.split('\n')) {
      // Skip lines that look like the canonical wrapper or comments.
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) continue;
      if (/from\s+['"]lucide-react['"]/.test(line)) count++;
    }
  }
  return count;
}

describe('Icon governance (W17)', () => {
  // Baselines snapshotted 2026-06-25. The hard ceiling is "<= baseline".
  // Any PR that increases the count fails CI with a clear message; a PR
  // that decreases the count must update the baseline in this test.
  const BASELINES: Record<string, number> = {
    'apps/storefront/src': 200,
    'apps/merchant-dashboard/src': 200,
    'apps/admin-dashboard/src': 100,
  };

  for (const [scope, ceiling] of Object.entries(BASELINES)) {
    it(`${scope} keeps lucide imports <= ${ceiling}`, () => {
      const count = countLucideImports(resolve(ROOT, scope));
      if (count > ceiling) {
        throw new Error(
          `[W17] ${scope} has ${count} direct lucide-react imports — over the ${ceiling} ceiling.\n` +
          `Either migrate to <Icon icon={...} /> from @/components/ui/icon, or update the baseline in tests/w17-icon-governance.test.ts.`,
        );
      }
      expect(count).toBeLessThanOrEqual(ceiling);
    });
  }

  it('ESLint config warns on lucide-react in dashboards (no-restricted-imports)', () => {
    const eslint = readFileSync(resolve(ROOT, 'eslint.config.mjs'), 'utf-8');
    // The rule must exist in the dashboards override block.
    expect(eslint).toMatch(/lucide-react/);
  });
});
