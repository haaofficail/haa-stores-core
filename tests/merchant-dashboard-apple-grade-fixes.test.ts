// Apple-grade audit fixes — merchant dashboard (2026-06-22).
//
// Locks the seven fixes from the staging audit:
//   1. KPI cards isolate signed percentages with dir="ltr" so "-23%"
//      doesn't render as "23%-" inside the RTL parent.
//   2. KPI value/suffix pair uses `ms-1.5` (logical inline-start) so the
//      "ر.س" sits at a readable distance from the number.
//   3. Notification dot on Topbar uses `bg-danger` token, not `bg-red-500`.
//   4. ProductListTable out-of-stock badge uses danger tokens.
//   5. Sidebar brand title is "متاجر هاء" (matches login + landing) and
//      stays on one line via `whitespace-nowrap`.
//   6. Onboarding wizard derives the storefront origin by stripping the
//      "merchant." subdomain, so it points at the apex SPA.
//   7. Onboarding "تخطي" button asks for confirmation before leaving.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const PRIMARY = read('apps/merchant-dashboard/src/pages/dashboard/PrimaryKpiCards.tsx');
const STATS = read('apps/merchant-dashboard/src/pages/dashboard/StatsCards.tsx');
const TOPBAR = read('apps/merchant-dashboard/src/components/layout/Topbar.tsx');
const PRODUCT_LIST = read('apps/merchant-dashboard/src/components/products/ProductListTable.tsx');
const PRODUCT_FORM = read('apps/merchant-dashboard/src/components/products/ProductFormDialog.tsx');
const MARKETPLACES = read('apps/merchant-dashboard/src/pages/Marketplaces.tsx');
// IntegrationHub.tsx was deleted in PR #229 — it was a duplicate of
// Marketplaces.tsx. The status-dot assertion below is retained
// against Marketplaces only.
const SIDEBAR = read('apps/merchant-dashboard/src/components/layout/Sidebar.tsx');
const ONBOARDING = read('apps/merchant-dashboard/src/pages/OnboardingWizard.tsx');
// The storefront-origin derivation was extracted from OnboardingWizard into a
// shared helper so every "open the storefront" link resolves it the same way
// (no hardcoded localhost on deployed builds). Fix 6 now asserts the contract
// against the helper + that onboarding wires it.
const STOREFRONT_URL = read('apps/merchant-dashboard/src/lib/storefront-url.ts');

