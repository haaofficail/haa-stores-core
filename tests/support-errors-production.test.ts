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
});
