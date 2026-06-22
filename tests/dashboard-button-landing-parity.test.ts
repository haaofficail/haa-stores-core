// Guard test — merchant dashboard <Button> must stay in pixel-parity
// with the public landing CTA stack (staging.haastores.com).
//
// Locks four invariants on the cva base class + new `cta` size:
//   1. Motion duration matches landing (200ms).
//   2. Easing curve matches landing (cubic-bezier(0.4,0,0.2,1)).
//   3. Focus ring is WCAG-compliant (ring-2 + primary-500).
//   4. `cta` size variant exists with h-12 (48px = landing primary CTA).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BUTTON_PATH = resolve(
  new URL('..', import.meta.url).pathname,
  'apps/merchant-dashboard/src/components/ui/button.tsx',
);
const SRC = readFileSync(BUTTON_PATH, 'utf-8');

describe('Merchant Button is in parity with landing CTA tokens', () => {
  it('base class declares the 200ms landing motion duration', () => {
    expect(SRC).toContain('duration-200');
  });

  it('base class declares the landing apple-grade easing curve', () => {
    expect(SRC).toContain('cubic-bezier(0.4,0,0.2,1)');
  });

  it('base class declares a WCAG-compliant focus ring', () => {
    expect(SRC).toMatch(/focus-visible:ring-2\b/);
    expect(SRC).toMatch(/focus-visible:ring-primary-500\b/);
  });

  it('exposes a `cta` size variant at h-12 (48px landing primary CTA)', () => {
    // Match the cta entry inside the size variants block and assert
    // it carries h-12 — independent of surrounding utility ordering.
    const ctaMatch = SRC.match(/cta:\s*['"]([^'"]+)['"]/);
    expect(ctaMatch).not.toBeNull();
    expect(ctaMatch![1]).toMatch(/\bh-12\b/);
  });
});
