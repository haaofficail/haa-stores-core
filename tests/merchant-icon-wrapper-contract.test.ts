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

  it('declares itself as the SANCTIONED WRAPPER and imports lucide directly (ISSUE-0009)', () => {
    const src = readFileSync(WRAPPER_PATH, 'utf-8');
    // Wrapper must self-identify with the governance marker so a future
    // refactor can't accidentally repurpose this file path.
    expect(src, 'must contain "SANCTIONED WRAPPER — ISSUE-0009" governance marker').toMatch(
      /SANCTIONED WRAPPER\s+—\s+ISSUE-0009/,
    );
    // And it must be the only file importing lucide directly — enforced
    // structurally by the WRAPPER_FILES exclusion in
    // tests/lucide-migration-progress.test.ts.
    expect(src).toMatch(/from\s+['"]lucide-react['"]/);
  });

  it('accepts an `icon` prop (LucideIcon ref) — the merchant-dashboard call shape', () => {
    const src = readFileSync(WRAPPER_PATH, 'utf-8');
    expect(src).toMatch(/icon:\s*LucideIcon/);
  });
});