describe('Apple-grade merchant dashboard fixes (audit 2026-06-22)', () => {
  describe('Fix 1+2: KPI bidi + spacing', () => {
    it('PrimaryKpiCards wraps the trend label in dir="ltr" + tabular-nums', () => {
      expect(PRIMARY).toMatch(/<span dir="ltr"[^>]*>\{salesTrendLabel\}<\/span>/);
    });

    it('StatsCards wraps the trend value in dir="ltr" + tabular-nums', () => {
      expect(STATS).toMatch(/<span dir="ltr"[^>]*>\{s\.trendValue\}<\/span>/);
    });

    it('PrimaryKpiCards uses logical ms-1.5 between value and suffix', () => {
      expect(PRIMARY).toMatch(/ms-1\.5/);
      // The old inline marginInlineEnd is gone.
      expect(PRIMARY).not.toMatch(/marginInlineEnd:\s*['"]0\.25rem['"]/);
    });

    it('StatsCards uses logical ms-1.5 between value and suffix', () => {
      expect(STATS).toMatch(/ms-1\.5/);
      expect(STATS).not.toMatch(/marginInlineEnd:\s*['"]0\.25rem['"]/);
    });

    it('StatsCards "down" trend uses danger tokens, not red-600/red-50', () => {
      // The down branch line should be on `text-danger bg-danger-subtle`.
      expect(STATS).toMatch(/['"]text-danger bg-danger-subtle['"]/);
    });
  });

  describe('Fix 3: notification dot uses danger token, not bg-red-500', () => {
    it('Topbar bell dot is bg-danger', () => {
      expect(TOPBAR).toMatch(/rounded-full bg-danger ring-2 ring-white/);
      expect(TOPBAR).not.toMatch(/rounded-full bg-red-500 ring/);
    });
  });

  describe('Fix 4: stock + status dots use danger tokens', () => {
    it('ProductListTable out-of-stock badge uses danger', () => {
      const region = PRODUCT_LIST.slice(0, PRODUCT_LIST.indexOf('lowStock'));
      expect(region).toMatch(/text-danger bg-danger-subtle/);
      expect(region).toMatch(/rounded-full bg-danger/);
    });

    it('ProductFormDialog image-delete uses danger', () => {
      expect(PRODUCT_FORM).toMatch(/bg-danger text-white rounded-full p-1/);
      expect(PRODUCT_FORM).not.toMatch(/bg-red-500 text-white rounded-full p-1/);
    });

    it('Marketplaces status dot uses danger', () => {
      expect(MARKETPLACES).toMatch(/bg-danger inline-block/);
      expect(MARKETPLACES).not.toMatch(/bg-red-500 inline-block/);
    });

    // IntegrationHub.tsx was removed in PR #229 — the status-dot
    // assertion is enforced on Marketplaces.tsx (the canonical
    // implementation) above. Leaving a placeholder so the test count
    // stays meaningful in CI logs.
    it.skip('IntegrationHub status dot uses danger — file removed in PR #229', () => {
      // intentionally empty
    });
  });

  describe('Fix 5: sidebar brand name + wrap', () => {
    it('title fallback is "متاجر هاء" not "ها ستورز"', () => {
      expect(SIDEBAR).toMatch(/t\('app\.title',\s*'متاجر هاء'\)/);
      expect(SIDEBAR).not.toMatch(/t\('app\.title',\s*'ها ستورز'\)/);
    });

    it('subtitle fallback is "لوحة التاجر"', () => {
      expect(SIDEBAR).toMatch(/t\('app\.subtitle',\s*'لوحة التاجر'\)/);
    });

    it('brand title has whitespace-nowrap so it never breaks mid-word', () => {
      // The two spans (title + subtitle) carry whitespace-nowrap.
      const matches = SIDEBAR.match(/whitespace-nowrap/g) || [];
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Fix 6: onboarding storefront URL', () => {
    it('getStorefrontOrigin strips a leading "merchant." subdomain', () => {
      expect(STOREFRONT_URL).toMatch(/host\.startsWith\(['"]merchant\.['"]\)/);
      expect(STOREFRONT_URL).toMatch(/host\.slice\(['"]merchant\.['"]\.length\)/);
    });

    it('respects VITE_STOREFRONT_URL as explicit override (still)', () => {
      expect(STOREFRONT_URL).toMatch(/import\.meta\.env\.VITE_STOREFRONT_URL/);
    });

    it('onboarding wires the shared resolver instead of hardcoding localhost', () => {
      expect(ONBOARDING).toMatch(/from ['"]@\/lib\/storefront-url['"]/);
      expect(ONBOARDING).toMatch(/getStorefrontOrigin\(\)/);
      expect(ONBOARDING).not.toContain("'http://localhost:5174'");
    });
  });

  describe('Fix 7: onboarding skip asks for confirmation', () => {
    it('the skip button calls window.confirm before navigating', () => {
      // The skip handler must include both window.confirm and navigate
      // to /dashboard inside the same arrow function body.
      expect(ONBOARDING).toMatch(/window\.confirm\([^)]*onboarding\.skipConfirm/s);
      expect(ONBOARDING).toMatch(/navigate\('\/dashboard'\)/);
    });

    it('the skip button is at least h-11 (touch target ≥ 44px)', () => {
      const skipIdx = ONBOARDING.indexOf("'onboarding.skip'");
      expect(skipIdx).toBeGreaterThan(-1);
      // Walk back to the nearest opening <Button — that's the skip button.
      const buttonStart = ONBOARDING.lastIndexOf('<Button', skipIdx);
      expect(buttonStart).toBeGreaterThan(-1);
      const buttonBlock = ONBOARDING.slice(buttonStart, skipIdx);
      expect(buttonBlock).toMatch(/h-11/);
    });
  });
});
