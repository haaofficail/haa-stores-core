// W18 (Autopilot Phase 3) — RTL / accessibility / brand contract lock.
//
// W18 spec asks for "RTL source-grep guard + accessibility guard +
// brand guard, registered gradually in REMAINING_WORK". All three
// surfaces already have dedicated test files. This file is a thin
// cross-reference lock so they cannot be silently deleted.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('RTL / a11y / Brand guard contract (W18)', () => {
  it('RTL + accessibility guard test exists', () => {
    expect(existsSync(resolve(ROOT, 'tests/rtl-accessibility-guards.test.ts'))).toBe(true);
  });

  it('brand consistency guard test exists', () => {
    expect(existsSync(resolve(ROOT, 'tests/brand-consistency.test.ts'))).toBe(true);
  });

  it('dashboard error-handling + a11y test exists', () => {
    expect(existsSync(resolve(ROOT, 'tests/dashboard-error-handling-and-a11y.test.ts'))).toBe(true);
  });

  it('RTL guard asserts the lang="ar" + dir="rtl" HTML root contract', () => {
    const src = read('tests/rtl-accessibility-guards.test.ts');
    expect(src).toMatch(/lang=['"]ar['"]/);
    expect(src).toMatch(/dir=['"]rtl['"]/);
  });

  it('brand guard locks #5c9cd5 as canonical', () => {
    const src = read('tests/brand-consistency.test.ts');
    expect(src).toMatch(/5c9cd5/);
  });

  it('design-tokens guard test exists (hex-literal ceiling)', () => {
    expect(existsSync(resolve(ROOT, 'tests/design-tokens.test.ts'))).toBe(true);
  });
});
