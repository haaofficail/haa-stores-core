// Apple-grade transition timing — locks the landing page parity.
//
// Landing pages use `transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1)`
// everywhere. Tailwind's default `duration-300` (300ms) is sluggish.
// This PR adds `ease-timing` + `ease-spring` to the merchant
// Tailwind config and migrates the highest-traffic micro-interaction
// (the Sidebar slide-in/out transform).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const TW_CONFIG = read('apps/merchant-dashboard/tailwind.config.js');
const SIDEBAR = read('apps/merchant-dashboard/src/components/layout/Sidebar.tsx');

describe('Dashboard transition timing — Apple-grade (PR landing-parity)', () => {
  it('Tailwind extend defines transitionTimingFunction.timing = cubic-bezier(0.4, 0, 0.2, 1)', () => {
    expect(TW_CONFIG).toMatch(/transitionTimingFunction/);
    expect(TW_CONFIG).toMatch(/timing:\s*['"]cubic-bezier\(0\.4,\s*0,\s*0\.2,\s*1\)['"]/);
  });

  it('Tailwind extend also exposes ease-spring for playful states', () => {
    expect(TW_CONFIG).toMatch(/spring:\s*['"]cubic-bezier\(0\.34,\s*1\.56,\s*0\.64,\s*1\)['"]/);
  });

  it('Sidebar uses duration-200 + ease-timing instead of duration-300', () => {
    expect(SIDEBAR).toMatch(/transition-transform duration-200 ease-timing/);
    expect(SIDEBAR).not.toMatch(/transition-transform duration-300\b/);
  });
});
