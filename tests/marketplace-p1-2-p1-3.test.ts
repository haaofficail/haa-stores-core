/**
 * TASK-0043 Phase 4 — Track 4B — P1-2 permissions + P1-3 pagination
 *
 * Source-grep contracts verifying that:
 *   - P1-2: admin marketplace actions use specific permissions
 *     (marketplace.review + marketplace.feature) instead of the
 *     broad marketplace:moderate
 *   - P1-3: admin marketplace/products supports ?page + ?limit
 *     pagination and returns metadata (total, totalPages)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const ADMIN_ROUTES = resolve(projectRoot, 'apps/api/src/routes/admin/index.ts');
const ADMIN_MP = resolve(projectRoot, 'apps/api/src/routes/admin/marketplace.ts');
const PERMISSIONS = resolve(projectRoot, 'packages/shared/src/permissions.ts');

const adminRoutesSrc = readFileSync(ADMIN_ROUTES, 'utf-8');
const adminMpSrc = readFileSync(ADMIN_MP, 'utf-8');
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
});
