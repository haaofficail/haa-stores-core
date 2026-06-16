/**
 * Regression test for the `luxury-showcase` theme Header.
 *
 * Bug: `Header.tsx` defined two navLinks with the same `to` (`/s/${slug}/c/all`)
 *      — one labeled "جميع التصنيفات" and the other "التصنيفات". React rendered
 *      both with `key={link.to}`, which produced the warning:
 *        "Encountered two children with the same key"
 *      (6× per page load, observed via Playwright).
 *
 * Fix: deduplicate `navLinks` so each `to` appears at most once.
 *
 * This test imports nothing from the theme — it reads the source file and
 * asserts on the static structure (the same way a code review would). That
 * makes it cheap, framework-free, and immune to React/router mocking pain.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const HEADER_PATH = resolve(
  __dirname,
  '../apps/storefront/src/themes/luxury-showcase/Header.tsx',
);

function readHeader(): string {
  return readFileSync(HEADER_PATH, 'utf8');
}

/**
 * Extract the literal `navLinks = [ ... ]` block from the Header source.
 * We deliberately keep this dumb (no AST) so the test does not break on
 * cosmetic refactors (formatting, comments, type annotations).
 */
function extractNavLinksArray(source: string): string | null {
  const match = source.match(/const\s+navLinks\s*=\s*\[([\s\S]*?)\];/);
  return match ? match[1] : null;
}

/**
 * Pull out each object literal entry from the navLinks array. Each entry
 * looks like `{ to: `/s/${slug}/c/all`, label: t('store.x') }` — possibly
 * spanning multiple lines. We match by splitting on top-level `,` boundaries
 * that separate object literals.
 */
function extractNavLinkEntries(arrayBody: string): Array<{ to: string; label: string }> {
  // Match each `{ ... }` block (no nested braces in our case)
  const entryRegex = /\{\s*to:\s*([^,]+?),\s*label:\s*([^}]+?)\s*\}/g;
  const entries: Array<{ to: string; label: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(arrayBody)) !== null) {
    entries.push({ to: m[1].trim(), label: m[2].trim() });
  }
  return entries;
}

describe('luxury-showcase Header — navLinks uniqueness', () => {
  it('Header.tsx source declares a navLinks array', () => {
    const source = readHeader();
    const arrayBody = extractNavLinksArray(source);
    expect(arrayBody, 'Header.tsx must declare `const navLinks = [...]`').not.toBeNull();
  });

  it('every navLink entry has a unique `to` value (no React key collision)', () => {
    const source = readHeader();
    const arrayBody = extractNavLinksArray(source);
    expect(arrayBody).not.toBeNull();

    const entries = extractNavLinkEntries(arrayBody!);
    expect(entries.length, 'navLinks must have at least one entry').toBeGreaterThan(0);

    const tos = entries.map((e) => e.to);
    const uniqueTos = new Set(tos);

    // The bug: two entries pointed to `/s/${slug}/c/all` with different labels.
    // After the fix, every `to` is unique — which lets `key={link.to}` work.
    expect(
      uniqueTos.size,
      `navLinks has duplicate \`to\` values: ${JSON.stringify(tos)}`,
    ).toBe(tos.length);
  });

  it('the duplicate `/s/${slug}/c/all` entry is gone', () => {
    const source = readHeader();
    const arrayBody = extractNavLinksArray(source);
    expect(arrayBody).not.toBeNull();

    const entries = extractNavLinkEntries(arrayBody!);
    const cAllEntries = entries.filter((e) => e.to.includes('/c/all'));

    // Before fix: 2 entries (one for "جميع التصنيفات", one for "التصنيفات")
    // After fix:  exactly 1 entry
    expect(
      cAllEntries.length,
      `expected exactly 1 navLink with \`/c/all\` in \`to\`, got ${cAllEntries.length}: ${JSON.stringify(cAllEntries)}`,
    ).toBe(1);
  });
});
