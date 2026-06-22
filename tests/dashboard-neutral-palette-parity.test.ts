import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Guard test: merchant-dashboard neutral palette must mirror the landing
 * page's true-gray tokens (Apple-style), not Tailwind's slate scale.
 *
 * If this test fails, the dashboard has drifted back to slate-* values
 * which introduce a visible blue tint across sidebar, borders, and text.
 *
 * Note: --color-neutral-900 is intentionally excluded from this guard;
 * it preserves the dashboard's primary-text alias per scope brief.
 */

const CSS_PATH = resolve(
  __dirname,
  '../apps/merchant-dashboard/src/index.css',
);
const css = readFileSync(CSS_PATH, 'utf8');

const EXPECTED_NEUTRALS: Record<string, string> = {
  '--color-neutral-50': '#fafafa',
  '--color-neutral-100': '#f5f5f5',
  '--color-neutral-200': '#e5e5e5',
  '--color-neutral-300': '#d4d4d4',
  '--color-neutral-400': '#a3a3a3',
  '--color-neutral-500': '#737373',
  '--color-neutral-600': '#525252',
  '--color-neutral-700': '#404040',
  '--color-neutral-800': '#262626',
  '--color-neutral-950': '#0a0a0a',
};

describe('merchant-dashboard neutral palette parity with landing', () => {
  for (const [token, value] of Object.entries(EXPECTED_NEUTRALS)) {
    it(`${token} === ${value}`, () => {
      const re = new RegExp(`${token}\\s*:\\s*${value}\\s*;`, 'i');
      expect(css).toMatch(re);
    });
  }

  it('exposes Apple-style --text-secondary (#86868b)', () => {
    expect(css).toMatch(/--text-secondary\s*:\s*#86868b\s*;/i);
  });

  it('exposes Apple-style --text-tertiary (#aeaeb2)', () => {
    expect(css).toMatch(/--text-tertiary\s*:\s*#aeaeb2\s*;/i);
  });

  it('forbids slate-500 (#64748b) anywhere in the file', () => {
    expect(css.toLowerCase()).not.toContain('#64748b');
  });
});
