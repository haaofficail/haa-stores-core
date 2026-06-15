/**
 * Regression test for `luxury-showcase` theme design tokens.
 *
 * Earlier inspection suggested `--primary` and `--border` were "empty" on
 * `document.documentElement`. That turned out to be a false alarm — those
 * tokens are intentionally scoped to `.luxury-showcase-theme` (and its
 * descendants), not to `:root`, so theme leakage into dashboards/admin is
 * prevented (per AGENTS.md §5 "Theme Isolation" and §6 "Storefront vs
 * Merchant Dashboard").
 *
 * This test pins down the contract by reading the source:
 *   1. `luxuryTokens.colors.primary` and `luxuryTokens.colors.border`
 *      must be non-empty hex colors.
 *   2. The `luxuryCSSVars` map must expose `--primary` and `--border`
 *      pointing to those values.
 *
 * If anyone later refactors and drops one of these bindings, the test
 * fails loudly.
 *
 * Note: this reads the source as a string. It does NOT execute the module
 * (no jsdom, no theme-system wiring), so it stays cheap and isolated.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const TOKENS_PATH = resolve(
  __dirname,
  '../apps/storefront/src/themes/luxury-showcase/luxuryTokens.ts',
);

function readTokens(): string {
  return readFileSync(TOKENS_PATH, 'utf8');
}

/**
 * Pull the `colors` object literal body out of `luxuryTokens`. The shape is:
 *   colors: {
 *     bg: '#FAF7F1',
 *     primary: '#B88A3D',
 *     border: '#E6D8C6',
 *     ...
 *   }
 */
function extractColorsBlock(source: string): string | null {
  const m = source.match(/colors\s*:\s*\{([\s\S]*?)\n\s*\},?\s*\n/);
  return m ? m[1] : null;
}

function extractColorValue(colorsBlock: string, key: string): string | null {
  // Matches: `primary: '#B88A3D',` or `primary: "#B88A3D",`
  const re = new RegExp(`\\b${key}\\s*:\\s*['"]([^'"]+)['"]`);
  const m = colorsBlock.match(re);
  return m ? m[1] : null;
}

/**
 * Pull the `luxuryCSSVars` map body. The shape is:
 *   export const luxuryCSSVars: Record<string, string> = {
 *     '--primary': luxuryTokens.colors.primary,
 *     ...
 *   };
 */
function extractCssVarsBlock(source: string): string | null {
  const m = source.match(/luxuryCSSVars\s*:[^=]*=\s*\{([\s\S]*?)\n\s*\};/);
  return m ? m[1] : null;
}

function cssVarPointsTo(cssVarsBlock: string, cssVarName: string, sourcePath: string): boolean {
  // Matches: `'--primary': luxuryTokens.colors.primary,`
  const re = new RegExp(
    `['"]${cssVarName}['"]\\s*:\\s*luxuryTokens\\.colors\\.${sourcePath}\\b`,
  );
  return re.test(cssVarsBlock);
}

describe('luxury-showcase tokens — primary & border bindings', () => {
  const source = readTokens();
  const colorsBlock = extractColorsBlock(source);
  const cssVarsBlock = extractCssVarsBlock(source);

  it('source declares a `colors` block inside `luxuryTokens`', () => {
    expect(colorsBlock, 'luxuryTokens.colors must exist').not.toBeNull();
  });

  it('source declares a `luxuryCSSVars` map', () => {
    expect(cssVarsBlock, 'luxuryCSSVars must exist').not.toBeNull();
  });

  it('colors.primary is a non-empty hex color', () => {
    expect(colorsBlock).not.toBeNull();
    const v = extractColorValue(colorsBlock!, 'primary');
    expect(v, 'luxuryTokens.colors.primary must be defined').not.toBeNull();
    expect(v, 'luxuryTokens.colors.primary must be a hex color').toMatch(/^#[0-9A-Fa-f]{3,8}$/);
  });

  it('colors.border is a non-empty hex color', () => {
    expect(colorsBlock).not.toBeNull();
    const v = extractColorValue(colorsBlock!, 'border');
    expect(v, 'luxuryTokens.colors.border must be defined').not.toBeNull();
    expect(v, 'luxuryTokens.colors.border must be a hex color').toMatch(/^#[0-9A-Fa-f]{3,8}$/);
  });

  it('luxuryCSSVars exposes `--primary` → colors.primary', () => {
    expect(cssVarsBlock).not.toBeNull();
    expect(
      cssVarPointsTo(cssVarsBlock!, '--primary', 'primary'),
      "luxuryCSSVars['--primary'] must point to luxuryTokens.colors.primary",
    ).toBe(true);
  });

  it('luxuryCSSVars exposes `--border` → colors.border', () => {
    expect(cssVarsBlock).not.toBeNull();
    expect(
      cssVarPointsTo(cssVarsBlock!, '--border', 'border'),
      "luxuryCSSVars['--border'] must point to luxuryTokens.colors.border",
    ).toBe(true);
  });
});
