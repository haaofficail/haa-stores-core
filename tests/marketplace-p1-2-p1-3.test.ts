/**
 * TASK-0043 Phase 4 — Track 4B — P1-2 permissions + P1-3 pagination
 *
 * Source-grep contracts verifying that:
 *   - P1-2: admin marketplace actions use specific permissions
 *     (marketplace.review + marketplace.feature) instead of the
 *     broad marketplace:moderate
 *   - P1-3: admin marketplace/products + orders support ?page + ?limit
 *     pagination and return metadata (total, totalPages)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const ADMIN_ROUTES = resolve(projectRoot, 'apps/api/src/routes/admin/index.ts');
const ADMIN_MP = resolve(projectRoot, 'apps/api/src/routes/admin/marketplace.ts');
const ADMIN_API_CLIENT = resolve(projectRoot, 'apps/admin-dashboard/src/lib/api.ts');
const ADMIN_MARKETPLACE_PAGE = resolve(projectRoot, 'apps/admin-dashboard/src/pages/Marketplace.tsx');
const PERMISSIONS = resolve(projectRoot, 'packages/shared/src/permissions.ts');

const adminRoutesSrc = readFileSync(ADMIN_ROUTES, 'utf-8');
const adminMpSrc = readFileSync(ADMIN_MP, 'utf-8');
const adminApiClientSrc = readFileSync(ADMIN_API_CLIENT, 'utf-8');
const adminMarketplacePageSrc = readFileSync(ADMIN_MARKETPLACE_PAGE, 'utf-8');
const permissionsSrc = readFileSync(PERMISSIONS, 'utf-8');

describe('TASK-0043 Track 4B — P1-2 marketplace permissions', () => {
  it('marketplace.review permission is defined in the shared permissions catalog', () => {
    expect(permissionsSrc).toMatch(/key:\s*['"]marketplace\.review['"]/);
  });

  it('marketplace.feature permission is defined in the shared permissions catalog', () => {
    expect(permissionsSrc).toMatch(/key:\s*['"]marketplace\.feature['"]/);
  });

  it('marketplace.review is gated on the review endpoint (not broad marketplace:moderate)', () => {
    // Match from the route declaration through the handler reference
    // (greedy). This captures the full middleware chain including
    // requireAdminPermission('marketplace.review').
    const reviewRoute = adminRoutesSrc.match(
      /adminRouter\.patch\(\s*['"]\/marketplace\/products\/:id\/review['"][\s\S]{0,800}?marketplaceProductReviewRoute\)/,
    );
    expect(reviewRoute).not.toBeNull();
    const src = reviewRoute![0];
    // Must require marketplace.review specifically.
    expect(src).toMatch(/requireAdminPermission\(['"]marketplace\.review['"]\)/);
    // Must NOT use the broad marketplace:moderate permission.
    expect(src).not.toMatch(/marketplace:moderate/);
  });

  it('marketplace.feature is gated on the feature endpoint (not broad marketplace:moderate)', () => {
    const featureRoute = adminRoutesSrc.match(
      /adminRouter\.patch\(\s*['"]\/marketplace\/products\/:id\/feature['"][\s\S]{0,800}?marketplaceProductFeatureRoute\)/,
    );
    expect(featureRoute).not.toBeNull();
    const src = featureRoute![0];
    expect(src).toMatch(/requireAdminPermission\(['"]marketplace\.feature['"]/);
    expect(src).not.toMatch(/marketplace:moderate/);
  });

  it('review endpoint still requires admin auth', () => {
    const reviewRoute = adminRoutesSrc.match(
      /adminRouter\.patch\(\s*['"]\/marketplace\/products\/:id\/review['"][\s\S]{0,800}?marketplaceProductReviewRoute\)/,
    );
    expect(reviewRoute![0]).toMatch(/requireAdminAuth\(\)/);
  });

  it('feature endpoint still requires admin auth', () => {
    const featureRoute = adminRoutesSrc.match(
      /adminRouter\.patch\(\s*['"]\/marketplace\/products\/:id\/feature['"][\s\S]{0,800}?marketplaceProductFeatureRoute\)/,
    );
    expect(featureRoute![0]).toMatch(/requireAdminAuth\(\)/);
  });

  it('marketplace.review and marketplace.feature are NOT the same permission', () => {
    // Verify both keys exist independently (no aliasing).
    const reviewMatch = permissionsSrc.match(/key:\s*['"]marketplace\.review['"][^}]+/);
    const featureMatch = permissionsSrc.match(/key:\s*['"]marketplace\.feature['"][^}]+/);
    expect(reviewMatch).not.toBeNull();
    expect(featureMatch).not.toBeNull();
    expect(reviewMatch![0]).not.toEqual(featureMatch![0]);
  });

  it('marketplace.review/feature are restricted to owner/admin roles only', () => {
    // P1-2 spec: these are critical-risk permissions — only owner
    // and admin roles should have them. Employees should NOT.
    const reviewBlock = permissionsSrc.match(/key:\s*['"]marketplace\.review['"][\s\S]{0,300}/);
    const featureBlock = permissionsSrc.match(/key:\s*['"]marketplace\.feature['"][\s\S]{0,300}/);
    expect(reviewBlock).not.toBeNull();
    expect(featureBlock).not.toBeNull();
    // Owner + admin in recommendedForRoles
    expect(reviewBlock![0]).toMatch(/recommendedForRoles:\s*\[[^\]]*['"]owner['"]/);
    expect(reviewBlock![0]).toMatch(/['"]admin['"]/);
    expect(featureBlock![0]).toMatch(/recommendedForRoles:\s*\[[^\]]*['"]owner['"]/);
    expect(featureBlock![0]).toMatch(/['"]admin['"]/);
    // critical/high risk level
    expect(reviewBlock![0]).toMatch(/riskLevel:\s*['"]critical['"]/);
    expect(featureBlock![0]).toMatch(/riskLevel:\s*['"]high['"]/);
  });
});

describe('TASK-0043 Track 4B — P1-3 admin marketplace pagination', () => {
  it('marketplaceProductsRoute reads ?page query param', () => {
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/c\.req\.query\(['"]page['"]\)/);
  });

  it('marketplaceProductsRoute reads ?limit query param', () => {
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    expect(block![0]).toMatch(/c\.req\.query\(['"]limit['"]\)/);
  });

  it('limit is clamped to a sane max (no unbounded results)', () => {
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    // Must use Math.min to cap limit (avoid expensive queries).
    expect(block![0]).toMatch(/Math\.min\(\s*\d+/);
    // Cap value must be ≤500 (sanity).
    const capMatch = block![0].match(/Math\.min\(\s*(\d+)/);
    expect(capMatch).not.toBeNull();
    expect(Number(capMatch![1])).toBeLessThanOrEqual(500);
  });

  it('offset is computed from page + limit', () => {
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    expect(block![0]).toMatch(/offset\s*=\s*\(\s*page\s*-\s*1\s*\)\s*\*\s*limit/);
  });

  it('response includes pagination metadata (total + totalPages)', () => {
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    expect(block![0]).toMatch(/total/);
    expect(block![0]).toMatch(/totalPages/);
  });

  it('uses a separate count query for total (not just rows.length)', () => {
    // The total must come from a COUNT(*) query so the client can
    // paginate beyond the current page.
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    expect(block![0]).toMatch(/count\(\*\)/);
  });

  it('default page=1 and limit=50 are applied when params are missing', () => {
    const block = adminMpSrc.match(/export async function marketplaceProductsRoute[\s\S]{0,2500}?\n\}/);
    // The default fallback expression uses `|| 1` and `|| 50`.
    expect(block![0]).toMatch(/\|\|\s*1/);
    expect(block![0]).toMatch(/\|\|\s*50/);
  });

  it('admin API client preserves marketplace pagination metadata from the response envelope', () => {
    const block = adminApiClientSrc.match(/getMarketplaceProducts:[\s\S]{0,1800}?reviewMarketplaceProduct/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/MarketplaceProductsParams/);
    expect(block![0]).toMatch(/requestResponse<Record<string, unknown>\[\]>/);
    expect(block![0]).toMatch(/normalizeMarketplacePage\(response,\s*\{\s*page,\s*limit\s*\}\)/);

    const helperBlock = adminApiClientSrc.match(/function normalizeMarketplacePage[\s\S]{0,1200}?\n\}/);
    expect(helperBlock).not.toBeNull();
    expect(helperBlock![0]).toMatch(/page:\s*Number\.isFinite\(resolvedPage\)/);
    expect(helperBlock![0]).toMatch(/limit:\s*Number\.isFinite\(resolvedLimit\)/);
    expect(helperBlock![0]).toMatch(/total:\s*Number\.isFinite\(total\)/);
    expect(helperBlock![0]).toMatch(/totalPages:\s*Number\.isFinite\(totalPages\)/);
  });

  it('marketplaceOrdersRoute uses the same page/limit pagination metadata contract', () => {
    const block = adminMpSrc.match(/export async function marketplaceOrdersRoute[\s\S]{0,1800}?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/c\.req\.query\(['"]page['"]\)/);
    expect(block![0]).toMatch(/c\.req\.query\(['"]limit['"]\)/);
    expect(block![0]).toMatch(/offset\s*=\s*\(\s*page\s*-\s*1\s*\)\s*\*\s*limit/);
    expect(block![0]).toMatch(/count\(\*\)/);
    expect(block![0]).toMatch(/\.limit\(limit\)/);
    expect(block![0]).toMatch(/\.offset\(offset\)/);
    expect(block![0]).toMatch(/totalPages/);
    expect(block![0]).not.toMatch(/\.limit\(200\)/);
  });

  it('admin API client preserves marketplace order pagination metadata', () => {
    const block = adminApiClientSrc.match(/getMarketplaceOrders:[\s\S]{0,1000}?getMarketplaceSettlements/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/MarketplacePageParams/);
    expect(block![0]).toMatch(/requestResponse<Record<string, unknown>\[\]>/);
    expect(block![0]).toMatch(/\/admin\/marketplace\/orders\?\$\{qs\.toString\(\)\}/);
    expect(block![0]).toMatch(/normalizeMarketplacePage\(response,\s*\{\s*page,\s*limit\s*\}\)/);
  });

  it('Marketplace page requests server page/limit and keys the query by server page', () => {
    expect(adminMarketplacePageSrc).toMatch(/MARKETPLACE_PRODUCTS_PAGE_SIZE\s*=\s*50/);
    expect(adminMarketplacePageSrc).toMatch(/const \[serverPage,\s*setServerPage\]\s*=\s*useState\(1\)/);
    expect(adminMarketplacePageSrc).toMatch(/queryKey:\s*\[\.\.\.queryKeys\.marketplaceProducts,\s*status,\s*serverPage,\s*MARKETPLACE_PRODUCTS_PAGE_SIZE\]/);
    expect(adminMarketplacePageSrc).toMatch(/adminApi\.getMarketplaceProducts\(\{\s*[\s\S]*page:\s*serverPage,\s*[\s\S]*limit:\s*MARKETPLACE_PRODUCTS_PAGE_SIZE/);
  });

  it('Marketplace page requests marketplace orders as a separately paged query', () => {
    expect(adminMarketplacePageSrc).toMatch(/MARKETPLACE_ORDERS_PAGE_SIZE\s*=\s*50/);
    expect(adminMarketplacePageSrc).toMatch(/const \[ordersServerPage,\s*setOrdersServerPage\]\s*=\s*useState\(1\)/);
    expect(adminMarketplacePageSrc).toMatch(/queryKey:\s*\[\.\.\.queryKeys\.marketplaceOrders,\s*ordersServerPage,\s*MARKETPLACE_ORDERS_PAGE_SIZE\]/);
    expect(adminMarketplacePageSrc).toMatch(/adminApi\.getMarketplaceOrders\(\{\s*[\s\S]*page:\s*ordersServerPage,\s*[\s\S]*limit:\s*MARKETPLACE_ORDERS_PAGE_SIZE/);
  });

  it('Marketplace page drives TablePager from server totals instead of local filtered counts', () => {
    const pagerBlock = adminMarketplacePageSrc.match(/<TablePager[\s\S]{0,700}?\/>/);
    expect(pagerBlock).not.toBeNull();
    expect(pagerBlock![0]).toMatch(/page=\{serverPage\}/);
    expect(pagerBlock![0]).toMatch(/totalPages=\{totalPages\}/);
    expect(pagerBlock![0]).toMatch(/filteredCount=\{totalProducts\}/);
    expect(pagerBlock![0]).toMatch(/onPageChange=\{setServerPage\}/);
    expect(pagerBlock![0]).not.toMatch(/controls\.totalPages|controls\.setPage|controls\.filteredCount/);
  });

  it('Marketplace order table drives TablePager from server totals', () => {
    const pagerBlock = adminMarketplacePageSrc.match(/<TablePager[\s\S]{0,900}?itemLabel="طلب"[\s\S]{0,100}?\/>/);
    expect(pagerBlock).not.toBeNull();
    expect(pagerBlock![0]).toMatch(/page=\{ordersServerPage\}/);
    expect(pagerBlock![0]).toMatch(/totalPages=\{orderTotalPages\}/);
    expect(pagerBlock![0]).toMatch(/filteredCount=\{totalOrders\}/);
    expect(pagerBlock![0]).toMatch(/onPageChange=\{setOrdersServerPage\}/);
  });
});
