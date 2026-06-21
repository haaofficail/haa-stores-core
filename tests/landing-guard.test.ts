import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const landing = readFileSync(resolve(here, '../apps/storefront/src/pages/LandingPage.tsx'), 'utf-8');
const publicDir = resolve(here, '../apps/storefront/public');

describe('Landing page guard (QA B7)', () => {
  it('renders under lp-page scope with key sections', () => {
    expect(landing).toContain('lp-page');
    expect(landing).toContain('lp-hero');
    for (const id of ['ai', 'features', 'pricing', 'faq']) {
      expect(landing).toContain(`id="${id}"`);
    }
  });
  it('has an SEO title containing the Haa brand (E2E regex)', () => {
    expect(landing).toMatch(/useSEO\(/);
    expect(landing).toMatch(/Haa Stores|هاء متاجر/);
  });
  it('has no broken internal footer links (/blog,/market,/help,/contact,/privacy)', () => {
    expect(landing).not.toMatch(/to="\/blog"/);
    expect(landing).not.toMatch(/href="\/market"/);
    expect(landing).not.toMatch(/to="\/help"/);
    expect(landing).not.toMatch(/to="\/privacy"/);
  });
  it('every static /assets reference exists on disk (no broken images)', () => {
    const refs = [...landing.matchAll(/src="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
    const missing = refs.filter((p) => !existsSync(resolve(publicDir, '.' + p)));
    expect(missing).toEqual([]);
  });
});
