// Reset CSS must NOT apply link color + underline to every <a>.
//
// Live-staging audit found that every navigation link on the merchant
// dashboard turned a stale blue (#007aff) and got an underline on
// hover because @haa/tokens shipped a global `a:hover` rule in
// 00-reset.css. PR #74 fixed the COLOR (#007aff → #5c9cd5), but the
// UNDERLINE on every NavLink / pill / button-shaped anchor remained.
//
// This PR scopes the rules so they only apply to bare anchors
// (in-content links). Anchors with any `text-*`, `bg-*`, or
// `from-*` Tailwind utility class opt out.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const RESET_CSS = read('packages/tokens/output/css/00-reset.css');
const BUILD_SCRIPT = read('packages/tokens/scripts/build-css.ts');

describe('@haa/tokens reset — a:hover scoped (not global)', () => {
  it('build script no longer emits a bare `a {}` global rule', () => {
    // The bare `a {` (no `:not`, no compound selector) is gone.
    expect(BUILD_SCRIPT).not.toMatch(/^a \{[\s\S]*?color: var\(--text-link\);[\s\S]*?text-decoration: none;[\s\S]*?\}/m);
  });

  it('build script no longer emits a bare `a:hover {}` global rule', () => {
    expect(BUILD_SCRIPT).not.toMatch(/^a:hover \{[\s\S]*?text-decoration: underline;[\s\S]*?\}/m);
  });

  it('build script scopes the rules with :not([class*="text-"]) etc', () => {
    expect(BUILD_SCRIPT).toMatch(/a:not\(\[class\*="text-"\]\):not\(\[class\*="bg-"\]\):not\(\[class\*="from-"\]\)/);
    expect(BUILD_SCRIPT).toMatch(/a:not\(\[class\*="text-"\]\):not\(\[class\*="bg-"\]\):not\(\[class\*="from-"\]\):hover/);
  });

  it('generated 00-reset.css carries the scoped selectors (regenerated cleanly)', () => {
    expect(RESET_CSS).toMatch(/a:not\(\[class\*="text-"\]\):not\(\[class\*="bg-"\]\):not\(\[class\*="from-"\]\)/);
    expect(RESET_CSS).toMatch(/text-decoration: underline/);
  });

  it('generated 00-reset.css contains no bare `a {` selector', () => {
    // Match start-of-line `a {` with NO selector continuation.
    const bareARule = /\na \{[^}]*\}/.test(RESET_CSS);
    expect(bareARule).toBe(false);
  });

  it('generated 00-reset.css contains no bare `a:hover {` selector', () => {
    const bareAHover = /\na:hover \{[^}]*\}/.test(RESET_CSS);
    expect(bareAHover).toBe(false);
  });
});
