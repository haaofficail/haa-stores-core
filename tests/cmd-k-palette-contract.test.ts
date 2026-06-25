// Command Palette (Cmd+K) — IA Wave 5 part 2.
//
// The fake search input that the Topbar used to render on Cmd+K is
// gone. The shortcut now opens a real palette with:
//   - keyboard navigation (Esc / Arrow / Enter)
//   - real-time filtering against label + path + keywords
//   - recent-commands bubble-to-top via localStorage
//   - W3-canonical paths in every result row
//   - a dedicated "Quick create" group for new-product / new-coupon

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PALETTE = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/CommandPalette.tsx'),
  'utf-8',
);
const TOPBAR = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/components/layout/Topbar.tsx'),
  'utf-8',
);

describe('CommandPalette — component', () => {
  it('opens/closes via the open/onClose props', () => {
    expect(PALETTE).toMatch(/export function CommandPalette\(\s*\{\s*open,\s*onClose\s*\}/);
    expect(PALETTE).toMatch(/if\s*\(!open\)\s*return\s*null/);
  });

  it('supports keyboard navigation (Esc / ArrowDown / ArrowUp / Enter)', () => {
    expect(PALETTE).toMatch(/e\.key\s*===\s*['"]Escape['"]/);
    expect(PALETTE).toMatch(/e\.key\s*===\s*['"]ArrowDown['"]/);
    expect(PALETTE).toMatch(/e\.key\s*===\s*['"]ArrowUp['"]/);
    expect(PALETTE).toMatch(/e\.key\s*===\s*['"]Enter['"]/);
  });

  it('persists recent commands in localStorage', () => {
    expect(PALETTE).toMatch(/const RECENT_KEY = ['"]cmdk\.recent\.v1['"]/);
    expect(PALETTE).toMatch(/window\.localStorage\.setItem\(RECENT_KEY/);
  });

  it('uses W3-canonical paths in commands', () => {
    // Every leaf is namespaced. The audit found this is the critical
    // surface to keep in sync — a stale path here would silently
    // redirect through the legacy chain.
    for (const path of [
      '/catalog/products',
      '/sales/orders',
      '/marketing/promotions',
      '/finance/wallet',
      '/sales/abandoned-carts',
    ]) {
      expect(PALETTE, `path ${path} must appear`).toMatch(new RegExp(`path:\\s*['"]${path.replace(/\//g, '\\/')}['"]`));
    }
  });

  it('exposes test ids for stable e2e selectors', () => {
    expect(PALETTE).toMatch(/data-testid=['"]cmdk-overlay['"]/);
    expect(PALETTE).toMatch(/data-testid=['"]cmdk-input['"]/);
    expect(PALETTE).toMatch(/data-testid=['"]cmdk-list['"]/);
  });

  it('returns no results gracefully when the query matches nothing', () => {
    // The "empty" branch shows a localised message — clicking
    // arrow keys with zero results must not crash.
    expect(PALETTE).toMatch(/results\.length === 0/);
    expect(PALETTE).toMatch(/cmdk\.empty/);
  });

  it('declares a "Quick create" group for new-product / new-coupon', () => {
    expect(PALETTE).toMatch(/id:\s*['"]new-product['"]/);
    expect(PALETTE).toMatch(/id:\s*['"]new-coupon['"]/);
  });
});

describe('Topbar — fake search replaced by palette trigger', () => {
  it('no inline <input type="text" placeholder="بحث"> remains', () => {
    expect(TOPBAR).not.toMatch(/<input[\s\S]{0,200}placeholder=\{t\(['"]topbar\.search['"]/);
  });

  it('Cmd+K opens the palette, not a text input', () => {
    expect(TOPBAR).toMatch(/useKeyboardShortcut\(\{\s*key:\s*['"]k['"]\s*,\s*onTrigger:\s*\(\)\s*=>\s*setPaletteOpen\(true\)/);
  });

  it('renders the palette and a button that triggers it', () => {
    expect(TOPBAR).toMatch(/<CommandPalette\s+open=\{paletteOpen\}/);
    expect(TOPBAR).toMatch(/data-testid=['"]cmdk-trigger['"]/);
  });

  it('shows the ⌘K hint kbd next to the search button on desktop', () => {
    // Keyboard discoverability — users learn the shortcut by seeing
    // it next to the button.
    expect(TOPBAR).toMatch(/⌘K/);
  });
});
