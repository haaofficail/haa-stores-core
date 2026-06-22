// Merchant login logo + layout polish — P2 audit follow-ups.
//
// Locks the three P2 findings:
//   - Logo is decorative (alt="") because the brand name is announced
//     by the h1 below; otherwise screen readers say "هاء متاجر هاء".
//   - <img srcset + sizes> so the browser picks the 64/192/512 variant
//     instead of downloading the 6000x6000 master at every visit.
//   - The login container is capped at max-w-6xl so the two columns
//     sit closer together on wide screens.

import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

const LOGIN = readFileSync(
  resolve(ROOT, 'apps/merchant-dashboard/src/pages/Login.tsx'),
  'utf-8',
);

function extractImgBlock(): string {
  // The <img haa-logo ...> tag spans multiple lines in Login.tsx; slice
  // from the opening <img to the closing />.
  const start = LOGIN.indexOf('<img');
  const end = LOGIN.indexOf('/>', start);
  return start === -1 || end === -1 ? '' : LOGIN.slice(start, end + 2);
}

describe('Merchant login logo + layout (P2 audit)', () => {
  it('the brand image is decorative (alt="") so it does not duplicate the h1', () => {
    const block = extractImgBlock();
    expect(block).toContain('haa-logo');
    expect(block).toMatch(/alt=""/);
    expect(block).not.toMatch(/alt="هاء"/);
  });

  it('the brand image declares srcset + sizes so the browser picks a small variant', () => {
    const block = extractImgBlock();
    expect(block).toContain('srcSet="/haa-logo-64.png 64w, /haa-logo-192.png 192w, /haa-logo-512.png 512w"');
    expect(block).toContain('sizes="40px"');
    expect(block).toContain('decoding="async"');
    // Explicit dimensions prevent CLS.
    expect(block).toContain('width={40}');
    expect(block).toContain('height={40}');
  });

  it('the default src points at the 192 variant, not the 6000x6000 master', () => {
    const block = extractImgBlock();
    expect(block).toContain('src="/haa-logo-192.png"');
    expect(block).not.toContain('src="/haa-logo.png"');
  });

  it('the page container is capped at max-w-6xl (not 7xl) for better balance', () => {
    expect(LOGIN).toMatch(/max-w-6xl/);
    expect(LOGIN).not.toMatch(/max-w-7xl/);
  });

  it('the resized logo variants exist on disk and are reasonably small', () => {
    const dir = resolve(ROOT, 'apps/merchant-dashboard/public');
    const v64 = statSync(resolve(dir, 'haa-logo-64.png'));
    const v192 = statSync(resolve(dir, 'haa-logo-192.png'));
    const v512 = statSync(resolve(dir, 'haa-logo-512.png'));
    // Ballpark guards — the 6000x6000 master weighs ~2.4 MB. Each variant
    // must come in well under that.
    expect(v64.size).toBeLessThan(50_000);
    expect(v192.size).toBeLessThan(100_000);
    expect(v512.size).toBeLessThan(300_000);
  });
});
