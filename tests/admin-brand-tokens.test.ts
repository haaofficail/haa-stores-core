// Admin dashboard brand-tokens guard — F-QA-D-003 / DECISION-OS-010.
//
// Locks the rule that admin-dashboard uses Tailwind `primary-*` brand tokens
// (mapped to the Haa #5c9cd5 palette via tailwind.config.js) instead of
// hardcoded Tailwind `blue-*` defaults (which render as the Tailwind default
// blue, not the platform brand).
//
// If this test fails, a new admin file introduced a Tailwind `blue-*` class.
// Either map it to the `primary-*` token (preferred), or — if a literal
// blue is genuinely required (e.g. an info badge that intentionally differs
// from the brand) — get an explicit owner ruling and amend this test.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
      walk(full, acc);
    } else if (full.endsWith('.tsx')) {
      acc.push(full);
    }
  }
  return acc;
}

describe('Admin dashboard brand tokens (DECISION-OS-010 / F-QA-D-003)', () => {
  it('no hardcoded Tailwind blue-* class in admin-dashboard src', () => {
    const dir = resolve(ROOT, 'apps/admin-dashboard/src');
    const files = walk(dir);
    const offenders: string[] = [];
    // Pattern: any Tailwind utility prefix followed by `-blue-` and a numeric stop.
    const pattern = /\b(bg|text|border|ring|from|to|hover:bg|hover:text|focus:ring|focus:border|dark:bg|dark:text)-blue-\d/g;
    for (const f of files) {
      const text = readFileSync(f, 'utf-8');
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        offenders.push(`${f.replace(ROOT + '/', '')} → ${matches.slice(0, 5).join(', ')}${matches.length > 5 ? ' …' : ''}`);
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        'Hardcoded Tailwind blue-* in admin-dashboard (use primary-* tokens per DECISION-OS-010):\n' +
          offenders.join('\n'),
      );
    }
    expect(offenders).toEqual([]);
  });
});
