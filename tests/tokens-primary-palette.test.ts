// @haa/tokens primary palette — F-QA-D-002.
//
// Locks the rule that `color.primary` in tokens.json is centered on the
// canonical Haa primary #5c9cd5 (DECISION-OS-010), and that the
// generated CSS output matches the source.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

const TOKENS = JSON.parse(
  readFileSync(resolve(ROOT, 'packages/tokens/source/tokens.json'), 'utf-8'),
);
const COLORS_CSS = readFileSync(
  resolve(ROOT, 'packages/tokens/output/css/01-colors.css'),
  'utf-8',
);

const STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '950'];
const ALL_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

function hexToY(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Rec. 709 luma is a fine proxy for "lightness ordering".
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

describe('@haa/tokens primary palette (F-QA-D-002)', () => {
  it('500 is the canonical Haa primary #5c9cd5', () => {
    expect(TOKENS.color.primary['500'].srgb).toBe('#5c9cd5');
  });

  it('every step 50→950 has an srgb hex + a p3 value', () => {
    for (const step of ALL_STEPS) {
      const entry = TOKENS.color.primary[step];
      expect(entry, `step ${step}`).toBeDefined();
      expect(entry.srgb, `step ${step} srgb`).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(entry.p3, `step ${step} p3`).toMatch(/^color\(display-p3/);
    }
  });

  it('palette is monotonically darkening from 50 → 950', () => {
    let prev = Infinity;
    for (const step of ALL_STEPS) {
      const y = hexToY(TOKENS.color.primary[step].srgb);
      expect(y, `step ${step} should be darker than the previous step`).toBeLessThan(prev);
      prev = y;
    }
  });

  it('every step from source matches the generated CSS output', () => {
    for (const step of STEPS) {
      const expected = TOKENS.color.primary[step].srgb;
      const pattern = new RegExp(
        `--color-primary-${step}:\\s*${expected.replace(/[#]/g, '\\$&')};`,
      );
      expect(COLORS_CSS, `--color-primary-${step}`).toMatch(pattern);
    }
  });

  it('the top-level description records the F-QA-D-002 alignment', () => {
    expect(TOKENS.description).toMatch(/5c9cd5/);
    expect(TOKENS.description).toMatch(/F-QA-D-002/);
  });

  it('the primary palette description references DECISION-OS-010', () => {
    expect(TOKENS.color.primary.description).toMatch(/DECISION-OS-010/);
  });
});
