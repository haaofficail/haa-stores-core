import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const auth = readFileSync(new URL('../apps/storefront/src/pages/Auth.tsx', import.meta.url), 'utf-8');
const css = readFileSync(new URL('../apps/storefront/src/index.css', import.meta.url), 'utf-8');
const layout = readFileSync(new URL('../apps/storefront/src/components/Layout.tsx', import.meta.url), 'utf-8');

describe('Theme scope isolation (QA AU5 / Batch 4)', () => {
  it('AuthShell uses auth-scope, NOT storefront-scope', () => {
    expect(auth).toContain('id="auth-scope"');
    expect(auth).toContain('data-theme-scope="auth"');
    expect(auth).not.toContain('id="storefront-scope"');
  });
  it('.auth-scope CSS exists and defines brand token + font', () => {
    expect(css).toMatch(/\.auth-scope\s*\{/);
    const block = css.slice(css.indexOf('.auth-scope {'), css.indexOf('.auth-scope {') + 400);
    expect(block).toContain('--brand-primary: #5c9cd5');
    expect(block).toContain('IBM Plex Sans Arabic');
  });
  it('storefront Layout still uses storefront-scope', () => {
    expect(layout).toContain('id="storefront-scope"');
    expect(layout).toContain('data-theme-scope="storefront"');
  });
  it('no broken CSS comments (every /* has a closing */)', () => {
    expect((css.match(/\/\*/g) || []).length).toBe((css.match(/\*\//g) || []).length);
  });
});
