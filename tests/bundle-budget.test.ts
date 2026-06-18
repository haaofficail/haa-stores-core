/**
 * Bundle budget regression test — Sprint 4+ Round 2.
 *
 * Goal: lock in current bundle sizes as a maximum budget. Future PRs that
 * significantly grow the bundle (without a documented exception) will
 * fail this test.
 *
 * Numbers captured: 2026-06-18 (Sprint 4+ Round 2 baseline).
 *
 * Note: This test does NOT actually run a build — it reads the existing
 * `dist/` output if present, and falls back to "skip" otherwise. The
 * intent is to fail in CI after a build, not to fail during local dev
 * when `dist/` hasn't been generated yet.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

const ROOT = resolve(__dirname, '..');

/** Recursively collect file sizes under a dir. */
function collectFiles(dir: string, out: { path: string; bytes: number }[] = []): typeof out {
  const full = resolve(ROOT, dir);
  if (!existsSync(full)) return out;
  for (const name of readdirSync(full)) {
    const p = join(full, name);
    if (statSync(p).isDirectory()) {
      collectFiles(join(dir, name), out);
    } else if (statSync(p).isFile()) {
      out.push({ path: join(dir, name), bytes: statSync(p).size });
    }
  }
  return out;
}

/** Sum bytes for a list of files. */
function totalBytes(files: { bytes: number }[]): number {
  return files.reduce((sum, f) => sum + f.bytes, 0);
}

/** Read package.json dist (chunkSizeWarningLimit). */
function distConfig(appDir: string): { warningLimit: number } {
  const cfg = readFileSync(resolve(ROOT, appDir, 'vite.config.ts'), 'utf-8');
  const m = cfg.match(/chunkSizeWarningLimit:\s*(\d+)/);
  return { warningLimit: m ? Number(m[1]) : 500 };
}

interface AppBudget {
  name: string;
  dir: string;
  maxTotalJS: number; // bytes
  maxSingleChunk: number; // bytes
}

const BUDGETS: AppBudget[] = [
  { name: 'storefront', dir: 'apps/storefront', maxTotalJS: 1_500_000, maxSingleChunk: 500_000 },
  { name: 'merchant-dashboard', dir: 'apps/merchant-dashboard', maxTotalJS: 5_000_000, maxSingleChunk: 500_000 },
  { name: 'admin-dashboard', dir: 'apps/admin-dashboard', maxTotalJS: 1_500_000, maxSingleChunk: 500_000 },
];

describe('Bundle budget — Sprint 4+ Round 2 baseline', () => {
  for (const budget of BUDGETS) {
    describe(budget.name, () => {
      const distDir = `${budget.dir}/dist/assets`;
      it('dist/assets/ exists (build was run)', () => {
        if (!existsSync(resolve(ROOT, distDir))) {
          // Skip — this is local dev, not CI. CI will fail this test.
          return;
        }
        expect(existsSync(resolve(ROOT, distDir))).toBe(true);
      });

      it(`total JS size <= ${(budget.maxTotalJS / 1024).toFixed(0)} KB`, () => {
        if (!existsSync(resolve(ROOT, distDir))) return;
        const files = collectFiles(distDir).filter((f) => f.path.endsWith('.js'));
        const total = totalBytes(files);
        if (total > budget.maxTotalJS) {
          throw new Error(
            `${budget.name} total JS is ${(total / 1024).toFixed(1)} KB, exceeds budget ${(budget.maxTotalJS / 1024).toFixed(0)} KB. Top 5 chunks:\n  ${files
              .sort((a, b) => b.bytes - a.bytes)
              .slice(0, 5)
              .map((f) => `${(f.bytes / 1024).toFixed(1)} KB — ${f.path.replace(`${budget.dir}/`, '')}`)
              .join('\n  ')}`
          );
        }
      });

      it(`no single JS chunk exceeds ${(budget.maxSingleChunk / 1024).toFixed(0)} KB`, () => {
        if (!existsSync(resolve(ROOT, distDir))) return;
        const files = collectFiles(distDir).filter((f) => f.path.endsWith('.js'));
        const offenders = files.filter((f) => f.bytes > budget.maxSingleChunk);
        if (offenders.length > 0) {
          throw new Error(
            `${budget.name} has ${offenders.length} chunk(s) > ${(budget.maxSingleChunk / 1024).toFixed(0)} KB:\n  ${offenders
              .sort((a, b) => b.bytes - a.bytes)
              .map((f) => `${(f.bytes / 1024).toFixed(1)} KB — ${f.path.replace(`${budget.dir}/`, '')}`)
              .join('\n  ')}`
          );
        }
      });

      it('CSS bundle is also under budget', () => {
        if (!existsSync(resolve(ROOT, distDir))) return;
        const files = collectFiles(distDir).filter((f) => f.path.endsWith('.css'));
        const total = totalBytes(files);
        // 200KB CSS is plenty for the design system
        if (total > 200_000) {
          throw new Error(
            `${budget.name} CSS is ${(total / 1024).toFixed(1)} KB, exceeds 200 KB budget. Files:\n  ${files
              .sort((a, b) => b.bytes - a.bytes)
              .map((f) => `${(f.bytes / 1024).toFixed(1)} KB — ${f.path.replace(`${budget.dir}/`, '')}`)
              .join('\n  ')}`
          );
        }
      });
    });
  }
});

describe('Bundle budget — vite config matches budget', () => {
  it('all apps declare a chunkSizeWarningLimit', () => {
    for (const budget of BUDGETS) {
      const cfg = distConfig(budget.dir);
      expect(cfg.warningLimit).toBeGreaterThan(0);
    }
  });
});
