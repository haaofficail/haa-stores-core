// MarketplaceListings pagination guard (perf P0).
//
// Locks in client-side pagination ("load more" + PAGE_SIZE) on
// `apps/merchant-dashboard/src/pages/MarketplaceListings.tsx`. Previously the
// page rendered the entire listings array in a single <TableBody>, which
// degrades the dashboard for merchants with thousands of synced products.
//
// If this test fails, the page has either:
//   (a) lost its PAGE_SIZE slice (regressed to unbounded render), or
//   (b) lost its "load more" / pagination affordance.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const PAGE = resolve(ROOT, 'apps/merchant-dashboard/src/pages/MarketplaceListings.tsx');

function read() {
  expect(existsSync(PAGE)).toBe(true);
  return readFileSync(PAGE, 'utf8');
}

describe('MarketplaceListings pagination (perf P0)', () => {
  it('declares a PAGE_SIZE constant for bounded rendering', () => {
    const src = read();
    expect(src).toMatch(/const\s+PAGE_SIZE\s*=\s*\d+/);
  });

  it('tracks visibleCount state to slice the rendered rows', () => {
    const src = read();
    expect(src).toMatch(/visibleCount/);
    // Slice/limit the listings array before mapping into table rows.
    expect(src).toMatch(/listings\.slice\(\s*0\s*,\s*visibleCount\s*\)/);
  });

  it('renders a "load more" affordance when more rows remain', () => {
    const src = read();
    // Arabic label for "load more" — must exist as fallback string.
    expect(src).toMatch(/تحميل المزيد/);
    // Translation key used by i18next for the button.
    expect(src).toMatch(/marketplaces\.loadMore/);
    // Guard around the affordance.
    expect(src).toMatch(/hasMore/);
  });

  it('shows a "showing N of M" counter so the user understands pagination', () => {
    const src = read();
    expect(src).toMatch(/marketplaces\.paginationShowing/);
  });

  it('does not render the unbounded `listings.map` pattern in the table body', () => {
    const src = read();
    // The original monolith mapped `listings.map((listing: any) =>` directly.
    // The refactored page must map the bounded slice instead.
    expect(src).not.toMatch(/\{listings\.map\(\(listing:\s*any\)\s*=>/);
    expect(src).toMatch(/visibleListings\.map\(/);
  });
});
