// Merchant dashboard Icon wrapper contract.
//
// New merchant-dashboard files MUST use this wrapper instead of
// importing `lucide-react` directly — same governance the storefront
// has had since the start (ISSUE-0009). The wrapper itself is the
// single permitted direct import.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const WRAPPER_PATH = resolve(__dirname, '../apps/merchant-dashboard/src/components/ui/icon.tsx');

describe('Merchant Icon wrapper', () => {
  it('exists at the conventional path', () => {
    expect(existsSync(WRAPPER_PATH)).toBe(true);
  });

  it('exports a single named Icon component', () => {
    const src = readFileSync(WRAPPER_PATH, 'utf-8');
    expect(src).toMatch(/export function Icon\(/);
  });

  it('matches the storefront size-token set', () => {
    const src = readFileSync(WRAPPER_PATH, 'utf-8');
    for (const token of ['3xs', '2xs', 'xs', 'sm', 'md', 'default', 'lg', 'xl', '2xl']) {
      expect(src, `must declare size token "${token}"`).toMatch(new RegExp(`['"]${token}['"]`));
    }
  });

  it('keeps the single lucide-react import under an eslint-disable (ISSUE-0009)', () => {
    const src = readFileSync(WRAPPER_PATH, 'utf-8');
    expect(src).toMatch(/eslint-disable-next-line[\s\S]{0,400}no-restricted-imports[\s\S]{0,200}from\s+['"]lucide-react['"]/);
  });

  it('accepts an `icon` prop (LucideIcon ref) — the merchant-dashboard call shape', () => {
    const src = readFileSync(WRAPPER_PATH, 'utf-8');
    expect(src).toMatch(/icon:\s*LucideIcon/);
  });
});
