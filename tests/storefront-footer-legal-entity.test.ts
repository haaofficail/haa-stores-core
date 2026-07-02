// P1-12 audit fix — the platform operating entity ("مؤسسة حرف الهاء
// التجارية · CR 7038798612") was shown on the haastores.com marketing
// pages (LegalPage, PlatformAbout, Pricing, LandingPage) but missing
// from the actual per-merchant storefront footer that customers see
// while shopping on a store's own page.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FOOTER = readFileSync(
  resolve(__dirname, '../apps/storefront/src/components/Footer.tsx'),
  'utf-8',
);

describe('Storefront Footer — legal entity disclosure', () => {
  it('imports the single-source-of-truth PLATFORM_LEGAL_ENTITY (not a hardcoded literal)', () => {
    expect(FOOTER).toMatch(/import\s*\{[\s\S]*?PLATFORM_LEGAL_ENTITY[\s\S]*?\}\s*from\s*['"]@haa\/shared['"]/);
    expect(FOOTER).not.toMatch(/7038798612/);
  });

  it('renders the entity display line', () => {
    expect(FOOTER).toMatch(/PLATFORM_LEGAL_ENTITY\.displayLine/);
  });
});
