/**
 * Regression test for ISSUE-0010 — Vite HMR transient errors + ErrorBoundary hardening.
 *
 * Verifies:
 * 1. ErrorBoundary source includes `isPersistent` detection
 * 2. ErrorBoundary source includes `componentFrame` extraction from `info.componentStack`
 * 3. ErrorBoundary source includes the persistent/transient message branches in Arabic
 * 4. ErrorBoundary source includes a "العودة للرئيسية" fallback link
 * 5. ErrorBoundary source posts the new `isPersistent` + `componentFrame` fields to /internal/support-errors/report
 * 6. All 3 ErrorBoundary files (merchant-dashboard, storefront, admin-dashboard) are updated
 *
 * No runtime / no React render — pure source-grep verification.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

function read(rel: string): string {
  const path = resolve(ROOT, rel);
  if (!existsSync(path)) {
    throw new Error(`Required file missing: ${rel}`);
  }
  return readFileSync(path, 'utf-8');
}

const ERROR_BOUNDARY_FILES = [
  'apps/merchant-dashboard/src/components/ErrorBoundary.tsx',
  'apps/storefront/src/components/ErrorBoundary.tsx',
  'apps/admin-dashboard/src/ErrorBoundary.tsx',
];

describe('ErrorBoundary — ISSUE-0010 hardening (Vite HMR transient detection)', () => {
  for (const file of ERROR_BOUNDARY_FILES) {
    describe(file, () => {
      it('exists and exports the ErrorBoundary class', () => {
        const src = read(file);
        expect(src).toMatch(/export\s+class\s+ErrorBoundary/);
      });

      it('detects transient vs persistent via detectPersistent() helper', () => {
        const src = read(file);
        // sessionStorage-based fingerprinting with 60s window
        expect(src).toMatch(/detectPersistent\s*\(/);
        expect(src).toMatch(/sessionStorage/);
        expect(src).toMatch(/60[_\s]*000/);
      });

      it('extracts componentFrame from info.componentStack', () => {
        const src = read(file);
        expect(src).toMatch(/componentStack/);
        expect(src).toMatch(/componentFrame/);
        // The first non-empty frame is taken from line [1] (line 0 is the "Component Stack:" header)
        expect(src).toMatch(/\.split\('\\n'\)\[1\]/);
      });

      it('includes isPersistent in the report payload to /internal/support-errors/report', () => {
        const src = read(file);
        expect(src).toMatch(/isPersistent:\s*this\.state\.isPersistent/);
        expect(src).toMatch(/componentFrame:\s*firstFrame/);
      });

      it('has persistent/transient Arabic message branches', () => {
        const src = read(file);
        // Persistent message variant (same across all 3 ErrorBoundaries)
        expect(src).toMatch(/نواجه مشكلة/);
        // Transient message variant — at least one of these per file
        // merchant-dashboard: 'تعذر تحميل' | storefront: 'تعذر تحميل' | admin: 'نأسف للإزعاج'
        const hasTransientVariant =
          /تعذر/.test(src) || /نأسف/.test(src) || /حدث خطأ/.test(src);
        expect(hasTransientVariant).toBe(true);
        // Persistent branch must exist
        const persistentCount = (src.match(/نواجه مشكلة/g) || []).length;
        expect(persistentCount).toBeGreaterThanOrEqual(1);
      });

      it('includes "العودة للرئيسية" fallback link', () => {
        const src = read(file);
        expect(src).toMatch(/العودة للرئيسية/);
      });

      it('still has the reload button (preserved from prior behavior)', () => {
        const src = read(file);
        expect(src).toMatch(/window\.location\.reload\(\)/);
      });
    });
  }
});

describe('ISSUE-0010 — knowledge base and incidents updated', () => {
  it('ISSUE-0010 documented in ISSUE_KNOWLEDGE_BASE.md', () => {
    const src = read('docs/ops/ISSUE_KNOWLEDGE_BASE.md');
    expect(src).toMatch(/ISSUE-0010/);
    expect(src).toMatch(/Vite HMR/);
  });

  it('INC-20260615-001..005 marked as Resolved in INCIDENTS.md', () => {
    const src = read('docs/ops/INCIDENTS.md');
    expect(src).toMatch(/INC-20260615-001\.\.005/);
    expect(src).toMatch(/Resolved/);
  });
});
