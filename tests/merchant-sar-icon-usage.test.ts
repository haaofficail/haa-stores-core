// Merchant adopts <SarIcon> for currency display — audit follow-up.
//
// Locks the rule that the merchant dashboard's Wallet page uses the
// shared SarIcon component instead of plain Arabic text "ر.س". The
// storefront already renders SAR via this component (see
// apps/storefront/src/components/ui/SarIcon.tsx); the merchant
// dashboard previously rendered it as untyped text, which couldn't
// inherit color and crowded the numerals at small sizes.
//
// We only guard the highest-value surface (Wallet) here so the rule
// is enforced where it matters most. Reports / Orders / KPI cards
// follow in subsequent PRs as scope allows.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const SAR_ICON = read('apps/merchant-dashboard/src/components/ui/SarIcon.tsx');
const WALLET = read('apps/merchant-dashboard/src/pages/Wallet.tsx');

describe('Merchant SarIcon adoption (audit follow-up)', () => {
  it('SarIcon component exists in merchant-dashboard', () => {
    expect(SAR_ICON).toMatch(/export function SarIcon/);
    expect(SAR_ICON).toMatch(/viewBox="0 0 1124\.14 1256\.39"/);
    expect(SAR_ICON).toMatch(/fill="currentColor"/);
  });

  it('Wallet.tsx imports SarIcon', () => {
    expect(WALLET).toMatch(/import \{ SarIcon \} from ['"]@\/components\/ui\/SarIcon['"]/);
  });

  it('Wallet.tsx renders <SarIcon /> at least 4 times (replacing plain ر.س text)', () => {
    const occurrences = (WALLET.match(/<SarIcon\b/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(4);
  });
});
