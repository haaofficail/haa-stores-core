// support-errors production behaviour — AGENTS.md §13 #5.
//
// When NODE_ENV is production, POST /internal/support-errors/report
// must return 404 (not 403) to hide endpoint existence from scanners.
// Source-grep test (no runtime import) — locks the status code constant
// so a future edit that re-introduces 403 fails CI.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SRC = readFileSync(
  resolve(__dirname, '../apps/api/src/routes/support-errors.ts'),
  'utf-8',
);

describe('support-errors production behaviour (AGENTS.md §13 #5)', () => {
  it('non-local branch returns 404 (not 403)', () => {
    // Locate the non-local guard block and assert it uses 404, not 403.
    const idx = SRC.indexOf('if (!IS_LOCAL)');
    expect(idx).toBeGreaterThanOrEqual(0);
    // Inspect the next ~250 chars (enough to cover the return statement).
    const block = SRC.slice(idx, idx + 250);
    expect(block).toMatch(/,\s*404\s*\)/);
    expect(block).not.toMatch(/,\s*403\s*\)/);
  });

  it('uses NODE_ENV === development to enable local processing', () => {
    expect(SRC).toMatch(/NODE_ENV\s*===\s*['"]development['"]/);
  });

  // W10 (Autopilot Phase 3): additional guards.
  it('default NODE_ENV (unset) is treated as local (dev-friendly default)', () => {
    // Without this, a misconfigured production container that lost
    // NODE_ENV would silently expose the endpoint.
    expect(SRC).toMatch(/!process\.env\.NODE_ENV/);
  });

  it('non-local 404 response carries no error details (no scanner hints)', () => {
    const idx = SRC.indexOf('if (!IS_LOCAL)');
    const block = SRC.slice(idx, idx + 250);
    // The 404 body must be a generic "Not found." — NOT a stack trace
    // or any string that hints at the real route purpose.
    expect(block).toMatch(/Not found/);
    expect(block).not.toMatch(/support|error|report|correlation/i);
  });

  it('route is mounted at /internal/support-errors (internal prefix)', () => {
    // The /internal prefix is the canonical "not for public consumption"
    // namespace. A future regression that mounted at /api/support-errors
    // would defeat the obscurity goal.
    const indexSrc = readFileSync(
      resolve(__dirname, '../apps/api/src/index.ts'),
      'utf-8',
    );
    expect(indexSrc).toMatch(/app\.route\(['"]\/internal\/support-errors['"]/);
  });
});
