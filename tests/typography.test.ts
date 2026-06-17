/**
 * Typography Enforcement Test — T1.3
 *
 * Scans .tsx files and flags:
 *   1. text-[10px] / text-[11px] for body content (BAD — below readable threshold)
 *      EXCEPTION: badges, chips, code, decorative labels — but require explicit opt-in via comment
 *   2. text-[1px] through text-[9px] (NEVER allowed)
 *   3. text-[Npx] where N is between 10-11 (warn only — needs badge-allowlist annotation)
 *
 * Mode: warn (Sprint 1) → block (Sprint 2) when violations < 5
 *
 * Per BRANDING_BRIEF (2026-06-18):
 *   - Body text ≥ 12px (text-xs minimum)
 *   - Body text ≥ 14px preferred (text-sm minimum for helper text)
 *   - 16px on storefront, 15px on merchant, 14px on admin
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const APPS = ['apps/storefront', 'apps/merchant-dashboard', 'apps/admin-dashboard'];

const ALLOWLIST_FILES = [
  /luxury-showcase\//, // luxury theme may use small text intentionally
];

const SMALL_TEXT_PATTERN = /text-\[(\d+)px\]/g;
const BANNED_SIZE_RANGE = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // never allowed
const WARN_SIZE_RANGE = [10, 11]; // allowed only in badges with comment

interface TypographyViolation {
  file: string;
  line: number;
  size: number;
  type: 'banned' | 'warn';
  context: string;
}

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

const isAllowlisted = (filePath: string): boolean => {
  const rel = relative(ROOT, filePath);
  return ALLOWLIST_FILES.some((p) => p.test(rel));
};

function findViolations(file: string): TypographyViolation[] {
  const rel = relative(ROOT, file);
  if (isAllowlisted(file)) return [];

  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const violations: TypographyViolation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.matchAll(SMALL_TEXT_PATTERN);
    for (const m of matches) {
      const size = parseInt(m[1], 10);
      if (BANNED_SIZE_RANGE.includes(size)) {
        violations.push({
          file: rel,
          line: i + 1,
          size,
          type: 'banned',
          context: line.trim().substring(0, 100),
        });
      } else if (WARN_SIZE_RANGE.includes(size)) {
        // Check for opt-in comment: `// small-text-allowed:badge`
        const hasAllowComment = line.includes('// small-text-allowed') || line.includes('/* small-text-allowed');
        if (!hasAllowComment) {
          violations.push({
            file: rel,
            line: i + 1,
            size,
            type: 'warn',
            context: line.trim().substring(0, 100),
          });
        }
      }
    }
  }

  return violations;
}

describe('Typography Enforcement (T1.3)', () => {
  const allViolations: TypographyViolation[] = [];

  beforeAll(() => {
    const files: string[] = [];
    for (const app of APPS) {
      walk(join(ROOT, app, 'src'), files);
    }
    for (const f of files) {
      allViolations.push(...findViolations(f));
    }
  });

  const MODE: 'warn' | 'block' = 'block'; // promoted after Sprint 1 — 0 violations
  const BLOCK_THRESHOLD = 0;

  it('should have ZERO banned text sizes (1-9px)', () => {
    const banned = allViolations.filter((v) => v.type === 'banned');
    if (banned.length > 0) {
      const summary = banned
        .slice(0, 10)
        .map((v) => `  ${v.file}:${v.line}  text-[${v.size}px]`)
        .join('\n');
      console.warn(`\n⚠ ${banned.length} banned text sizes:\n${summary}\n`);
    }
    if (MODE === 'block' || banned.length < BLOCK_THRESHOLD) {
      expect(banned).toHaveLength(0);
    }
  });

  it('should have ZERO small text (10-11px) without explicit badge allowlist', () => {
    const warns = allViolations.filter((v) => v.type === 'warn');
    if (warns.length > 0) {
      const summary = warns
        .slice(0, 10)
        .map((v) => `  ${v.file}:${v.line}  text-[${v.size}px]`)
        .join('\n');
      const more = warns.length > 10 ? `\n  ... and ${warns.length - 10} more` : '';
      console.warn(`\n⚠ ${warns.length} small-text instances (use text-xs 12px or add // small-text-allowed:badge):\n${summary}${more}\n`);
    }
    if (MODE === 'block' || warns.length < BLOCK_THRESHOLD) {
      expect(warns).toHaveLength(0);
    }
  });

  it('reports total violation count (Sprint 1 baseline)', () => {
    if (allViolations.length > 0) {
      const byType = allViolations.reduce(
        (acc, v) => {
          acc[`text-[${v.size}px]`] = (acc[`text-[${v.size}px]`] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      console.log(
        `\n📊 Typography: ${allViolations.length} violations (${Object.entries(byType)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')})`
      );
    }
  });
});
