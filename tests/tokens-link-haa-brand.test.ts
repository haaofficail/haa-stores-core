// Token theme files must use the Haa brand color (#5c9cd5) for links —
// not Apple's iOS blue (#007aff). The live-staging audit found that
// every <a> on the merchant dashboard was hovering to Apple's iOS
// #007aff because @haa/tokens shipped `--text-link: #007aff` in
// themes-light.css. This guard prevents the regression.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const LIGHT_JSON = read('packages/tokens/source/themes/light.json');
const DARK_JSON = read('packages/tokens/source/themes/dark.json');
const HC_JSON = read('packages/tokens/source/themes/high-contrast.json');
const LIGHT_CSS = read('packages/tokens/output/css/themes-light.css');
const DARK_CSS = read('packages/tokens/output/css/themes-dark.css');
const HC_CSS = read('packages/tokens/output/css/themes-high-contrast.css');

describe('@haa/tokens link colors aligned to Haa brand', () => {
  describe('source themes', () => {
    it('light theme text.link = #5c9cd5 (primary-500)', () => {
      expect(LIGHT_JSON).toMatch(/"link":\s*\{\s*"value":\s*"#5c9cd5"/);
    });
    it('light theme text.linkHover = #4485c4 (primary-600)', () => {
      expect(LIGHT_JSON).toMatch(/"linkHover":\s*\{\s*"value":\s*"#4485c4"/);
    });
    it('light theme border.focus = #5c9cd5', () => {
      expect(LIGHT_JSON).toMatch(/"focus":\s*\{\s*"value":\s*"#5c9cd5"/);
    });
    it('dark theme text.link uses Haa primary-400 (#78aedd) for adequate contrast on dark', () => {
      expect(DARK_JSON).toMatch(/"link":\s*\{\s*"value":\s*"#78aedd"/);
    });
    it('high-contrast theme text.link uses Haa primary-800 (#2a5582) — AAA-grade', () => {
      expect(HC_JSON).toMatch(/"link":\s*\{\s*"value":\s*"#2a5582"/);
    });
  });

  describe('generated CSS outputs', () => {
    it('themes-light.css emits the Haa brand link values', () => {
      expect(LIGHT_CSS).toMatch(/--text-link:\s*#5c9cd5/);
      expect(LIGHT_CSS).toMatch(/--text-link-hover:\s*#4485c4/);
      expect(LIGHT_CSS).toMatch(/--border-focus:\s*#5c9cd5/);
    });
    it('themes-light.css no longer contains Apple iOS #007aff link', () => {
      // The string can still appear under the legacy `platform.ios.blue`
      // alias inside tokens.json, but it must NOT appear inside the LIGHT
      // theme CSS for --text-link / --border-focus.
      const linkLine = LIGHT_CSS.split('\n').find((l) => /--text-link:/.test(l)) ?? '';
      expect(linkLine).not.toMatch(/#007aff/i);
    });
    it('themes-dark.css uses #78aedd for link', () => {
      expect(DARK_CSS).toMatch(/--text-link:\s*#78aedd/);
    });
    it('themes-high-contrast.css uses #2a5582 for link', () => {
      expect(HC_CSS).toMatch(/--text-link:\s*#2a5582/);
    });
  });
});
