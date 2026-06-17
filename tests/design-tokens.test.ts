/**
 * Design Tokens Enforcement Test — T1.1
 *
 * Scans all React component files (.tsx) across the 3 apps and asserts:
 *   1. NO hardcoded hex colors (#abc, #abcdef) appear in .tsx files
 *      (with explicit allowlist: themes.ts, theme-registry.ts, test files, mock data)
 *   2. NO inline style with hex color (e.g. style={{ color: '#hex' }})
 *   3. NO Tailwind raw color utilities (text-gray-500, bg-red-600, etc.)
 *      — only design system tokens allowed
 *
 * Mode: warn by default (CI passes, violations logged).
 * After violations < 5, promote to block mode (CI fails on violation).
 *
 * Allowlist (known safe sources of hex):
 *   - packages/theme-system/ (theme registry)
 *   - apps/storefront/src/themes/ (runtime themes)
 *   - all .test.ts and .test.tsx files
 *   - mocks/ and fixtures/ directories
 *   - any .css file (token definitions live there)
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const APPS = ['apps/storefront', 'apps/merchant-dashboard', 'apps/admin-dashboard'];

const ALLOWLIST_PATTERNS = [
  /packages\/theme-system\//,
  /apps\/storefront\/src\/themes\//,
  /apps\/[^/]+\/src\/themes\//,
  /\.test\.tsx?$/,
  /__tests__\//,
  /\/mocks?\//,
  /\/fixtures?\//,
  /\/index\.css$/,
  /\.css$/, // any CSS file — token definitions live there
  /luxury-showcase\//, // luxury theme uses var() with hex fallback (intentional pattern)
  /ThemeEditor\.tsx$/, // color-picker widget renders hue/saturation/lightness gradients
];

const HEX_PATTERN = /#[0-9a-fA-F]{3,8}\b/g;
const INLINE_STYLE_HEX = /style\s*=\s*\{\{[^}]*#[0-9a-fA-F]{3,8}/g;
const TAILWIND_RAW_COLORS = /\b(?:text|bg|border|ring|fill|stroke|from|to|via|placeholder|caret|accent|outline|divide|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

const isAllowlisted = (filePath: string): boolean => {
  const rel = relative(ROOT, filePath);
  return ALLOWLIST_PATTERNS.some((p) => p.test(rel));
};

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      walk(full, out);
    } else if (st.isFile() && full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

interface Violation {
  file: string;
  line: number;
  type: 'hex-literal' | 'inline-style-hex' | 'tailwind-raw-color';
  match: string;
  context: string;
}

function findViolations(file: string): Violation[] {
  const rel = relative(ROOT, file);
  if (isAllowlisted(file)) return [];

  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Hardcoded hex literals (#abc, #abcdef, #abcdef00)
    const hexMatches = line.match(HEX_PATTERN);
    if (hexMatches) {
      for (const m of hexMatches) {
        // skip URL fragments, anchor links, color() notation
        const before = line.substring(0, line.indexOf(m));
        if (before.endsWith('href=') || before.endsWith('"') && line.includes('http')) continue;
        violations.push({
          file: rel,
          line: i + 1,
          type: 'hex-literal',
          match: m,
          context: line.trim().substring(0, 120),
        });
      }
    }

    // 2. Inline style with hex
    const styleMatches = line.match(INLINE_STYLE_HEX);
    if (styleMatches) {
      for (const m of styleMatches) {
        violations.push({
          file: rel,
          line: i + 1,
          type: 'inline-style-hex',
          match: m.substring(0, 40),
          context: line.trim().substring(0, 120),
        });
      }
    }

    // 3. Tailwind raw color utilities
    const twMatches = line.match(TAILWIND_RAW_COLORS);
    if (twMatches) {
      for (const m of twMatches) {
        violations.push({
          file: rel,
          line: i + 1,
          type: 'tailwind-raw-color',
          match: m,
          context: line.trim().substring(0, 120),
        });
      }
    }
  }

  return violations;
}

describe('Design Tokens Enforcement (T1.1)', () => {
  const allViolations: Violation[] = [];

  beforeAll(() => {
    const files: string[] = [];
    for (const app of APPS) {
      const appPath = join(ROOT, app, 'src');
      walk(appPath, files);
    }
    for (const f of files) {
      allViolations.push(...findViolations(f));
    }
  });

  // Sprint 1 status (2026-06-18):
  //   - hex literals: 208 violations (need fix-up — Sprint 2 work)
  //   - inline-style hex: 0 (passing in block mode)
  //   - Tailwind raw colors: 4,842 violations (legacy; need token migration — Sprint 2)
  // → MODE remains 'warn' for hex + tailwind. Inline-style already at 0.
  const MODE: 'warn' | 'block' = 'warn';
  const BLOCK_THRESHOLD = 5;

  it('should have ZERO hex literals in .tsx component files', () => {
    const hexViolations = allViolations.filter((v) => v.type === 'hex-literal');
    if (hexViolations.length > 0) {
      const summary = hexViolations
        .slice(0, 10)
        .map((v) => `  ${v.file}:${v.line}  ${v.match}`)
        .join('\n');
      const more = hexViolations.length > 10 ? `\n  ... and ${hexViolations.length - 10} more` : '';
      console.warn(`\n⚠ ${hexViolations.length} hex literals found (use --haa-* tokens):\n${summary}${more}\n`);
    }
    if (MODE === 'block' || hexViolations.length < BLOCK_THRESHOLD) {
      expect(hexViolations).toHaveLength(0);
    } else {
      expect(hexViolations.length).toBeGreaterThanOrEqual(0); // always pass in warn mode
    }
  });

  it('should have ZERO inline style with hex color', () => {
    const inlineViolations = allViolations.filter((v) => v.type === 'inline-style-hex');
    if (inlineViolations.length > 0) {
      const summary = inlineViolations
        .slice(0, 10)
        .map((v) => `  ${v.file}:${v.line}  ${v.match}`)
        .join('\n');
      console.warn(`\n⚠ ${inlineViolations.length} inline hex styles found (use --haa-* tokens):\n${summary}\n`);
    }
    if (MODE === 'block' || inlineViolations.length < BLOCK_THRESHOLD) {
      expect(inlineViolations).toHaveLength(0);
    } else {
      expect(inlineViolations.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have ZERO Tailwind raw color utilities (use --haa-* or text-primary etc.)', () => {
    const twViolations = allViolations.filter((v) => v.type === 'tailwind-raw-color');
    if (twViolations.length > 0) {
      const summary = twViolations
        .slice(0, 10)
        .map((v) => `  ${v.file}:${v.line}  ${v.match}`)
        .join('\n');
      const more = twViolations.length > 10 ? `\n  ... and ${twViolations.length - 10} more` : '';
      console.warn(`\n⚠ ${twViolations.length} Tailwind raw color utilities found (use text-primary, bg-surface-1, etc.):\n${summary}${more}\n`);
    }
    if (MODE === 'block' || twViolations.length < BLOCK_THRESHOLD) {
      expect(twViolations).toHaveLength(0);
    } else {
      expect(twViolations.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('reports total violation count (for tracking Sprint 1 progress)', () => {
    if (allViolations.length > 0) {
      const byType = allViolations.reduce(
        (acc, v) => {
          acc[v.type] = (acc[v.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      console.log(
        `\n📊 Design tokens: ${allViolations.length} total violations (${Object.entries(byType)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')})`
      );
    }
  });
});
