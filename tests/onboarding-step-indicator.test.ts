// Onboarding step indicator — RTL guard.
//
// The merchant onboarding wizard renders a 3-step indicator
// (store → products → launch). In RTL the first step ("متجرك") must
// appear on the RIGHT, matching Arabic reading order. The bug was that
// the inner flex row inherited LTR direction in some contexts, flipping
// the visual order. Fix: declare `dir="rtl"` explicitly on the steps
// container. This file asserts the fix stays in place.
//
// Static guard — reads the OnboardingWizard.tsx source as text.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const WIZARD_PATH = resolve(
  __dirname,
  '..',
  'apps/merchant-dashboard/src/pages/OnboardingWizard.tsx',
);

describe('Onboarding step indicator — RTL guard', () => {
  const source = readFileSync(WIZARD_PATH, 'utf-8');

  it('steps container declares dir="rtl" explicitly', () => {
    // The steps row carries the flex layout that controls visual order.
    // We require an explicit dir="rtl" attribute on a container that
    // sits immediately before the steps.map() call.
    //
    // Pattern: capture everything from a `dir="rtl"` opening div down
    // to `steps.map(`, with no intermediate `</div>` that would close
    // the dir="rtl" wrapper before reaching the map.
    const wrapper = /<div[^>]*\bdir=["']rtl["'][^>]*>(?:(?!<\/div>)[\s\S])*?steps\.map\(/;
    expect(source).toMatch(wrapper);
  });

  it('connector line between steps uses no directional Tailwind classes', () => {
    // Find the connector line element. It is rendered inside
    //   {i < steps.length - 1 && (
    //     <div className={`w-12 h-0.5 ...`} />
    //   )}
    // The className must not contain hardcoded directional utilities
    // (ml-, mr-, pl-, pr-, text-left, text-right). Logical equivalents
    // (ms-, me-, ps-, pe-, text-start, text-end) or none are accepted.
    const connectorBlock = source.match(
      /i < steps\.length - 1 && \([\s\S]*?w-12 h-0\.5[\s\S]*?\)/,
    );
    expect(connectorBlock, 'connector line block not found').not.toBeNull();
    const connector = connectorBlock![0];
    expect(connector).not.toMatch(/\b(ml|mr|pl|pr)-\d/);
    expect(connector).not.toMatch(/\btext-(left|right)\b/);
  });

  it('component still maps over steps with (s, i) signature', () => {
    // Sanity guard — make sure the indicator is not refactored away or
    // its iteration shape changed in a way that would silently break
    // the two checks above.
    expect(source).toMatch(/steps\.map\(\s*\(\s*s\s*,\s*i\s*\)\s*=>/);
  });
});
